"""Routes for running the local test suite."""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.schemas.tests import TestRunResponse
from app.services.test_runner import run_discovered_tests, stream_discovered_tests

router = APIRouter()


@router.post("/run", response_model=TestRunResponse)
def run_tests() -> TestRunResponse:
    return run_discovered_tests()


@router.get("/stream")
def stream_tests() -> StreamingResponse:
    return StreamingResponse(
        stream_discovered_tests(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
