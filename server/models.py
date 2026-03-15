import uuid

from sqlalchemy import DateTime, String, func
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
