"""Shared database enums."""

from enum import StrEnum


class MediaType(StrEnum):
    AUDIO = "audio"
    VIDEO = "video"


class MediaStatus(StrEnum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ALERTED = "alerted"
    FAILED = "failed"
