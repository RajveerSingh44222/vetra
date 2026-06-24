from sqlalchemy import Column, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database.connection import Base


class VaultEntry(Base):

    __tablename__ = "vault_entries"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False
    )

    website_name = Column(
        Text,
        nullable=False
    )

    website_url = Column(
        Text,
        nullable=True
    )

    login_identifier = Column(
        Text,
        nullable=False
    )

    encrypted_pass = Column(
        Text,
        nullable=False
    )

    notes = Column(
        Text,
        nullable=True
    )

    iv = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now()
    )
    tag = Column(
    Text,
    nullable=True
)