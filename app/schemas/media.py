"""Media schemas."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class MediaUploadResponse(BaseModel):
    message: str
    asset_id: int
    task_id: str
    media_type: str
    original_filename: str


class MediaListResponse(BaseModel):
    items: list["MediaAssetRead"]
    limit: int
    offset: int
    total: int


class MediaAssetRead(BaseModel):
    id: int
    original_filename: str
    extension: str
    media_type: str
    status: str
    processing_stage: str
    transcript: str | None
    transcript_excerpt: str | None
    summary: str | None
    entities: list[dict[str, str]]
    entity_count: int
    alert_matches: list[str]
    alert_count: int
    error_message: str | None
    processing_started_at: datetime | None
    processing_finished_at: datetime | None
    processing_duration_ms: int | None
    retry_count: int
    created_at: datetime | None
    updated_at: datetime | None


class AlertWatchlistUpdate(BaseModel):
    entities: list[str] = Field(default_factory=list, max_length=40)

    @field_validator("entities")
    @classmethod
    def normalize_entities(cls, values: list[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()

        for item in values:
            clean = " ".join(item.split()).strip()
            if not clean:
                continue
            if len(clean) > 80:
                raise ValueError("Watchlist entries must be 80 characters or fewer")
            key = clean.lower()
            if key in seen:
                continue
            seen.add(key)
            normalized.append(clean)

        return normalized


class AlertWatchlistRead(BaseModel):
    entities: list[str]


MediaListResponse.model_rebuild()
