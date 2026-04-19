"""User model."""

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    media_assets = relationship("MediaAsset", back_populates="owner", cascade="all, delete-orphan")
    watchlist_entries = relationship(
        "WatchlistEntry",
        back_populates="owner",
        cascade="all, delete-orphan",
        order_by="WatchlistEntry.entity_name.asc()",
    )
