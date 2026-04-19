"""Tests for media schema normalization and API helper serialization."""

import json
from pathlib import Path
from io import BytesIO
from tempfile import TemporaryDirectory
import unittest
from datetime import datetime, timezone

try:
    from fastapi import HTTPException, UploadFile
    from app.models.enums import MediaStatus, MediaType
    from app.models.media import MediaAsset
    from app.schemas.media import AlertWatchlistUpdate
    from app.routers.media import (
        _clean_filename,
        _delete_asset_files,
        _serialize_asset,
        _validate_upload_metadata,
    )
    from app.services.watchlist import normalize_watchlist_entities
    IMPORT_ERROR = None
except ModuleNotFoundError as exc:  # pragma: no cover - environment-dependent
    MediaStatus = None
    MediaType = None
    MediaAsset = None
    AlertWatchlistUpdate = None
    UploadFile = None
    HTTPException = None
    _clean_filename = None
    _delete_asset_files = None
    _serialize_asset = None
    _validate_upload_metadata = None
    normalize_watchlist_entities = None
    IMPORT_ERROR = exc


@unittest.skipIf(IMPORT_ERROR is not None, f"Missing dependency: {IMPORT_ERROR}")
class MediaSchemaAndRouteHelperTests(unittest.TestCase):
    def test_watchlist_update_deduplicates_and_trims(self) -> None:
        payload = AlertWatchlistUpdate(
            entities=[" OpenAI  ", "openai", "", "European   Union", "Microsoft"]
        )

        self.assertEqual(payload.entities, ["OpenAI", "European Union", "Microsoft"])
        self.assertEqual(
            normalize_watchlist_entities([" OpenAI  ", "openai", "", "European   Union", "Microsoft"]),
            ["OpenAI", "European Union", "Microsoft"],
        )

    def test_clean_filename_normalizes_unsafe_name(self) -> None:
        cleaned = _clean_filename("../Quarterly*&^ Report!!.mp4")

        self.assertEqual(cleaned, "Quarterly Report.mp4")

    def test_validate_upload_metadata_accepts_matching_content_type(self) -> None:
        upload = UploadFile(
            file=BytesIO(b"test"),
            filename="briefing.mp4",
            headers={"content-type": "video/mp4"},
        )

        clean_name, extension = _validate_upload_metadata(upload)

        self.assertEqual(clean_name, "briefing.mp4")
        self.assertEqual(extension, ".mp4")

    def test_validate_upload_metadata_rejects_mismatched_content_type(self) -> None:
        upload = UploadFile(
            file=BytesIO(b"test"),
            filename="briefing.mp4",
            headers={"content-type": "audio/mpeg"},
        )

        with self.assertRaises(HTTPException) as ctx:
            _validate_upload_metadata(upload)

        self.assertEqual(ctx.exception.status_code, 415)

    def test_serialize_asset_adds_counts_and_excerpt(self) -> None:
        asset = MediaAsset(
            id=7,
            owner_id=3,
            original_filename="briefing.mp4",
            stored_path="storage/uploads/briefing.mp4",
            media_type=MediaType.VIDEO,
            status=MediaStatus.ALERTED,
            transcript="OpenAI and Microsoft appear repeatedly in the uploaded strategy briefing.",
            summary="Automated summary: key account briefing.",
            entities=json.dumps(
                [{"text": "OpenAI", "label": "ORG"}, {"text": "Microsoft", "label": "ORG"}]
            ),
            alert_matches=json.dumps(["OpenAI"]),
            error_message=None,
            processing_duration_ms=512,
            retry_count=1,
            created_at=datetime(2026, 4, 14, 10, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 14, 10, 5, tzinfo=timezone.utc),
        )

        result = _serialize_asset(asset)

        self.assertEqual(result.extension, "mp4")
        self.assertEqual(result.entity_count, 2)
        self.assertEqual(result.alert_count, 1)
        self.assertEqual(result.processing_stage, "Transcript ready with alerts")
        self.assertEqual(result.processing_duration_ms, 512)
        self.assertEqual(result.retry_count, 1)
        self.assertTrue(result.transcript_excerpt)
        self.assertIn("OpenAI", result.transcript_excerpt)

    def test_delete_asset_files_removes_media_and_wav_sidecar(self) -> None:
        with TemporaryDirectory() as temp_dir:
            media_path = Path(temp_dir) / "briefing.mp4"
            wav_path = media_path.with_suffix(".wav")
            media_path.write_bytes(b"video")
            wav_path.write_bytes(b"audio")

            asset = MediaAsset(
                id=8,
                owner_id=3,
                original_filename="briefing.mp4",
                stored_path=str(media_path),
                media_type=MediaType.VIDEO,
                status=MediaStatus.QUEUED,
            )

            _delete_asset_files(asset)

            self.assertFalse(media_path.exists())
            self.assertFalse(wav_path.exists())


if __name__ == "__main__":
    unittest.main()
