"""Media routes."""

from importlib.util import find_spec
import json
import re
from typing import Annotated
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.enums import MediaStatus, MediaType
from app.models.media import MediaAsset
from app.models.user import User
from app.schemas.media import (
    AlertWatchlistRead,
    AlertWatchlistUpdate,
    MediaAssetRead,
    MediaListResponse,
    MediaUploadResponse,
)
from app.services.auth import get_current_user
from app.services.media_pipeline import MediaPipeline
from app.services.watchlist import get_watchlist_entities, replace_watchlist_entities
from app.tasks.media_tasks import process_media

router = APIRouter()
pipeline = MediaPipeline()

AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".flac"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
ALLOWED_MEDIA_EXTENSIONS = AUDIO_EXTENSIONS | VIDEO_EXTENSIONS
UPLOAD_CHUNK_SIZE = 4 * 1024 * 1024
MAX_FILENAME_LENGTH = 120
FALLBACK_CONTENT_TYPES = {
    "application/octet-stream",
    "binary/octet-stream",
}
ALLOWED_CONTENT_TYPES = {
    ".aac": {"audio/aac", "audio/x-aac"},
    ".avi": {"video/x-msvideo", "video/avi"},
    ".flac": {"audio/flac", "audio/x-flac"},
    ".m4a": {"audio/mp4", "audio/x-m4a"},
    ".mkv": {"video/x-matroska"},
    ".mov": {"video/quicktime"},
    ".mp3": {"audio/mpeg", "audio/mp3"},
    ".mp4": {"video/mp4"},
    ".wav": {"audio/wav", "audio/x-wav", "audio/wave"},
    ".webm": {"audio/webm", "video/webm"},
}
SAFE_FILENAME_RE = re.compile(r"[^A-Za-z0-9._ -]+")
MULTIPART_AVAILABLE = find_spec("multipart") is not None


def _file_extension(filename: str) -> str:
    extension = Path(filename).suffix.lower()
    return extension[1:] if extension.startswith(".") else extension


def _clean_filename(filename: str) -> str:
    base_name = Path(filename).name.strip()
    normalized = SAFE_FILENAME_RE.sub("", base_name)
    normalized = " ".join(normalized.split())
    return normalized.strip("._ ")


def _media_type(filename: str) -> MediaType:
    extension = Path(filename).suffix.lower()
    if extension in VIDEO_EXTENSIONS:
        return MediaType.VIDEO
    return MediaType.AUDIO


def _validate_upload_metadata(file: UploadFile) -> tuple[str, str]:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename is required")

    clean_name = _clean_filename(file.filename)
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename contains unsupported characters",
        )
    if len(clean_name) > MAX_FILENAME_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Filename must be {MAX_FILENAME_LENGTH} characters or fewer",
        )

    extension = Path(clean_name).suffix.lower()
    if extension not in ALLOWED_MEDIA_EXTENSIONS:
        allowed_extensions = ", ".join(sorted(ALLOWED_MEDIA_EXTENSIONS))
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type. Allowed extensions: {allowed_extensions}",
        )

    content_type = (file.content_type or "").lower().strip()
    allowed_content_types = ALLOWED_CONTENT_TYPES.get(extension, set())
    if content_type and content_type not in allowed_content_types and content_type not in FALLBACK_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Content type {content_type} does not match {extension} uploads",
        )

    return clean_name, extension


def _parse_json_list(raw_value: str | None) -> list[object]:
    if not raw_value:
        return []
    try:
        parsed = json.loads(raw_value)
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []


def _transcript_excerpt(transcript: str | None, limit: int = 220) -> str | None:
    if not transcript:
        return None

    normalized = " ".join(transcript.split())
    if not normalized:
        return None
    if len(normalized) <= limit:
        return normalized
    return f"{normalized[:limit].rstrip(' .,;:')}..."


def _processing_stage(status: MediaStatus, alerts: list[str]) -> str:
    if status == MediaStatus.QUEUED:
        return "Waiting in queue"
    if status == MediaStatus.PROCESSING:
        return "Generating full transcript"
    if status == MediaStatus.FAILED:
        return "Needs review"
    if alerts:
        return "Transcript ready with alerts"
    return "Transcript ready"


async def _save_upload(file: UploadFile, destination: Path) -> None:
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    written = 0

    try:
        with destination.open("wb") as buffer:
            while chunk := await file.read(UPLOAD_CHUNK_SIZE):
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            f"File exceeds the {settings.max_upload_size_mb} MB upload limit"
                        ),
                    )
                buffer.write(chunk)
        if written == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty",
            )
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await file.close()


def _serialize_asset(asset: MediaAsset) -> MediaAssetRead:
    entities = _parse_json_list(asset.entities)
    alerts = _parse_json_list(asset.alert_matches)
    transcript_excerpt = _transcript_excerpt(asset.transcript)
    return MediaAssetRead(
        id=asset.id,
        original_filename=asset.original_filename,
        extension=_file_extension(asset.original_filename),
        media_type=asset.media_type.value,
        status=asset.status.value,
        processing_stage=_processing_stage(asset.status, alerts),
        transcript=asset.transcript,
        transcript_excerpt=transcript_excerpt,
        summary=asset.summary,
        entities=entities,
        entity_count=len(entities),
        alert_matches=alerts,
        alert_count=len(alerts),
        error_message=asset.error_message,
        processing_started_at=asset.processing_started_at,
        processing_finished_at=asset.processing_finished_at,
        processing_duration_ms=asset.processing_duration_ms,
        retry_count=asset.retry_count,
        created_at=asset.created_at,
        updated_at=asset.updated_at,
    )


def _delete_asset_files(asset: MediaAsset) -> None:
    stored_path = Path(asset.stored_path)
    stored_path.unlink(missing_ok=True)

    wav_path = stored_path.with_suffix(".wav")
    if wav_path != stored_path:
        wav_path.unlink(missing_ok=True)


if MULTIPART_AVAILABLE:
    @router.post("/upload", response_model=MediaUploadResponse)
    async def upload_media(
        file: UploadFile = File(...),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> MediaUploadResponse:
        clean_name, extension = _validate_upload_metadata(file)

        settings.upload_path.mkdir(parents=True, exist_ok=True)
        stored_name = f"{uuid4()}_{clean_name}"
        destination = settings.upload_path / stored_name
        await _save_upload(file, destination)

        try:
            asset = MediaAsset(
                owner_id=current_user.id,
                original_filename=clean_name,
                stored_path=str(destination),
                media_type=_media_type(clean_name),
                status=MediaStatus.QUEUED,
            )
            db.add(asset)
            db.commit()
            db.refresh(asset)
        except Exception:
            destination.unlink(missing_ok=True)
            raise

        try:
            try:
                task = process_media.delay(asset.id)
            except Exception:
                task = process_media.apply(args=[asset.id])
            task_id = str(task.id or uuid4())
        except Exception:
            asset.status = MediaStatus.FAILED
            asset.error_message = "Unable to start media processing"
            db.add(asset)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to start media processing",
            )

        asset.task_id = task_id
        db.add(asset)
        db.commit()

        return MediaUploadResponse(
            message=f"{clean_name} queued for processing",
            asset_id=asset.id,
            task_id=task_id,
            media_type=asset.media_type,
            original_filename=asset.original_filename,
        )


@router.get("", response_model=MediaListResponse)
def list_media(
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    offset: Annotated[int, Query(ge=0)] = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MediaListResponse:
    query = db.query(MediaAsset).filter(MediaAsset.owner_id == current_user.id)
    total = query.count()
    assets = query.order_by(MediaAsset.created_at.desc()).offset(offset).limit(limit).all()
    return MediaListResponse(
        items=[_serialize_asset(asset) for asset in assets],
        limit=limit,
        offset=offset,
        total=total,
    )


@router.get("/watchlist/settings", response_model=AlertWatchlistRead)
def get_watchlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AlertWatchlistRead:
    entities = get_watchlist_entities(db, current_user.id)
    return AlertWatchlistRead(entities=entities)


@router.post("/watchlist/settings", response_model=AlertWatchlistRead)
def update_watchlist(
    payload: AlertWatchlistUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AlertWatchlistRead:
    clean = replace_watchlist_entities(db, current_user.id, payload.entities)
    return AlertWatchlistRead(entities=clean)


@router.get("/{asset_id}", response_model=MediaAssetRead)
def get_media(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MediaAssetRead:
    asset = (
        db.query(MediaAsset)
        .filter(MediaAsset.id == asset_id, MediaAsset.owner_id == current_user.id)
        .first()
    )
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")
    return _serialize_asset(asset)


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_media(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    asset = (
        db.query(MediaAsset)
        .filter(MediaAsset.id == asset_id, MediaAsset.owner_id == current_user.id)
        .first()
    )
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")

    _delete_asset_files(asset)
    db.delete(asset)
    db.commit()


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_all_media(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    assets = db.query(MediaAsset).filter(MediaAsset.owner_id == current_user.id).all()
    for asset in assets:
        _delete_asset_files(asset)
        db.delete(asset)
    db.commit()


@router.post("/{asset_id}/recap", response_model=MediaAssetRead)
def generate_recap(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MediaAssetRead:
    asset = (
        db.query(MediaAsset)
        .filter(MediaAsset.id == asset_id, MediaAsset.owner_id == current_user.id)
        .first()
    )
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")
    if asset.status not in {"completed", "alerted"} or not asset.transcript:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Transcript is not ready yet",
        )

    asset.summary = pipeline.summarize(asset.transcript)
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return _serialize_asset(asset)
