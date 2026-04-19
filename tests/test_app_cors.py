"""Regression tests for API app configuration."""

import unittest

try:
    from fastapi.middleware.cors import CORSMiddleware

    from app.config import settings
    from app.main import app

    IMPORT_ERROR = None
except ModuleNotFoundError as exc:  # pragma: no cover - environment-dependent
    CORSMiddleware = None
    app = None
    settings = None
    IMPORT_ERROR = exc


@unittest.skipIf(IMPORT_ERROR is not None, f"Missing dependency: {IMPORT_ERROR}")
class AppCorsTests(unittest.TestCase):
    def test_cors_middleware_is_enabled_for_frontend(self) -> None:
        middleware_classes = [middleware.cls for middleware in app.user_middleware]

        self.assertIn(CORSMiddleware, middleware_classes)
        self.assertIn("http://localhost:3000", settings.cors_allowed_origins_list)
        self.assertIn("http://127.0.0.1:3000", settings.cors_allowed_origins_list)


if __name__ == "__main__":
    unittest.main()
