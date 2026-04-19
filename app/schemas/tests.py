"""Schemas for the API test runner."""

from __future__ import annotations

from pydantic import BaseModel


class TestCaseResult(BaseModel):
    id: str
    suite: str
    assignment: str
    status: str
    duration_ms: int
    detail: str | None = None


class TestRunSummary(BaseModel):
    total: int
    passed: int
    failed: int
    skipped: int
    duration_ms: int
    status: str


class TestRunResponse(BaseModel):
    generated_at: str
    summary: TestRunSummary
    results: list[TestCaseResult]
