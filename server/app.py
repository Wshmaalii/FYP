from datetime import datetime, timedelta, timezone
import os
import re
import uuid
from urllib import parse

import jwt
from flask import Flask, jsonify, request
from flask_cors import CORS
try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(*args, **kwargs):
        return False
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash, generate_password_hash

try:
    from .extensions import db, migrate
    from .market_service import (
        RateLimitError,
        fetch_bulk_quotes,
        fetch_history,
        fetch_market_overview,
        fetch_quote,
        fetch_top_movers,
        fetch_upcoming_earnings,
        get_alpha_vantage_api_key,
    )
    from .models import ChatMessage, RevokedToken, User, UserActivity, UserProfile, UserSettings, WatchlistItem
except ImportError:
    from extensions import db, migrate
    from market_service import (
        RateLimitError,
        fetch_bulk_quotes,
        fetch_history,
        fetch_market_overview,
        fetch_quote,
        fetch_top_movers,
        fetch_upcoming_earnings,
        get_alpha_vantage_api_key,
    )
    from models import ChatMessage, RevokedToken, User, UserActivity, UserProfile, UserSettings, WatchlistItem

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv(os.path.join(os.path.dirname(BASE_DIR), ".env"))

app = Flask(__name__)
schema_initialized = False


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
    schema_initialized = True


def _username_seed(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9_]", "", value.lower().replace(" ", "_"))
    normalized = normalized.strip("_")
    return normalized[:24] or f"user{uuid.uuid4().hex[:6]}"


def _initials_from_name(name: str) -> str:
    parts = [part for part in (name or "").split() if part]
    if not parts:
        return "TL"
    return "".join(part[0] for part in parts[:2]).upper()


def _extract_tickers(content: str):
    tickers = []
    for match in re.finditer(r"(?<!\w)[$#]([A-Za-z]{1,5}(?:\.[A-Za-z]{1,3})?)\b", content or ""):
        symbol = match.group(1).upper()
        if symbol not in tickers:
            tickers.append(symbol)
    return tickers[:5]


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


def ensure_user_profile(user: User) -> UserProfile:
    profile = user.profile
    if profile:
        return profile

    profile = UserProfile(
        user_id=user.id,
        full_name=user.name,
        username=_generate_unique_username(user.email.split("@")[0] or user.name),
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


def get_authenticated_user():
    ensure_database_schema()
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
        "email": user.email,
        **profile.to_dict(),
    }


def build_settings_payload(user: User):
    settings = ensure_user_settings(user)
    profile = ensure_user_profile(user)
    return {
        "email": user.email,
        "full_name": profile.full_name,
        "username": profile.username,
        **settings.to_dict(),
    }


def build_profile_stats_payload(user: User):
    profile = ensure_user_profile(user)
    watchlist_count = WatchlistItem.query.filter_by(user_id=user.id).count()
    messages_sent_count = ChatMessage.query.filter_by(user_id=user.id).count()
    tickers_shared_count = sum(len(message.ticker_list()) for message in ChatMessage.query.filter_by(user_id=user.id).all())

    profile.messages_sent_count = messages_sent_count
    profile.tickers_shared_count = tickers_shared_count
    db.session.flush()
    return {
        "messages_sent_count": messages_sent_count,
        "tickers_shared_count": tickers_shared_count,
        "watchlist_items_count": watchlist_count,
        "trust_score": profile.trust_score,
    }


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
        db.session.execute(text("SELECT 1"))
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"status": "error", "database": "unreachable"}), 503

    return jsonify({"status": "ok", "database": "ok"})


@app.route("/api/stocks/quote/<symbol>", methods=["GET"])
def stock_quote(symbol):
    api_key = get_alpha_vantage_api_key()
    if not api_key:
        return json_error("ALPHA_VANTAGE_API_KEY is not set", 500)

    normalized_symbol = (symbol or "").strip().upper()
    if not normalized_symbol:
        return json_error("symbol is required", 400)

    try:
        quote = fetch_quote(api_key, normalized_symbol)
    except RateLimitError:
        return json_error("rate limit exceeded", 429)
    except Exception as exc:
        return json_error(str(exc), 502)

    return jsonify(quote)


@app.route("/api/market/overview", methods=["GET"])
def market_overview():
    api_key = get_alpha_vantage_api_key()
    if not api_key:
        return json_error("ALPHA_VANTAGE_API_KEY is not set", 500)

    try:
        payload = fetch_market_overview(api_key)
    except RateLimitError:
        return json_error("rate limit exceeded", 429)
    except Exception as exc:
        return json_error(str(exc), 502)

    return jsonify(payload)


@app.route("/api/earnings/upcoming", methods=["GET"])
def earnings_upcoming():
    api_key = get_alpha_vantage_api_key()
    if not api_key:
        return json_error("ALPHA_VANTAGE_API_KEY is not set", 500)

    try:
        payload = fetch_upcoming_earnings(api_key)
    except RateLimitError:
        return json_error("rate limit exceeded", 429)
    except Exception as exc:
        return json_error(str(exc), 502)

    return jsonify(payload)


@app.route("/api/stocks/history/<symbol>", methods=["GET"])
def stock_history(symbol):
    api_key = get_alpha_vantage_api_key()
    if not api_key:
        return json_error("ALPHA_VANTAGE_API_KEY is not set", 500)

    normalized_symbol = (symbol or "").strip().upper()
    if not normalized_symbol:
        return json_error("symbol is required", 400)

    try:
        history = fetch_history(api_key, normalized_symbol)
    except RateLimitError:
        return json_error("rate limit exceeded", 429)
    except Exception as exc:
        return json_error(str(exc), 502)

    return jsonify([{"time": point["time"], "price": point["price"]} for point in history])


@app.route("/api/market/quotes", methods=["GET"])
def market_quotes():
    api_key = get_alpha_vantage_api_key()
    if not api_key:
        return json_error("ALPHA_VANTAGE_API_KEY is not set", 500)

    tickers_param = (request.args.get("tickers") or "").strip()
    if not tickers_param:
        return json_error("tickers query parameter is required", 400)

    requested_tickers = [ticker.strip() for ticker in tickers_param.split(",") if ticker.strip()]
    if not requested_tickers:
        return json_error("No valid tickers provided", 400)

    try:
        quotes = fetch_bulk_quotes(api_key, requested_tickers)
    except RateLimitError:
        return json_error("rate limit exceeded", 429)
    except Exception as exc:
        return json_error(str(exc), 502)

    return jsonify({"quotes": quotes})


@app.route("/api/market/top-movers", methods=["GET"])
def market_top_movers():
    api_key = get_alpha_vantage_api_key()
    if not api_key:
        return json_error("ALPHA_VANTAGE_API_KEY is not set", 500)

    index = (request.args.get("index") or "FTSE100").strip()

    try:
        payload = fetch_top_movers(api_key, index)
    except ValueError as exc:
        return json_error(str(exc), 400)
    except RateLimitError:
        return json_error("rate limit exceeded", 429)
    except Exception as exc:
        return json_error(str(exc), 502)

    return jsonify(payload)


@app.route("/api/auth/signup", methods=["POST"])
def signup():
    ensure_database_schema()
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return json_error("Name, email, and password are required", 400)

    if len(password) < 6:
        return json_error("Password must be at least 6 characters", 400)

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return json_error("Email is already registered", 409)

    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
    )
    db.session.add(user)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return json_error("Email is already registered", 409)

    ensure_user_profile(user)
    _create_activity(user.id, "account_created", "Created account")
    db.session.commit()

    token = create_token(str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    ensure_database_schema()
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return json_error("Email and password are required", 400)

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return json_error("Invalid credentials", 401)

    ensure_user_profile(user)
    ensure_user_settings(user)
    db.session.commit()
    token = create_token(str(user.id))
    return jsonify({"token": token, "user": user.to_dict()})


@app.route("/api/auth/me", methods=["GET"])
def me():
    user, error_response = get_authenticated_user()
    if error_response:
        return error_response

    return jsonify({"user": user.to_dict()})


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

    existing_item = WatchlistItem.query.filter_by(user_id=user.id, ticker=ticker).first()
    if existing_item:
        return json_error("Ticker is already in your watchlist", 409)

    item = WatchlistItem(user_id=user.id, ticker=ticker, company_name=company_name)
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
