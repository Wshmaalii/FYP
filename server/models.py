import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

try:
    from .extensions import db
except ImportError:
    from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(String(255), nullable=False)
    email = db.Column(String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(String(255), nullable=False)
    created_at = db.Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    profile = db.relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    settings = db.relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    messages = db.relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")
    watchlist_items = db.relationship("WatchlistItem", back_populates="user", cascade="all, delete-orphan")
    activities = db.relationship("UserActivity", back_populates="user", cascade="all, delete-orphan")
    owned_conversations = db.relationship("Conversation", back_populates="owner", cascade="all, delete-orphan")
    conversation_memberships = db.relationship("ConversationMember", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "email": self.email,
        }


class RevokedToken(db.Model):
    __tablename__ = "revoked_tokens"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jti = db.Column(String(255), unique=True, nullable=False, index=True)
    created_at = db.Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class UserProfile(db.Model):
    __tablename__ = "user_profiles"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False, index=True)
    full_name = db.Column(String(255), nullable=False)
    username = db.Column(String(64), unique=True, nullable=False, index=True)
    bio = db.Column(Text, nullable=False, default="")
    avatar_url = db.Column(Text, nullable=True)
    avatar_seed = db.Column(String(64), nullable=False, default="TL")
    joined_at = db.Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    verified_trader = db.Column(Boolean, nullable=False, default=False)
    trust_score = db.Column(Integer, nullable=False, default=50)
    messages_sent_count = db.Column(Integer, nullable=False, default=0)
    tickers_shared_count = db.Column(Integer, nullable=False, default=0)
    created_at = db.Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = db.Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    user = db.relationship("User", back_populates="profile")

    def to_dict(self):
        return {
            "full_name": self.full_name,
            "username": self.username,
            "bio": self.bio,
            "avatar_url": self.avatar_url,
            "avatar_seed": self.avatar_seed,
            "joined_at": self.joined_at.isoformat() if self.joined_at else None,
            "verified_trader": self.verified_trader,
        }


class UserSettings(db.Model):
    __tablename__ = "user_settings"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False, index=True)
    email_notifications = db.Column(Boolean, nullable=False, default=True)
    push_notifications = db.Column(Boolean, nullable=False, default=True)
    message_notifications = db.Column(Boolean, nullable=False, default=True)
    profile_visibility = db.Column(String(32), nullable=False, default="public")
    dark_mode = db.Column(Boolean, nullable=False, default=True)
    created_at = db.Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = db.Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    user = db.relationship("User", back_populates="settings")

    def to_dict(self):
        return {
            "email_notifications": self.email_notifications,
            "push_notifications": self.push_notifications,
            "message_notifications": self.message_notifications,
            "profile_visibility": self.profile_visibility,
            "dark_mode": self.dark_mode,
        }


class ChatMessage(db.Model):
    __tablename__ = "chat_messages"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    channel = db.Column(String(32), nullable=False, index=True)
    content = db.Column(Text, nullable=False)
    ticker_symbols = db.Column(Text, nullable=False, default="")
    created_at = db.Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)

    user = db.relationship("User", back_populates="messages")

    def ticker_list(self):
        return [ticker for ticker in (self.ticker_symbols or "").split(",") if ticker]

    def to_dict(self):
        profile = self.user.profile if self.user else None
        display_name = profile.full_name if profile else (self.user.name if self.user else "Trader")
        verified = profile.verified_trader if profile else False
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "user": display_name,
            "verified": verified,
            "content": self.content,
            "timestamp": self.created_at.isoformat() if self.created_at else None,
            "tickers": self.ticker_list(),
            "channel": self.channel,
        }


class Conversation(db.Model):
    __tablename__ = "conversations"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_key = db.Column(String(32), unique=True, nullable=False, index=True)
    kind = db.Column(String(32), nullable=False, index=True)
    name = db.Column(String(255), nullable=False)
    description = db.Column(Text, nullable=False, default="")
    visibility = db.Column(String(32), nullable=False, default="public")
    owner_id = db.Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    created_at = db.Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = db.Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    owner = db.relationship("User", back_populates="owned_conversations")
    channels = db.relationship("ConversationChannel", back_populates="conversation", cascade="all, delete-orphan")
    members = db.relationship("ConversationMember", back_populates="conversation", cascade="all, delete-orphan")


class ConversationChannel(db.Model):
    __tablename__ = "conversation_channels"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = db.Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False, index=True)
    channel_key = db.Column(String(32), unique=True, nullable=False, index=True)
    name = db.Column(String(64), nullable=False)
    slug = db.Column(String(32), nullable=False)
    position = db.Column(Integer, nullable=False, default=0)
    created_at = db.Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    conversation = db.relationship("Conversation", back_populates="channels")


class ConversationMember(db.Model):
    __tablename__ = "conversation_members"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = db.Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False, index=True)
    user_id = db.Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    role = db.Column(String(32), nullable=False, default="member")
    created_at = db.Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    conversation = db.relationship("Conversation", back_populates="members")
    user = db.relationship("User", back_populates="conversation_memberships")

    __table_args__ = (
        db.UniqueConstraint("conversation_id", "user_id", name="uq_conversation_member"),
    )


class WatchlistItem(db.Model):
    __tablename__ = "watchlist_items"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    ticker = db.Column(String(32), nullable=False)
    company_name = db.Column(String(255), nullable=True)
    created_at = db.Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    user = db.relationship("User", back_populates="watchlist_items")

    __table_args__ = (
        db.UniqueConstraint("user_id", "ticker", name="uq_watchlist_user_ticker"),
    )

    def to_dict(self):
        return {
            "ticker": self.ticker,
            "company_name": self.company_name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class UserActivity(db.Model):
    __tablename__ = "user_activities"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    activity_type = db.Column(String(64), nullable=False, index=True)
    description = db.Column(Text, nullable=False)
    ticker = db.Column(String(32), nullable=True)
    created_at = db.Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)

    user = db.relationship("User", back_populates="activities")

    def to_dict(self):
        return {
            "id": str(self.id),
            "activity_type": self.activity_type,
            "description": self.description,
            "ticker": self.ticker,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class MarketSnapshot(db.Model):
    __tablename__ = "market_snapshots"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    snapshot_key = db.Column(String(128), unique=True, nullable=False, index=True)
    payload = db.Column(Text, nullable=False)
    created_at = db.Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = db.Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
