"""Regression tests for Celery worker configuration."""

import unittest

try:
    from worker.celery_worker import celery_app

    IMPORT_ERROR = None
except ImportError as exc:  # pragma: no cover - environment-dependent
    celery_app = None
    IMPORT_ERROR = exc


@unittest.skipIf(IMPORT_ERROR is not None, f"Missing dependency: {IMPORT_ERROR}")
class WorkerConfigTests(unittest.TestCase):
    def test_worker_includes_media_tasks_module(self) -> None:
        include_modules = celery_app.conf.include or ()

        self.assertIn("app.tasks.media_tasks", include_modules)


if __name__ == "__main__":
    unittest.main()
