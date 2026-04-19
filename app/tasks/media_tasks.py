"""Celery tasks for media processing."""

import json
from pathlib import Path
from time import perf_counter
from datetime import datetime, timezone

try:
    from celery.utils.log import get_task_logger
except ImportError:  # pragma: no cover - local fallback without Celery
    import logging

    def get_task_logger(name: str):
        return logging.getLogger(name)
from app.database import SessionLocal
from app.models.enums import MediaStatus, MediaType
from app.models.media import MediaAsset
from app.services.media_pipeline import MediaPipeline
from app.services.watchlist import get_watchlist_entities
from worker.celery_worker import celery_app
from sqlalchemy.orm import Session

pipeline = MediaPipeline()
logger = get_task_logger(__name__)


def _mark_asset_failed(db: Session, asset: MediaAsset, message: str) -> None:
    asset.status = MediaStatus.FAILED
    asset.error_message = message
    asset.processing_finished_at = datetime.now(timezone.utc)
    db.add(asset)
    db.commit()


@celery_app.task(
    bind=True,
    name="media.process",
    autoretry_for=(RuntimeError,),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 3},
)
def process_media(self, asset_id: int) -> dict[str, str | list[str]]:
    db = SessionLocal()
    asset: MediaAsset | None = None
    cleanup_path: Path | None = None
    started = perf_counter()
    try:
        asset = db.query(MediaAsset).filter(MediaAsset.id == asset_id).first()
        if asset is None:
            return {"error": "Asset not found"}

        watchlist = get_watchlist_entities(db, asset.owner_id)

        asset.status = MediaStatus.PROCESSING
        asset.processing_started_at = datetime.now(timezone.utc)
        asset.processing_finished_at = None
        asset.processing_duration_ms = None
        asset.retry_count = getattr(self.request, "retries", 0)
        db.add(asset)
        db.commit()

        source_path = Path(asset.stored_path)
        if not source_path.exists():
            raise FileNotFoundError("Stored media file is missing")

        audio_path = str(source_path.with_suffix(".wav"))
        cleanup_path = Path(audio_path) if asset.media_type == "video" else None

        if asset.media_type == MediaType.VIDEO:
            try:
                pipeline.extract_audio(asset.stored_path, audio_path)
            except Exception as exc:
                raise RuntimeError(f"Audio extraction failed: {exc}") from exc
        else:
            audio_path = asset.stored_path

        transcript = pipeline.transcribe(audio_path)
        summary = pipeline.summarize(transcript)
        entities = pipeline.extract_entities(transcript)
        alerts = pipeline.detect_alert_matches(transcript, entities, watchlist)

        asset.transcript = transcript
        asset.summary = summary
        asset.entities = pipeline.render_entities(entities)
        asset.alert_matches = json.dumps(alerts)
        asset.status = MediaStatus.ALERTED if alerts else MediaStatus.COMPLETED
        asset.error_message = None
        asset.processing_finished_at = datetime.now(timezone.utc)
        asset.processing_duration_ms = int((perf_counter() - started) * 1000)
        db.add(asset)
        db.commit()

        logger.info(
            "media.process completed asset_id=%s status=%s alerts=%s duration_ms=%s retries=%s",
            asset.id,
            asset.status.value,
            len(alerts),
            asset.processing_duration_ms,
            asset.retry_count,
        )
        return {"asset_id": str(asset.id), "status": asset.status.value, "alerts": alerts}
    except Exception as exc:
        if asset is not None:
            _mark_asset_failed(db, asset, str(exc))
            logger.exception("media.process failed asset_id=%s error=%s", asset_id, exc)
        return {"asset_id": str(asset_id), "status": "failed", "error": str(exc)}
    finally:
        if cleanup_path and cleanup_path.exists():
            cleanup_path.unlink(missing_ok=True)
        db.close()
