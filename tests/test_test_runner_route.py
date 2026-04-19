"""Tests for the API test runner endpoint."""

import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app


class TestRunnerRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_run_tests_returns_structured_report(self) -> None:
        payload = {
            "generated_at": "2026-04-19T12:00:00+00:00",
            "summary": {
                "total": 2,
                "passed": 1,
                "failed": 1,
                "skipped": 0,
                "duration_ms": 245,
                "status": "fail",
            },
            "results": [
                {
                    "id": "tests.demo.ok",
                    "suite": "tests.demo",
                    "assignment": "Demo passes",
                    "status": "ok",
                    "duration_ms": 12,
                    "detail": None,
                },
                {
                    "id": "tests.demo.fail",
                    "suite": "tests.demo",
                    "assignment": "Demo fails",
                    "status": "fail",
                    "duration_ms": 33,
                    "detail": "Traceback...",
                },
            ],
        }

        with patch("app.routers.tests.run_discovered_tests", return_value=payload):
            response = self.client.post("/api/tests/run")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["summary"]["failed"], 1)
        self.assertEqual(response.json()["results"][1]["status"], "fail")


if __name__ == "__main__":
    unittest.main()
