"""Utilities for running the local unittest suite and returning structured results."""

from __future__ import annotations

import json
import time
import traceback
import unittest
from collections.abc import Callable, Iterable
from datetime import UTC, datetime
from io import StringIO
from pathlib import Path
from queue import Queue
from threading import Thread

from app.schemas.tests import TestCaseResult, TestRunResponse, TestRunSummary

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TESTS_DIR = PROJECT_ROOT / "tests"


def _flatten_suite(suite: unittest.TestSuite) -> Iterable[unittest.TestCase]:
    for item in suite:
        if isinstance(item, unittest.TestSuite):
            yield from _flatten_suite(item)
        else:
            yield item


def _suite_name(test: unittest.TestCase) -> str:
    parts = test.id().split(".")
    if len(parts) >= 2:
        return ".".join(parts[-3:-1]) if len(parts) >= 3 else ".".join(parts[:-1])
    return test.__class__.__name__


def _assignment_name(test: unittest.TestCase) -> str:
    description = test.shortDescription()
    if description:
        return f"Checking: {description.strip()}"

    method = getattr(test, "_testMethodName", "unnamed_test")
    cleaned = method.removeprefix("test_").replace("_", " ").strip()
    if not cleaned:
        return "Checking: unnamed test"
    return f"Checking: {cleaned}"


def _detail_from_info(info: tuple[type[BaseException], BaseException, object]) -> str:
    formatted = "".join(traceback.format_exception(*info)).strip()
    return formatted or str(info[1])


class StructuredTestResult(unittest.TextTestResult):
    def __init__(self, *args, event_callback: Callable[[TestCaseResult], None] | None = None, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.case_results: list[TestCaseResult] = []
        self._started_at: dict[str, float] = {}
        self._event_callback = event_callback

    def startTest(self, test: unittest.TestCase) -> None:
        self._started_at[test.id()] = time.perf_counter()
        super().startTest(test)

    def _duration_ms(self, test: unittest.TestCase) -> int:
        started_at = self._started_at.pop(test.id(), None)
        if started_at is None:
            return 0
        return int((time.perf_counter() - started_at) * 1000)

    def _append_case(
        self,
        test: unittest.TestCase,
        status: str,
        detail: str | None = None,
    ) -> None:
        case_result = TestCaseResult(
            id=test.id(),
            suite=_suite_name(test),
            assignment=_assignment_name(test),
            status=status,
            duration_ms=self._duration_ms(test),
            detail=detail,
        )
        self.case_results.append(case_result)
        if self._event_callback is not None:
            self._event_callback(case_result)

    def addSuccess(self, test: unittest.TestCase) -> None:
        super().addSuccess(test)
        self._append_case(test, "ok")

    def addFailure(self, test: unittest.TestCase, err) -> None:
        super().addFailure(test, err)
        self._append_case(test, "fail", _detail_from_info(err))

    def addError(self, test: unittest.TestCase, err) -> None:
        super().addError(test, err)
        self._append_case(test, "fail", _detail_from_info(err))

    def addSkip(self, test: unittest.TestCase, reason: str) -> None:
        super().addSkip(test, reason)
        self._append_case(test, "skip", reason)


def _discover_suite() -> unittest.TestSuite:
    loader = unittest.defaultTestLoader
    return loader.discover(start_dir=str(TESTS_DIR), top_level_dir=str(PROJECT_ROOT))


def _empty_discovery_response() -> TestRunResponse:
    return TestRunResponse(
        generated_at=datetime.now(UTC).isoformat(),
        summary=TestRunSummary(
            total=0,
            passed=0,
            failed=1,
            skipped=0,
            duration_ms=0,
            status="fail",
        ),
        results=[
            TestCaseResult(
                id="tests.discovery",
                suite="tests",
                assignment="Test discovery returned no cases",
                status="fail",
                duration_ms=0,
                detail="No tests were found in the local tests directory.",
            )
        ],
    )


def _run_suite(
    suite: unittest.TestSuite,
    event_callback: Callable[[TestCaseResult], None] | None = None,
) -> TestRunResponse:
    started_at = time.perf_counter()
    cases = list(_flatten_suite(suite))
    if not cases:
        response = _empty_discovery_response()
        if event_callback is not None:
            for result in response.results:
                event_callback(result)
        return response

    runner = unittest.TextTestRunner(
        stream=StringIO(),
        verbosity=0,
        resultclass=lambda *args, **kwargs: StructuredTestResult(
            *args,
            event_callback=event_callback,
            **kwargs,
        ),
    )
    result: StructuredTestResult = runner.run(suite)  # type: ignore[assignment]

    duration_ms = int((time.perf_counter() - started_at) * 1000)
    failed = len(result.failures) + len(result.errors)
    skipped = len(result.skipped)
    passed = result.testsRun - failed - skipped

    return TestRunResponse(
        generated_at=datetime.now(UTC).isoformat(),
        summary=TestRunSummary(
            total=result.testsRun,
            passed=passed,
            failed=failed,
            skipped=skipped,
            duration_ms=duration_ms,
            status="ok" if failed == 0 else "fail",
        ),
        results=result.case_results,
    )


def run_discovered_tests() -> TestRunResponse:
    return _run_suite(_discover_suite())


def stream_discovered_tests() -> Iterable[str]:
    suite = _discover_suite()
    cases = list(_flatten_suite(suite))

    yield _sse_event(
        "start",
        {
            "total": len(cases),
            "started_at": datetime.now(UTC).isoformat(),
        },
    )

    queue: Queue[tuple[str, object] | None] = Queue()

    def on_case(case: TestCaseResult) -> None:
        queue.put(("case", case.model_dump()))

    def worker() -> None:
        try:
            response = _run_suite(suite, event_callback=on_case)
            queue.put(("summary", response.summary.model_dump()))
            queue.put(
                (
                    "complete",
                    {
                        "generated_at": response.generated_at,
                        "summary": response.summary.model_dump(),
                        "results": [result.model_dump() for result in response.results],
                    },
                )
            )
        except Exception as exc:  # pragma: no cover - streaming safety
            queue.put(
                (
                    "error",
                    {
                        "detail": "".join(
                            traceback.format_exception(type(exc), exc, exc.__traceback__)
                        ).strip(),
                    },
                )
            )
        finally:
            queue.put(None)

    Thread(target=worker, daemon=True).start()

    while True:
        event = queue.get()
        if event is None:
            break
        event_name, payload = event
        yield _sse_event(event_name, payload)


def _sse_event(event_name: str, payload: object) -> str:
    return f"event: {event_name}\ndata: {json.dumps(payload)}\n\n"
