"""Watchlist model."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class WatchlistEntry(Base):
    __tablename__ = "watchlist_entries"
    __table_args__ = (
        UniqueConstraint("owner_id", "entity_key", name="uq_watchlist_owner_entity_key"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    entity_name: Mapped[str] = mapped_column(String(80))
    entity_key: Mapped[str] = mapped_column(String(80), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    owner = relationship("User", back_populates="watchlist_entries")
