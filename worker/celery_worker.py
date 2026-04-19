"""Celery worker entry point."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

from app.config import settings

try:
    from celery import Celery
except ImportError:  # pragma: no cover - local fallback for tests without Celery
    class _EagerResult:
        def __init__(self, value):
            self.id = str(uuid4())
            self.value = value

    class _FallbackTask:
        def __init__(self, func, bind: bool = False):
            self.func = func
            self.bind = bind
            self.__name__ = getattr(func, "__name__", "task")
            self.request = SimpleNamespace(retries=0)

        def _call(self, *args, **kwargs):
            if self.bind:
                return self.func(self, *args, **kwargs)
            return self.func(*args, **kwargs)

        def __call__(self, *args, **kwargs):
            return self._call(*args, **kwargs)

        def delay(self, *args, **kwargs):
            return _EagerResult(self._call(*args, **kwargs))

        def apply(self, args=None, kwargs=None):
            result = self._call(*(args or ()), **(kwargs or {}))
            return _EagerResult(result)

    class Celery:  # type: ignore[override]
        def __init__(self, name: str, broker: str, backend: str, include: list[str]):
            self.name = name
            self.conf = SimpleNamespace(
                broker_url=broker,
                result_backend=backend,
                include=tuple(include),
            )
            self.backend = SimpleNamespace(client=SimpleNamespace(ping=lambda: True))
            self.control = SimpleNamespace(inspect=lambda timeout=1: SimpleNamespace(ping=lambda: None))

        def task(self, *task_args, **task_kwargs):
            def decorator(func):
                wrapped = _FallbackTask(func, bind=bool(task_kwargs.get("bind")))
                wrapped.name = task_kwargs.get("name") or func.__name__
                return wrapped

            return decorator


celery_app = Celery(
    "multimedia_analyzer",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.media_tasks"],
)
