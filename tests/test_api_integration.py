"""API integration tests."""

from __future__ import annotations

import io
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models.enums import MediaStatus, MediaType
from app.models.media import MediaAsset
from app.models.user import User
from app.services.auth import hash_password
from app.services.watchlist import replace_watchlist_entities


class ApiIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    def setUp(self) -> None:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

    def _register_and_login(self) -> str:
        register = self.client.post(
            "/api/auth/register",
            json={"email": "tester@example.com", "password": "strongpass123"},
        )
        self.assertEqual(register.status_code, 200)
        token = register.json()["access_token"]
        self.assertTrue(token)
        return token

    def test_register_me_and_watchlist_roundtrip(self) -> None:
        token = self._register_and_login()
        headers = {"Authorization": f"Bearer {token}"}

        me_response = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(me_response.json()["email"], "tester@example.com")
        self.assertGreaterEqual(len(me_response.json()["watched_entities"]), 1)

        watchlist_response = self.client.post(
            "/api/media/watchlist/settings",
            json={"entities": ["OpenAI", "openai", "Microsoft"]},
            headers=headers,
        )
        self.assertEqual(watchlist_response.status_code, 200)
        self.assertEqual(watchlist_response.json()["entities"], ["OpenAI", "Microsoft"])

        watchlist_read = self.client.get("/api/media/watchlist/settings", headers=headers)
        self.assertEqual(watchlist_read.status_code, 200)
        self.assertEqual(watchlist_read.json()["entities"], ["Microsoft", "OpenAI"])

    def test_media_listing_is_paginated(self) -> None:
        token = self._register_and_login()
        headers = {"Authorization": f"Bearer {token}"}

        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == "tester@example.com").first()
            assert user is not None
            for index in range(3):
                db.add(
                    MediaAsset(
                        owner_id=user.id,
                        original_filename=f"briefing-{index}.mp4",
                        stored_path=f"storage/uploads/briefing-{index}.mp4",
                        media_type=MediaType.VIDEO,
                        status=MediaStatus.COMPLETED,
                        retry_count=0,
                    )
                )
            db.commit()
        finally:
            db.close()

        response = self.client.get("/api/media?limit=2&offset=0", headers=headers)
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["limit"], 2)
        self.assertEqual(payload["offset"], 0)
        self.assertEqual(payload["total"], 3)
        self.assertEqual(len(payload["items"]), 2)

    def test_upload_and_delete_flow(self) -> None:
        token = self._register_and_login()
        headers = {"Authorization": f"Bearer {token}"}

        with patch("app.routers.media.process_media.delay", return_value=SimpleNamespace(id="task-123")):
            response = self.client.post(
                "/api/media/upload",
                headers=headers,
                files={"file": ("demo.mp3", io.BytesIO(b"audio-bytes"), "audio/mpeg")},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["task_id"], "task-123")
        asset_id = payload["asset_id"]

        db = SessionLocal()
        try:
            asset = db.query(MediaAsset).filter(MediaAsset.id == asset_id).first()
            self.assertIsNotNone(asset)
            assert asset is not None
            asset.status = MediaStatus.COMPLETED
            asset.transcript = "OpenAI discussed new workflows."
            asset.entities = '[{"text":"OpenAI","label":"ORG"}]'
            db.add(asset)
            db.commit()
        finally:
            db.close()

        list_response = self.client.get("/api/media?limit=10&offset=0", headers=headers)
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.json()["total"], 1)

        delete_response = self.client.delete(f"/api/media/{asset_id}", headers=headers)
        self.assertEqual(delete_response.status_code, 204)

    def test_recap_requires_completed_transcript(self) -> None:
        token = self._register_and_login()
        headers = {"Authorization": f"Bearer {token}"}

        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == "tester@example.com").first()
            assert user is not None
            asset = MediaAsset(
                owner_id=user.id,
                original_filename="briefing.mp3",
                stored_path="storage/uploads/briefing.mp3",
                media_type=MediaType.AUDIO,
                status=MediaStatus.PROCESSING,
                retry_count=0,
            )
            db.add(asset)
            db.commit()
            db.refresh(asset)
            asset_id = asset.id
        finally:
            db.close()

        response = self.client.post(f"/api/media/{asset_id}/recap", headers=headers)
        self.assertEqual(response.status_code, 409)


if __name__ == "__main__":
    unittest.main()
