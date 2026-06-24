from sqlalchemy import Column
from sqlalchemy import String
from sqlalchemy import DateTime
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID

from database.connection import Base


class User(Base):

    __tablename__ = "users"

    id = Column(
    UUID(as_uuid=True),
    primary_key=True
)

    email = Column(
        String,
        unique=True,
        nullable=False
    )

    master_password_hash = Column(
        String,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )