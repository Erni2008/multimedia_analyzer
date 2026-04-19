"""Media model."""

from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import MediaStatus, MediaType


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    original_filename: Mapped[str] = mapped_column(String(255))
    stored_path: Mapped[str] = mapped_column(String(500))
    media_type: Mapped[MediaType] = mapped_column(
        Enum(MediaType, native_enum=False),
        default=MediaType.AUDIO,
    )
    status: Mapped[MediaStatus] = mapped_column(
        Enum(MediaStatus, native_enum=False),
        default=MediaStatus.QUEUED,
    )
    task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    transcript: Mapped[str | None] = mapped_column(Text(), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text(), nullable=True)
    entities: Mapped[str | None] = mapped_column(Text(), nullable=True)
    alert_matches: Mapped[str | None] = mapped_column(Text(), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text(), nullable=True)
    processing_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    processing_finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    processing_duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner = relationship("User", back_populates="media_assets")
