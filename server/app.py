from datetime import datetime, timedelta, timezone
import os
import re
import uuid
import json
from urllib import parse

import jwt
from flask import Flask, jsonify, request
from flask_cors import CORS
try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(*args, **kwargs):
        return False
from sqlalchemy import and_, inspect, or_, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash, generate_password_hash

try:
    from .extensions import db, migrate
    from .market_service import (
        MARKET_OVERVIEW_INDICES,
        RateLimitError,
        bootstrap_market_snapshots,
        fetch_bulk_quotes,
        fetch_history,
        fetch_market_overview,
        fetch_quote,
        fetch_top_movers,
        fetch_upcoming_earnings,
        get_finnhub_env_diagnostics,
        get_bootstrap_symbols,
        get_market_debug_status,
        list_stored_quote_snapshot_symbols,
        get_supported_symbol_name,
        get_supported_symbols,
        is_supported_symbol,
        get_finnhub_api_key,
        get_supported_market_universe,
        refresh_market_snapshots,
    )
    from .models import (
        ChatMessage,
        ConnectionRequest,
        Conversation,
        ConversationChannel,
        ConversationMember,
        MarketSnapshot,
        Notification,
        RevokedToken,
        User,
        UserActivity,
        UserProfile,
        UserSettings,
        WatchlistItem,
    )
except ImportError:
    from extensions import db, migrate
    from market_service import (
        MARKET_OVERVIEW_INDICES,
        RateLimitError,
        bootstrap_market_snapshots,
        fetch_bulk_quotes,
        fetch_history,
        fetch_market_overview,
        fetch_quote,
        fetch_top_movers,
        fetch_upcoming_earnings,
        get_finnhub_env_diagnostics,
        get_bootstrap_symbols,
        get_market_debug_status,
        list_stored_quote_snapshot_symbols,
        get_supported_symbol_name,
        get_supported_symbols,
        is_supported_symbol,
        get_finnhub_api_key,
        get_supported_market_universe,
        refresh_market_snapshots,
    )
    from models import (
        ChatMessage,
        ConnectionRequest,
        Conversation,
        ConversationChannel,
        ConversationMember,
        MarketSnapshot,
        Notification,
        RevokedToken,
        User,
        UserActivity,
        UserProfile,
        UserSettings,
        WatchlistItem,
    )

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv(os.path.join(os.path.dirname(BASE_DIR), ".env"))

app = Flask(__name__)
schema_initialized = False
legacy_data_cleanup_completed = False


def _clean_secret(raw_value: str, fallback: str) -> str:
    value = (raw_value or "").strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        value = value[1:-1].strip()
    if value.startswith("SECRET_KEY="):
        value = value.split("=", 1)[1].strip()
    return value or fallback


def _normalize_database_url(raw_value: str) -> str:
    value = (raw_value or "").strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        value = value[1:-1].strip()
    if value.startswith("DATABASE_URL="):
        value = value.split("=", 1)[1].strip()
    if not value or "://" not in value or "@" not in value:
        return value

    scheme, rest = value.split("://", 1)
    if scheme == "postgresql":
        scheme = "postgresql+psycopg"
    elif scheme == "postgres":
        scheme = "postgresql+psycopg"
    credentials, location = rest.rsplit("@", 1)
    if ":" not in credentials:
        return value

    username, password = credentials.split(":", 1)
    encoded_password = parse.quote(password, safe="")
    return f"{scheme}://{username}:{encoded_password}@{location}"


app.config["SECRET_KEY"] = _clean_secret(
    os.environ.get("SECRET_KEY") or os.environ.get("FLASK_SECRET_KEY"),
    "dev-secret-change-me",
)
app.config["SQLALCHEMY_DATABASE_URI"] = _normalize_database_url(os.environ.get("DATABASE_URL"))
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)
migrate.init_app(app, db)

frontend_url = (
    os.environ.get("FRONTEND_URL")
    or os.environ.get("FRONTEND_API_URL")
    or "http://localhost:3000"
).strip().rstrip("/")

allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    frontend_url,
]
CORS(
    app,
    origins=[origin for origin in allowed_origins if origin],
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

JWT_EXPIRATION_DAYS = 7
MARKET_DATA_UNAVAILABLE_MESSAGE = "Live market data is limited in this prototype and may not be available right now."
MARKET_INGEST_MODE = "manual_only"


def create_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + timedelta(days=JWT_EXPIRATION_DAYS),
    }
    return jwt.encode(payload, app.config["SECRET_KEY"], algorithm="HS256")


def decode_token(token: str):
    try:
        payload = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
    except jwt.PyJWTError:
        return None

    jti = payload.get("jti")
    if not jti:
        return None

    revoked = db.session.query(RevokedToken.id).filter_by(jti=jti).first()
    if revoked:
        return None

    return payload


def _get_user_from_payload(payload):
    subject = payload.get("sub")
    if not subject:
        return None

    try:
        user_id = uuid.UUID(str(subject))
    except (TypeError, ValueError):
        return None

    return User.query.filter_by(id=user_id).first()


def get_authorization_token() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    return auth_header.replace("Bearer ", "", 1).strip()


def json_error(message: str, status: int):
    return jsonify({"error": message}), status


def ensure_database_schema():
    global schema_initialized

    if schema_initialized:
        return

    db.create_all()
    inspector = inspect(db.engine)

    user_profile_columns = {column["name"] for column in inspector.get_columns("user_profiles")}
    chat_message_columns = {column["name"] for column in inspector.get_columns("chat_messages")}

    with db.engine.begin() as connection:
        if "e2ee_public_key" not in user_profile_columns:
            connection.execute(text("ALTER TABLE user_profiles ADD COLUMN e2ee_public_key TEXT"))
        if "e2ee_key_algorithm" not in user_profile_columns:
            connection.execute(text("ALTER TABLE user_profiles ADD COLUMN e2ee_key_algorithm VARCHAR(32) DEFAULT 'RSA-OAEP'"))
        if "e2ee_key_updated_at" not in user_profile_columns:
            connection.execute(text("ALTER TABLE user_profiles ADD COLUMN e2ee_key_updated_at TIMESTAMP"))
        if "message_format" not in chat_message_columns:
            connection.execute(text("ALTER TABLE chat_messages ADD COLUMN message_format VARCHAR(32) DEFAULT 'plaintext'"))
        connection.execute(text("UPDATE user_profiles SET e2ee_key_algorithm = COALESCE(e2ee_key_algorithm, 'RSA-OAEP')"))
        connection.execute(text("UPDATE chat_messages SET message_format = COALESCE(message_format, 'plaintext')"))

    ensure_messaging_seed_data()
    schema_initialized = True


def cleanup_legacy_hru_data():
    global legacy_data_cleanup_completed

    if legacy_data_cleanup_completed:
        return

    legacy_messages = (
        ChatMessage.query
        .filter(ChatMessage.ticker_symbols.ilike("%HRU%"))
        .all()
    )
    for message in legacy_messages:
        normalized_content = (message.content or "").strip().lower()
        if normalized_content == "hru":
            db.session.delete(message)

    legacy_activities = (
        UserActivity.query
        .filter(
            (UserActivity.ticker == "HRU")
            | (UserActivity.description.ilike("%HRU%"))
        )
        .all()
    )
    for activity in legacy_activities:
        db.session.delete(activity)

    legacy_watchlist_items = WatchlistItem.query.filter_by(ticker="HRU").all()
    for item in legacy_watchlist_items:
        db.session.delete(item)

    db.session.commit()
    legacy_data_cleanup_completed = True


def _username_seed(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9_]", "", value.lower().replace(" ", "_"))
    normalized = normalized.strip("_")
    return normalized[:24] or f"user{uuid.uuid4().hex[:6]}"


def _build_internal_email(username: str) -> str:
    base = _username_seed(username)
    candidate = f"{base}@users.tradelink.local"
    suffix = 1

    while User.query.filter_by(email=candidate).first():
        suffix += 1
        candidate = f"{base[:20]}{suffix}@users.tradelink.local"

    return candidate


def _initials_from_name(name: str) -> str:
    parts = [part for part in (name or "").split() if part]
    if not parts:
        return "TL"
    return "".join(part[0] for part in parts[:2]).upper()


def _extract_tickers(content: str):
    tickers = []
    for match in re.finditer(r"(?<!\w)[$#]([A-Za-z]{1,5}(?:\.[A-Za-z]{1,3})?)\b", content or ""):
        symbol = match.group(1).upper()
        if is_supported_symbol(symbol) and symbol not in tickers:
            tickers.append(symbol)
    return tickers[:5]


def _extract_mentions(content: str):
    mentions = []
    for match in re.finditer(r"(?<!\w)@([A-Za-z0-9_]{3,24})\b", content or ""):
        username = (match.group(1) or "").strip().lower()
        if username and username not in mentions:
            mentions.append(username)
    return mentions[:10]


def _generate_unique_username(base_value: str, excluded_user_id=None) -> str:
    base = _username_seed(base_value)
    candidate = base
    suffix = 1

    while True:
        existing = UserProfile.query.filter_by(username=candidate).first()
        if not existing or existing.user_id == excluded_user_id:
            return candidate
        suffix += 1
        candidate = f"{base[:20]}{suffix}"


def _create_activity(user_id, activity_type: str, description: str, ticker: str | None = None):
    activity = UserActivity(
        user_id=user_id,
        activity_type=activity_type,
        description=description,
        ticker=ticker,
    )
    db.session.add(activity)
    return activity


def _create_notification(
    user_id,
    notification_type: str,
    *,
    entity_key: str | None = None,
    payload: dict | None = None,
):
    if entity_key:
        existing = Notification.query.filter_by(
            user_id=user_id,
            notification_type=notification_type,
            entity_key=entity_key,
        ).first()
        if existing:
            return existing

    notification = Notification(
        user_id=user_id,
        notification_type=notification_type,
        entity_key=entity_key,
        payload=json.dumps(payload or {}),
        is_read=False,
    )
    db.session.add(notification)
    db.session.flush()
    return notification


def _connection_request_pair_filter(user_a_id, user_b_id):
    return or_(
        and_(ConnectionRequest.requester_id == user_a_id, ConnectionRequest.recipient_id == user_b_id),
        and_(ConnectionRequest.requester_id == user_b_id, ConnectionRequest.recipient_id == user_a_id),
    )


def _connection_status(user_a_id, user_b_id):
    accepted_request = (
        ConnectionRequest.query
        .filter(
            _connection_request_pair_filter(user_a_id, user_b_id),
            ConnectionRequest.status == "accepted",
        )
        .order_by(ConnectionRequest.responded_at.desc(), ConnectionRequest.created_at.desc())
        .first()
    )
    if accepted_request:
        return "connected", accepted_request

    pending_request = (
        ConnectionRequest.query
        .filter(
            _connection_request_pair_filter(user_a_id, user_b_id),
            ConnectionRequest.status == "pending",
        )
        .order_by(ConnectionRequest.created_at.desc())
        .first()
    )
    if pending_request:
        if pending_request.requester_id == user_a_id:
            return "outgoing_pending", pending_request
        return "incoming_pending", pending_request

    return "none", None


def _connection_status_payload(current_user: User, other_user: User):
    status, request_record = _connection_status(current_user.id, other_user.id)
    conversation = Conversation.query.filter_by(
        conversation_key=_build_dm_key(current_user.id, other_user.id),
        kind="direct_message",
    ).first()
    return {
        "connection_status": status,
        "request_id": str(request_record.id) if request_record else None,
        "conversation_key": conversation.conversation_key if conversation else None,
    }


def _is_connected(user_a_id, user_b_id) -> bool:
    status, _ = _connection_status(user_a_id, user_b_id)
    return status == "connected"


def _update_connection_request_notification(connection_request: ConnectionRequest, *, mark_read: bool | None = None):
    existing = Notification.query.filter_by(
        user_id=connection_request.recipient_id,
        notification_type="connection_request",
        entity_key=f"connection_request:{connection_request.id}",
    ).first()
    if existing is None:
        existing = Notification(
            user_id=connection_request.recipient_id,
            notification_type="connection_request",
            entity_key=f"connection_request:{connection_request.id}",
            payload="{}",
            is_read=False,
        )
        db.session.add(existing)

    requester_profile = ensure_user_profile(connection_request.requester)
    existing.payload = json.dumps(
        {
            "request_id": str(connection_request.id),
            "requester_id": str(connection_request.requester_id),
            "requester_name": requester_profile.full_name,
            "requester_username": requester_profile.username,
            "status": connection_request.status,
        }
    )
    if mark_read is not None:
        existing.is_read = mark_read
        existing.read_at = datetime.now(timezone.utc) if mark_read else None
    elif connection_request.status == "pending":
        existing.is_read = False
        existing.read_at = None
    else:
        existing.is_read = True
        existing.read_at = datetime.now(timezone.utc)
    db.session.flush()
    return existing


def _latest_conversation_message(conversation: Conversation):
    channel_keys = [channel.channel_key for channel in conversation.channels]
    if not channel_keys:
        return None
    return (
        ChatMessage.query
        .filter(ChatMessage.channel.in_(channel_keys))
        .order_by(ChatMessage.created_at.desc())
        .first()
    )


def _message_preview_from_record(message: ChatMessage | None, default_preview: str = "") -> str:
    if message is None:
        return default_preview
    if getattr(message, "message_format", "plaintext") == "encrypted":
        return "Encrypted message"
    return _message_preview(message.content)


def _normalize_encrypted_payload(payload):
    if not isinstance(payload, dict):
        return None

    ciphertext = (payload.get("ciphertext") or "").strip()
    iv = (payload.get("iv") or "").strip()
    wrapped_keys = payload.get("wrapped_keys")
    algorithm = (payload.get("algorithm") or "AES-GCM").strip() or "AES-GCM"
    key_wrapping = (payload.get("key_wrapping") or "RSA-OAEP").strip() or "RSA-OAEP"

    if not ciphertext or not iv or not isinstance(wrapped_keys, dict) or not wrapped_keys:
        return None

    normalized_wrapped_keys = {
        str(user_id): str(value)
        for user_id, value in wrapped_keys.items()
        if str(user_id).strip() and str(value).strip()
    }
    if not normalized_wrapped_keys:
        return None

    return {
        "ciphertext": ciphertext,
        "iv": iv,
        "wrapped_keys": normalized_wrapped_keys,
        "algorithm": algorithm,
        "key_wrapping": key_wrapping,
    }


def _build_dm_list_item(current_user: User, other_user: User, conversation: Conversation | None, *, request_kind: str | None = None):
    other_profile = ensure_user_profile(other_user)
    status, request_record = _connection_status(current_user.id, other_user.id)
    latest_message = _latest_conversation_message(conversation) if conversation else None
    default_preview = (
        f"@{other_profile.username} wants to connect before messaging."
        if request_kind == "connection_request"
        else f"Start chatting with @{other_profile.username}"
    )
    return {
        "conversation_key": conversation.conversation_key if conversation else None,
        "user_id": str(other_user.id),
        "username": other_profile.username,
        "display_name": other_profile.full_name,
        "preview": _message_preview_from_record(latest_message, default_preview),
        "timestamp": latest_message.created_at.isoformat() if latest_message and latest_message.created_at else (
            request_record.created_at.isoformat() if request_record and request_record.created_at else None
        ),
        "connection_status": status,
        "request_id": str(request_record.id) if request_record else None,
        "request_kind": request_kind or ("message_request" if status != "connected" else None),
    }


def _message_preview(content: str, max_length: int = 140) -> str:
    value = (content or "").strip()
    if len(value) <= max_length:
        return value
    return value[: max_length - 1].rstrip() + "…"


def _create_mention_notifications(user: User, conversation: Conversation, channel: ConversationChannel, message: ChatMessage):
    if conversation.kind != "public_space":
        return []

    mentioned_usernames = _extract_mentions(message.content)
    if not mentioned_usernames:
        return []

    profiles = UserProfile.query.filter(UserProfile.username.in_(mentioned_usernames)).all()
    profile_map = {profile.username.lower(): profile for profile in profiles}
    author_profile = ensure_user_profile(user)
    created_notifications = []

    for username in mentioned_usernames:
        profile = profile_map.get(username)
        if not profile or profile.user_id == user.id:
            continue
        if not _member_exists(conversation.id, profile.user_id):
            continue

        recipient_settings = ensure_user_settings(profile.user)
        if not recipient_settings.message_notifications:
            continue

        created_notifications.append(
            _create_notification(
                profile.user_id,
                "mention",
                entity_key=f"mention:{message.id}:{profile.user_id}",
                payload={
                    "space_name": conversation.name,
                    "conversation_key": conversation.conversation_key,
                    "channel_name": channel.name,
                    "channel_key": channel.channel_key,
                    "message_id": str(message.id),
                    "mentioned_by_name": author_profile.full_name,
                    "mentioned_by_username": author_profile.username,
                    "message_preview": _message_preview(message.content),
                },
            )
        )

    return created_notifications


def _refresh_watchlist_alert_notifications(user: User):
    settings = ensure_user_settings(user)
    if not settings.push_notifications:
        return []

    watchlist_items = (
        WatchlistItem.query
        .filter_by(user_id=user.id)
        .order_by(WatchlistItem.created_at.desc())
        .all()
    )
    if not watchlist_items:
        return []

    quote_response = fetch_bulk_quotes(
        get_finnhub_api_key(),
        [item.ticker for item in watchlist_items],
        snapshot_loader=load_market_snapshot,
        snapshot_saver=save_market_snapshot,
    )
    quotes = quote_response.get("quotes") or {}
    created_notifications = []

    for item in watchlist_items:
        quote = quotes.get(item.ticker)
        if not quote:
            continue

        price = quote.get("price")
        change = quote.get("change")
        change_percent = quote.get("changePercent")
        updated_at = quote.get("updatedAt") or datetime.now(timezone.utc).isoformat()

        try:
            numeric_change = float(change or 0)
            numeric_change_percent = float(change_percent or 0)
        except (TypeError, ValueError):
            continue

        if abs(numeric_change) < 0.01 and abs(numeric_change_percent) < 0.01:
            continue

        created_notifications.append(
            _create_notification(
                user.id,
                "watchlist_alert",
                entity_key=f"watchlist:{item.ticker}:{updated_at}",
                payload={
                    "ticker": item.ticker,
                    "stock_name": item.company_name or get_supported_symbol_name(item.ticker) or item.ticker,
                    "price": price,
                    "change": numeric_change,
                    "change_percent": numeric_change_percent,
                    "movement_label": f"{numeric_change >= 0 and '+' or ''}{numeric_change:.2f} ({numeric_change_percent >= 0 and '+' or ''}{numeric_change_percent:.2f}%)",
                },
            )
        )

    return created_notifications


def ensure_user_profile(user: User) -> UserProfile:
    profile = user.profile
    if profile:
        return profile

    profile = UserProfile(
        user_id=user.id,
        full_name=user.name,
        username=_generate_unique_username(user.name),
        bio="",
        avatar_seed=_initials_from_name(user.name),
        joined_at=user.created_at,
        verified_trader=False,
        trust_score=50,
        messages_sent_count=0,
        tickers_shared_count=0,
    )
    db.session.add(profile)
    db.session.flush()
    return profile


def ensure_user_settings(user: User) -> UserSettings:
    settings = user.settings
    if settings:
        return settings

    settings = UserSettings(
        user_id=user.id,
        email_notifications=True,
        push_notifications=True,
        message_notifications=True,
        profile_visibility="public",
        dark_mode=True,
    )
    db.session.add(settings)
    db.session.flush()
    return settings


PUBLIC_SPACE_TEMPLATES = [
    {
        "key": "large_caps",
        "name": "Large Caps",
        "description": "Discuss major index names, broad market moves, and large-cap setups.",
        "channels": ["General", "Trading", "Earnings"],
    },
    {
        "key": "ai_traders",
        "name": "AI Traders",
        "description": "Focused discussion for AI-linked names, semiconductor momentum, and macro AI themes.",
        "channels": ["General", "Trading", "Earnings"],
    },
    {
        "key": "earnings_desk",
        "name": "Earnings Desk",
        "description": "Follow earnings season, reaction trades, and event-driven conversations.",
        "channels": ["General", "Trading", "Earnings"],
    },
]


def _slugify(value: str, max_length: int = 20) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "_", (value or "").strip().lower()).strip("_")
    return normalized[:max_length] or "channel"


def _conversation_key(prefix: str, value: str) -> str:
    slug = _slugify(value, max_length=20)
    return f"{prefix}_{slug}"[:32]


def _channel_key(prefix: str, value: str, slug: str) -> str:
    base = f"{prefix}_{_slugify(value, 12)}_{_slugify(slug, 12)}"
    return base[:32]


def _member_exists(conversation_id, user_id) -> bool:
    return ConversationMember.query.filter_by(conversation_id=conversation_id, user_id=user_id).first() is not None


def _ensure_conversation_member(conversation: Conversation, user: User, role: str = "member"):
    membership = ConversationMember.query.filter_by(conversation_id=conversation.id, user_id=user.id).first()
    if membership:
        return membership

    membership = ConversationMember(
        conversation_id=conversation.id,
        user_id=user.id,
        role=role,
    )
    db.session.add(membership)
    db.session.flush()
    return membership


def _create_conversation_channel(conversation: Conversation, name: str, position: int):
    slug = _slugify(name, max_length=16)
    channel = ConversationChannel(
        conversation_id=conversation.id,
        channel_key=_channel_key(conversation.conversation_key[:10], conversation.name, slug),
        name=name,
        slug=slug,
        position=position,
    )
    db.session.add(channel)
    db.session.flush()
    return channel


def ensure_messaging_seed_data():
    changed = False

    for template in PUBLIC_SPACE_TEMPLATES:
        conversation = Conversation.query.filter_by(conversation_key=template["key"]).first()
        if conversation is None:
            conversation = Conversation(
                conversation_key=template["key"],
                kind="public_space",
                name=template["name"],
                description=template["description"],
                visibility="public",
            )
            db.session.add(conversation)
            db.session.flush()
            changed = True

        existing_slugs = {channel.slug for channel in conversation.channels}
        for position, channel_name in enumerate(template["channels"]):
            slug = _slugify(channel_name, max_length=16)
            if slug in existing_slugs:
                continue
            _create_conversation_channel(conversation, channel_name, position)
            changed = True

    if changed:
        db.session.commit()


def _conversation_member_count(conversation_id) -> int:
    return ConversationMember.query.filter_by(conversation_id=conversation_id).count()


def _conversation_members(conversation: Conversation):
    memberships = (
        ConversationMember.query
        .filter_by(conversation_id=conversation.id)
        .join(UserProfile, ConversationMember.user_id == UserProfile.user_id)
        .order_by(UserProfile.username.asc())
        .all()
    )
    return [
        {
            "user_id": str(membership.user_id),
            "username": membership.user.profile.username if membership.user and membership.user.profile else membership.user.name,
            "display_name": membership.user.profile.full_name if membership.user and membership.user.profile else membership.user.name,
            "role": membership.role,
            "e2ee_public_key": (
                membership.user.profile.to_dict().get("e2ee_public_key")
                if membership.user and membership.user.profile else None
            ),
            "e2ee_key_algorithm": (
                membership.user.profile.e2ee_key_algorithm
                if membership.user and membership.user.profile else "RSA-OAEP"
            ),
        }
        for membership in memberships
    ]


def _conversation_payload(conversation: Conversation, user: User | None = None):
    channels = sorted(conversation.channels, key=lambda channel: (channel.position, channel.name.lower()))
    is_member = user is not None and _member_exists(conversation.id, user.id)
    payload = {
        "conversation_key": conversation.conversation_key,
        "kind": conversation.kind,
        "name": conversation.name,
        "description": conversation.description,
        "visibility": conversation.visibility,
        "member_count": _conversation_member_count(conversation.id),
        "is_member": is_member,
        "channels": [
            {
                "channel_key": channel.channel_key,
                "name": channel.name,
                "slug": channel.slug,
            }
            for channel in channels
        ],
    }
    if conversation.kind in {"private_group", "direct_message"}:
        payload["members"] = _conversation_members(conversation)
    if conversation.kind == "direct_message" and user is not None:
        other_members = [member for member in payload.get("members", []) if member["user_id"] != str(user.id)]
        if other_members:
            payload["name"] = other_members[0]["display_name"]
            payload["handle"] = other_members[0]["username"]
            other_user = User.query.filter_by(id=uuid.UUID(other_members[0]["user_id"])).first()
            if other_user:
                payload.update(_connection_status_payload(user, other_user))
        latest_message = _latest_conversation_message(conversation)
        payload["last_message_preview"] = _message_preview_from_record(latest_message)
        payload["last_message_at"] = latest_message.created_at.isoformat() if latest_message and latest_message.created_at else None
    return payload


def _channel_access(channel_key: str, user: User):
    channel = ConversationChannel.query.filter_by(channel_key=channel_key).first()
    if channel is None:
        return None, None, json_error("Conversation channel not found", 404)

    conversation = channel.conversation
    is_member = _member_exists(conversation.id, user.id)
    if conversation.kind != "public_space" and not is_member:
        return None, None, json_error("You do not have access to this conversation", 403)
    if conversation.kind == "public_space" and not is_member:
        return None, None, json_error("Join this space to read and send messages", 403)
    return conversation, channel, None


def _build_dm_key(user_a_id, user_b_id) -> str:
    ordered = sorted([str(user_a_id), str(user_b_id)])
    digest = uuid.uuid5(uuid.NAMESPACE_DNS, ":".join(ordered)).hex[:12]
    return f"dm_{digest}"


def _get_or_create_dm(user: User, other_user: User) -> Conversation:
    conversation_key = _build_dm_key(user.id, other_user.id)
    conversation = Conversation.query.filter_by(conversation_key=conversation_key).first()
    if conversation:
        _ensure_conversation_member(conversation, user)
        _ensure_conversation_member(conversation, other_user)
        db.session.commit()
        return conversation

    other_profile = ensure_user_profile(other_user)
    conversation = Conversation(
        conversation_key=conversation_key,
        kind="direct_message",
        name=other_profile.full_name or other_profile.username,
        description=f"Direct message with @{other_profile.username}",
        visibility="private",
        owner_id=user.id,
    )
    db.session.add(conversation)
    db.session.flush()
    _create_conversation_channel(conversation, "Messages", 0)
    _ensure_conversation_member(conversation, user, role="owner")
    _ensure_conversation_member(conversation, other_user, role="member")
    db.session.commit()
    return conversation


def _build_conversation_sidebar_payload(user: User):
    memberships = (
        ConversationMember.query
        .filter_by(user_id=user.id)
        .join(Conversation, ConversationMember.conversation_id == Conversation.id)
        .all()
    )

    my_spaces: list[dict] = []
    direct_messages: list[dict] = []
    private_groups: list[dict] = []

    for membership in memberships:
        conversation = membership.conversation
        payload = _conversation_payload(conversation, user)
        if conversation.kind == "public_space":
            my_spaces.append(payload)
        elif conversation.kind == "direct_message":
            other_members = [member for member in payload.get("members", []) if member["user_id"] != str(user.id)]
            other_member_id = other_members[0]["user_id"] if other_members else None
            try:
                other_uuid = uuid.UUID(other_member_id) if other_member_id else None
            except (TypeError, ValueError):
                other_uuid = None
            if other_uuid and _is_connected(user.id, other_uuid):
                direct_messages.append(payload)
        elif conversation.kind == "private_group":
            private_groups.append(payload)

    my_spaces.sort(key=lambda item: item["name"].lower())
    direct_messages.sort(key=lambda item: item["name"].lower())
    private_groups.sort(key=lambda item: item["name"].lower())

    return {
        "my_spaces": my_spaces,
        "direct_messages": direct_messages,
        "private_groups": private_groups,
    }


def get_authenticated_user():
    ensure_database_schema()
    cleanup_legacy_hru_data()
    token = get_authorization_token()
    if not token:
        return None, json_error("Missing token", 401)

    payload = decode_token(token)
    if not payload:
        return None, json_error("Invalid token", 401)

    user = _get_user_from_payload(payload)
    if not user:
        return None, json_error("User not found", 404)

    created_profile = user.profile is None
    created_settings = user.settings is None
    ensure_user_profile(user)
    ensure_user_settings(user)
    if created_profile or created_settings:
        db.session.commit()
    return user, None


def build_profile_payload(user: User):
    profile = ensure_user_profile(user)
    return {
        "user_id": str(user.id),
        **profile.to_dict(),
    }


def build_settings_payload(user: User):
    settings = ensure_user_settings(user)
    profile = ensure_user_profile(user)
    return {
        "full_name": profile.full_name,
        "username": profile.username,
        **settings.to_dict(),
    }


def build_auth_user_payload(user: User):
    profile = ensure_user_profile(user)
    return {
        "id": str(user.id),
        "name": user.name,
        "username": profile.username,
    }


def load_market_snapshot(snapshot_key: str):
    snapshot = MarketSnapshot.query.filter_by(snapshot_key=snapshot_key).first()
    if not snapshot:
        return None
    try:
        payload = json.loads(snapshot.payload)
    except (TypeError, ValueError):
        return None
    return {
        "data": payload,
        "updated_at": snapshot.updated_at.timestamp() if snapshot.updated_at else None,
    }


def save_market_snapshot(snapshot_key: str, payload, updated_at: float):
    snapshot = MarketSnapshot.query.filter_by(snapshot_key=snapshot_key).first()
    if snapshot is None:
        snapshot = MarketSnapshot(snapshot_key=snapshot_key, payload="{}")
        db.session.add(snapshot)

    snapshot.payload = json.dumps(payload)
    snapshot.updated_at = datetime.fromtimestamp(updated_at, timezone.utc)
    db.session.commit()


def list_market_snapshot_keys():
    snapshots = MarketSnapshot.query.order_by(MarketSnapshot.snapshot_key.asc()).all()
    return [
        {
            "snapshot_key": snapshot.snapshot_key,
            "updated_at": snapshot.updated_at.isoformat() if snapshot.updated_at else None,
        }
        for snapshot in snapshots
    ]


def snapshot_has_available_overview(snapshot_key: str) -> bool:
    snapshot = load_market_snapshot(snapshot_key)
    if not snapshot:
        return False
    payload = snapshot.get("data") or {}
    indices = payload.get("indices") or []
    return any(isinstance(index, dict) and index.get("available") for index in indices)


def build_profile_stats_payload(user: User):
    profile = ensure_user_profile(user)
    watchlist_count = WatchlistItem.query.filter_by(user_id=user.id).count()
    messages_sent_count = ChatMessage.query.filter_by(user_id=user.id).count()
    tickers_shared_count = sum(len(message.ticker_list()) for message in ChatMessage.query.filter_by(user_id=user.id).all())
    active_rooms_count = db.session.query(ChatMessage.channel).filter_by(user_id=user.id).distinct().count()
    recent_participation_count = (
        UserActivity.query
        .filter(
            UserActivity.user_id == user.id,
            UserActivity.created_at >= datetime.now(timezone.utc) - timedelta(days=7),
        )
        .count()
    )
    profile_completion_fields = [
        bool(profile.full_name.strip()),
        bool(profile.username.strip()),
        bool(profile.bio.strip()),
        bool((profile.avatar_url or "").strip()),
    ]
    profile_completion_percent = int((sum(profile_completion_fields) / len(profile_completion_fields)) * 100)

    profile.messages_sent_count = messages_sent_count
    profile.tickers_shared_count = tickers_shared_count
    db.session.flush()
    return {
        "messages_sent_count": messages_sent_count,
        "tickers_shared_count": tickers_shared_count,
        "watchlist_items_count": watchlist_count,
        "active_rooms_count": active_rooms_count,
        "profile_completion_percent": profile_completion_percent,
        "recent_participation_count": recent_participation_count,
    }


def _build_discussion_signals(bucket: str, window_days: int = 7):
    supported_symbols = {
        symbol for symbol in get_supported_symbols(bucket)
        if bucket == "Global" or symbol.endswith(".L")
    }
    since = datetime.now(timezone.utc) - timedelta(days=window_days)
    signals: dict[str, dict[str, object]] = {}

    def get_entry(symbol: str):
        return signals.setdefault(
            symbol,
            {"mentions": 0, "watchlist_adds": 0, "users": set()},
        )

    recent_messages = (
        ChatMessage.query
        .filter(ChatMessage.created_at >= since)
        .order_by(ChatMessage.created_at.desc())
        .all()
    )
    for message in recent_messages:
        for symbol in message.ticker_list():
            if symbol not in supported_symbols:
                continue
            entry = get_entry(symbol)
            entry["mentions"] = int(entry["mentions"]) + 1
            entry["users"].add(str(message.user_id))

    recent_watchlist_events = (
        UserActivity.query
        .filter(
            UserActivity.created_at >= since,
            UserActivity.activity_type == "watchlist_added",
        )
        .all()
    )
    for activity in recent_watchlist_events:
        symbol = (activity.ticker or "").upper()
        if symbol not in supported_symbols:
            continue
        entry = get_entry(symbol)
        entry["watchlist_adds"] = int(entry["watchlist_adds"]) + 1
        entry["users"].add(str(activity.user_id))

    ranked_entries = sorted(
        signals.items(),
        key=lambda item: (
            -(
                len(item[1]["users"]) * 3
                + int(item[1]["mentions"])
                + int(item[1]["watchlist_adds"]) * 2
            ),
            -len(item[1]["users"]),
            -int(item[1]["watchlist_adds"]),
            -int(item[1]["mentions"]),
            item[0],
        ),
    )

    return [
        {
            "symbol": symbol,
            "unique_users": len(metrics["users"]),
            "mentions": int(metrics["mentions"]),
            "watchlist_adds": int(metrics["watchlist_adds"]),
        }
        for symbol, metrics in ranked_entries
    ], window_days


@app.errorhandler(HTTPException)
def handle_http_exception(exc: HTTPException):
    return json_error(exc.description or "Request failed", exc.code or 500)


@app.errorhandler(Exception)
def handle_unexpected_exception(exc: Exception):
    if isinstance(exc, SQLAlchemyError):
        db.session.rollback()
        app.logger.exception("Database error")
        return json_error("Database error", 500)

    app.logger.exception("Unhandled error")
    return json_error("Internal server error", 500)


@app.route("/", methods=["GET"])
def root():
    return jsonify({"status": "ok", "service": "TradeLink API"})


@app.route("/api/health", methods=["GET"])
def health():
    try:
        ensure_database_schema()
        cleanup_legacy_hru_data()
        db.session.execute(text("SELECT 1"))
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"status": "error", "database": "unreachable"}), 503

    return jsonify({"status": "ok", "database": "ok"})


@app.route("/api/stocks/quote/<symbol>", methods=["GET"])
def stock_quote(symbol):
    ensure_database_schema()
    cleanup_legacy_hru_data()
    normalized_symbol = (symbol or "").strip().upper()
    if not normalized_symbol:
        return json_error("symbol is required", 400)

    try:
        quote = fetch_quote(
            "",
            normalized_symbol,
            snapshot_loader=load_market_snapshot,
            snapshot_saver=save_market_snapshot,
        )
    except ValueError as exc:
        return json_error(str(exc), 400)
    except RateLimitError:
        return json_error(MARKET_DATA_UNAVAILABLE_MESSAGE, 429)
    except Exception:
        return json_error(MARKET_DATA_UNAVAILABLE_MESSAGE, 502)

    return jsonify(quote)


@app.route("/api/market/overview", methods=["GET"])
def market_overview():
    ensure_database_schema()
    cleanup_legacy_hru_data()
    try:
        payload = fetch_market_overview(
            "",
            snapshot_loader=load_market_snapshot,
            snapshot_saver=save_market_snapshot,
        )
    except RateLimitError:
        return json_error(MARKET_DATA_UNAVAILABLE_MESSAGE, 429)
    except Exception:
        return json_error(MARKET_DATA_UNAVAILABLE_MESSAGE, 502)

    return jsonify(payload)


@app.route("/api/earnings/upcoming", methods=["GET"])
def earnings_upcoming():
    ensure_database_schema()
    cleanup_legacy_hru_data()
    try:
        payload = fetch_upcoming_earnings(
            "",
            snapshot_loader=load_market_snapshot,
            snapshot_saver=save_market_snapshot,
        )
    except RateLimitError:
        return json_error(MARKET_DATA_UNAVAILABLE_MESSAGE, 429)
    except Exception:
        return json_error(MARKET_DATA_UNAVAILABLE_MESSAGE, 502)

    return jsonify(payload)


@app.route("/api/stocks/history/<symbol>", methods=["GET"])
def stock_history(symbol):
    ensure_database_schema()
    cleanup_legacy_hru_data()
    normalized_symbol = (symbol or "").strip().upper()
    if not normalized_symbol:
        return json_error("symbol is required", 400)

    try:
        history = fetch_history(
            "",
            normalized_symbol,
            snapshot_loader=load_market_snapshot,
            snapshot_saver=save_market_snapshot,
        )
    except ValueError as exc:
        return json_error(str(exc), 400)
    except RateLimitError:
        return json_error(MARKET_DATA_UNAVAILABLE_MESSAGE, 429)
    except Exception:
        return json_error(MARKET_DATA_UNAVAILABLE_MESSAGE, 502)

    return jsonify({
        "points": [{"time": point["time"], "price": point["price"]} for point in history["points"]],
        "marketDataStatus": history.get("marketDataStatus"),
    })


@app.route("/api/market/quotes", methods=["GET"])
def market_quotes():
    ensure_database_schema()
    cleanup_legacy_hru_data()
    tickers_param = (request.args.get("tickers") or "").strip()
    if not tickers_param:
        return json_error("tickers query parameter is required", 400)

    requested_tickers = [ticker.strip() for ticker in tickers_param.split(",") if ticker.strip()]
    if not requested_tickers:
        return json_error("No valid tickers provided", 400)

    try:
        quotes_payload = fetch_bulk_quotes(
            "",
            requested_tickers,
            snapshot_loader=load_market_snapshot,
            snapshot_saver=save_market_snapshot,
        )
        quotes = quotes_payload.get("quotes", {})
        if not quotes:
            return json_error("No supported tickers provided", 400)
    except RateLimitError:
        return json_error(MARKET_DATA_UNAVAILABLE_MESSAGE, 429)
    except Exception:
        return json_error(MARKET_DATA_UNAVAILABLE_MESSAGE, 502)

    return jsonify({
        "quotes": quotes,
        "marketDataStatus": quotes_payload.get("marketDataStatus"),
    })


@app.route("/api/market/top-movers", methods=["GET"])
def market_top_movers():
    ensure_database_schema()
    cleanup_legacy_hru_data()
    index = (request.args.get("index") or "FTSE100").strip()
    community_entries = None
    window_days = 7
    if index in {"FTSE100", "FTSE250", "Global"}:
        community_entries, window_days = _build_discussion_signals(index, window_days=7)

    try:
        payload = fetch_top_movers(
            "",
            index,
            community_entries=community_entries,
            window_days=window_days,
        )
    except ValueError as exc:
        return json_error(str(exc), 400)
    except RateLimitError:
        return json_error(MARKET_DATA_UNAVAILABLE_MESSAGE, 429)
    except Exception:
        return json_error(MARKET_DATA_UNAVAILABLE_MESSAGE, 502)

    return jsonify(payload)


@app.route("/api/market/debug", methods=["GET"])
def market_debug():
    ensure_database_schema()
    cleanup_legacy_hru_data()
    payload = get_market_debug_status()
    payload["market_ingest_mode"] = MARKET_INGEST_MODE
    payload["finnhub_manual_routes"] = [
        "POST /api/market/bootstrap",
        "POST /api/market/refresh",
    ]
    payload["persistent_snapshots"] = list_market_snapshot_keys()
    payload["overview_symbols"] = [
        {
            "name": item["name"],
            "source_symbol": item["source_symbol"],
            "source_type": item["source_type"],
            "source_label": item["source_label"],
        }
        for item in MARKET_OVERVIEW_INDICES
    ]
    payload["overview_snapshot_available"] = snapshot_has_available_overview("market_overview")
    payload["finnhub_env"] = get_finnhub_env_diagnostics()
    payload["supported_universe"] = get_supported_market_universe()
    payload["bootstrap_symbols"] = get_bootstrap_symbols()
    payload["primary_baseline_symbol"] = get_bootstrap_symbols()[0] if get_bootstrap_symbols() else None
    payload["stored_quote_snapshots"] = list_stored_quote_snapshot_symbols(snapshot_loader=load_market_snapshot)
    return jsonify(payload)


@app.route("/api/market/bootstrap", methods=["POST"])
def market_bootstrap():
    ensure_database_schema()
    cleanup_legacy_hru_data()
    api_key = get_finnhub_api_key()
    if not api_key:
        return json_error("FINNHUB_API_KEY is not set", 500)

    try:
        results = bootstrap_market_snapshots(
            api_key,
            snapshot_loader=load_market_snapshot,
            snapshot_saver=save_market_snapshot,
        )
    except Exception as exc:
        results = {
            "status": "failed",
            "rate_limited_mode": False,
            "symbols": [],
            "overview_seeded": False,
            "overview_result": {
                "status": "failed",
                "saved": False,
                "available": False,
                "error_class": exc.__class__.__name__,
                "message": str(exc) or "bootstrap route crashed",
            },
        }
    results["finnhub_env"] = get_finnhub_env_diagnostics()
    if results.get("status") == "failed" and not results.get("overview_seeded"):
        results["message"] = MARKET_DATA_UNAVAILABLE_MESSAGE
        return jsonify(results), 503

    results["message"] = "Stored market baseline refreshed where data was available."
    return jsonify(results)


@app.route("/api/market/refresh", methods=["POST"])
def market_refresh():
    ensure_database_schema()
    cleanup_legacy_hru_data()
    api_key = get_finnhub_api_key()
    if not api_key:
        return json_error("FINNHUB_API_KEY is not set", 500)

    try:
        results = refresh_market_snapshots(
            api_key,
            snapshot_loader=load_market_snapshot,
            snapshot_saver=save_market_snapshot,
        )
    except Exception as exc:
        results = {
            "status": "failed",
            "rate_limited_mode": False,
            "symbols": [],
            "overview_seeded": False,
            "overview_result": {
                "status": "failed",
                "saved": False,
                "available": False,
                "error_class": exc.__class__.__name__,
                "message": str(exc) or "refresh route crashed",
            },
        }
    results["finnhub_env"] = get_finnhub_env_diagnostics()
    if results.get("status") == "failed":
        results["message"] = MARKET_DATA_UNAVAILABLE_MESSAGE
        return jsonify(results), 503

    results["message"] = "Stored market snapshots refreshed where data was available."
    return jsonify(results)


@app.route("/api/auth/signup", methods=["POST"])
def signup():
    ensure_database_schema()
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip().lower()
    name = (data.get("name") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return json_error("Username and password are required", 400)

    if not re.fullmatch(r"[a-z0-9_]{3,24}", username):
        return json_error("Username must be 3-24 characters using lowercase letters, numbers, or underscores", 400)

    if len(password) < 6:
        return json_error("Password must be at least 6 characters", 400)

    existing_username = UserProfile.query.filter_by(username=username).first()
    if existing_username:
        return json_error("Username is already taken", 409)

    display_name = name or username

    user = User(
        name=display_name,
        email=_build_internal_email(username),
        password_hash=generate_password_hash(password),
    )
    db.session.add(user)
    db.session.flush()

    profile = UserProfile(
        user_id=user.id,
        full_name=display_name,
        username=username,
        bio="",
        avatar_seed=_initials_from_name(display_name),
        joined_at=user.created_at,
        verified_trader=False,
        trust_score=50,
        messages_sent_count=0,
        tickers_shared_count=0,
    )
    db.session.add(profile)
    ensure_user_settings(user)
    _create_activity(user.id, "account_created", "Created account")

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return json_error("Username is already taken", 409)

    token = create_token(str(user.id))
    return jsonify({"token": token, "user": build_auth_user_payload(user)}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    ensure_database_schema()
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip().lower()
    password = data.get("password") or ""

    if not username or not password:
        return json_error("Username and password are required", 400)

    profile = UserProfile.query.filter_by(username=username).first()
    user = profile.user if profile else None
    if not user or not check_password_hash(user.password_hash, password):
        return json_error("Invalid credentials", 401)

    ensure_user_profile(user)
    ensure_user_settings(user)
    db.session.commit()
    token = create_token(str(user.id))
    return jsonify({"token": token, "user": build_auth_user_payload(user)})


@app.route("/api/auth/me", methods=["GET"])
def me():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    return jsonify({"user": build_auth_user_payload(user)})


@app.route("/api/profile/me", methods=["GET", "PATCH", "PUT"])
def profile_me():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    profile = ensure_user_profile(user)

    if request.method == "GET":
        return jsonify({"profile": build_profile_payload(user)})

    data = request.get_json(silent=True) or {}
    full_name = (data.get("full_name") or "").strip()
    username = (data.get("username") or "").strip().lower()
    bio = (data.get("bio") or "").strip()
    avatar_url = (data.get("avatar_url") or "").strip() or None

    if not full_name:
        return json_error("Full name is required", 400)

    if not username:
        return json_error("Username is required", 400)

    if not re.fullmatch(r"[a-z0-9_]{3,24}", username):
        return json_error("Username must be 3-24 characters using lowercase letters, numbers, or underscores", 400)

    existing_username = UserProfile.query.filter_by(username=username).first()
    if existing_username and existing_username.user_id != user.id:
        return json_error("Username is already taken", 409)

    profile.full_name = full_name
    profile.username = username
    profile.bio = bio[:280]
    profile.avatar_url = avatar_url
    profile.avatar_seed = _initials_from_name(full_name)
    user.name = full_name

    _create_activity(user.id, "profile_updated", "Updated profile")
    db.session.commit()

    return jsonify({"profile": build_profile_payload(user)})


@app.route("/api/profile/e2ee-key", methods=["PUT"])
def profile_e2ee_key():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}
    public_key = data.get("public_key")
    algorithm = (data.get("algorithm") or "RSA-OAEP").strip().upper() or "RSA-OAEP"

    if not isinstance(public_key, dict):
        return json_error("A valid public key is required", 400)

    profile = ensure_user_profile(user)
    profile.e2ee_public_key = json.dumps(public_key)
    profile.e2ee_key_algorithm = algorithm[:32]
    profile.e2ee_key_updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({"profile": build_profile_payload(user)})


@app.route("/api/profile/stats", methods=["GET"])
def profile_stats():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    return jsonify({"stats": build_profile_stats_payload(user)})


@app.route("/api/profile/activity", methods=["GET"])
def profile_activity():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    try:
        requested_limit = int(request.args.get("limit", 10))
    except (TypeError, ValueError):
        requested_limit = 10

    limit = min(max(requested_limit, 1), 25)
    activities = (
        UserActivity.query
        .filter_by(user_id=user.id)
        .order_by(UserActivity.created_at.desc())
        .limit(limit)
        .all()
    )

    return jsonify({"activities": [activity.to_dict() for activity in activities]})


@app.route("/api/notifications", methods=["GET"])
def notifications():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    _refresh_watchlist_alert_notifications(user)
    db.session.commit()

    try:
        requested_limit = int(request.args.get("limit", 50))
    except (TypeError, ValueError):
        requested_limit = 50

    limit = min(max(requested_limit, 1), 100)
    requested_type = (request.args.get("type") or "all").strip().lower()
    type_map = {
        "mentions": "mention",
        "watchlist_alerts": "watchlist_alert",
        "connections": "connection_request",
    }

    notifications_query = Notification.query.filter_by(user_id=user.id)
    if requested_type in type_map:
        notifications_query = notifications_query.filter_by(notification_type=type_map[requested_type])

    notifications = (
        notifications_query
        .order_by(Notification.created_at.desc())
        .all()
    )
    notifications = [
        item for item in notifications
        if item.notification_type != "connection_request" or item.payload_dict().get("status") == "pending"
    ]
    notifications = notifications[:limit]

    unread_count = Notification.query.filter_by(user_id=user.id, is_read=False).count()
    mention_count = Notification.query.filter_by(user_id=user.id, notification_type="mention").count()
    watchlist_alert_count = Notification.query.filter_by(user_id=user.id, notification_type="watchlist_alert").count()
    connection_count = (
        ConnectionRequest.query
        .filter_by(recipient_id=user.id, status="pending")
        .count()
    )

    return jsonify(
        {
            "notifications": [notification.to_dict() for notification in notifications],
            "unread_count": unread_count,
            "counts": {
                "mentions": mention_count,
                "watchlist_alerts": watchlist_alert_count,
                "connections": connection_count,
            },
        }
    )


@app.route("/api/notifications/read", methods=["POST"])
def mark_notifications_read():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}
    ids = data.get("ids") or []
    mark_all = bool(data.get("mark_all"))

    unread_query = Notification.query.filter_by(user_id=user.id, is_read=False)
    notifications_to_update = []

    if mark_all:
        notifications_to_update = unread_query.all()
    else:
        valid_ids = []
        for raw_id in ids:
            try:
                valid_ids.append(uuid.UUID(str(raw_id)))
            except (TypeError, ValueError):
                continue

        if valid_ids:
            notifications_to_update = unread_query.filter(Notification.id.in_(valid_ids)).all()

    for notification in notifications_to_update:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)

    if notifications_to_update:
        db.session.commit()

    unread_count = Notification.query.filter_by(user_id=user.id, is_read=False).count()
    return jsonify({"unread_count": unread_count})


@app.route("/api/settings/me", methods=["GET", "PATCH"])
def settings_me():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    settings = ensure_user_settings(user)

    if request.method == "GET":
        return jsonify({"settings": build_settings_payload(user)})

    data = request.get_json(silent=True) or {}
    profile_visibility = (data.get("profile_visibility") or settings.profile_visibility).strip().lower()

    if profile_visibility not in {"public", "members", "private"}:
        return json_error("Invalid profile visibility setting", 400)

    settings.email_notifications = bool(data.get("email_notifications", settings.email_notifications))
    settings.push_notifications = bool(data.get("push_notifications", settings.push_notifications))
    settings.message_notifications = bool(data.get("message_notifications", settings.message_notifications))
    settings.profile_visibility = profile_visibility
    settings.dark_mode = bool(data.get("dark_mode", settings.dark_mode))

    _create_activity(user.id, "settings_updated", "Updated account settings")
    db.session.commit()

    return jsonify({"settings": build_settings_payload(user)})


@app.route("/api/account/export", methods=["GET"])
def export_account_data():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    memberships = (
        ConversationMember.query
        .filter_by(user_id=user.id)
        .join(Conversation, Conversation.id == ConversationMember.conversation_id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    messages = (
        ChatMessage.query
        .filter_by(user_id=user.id)
        .order_by(ChatMessage.created_at.desc())
        .all()
    )
    watchlist_items = (
        WatchlistItem.query
        .filter_by(user_id=user.id)
        .order_by(WatchlistItem.created_at.desc())
        .all()
    )
    notifications = (
        Notification.query
        .filter_by(user_id=user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    connection_requests = (
        ConnectionRequest.query
        .filter(or_(ConnectionRequest.requester_id == user.id, ConnectionRequest.recipient_id == user.id))
        .order_by(ConnectionRequest.created_at.desc())
        .all()
    )
    activities = (
        UserActivity.query
        .filter_by(user_id=user.id)
        .order_by(UserActivity.created_at.desc())
        .all()
    )

    return jsonify(
        {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "account": user.to_dict(),
            "profile": build_profile_payload(user),
            "settings": build_settings_payload(user),
            "stats": build_profile_stats_payload(user),
            "watchlist": [item.to_dict() for item in watchlist_items],
            "notifications": [notification.to_dict() for notification in notifications],
            "connection_requests": [connection_request.to_dict() for connection_request in connection_requests],
            "activities": [activity.to_dict() for activity in activities],
            "messages": [message.to_dict() for message in messages],
            "conversations": [
                {
                    "conversation_key": membership.conversation.conversation_key,
                    "name": membership.conversation.name,
                    "kind": membership.conversation.kind,
                    "visibility": membership.conversation.visibility,
                    "role": membership.role,
                    "joined_at": membership.created_at.isoformat() if membership.created_at else None,
                    "channels": [
                        {
                            "channel_key": channel.channel_key,
                            "name": channel.name,
                            "slug": channel.slug,
                        }
                        for channel in membership.conversation.channels
                    ],
                }
                for membership in memberships
            ],
        }
    )


@app.route("/api/account", methods=["DELETE"])
def delete_account():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    token = get_authorization_token()
    payload = decode_token(token) if token else None
    jti = payload.get("jti") if isinstance(payload, dict) else None

    db.session.delete(user)
    if jti:
        db.session.add(RevokedToken(jti=jti))
    db.session.commit()

    return jsonify({"message": "Account deleted"})


@app.route("/api/users/search", methods=["GET"])
def user_search():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    query = (request.args.get("q") or "").strip().lower()
    if len(query) < 2:
        return jsonify({"users": []})

    profiles = (
        UserProfile.query
        .filter(
            UserProfile.user_id != user.id,
            (UserProfile.username.ilike(f"{query}%")) | (UserProfile.full_name.ilike(f"%{query}%")),
        )
        .order_by(UserProfile.username.asc())
        .limit(8)
        .all()
    )

    return jsonify({
        "users": [
            (
                {
                    "user_id": str(profile.user_id),
                    "username": profile.username,
                    "display_name": profile.full_name,
                }
                | _connection_status_payload(user, profile.user)
            )
            for profile in profiles
        ]
    })


@app.route("/api/connections/requests", methods=["POST"])
def create_connection_request():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip().lower()
    if not username:
        return json_error("Username is required", 400)

    profile = UserProfile.query.filter_by(username=username).first()
    target_user = profile.user if profile else None
    if target_user is None:
        return json_error("User not found", 404)
    if target_user.id == user.id:
        return json_error("You cannot connect with yourself", 400)

    connection_status, existing_request = _connection_status(user.id, target_user.id)
    if connection_status == "connected":
        return json_error("You are already connected", 400)
    if connection_status == "outgoing_pending":
        return jsonify({"request": existing_request.to_dict()}), 200
    if connection_status == "incoming_pending":
        return json_error("This user has already sent you a connection request", 409)

    request_record = ConnectionRequest.query.filter_by(requester_id=user.id, recipient_id=target_user.id).first()
    if request_record is None:
        request_record = ConnectionRequest(
            requester_id=user.id,
            recipient_id=target_user.id,
            status="pending",
        )
        db.session.add(request_record)
        db.session.flush()
    else:
        request_record.status = "pending"
        request_record.responded_at = None
        request_record.created_at = datetime.now(timezone.utc)

    _update_connection_request_notification(request_record, mark_read=False)
    _create_activity(user.id, "connection_requested", f"Sent a connection request to {profile.full_name}")
    db.session.commit()

    return jsonify({"request": request_record.to_dict()}), 201


@app.route("/api/connections/requests/<request_id>/accept", methods=["POST"])
def accept_connection_request(request_id):
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    try:
        request_uuid = uuid.UUID(str(request_id))
    except (TypeError, ValueError):
        return json_error("Invalid connection request id", 400)

    request_record = ConnectionRequest.query.filter_by(id=request_uuid).first()
    if request_record is None:
        return json_error("Connection request not found", 404)
    if request_record.recipient_id != user.id:
        return json_error("You cannot accept this connection request", 403)
    if request_record.status != "pending":
        return json_error("This connection request has already been handled", 400)

    request_record.status = "accepted"
    request_record.responded_at = datetime.now(timezone.utc)
    _update_connection_request_notification(request_record, mark_read=True)
    _create_activity(user.id, "connection_accepted", f"Accepted a connection request from {request_record.requester.profile.full_name}")
    conversation = _get_or_create_dm(user, request_record.requester)
    db.session.commit()

    return jsonify(
        {
            "request": request_record.to_dict(),
            "conversation": _conversation_payload(conversation, user),
        }
    )


@app.route("/api/connections/requests/<request_id>/decline", methods=["POST"])
def decline_connection_request(request_id):
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    try:
        request_uuid = uuid.UUID(str(request_id))
    except (TypeError, ValueError):
        return json_error("Invalid connection request id", 400)

    request_record = ConnectionRequest.query.filter_by(id=request_uuid).first()
    if request_record is None:
        return json_error("Connection request not found", 404)
    if request_record.recipient_id != user.id:
        return json_error("You cannot decline this connection request", 403)
    if request_record.status != "pending":
        return json_error("This connection request has already been handled", 400)

    request_record.status = "declined"
    request_record.responded_at = datetime.now(timezone.utc)
    _update_connection_request_notification(request_record, mark_read=True)
    _create_activity(user.id, "connection_declined", f"Declined a connection request from {request_record.requester.profile.full_name}")
    db.session.commit()

    return jsonify({"request": request_record.to_dict()})


@app.route("/api/dms/overview", methods=["GET"])
def dm_overview():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    memberships = (
        ConversationMember.query
        .filter_by(user_id=user.id)
        .join(Conversation, ConversationMember.conversation_id == Conversation.id)
        .filter(Conversation.kind == "direct_message")
        .all()
    )

    inbox = []
    requests = []
    request_user_ids = set()

    for membership in memberships:
        conversation = membership.conversation
        other_membership = next((item for item in conversation.members if item.user_id != user.id), None)
        if other_membership is None or other_membership.user is None:
            continue

        item = _build_dm_list_item(user, other_membership.user, conversation)
        if item["connection_status"] == "connected":
            inbox.append(item)
        else:
            item["request_kind"] = "message_request"
            requests.append(item)
            request_user_ids.add(item["user_id"])

    incoming_requests = (
        ConnectionRequest.query
        .filter_by(recipient_id=user.id, status="pending")
        .order_by(ConnectionRequest.created_at.desc())
        .all()
    )
    for request_record in incoming_requests:
        requester = request_record.requester
        if requester is None or str(requester.id) in request_user_ids:
            continue
        requests.append(
            _build_dm_list_item(
                user,
                requester,
                None,
                request_kind="connection_request",
            )
        )

    inbox.sort(key=lambda item: item["timestamp"] or "", reverse=True)
    requests.sort(key=lambda item: item["timestamp"] or "", reverse=True)

    return jsonify({"inbox": inbox, "requests": requests})


@app.route("/api/messaging/sidebar", methods=["GET"])
def messaging_sidebar():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    return jsonify(_build_conversation_sidebar_payload(user))


@app.route("/api/spaces", methods=["GET"])
def spaces():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    public_spaces = (
        Conversation.query
        .filter_by(kind="public_space")
        .order_by(Conversation.name.asc())
        .all()
    )
    return jsonify({"spaces": [_conversation_payload(space, user) for space in public_spaces]})


@app.route("/api/spaces", methods=["POST"])
def create_space():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()
    visibility = (data.get("visibility") or "public").strip().lower()

    if not name:
        return json_error("Space name is required", 400)
    if visibility not in {"public", "private"}:
        return json_error("Visibility must be public or private", 400)

    base_key = _conversation_key("space", name)
    conversation_key = base_key
    suffix = 1
    while Conversation.query.filter_by(conversation_key=conversation_key).first():
        suffix += 1
        conversation_key = f"{base_key[:24]}{suffix}"[:32]

    conversation = Conversation(
        conversation_key=conversation_key,
        kind="public_space",
        name=name[:255],
        description=description or "Community space",
        visibility=visibility,
        owner_id=user.id,
    )
    db.session.add(conversation)
    db.session.flush()

    for position, channel_name in enumerate(["General", "Trading", "Earnings"]):
        _create_conversation_channel(conversation, channel_name, position)

    _ensure_conversation_member(conversation, user, role="owner")
    _create_activity(user.id, "space_created", f"Created space {conversation.name}")
    db.session.commit()
    return jsonify({"conversation": _conversation_payload(conversation, user)}), 201


@app.route("/api/spaces/<conversation_key>/join", methods=["POST"])
def join_space(conversation_key):
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    conversation = Conversation.query.filter_by(conversation_key=conversation_key, kind="public_space").first()
    if conversation is None:
        return json_error("Space not found", 404)

    _ensure_conversation_member(conversation, user)
    _create_activity(user.id, "space_joined", f"Joined {conversation.name}")
    db.session.commit()
    return jsonify({"conversation": _conversation_payload(conversation, user)})


@app.route("/api/dms", methods=["POST"])
def create_dm():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip().lower()
    if not username:
        return json_error("Username is required", 400)

    profile = UserProfile.query.filter_by(username=username).first()
    target_user = profile.user if profile else None
    if target_user is None:
        return json_error("User not found", 404)
    if target_user.id == user.id:
        return json_error("You cannot start a direct message with yourself", 400)

    connection_status, _ = _connection_status(user.id, target_user.id)
    if connection_status != "connected":
        return json_error("Send or accept a connection request before starting a direct message", 403)

    conversation = _get_or_create_dm(user, target_user)
    return jsonify({"conversation": _conversation_payload(conversation, user)}), 201


@app.route("/api/groups", methods=["POST"])
def create_group():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    usernames = data.get("usernames") or []

    if not name:
        return json_error("Group name is required", 400)

    normalized_usernames = []
    for username in usernames:
        normalized = (username or "").strip().lower()
        if normalized and normalized not in normalized_usernames:
            normalized_usernames.append(normalized)

    profiles = UserProfile.query.filter(UserProfile.username.in_(normalized_usernames)).all() if normalized_usernames else []
    profile_map = {profile.username: profile.user for profile in profiles}
    missing = [username for username in normalized_usernames if username not in profile_map]
    if missing:
        return json_error(f"Users not found: {', '.join(missing)}", 404)

    conversation = Conversation(
        conversation_key=f"grp_{uuid.uuid4().hex[:12]}",
        kind="private_group",
        name=name[:255],
        description="Invite-only group",
        visibility="private",
        owner_id=user.id,
    )
    db.session.add(conversation)
    db.session.flush()
    _create_conversation_channel(conversation, "General", 0)
    _ensure_conversation_member(conversation, user, role="owner")
    for invited_user in profile_map.values():
        if invited_user.id == user.id:
            continue
        _ensure_conversation_member(conversation, invited_user, role="member")

    _create_activity(user.id, "group_created", f"Created private group {name}")
    db.session.commit()
    return jsonify({"conversation": _conversation_payload(conversation, user)}), 201


@app.route("/api/conversations/<conversation_key>", methods=["GET"])
def conversation_detail(conversation_key):
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    conversation = Conversation.query.filter_by(conversation_key=conversation_key).first()
    if conversation is None:
        return json_error("Conversation not found", 404)

    if conversation.kind != "public_space" and not _member_exists(conversation.id, user.id):
        return json_error("You do not have access to this conversation", 403)

    return jsonify({"conversation": _conversation_payload(conversation, user)})


@app.route("/api/conversations/<channel_key>/messages", methods=["GET", "POST"])
def conversation_messages(channel_key):
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    conversation, channel, access_error = _channel_access(channel_key, user)
    if access_error:
        return access_error

    if request.method == "GET":
        try:
            requested_limit = int(request.args.get("limit", 50))
        except (TypeError, ValueError):
            requested_limit = 50

        limit = min(max(requested_limit, 1), 100)
        messages_query = (
            ChatMessage.query
            .filter_by(channel=channel.channel_key)
            .order_by(ChatMessage.created_at.asc())
            .limit(limit)
            .all()
        )
        return jsonify({"messages": [message.to_dict() for message in messages_query]})

    data = request.get_json(silent=True) or {}
    is_encrypted_conversation = conversation.kind in {"direct_message", "private_group"}
    tickers = []

    if is_encrypted_conversation:
        encrypted_payload = _normalize_encrypted_payload(data.get("encrypted_payload"))
        if encrypted_payload is None:
            return json_error("Encrypted payload is required for end-to-end encrypted conversations", 400)
        content = json.dumps(encrypted_payload)
        message_format = "encrypted"
    else:
        content = (data.get("content") or "").strip()
        if not content:
            return json_error("Message content is required", 400)
        tickers = _extract_tickers(content)
        message_format = "plaintext"

    message = ChatMessage(
        user_id=user.id,
        channel=channel.channel_key,
        content=content,
        message_format=message_format,
        ticker_symbols=",".join(tickers),
    )
    db.session.add(message)
    db.session.flush()

    profile = ensure_user_profile(user)
    profile.messages_sent_count += 1
    profile.tickers_shared_count += len(tickers)
    if conversation.kind == "public_space":
        _create_mention_notifications(user, conversation, channel, message)

    activity_type = "message_sent"
    activity_description = (
        f"Sent an encrypted message in {conversation.name}"
        if is_encrypted_conversation
        else f"Sent a message in {conversation.name}"
    )
    activity_ticker = tickers[0] if tickers else None
    if tickers:
        activity_type = "ticker_shared"
        activity_description = f"Shared {', '.join(tickers)} in {conversation.name}"

    _create_activity(user.id, activity_type, activity_description, ticker=activity_ticker)
    db.session.commit()
    return jsonify({"message": message.to_dict()}), 201


@app.route("/api/messages", methods=["GET", "POST"])
def messages():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    valid_channels = {"market", "private", "earnings"}

    if request.method == "GET":
        channel = (request.args.get("channel") or "").strip().lower()
        if channel not in valid_channels:
            return json_error("Invalid message channel", 400)

        try:
            requested_limit = int(request.args.get("limit", 50))
        except (TypeError, ValueError):
            requested_limit = 50

        limit = min(max(requested_limit, 1), 100)
        messages_query = (
            ChatMessage.query
            .filter_by(channel=channel)
            .order_by(ChatMessage.created_at.asc())
            .limit(limit)
            .all()
        )
        return jsonify({"messages": [message.to_dict() for message in messages_query]})

    data = request.get_json(silent=True) or {}
    channel = (data.get("channel") or "").strip().lower()
    content = (data.get("content") or "").strip()

    if channel not in valid_channels:
        return json_error("Invalid message channel", 400)

    if not content:
        return json_error("Message content is required", 400)

    tickers = _extract_tickers(content)
    message = ChatMessage(
        user_id=user.id,
        channel=channel,
        content=content,
        ticker_symbols=",".join(tickers),
    )
    db.session.add(message)
    db.session.flush()

    profile = ensure_user_profile(user)
    profile.messages_sent_count += 1
    profile.tickers_shared_count += len(tickers)

    activity_description = f"Sent a message in {channel} chat"
    activity_type = "message_sent"
    activity_ticker = tickers[0] if tickers else None

    if tickers:
        activity_description = f"Shared {', '.join(tickers)} in {channel} chat"
        activity_type = "ticker_shared"

    _create_activity(user.id, activity_type, activity_description, ticker=activity_ticker)
    db.session.commit()

    return jsonify({"message": message.to_dict()}), 201


@app.route("/api/watchlist", methods=["GET", "POST"])
def watchlist():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    if request.method == "GET":
        items = (
            WatchlistItem.query
            .filter_by(user_id=user.id)
            .order_by(WatchlistItem.created_at.desc())
            .all()
        )
        return jsonify({"items": [item.to_dict() for item in items]})

    data = request.get_json(silent=True) or {}
    ticker = (data.get("ticker") or "").strip().upper()
    company_name = (data.get("company_name") or "").strip() or None

    if not ticker:
        return json_error("Ticker is required", 400)

    if not is_supported_symbol(ticker):
        return json_error("Ticker is not supported in TradeLink yet", 400)

    existing_item = WatchlistItem.query.filter_by(user_id=user.id, ticker=ticker).first()
    if existing_item:
        return json_error("Ticker is already in your watchlist", 409)

    resolved_company_name = company_name or get_supported_symbol_name(ticker)
    item = WatchlistItem(user_id=user.id, ticker=ticker, company_name=resolved_company_name)
    db.session.add(item)
    _create_activity(
        user.id,
        "watchlist_added",
        f"Added {ticker} to watchlist",
        ticker=ticker,
    )
    db.session.commit()

    return jsonify({"item": item.to_dict()}), 201


@app.route("/api/watchlist/<ticker>", methods=["DELETE"])
def delete_watchlist_item(ticker):
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    normalized_ticker = (ticker or "").strip().upper()
    item = WatchlistItem.query.filter_by(user_id=user.id, ticker=normalized_ticker).first()
    if not item:
        return json_error("Watchlist item not found", 404)

    db.session.delete(item)
    _create_activity(
        user.id,
        "watchlist_removed",
        f"Removed {normalized_ticker} from watchlist",
        ticker=normalized_ticker,
    )
    db.session.commit()

    return jsonify({"message": "Watchlist item removed"})


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    ensure_database_schema()
    token = get_authorization_token()
    if not token:
        return jsonify({"message": "Logged out"})

    payload = decode_token(token)
    if payload:
        revoked_token = RevokedToken(jti=payload["jti"])
        db.session.add(revoked_token)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()

    return jsonify({"message": "Logged out"})


@app.route("/api/auth/password", methods=["PATCH"])
def change_password():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""
    confirm_password = data.get("confirm_password") or ""

    if not current_password or not new_password or not confirm_password:
        return json_error("All password fields are required", 400)

    if not check_password_hash(user.password_hash, current_password):
        return json_error("Current password is incorrect", 401)

    if len(new_password) < 6:
        return json_error("New password must be at least 6 characters", 400)

    if new_password != confirm_password:
        return json_error("New password confirmation does not match", 400)

    if current_password == new_password:
        return json_error("New password must be different from current password", 400)

    user.password_hash = generate_password_hash(new_password)
    _create_activity(user.id, "password_updated", "Updated password")
    db.session.commit()

    return jsonify({"message": "Password updated"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
