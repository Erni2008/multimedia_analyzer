#!/usr/bin/env python3
"""Project test runner with explicit per-test statuses."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import traceback
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

GREEN = "\033[32m"
RED = "\033[31m"
YELLOW = "\033[33m"
RESET = "\033[0m"


class StatusTextResult(unittest.TextTestResult):
    """Print one clear status line per executed test."""

    separator1 = "=" * 72
    separator2 = "-" * 72

    def __init__(self, stream, descriptions, verbosity):
        super().__init__(stream, descriptions, verbosity)
        self.showAll = False
        self.dots = False
        self.successes: list[unittest.case.TestCase] = []

    def getDescription(self, test: unittest.case.TestCase) -> str:  # noqa: N802
        return self.get_test_label(test)

    @staticmethod
    def get_test_label(test: unittest.case.TestCase) -> str:
        class_name = test.__class__.__name__.removesuffix("Tests")
        method_name = test._testMethodName.removeprefix("test_").replace("_", " ")
        return f"{class_name}: {method_name}"

    @staticmethod
    def colorize(status: str, color: str) -> str:
        return f"{color}{status}{RESET}"

    def startTest(self, test: unittest.case.TestCase) -> None:  # noqa: N802
        super().startTest(test)
        self.stream.writeln(f"...  {self.get_test_label(test)}")

    def addSuccess(self, test: unittest.case.TestCase) -> None:  # noqa: N802
        super().addSuccess(test)
        self.successes.append(test)
        self.stream.writeln(f"{self.colorize('OK', GREEN)}   {self.get_test_label(test)}")

    def addSkip(self, test: unittest.case.TestCase, reason: str) -> None:  # noqa: N802
        super().addSkip(test, reason)
        self.stream.writeln(f"{self.colorize('SKIP', YELLOW)} {self.get_test_label(test)}")
        self.stream.writeln(f"     {reason}")

    def addFailure(self, test: unittest.case.TestCase, err) -> None:  # noqa: N802
        super().addFailure(test, err)
        self._write_problem("NO", test, err)

    def addError(self, test: unittest.case.TestCase, err) -> None:  # noqa: N802
        super().addError(test, err)
        self._write_problem("NO", test, err)

    def _write_problem(self, status: str, test: unittest.case.TestCase, err) -> None:
        color = RED if status == "NO" else RESET
        self.stream.writeln(f"{self.colorize(status, color)}   {self.get_test_label(test)}")
        formatted = "".join(traceback.format_exception(*err)).rstrip()
        for line in formatted.splitlines():
            self.stream.writeln(f"     {line}")


class StatusTextRunner(unittest.TextTestRunner):
    resultclass = StatusTextResult


def is_running_in_container() -> bool:
    return Path("/.dockerenv").exists() or os.environ.get("MULTIMEDIA_TEST_LOCAL") == "1"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run project tests with explicit OK/NO/SKIP output."
    )
    parser.add_argument(
        "--mode",
        choices=("auto", "docker", "local"),
        default="auto",
        help="Run tests locally or inside the api Docker container. Default: %(default)s",
    )
    parser.add_argument(
        "-p",
        "--pattern",
        default="test*.py",
        help="File pattern for unittest discovery. Default: %(default)s",
    )
    parser.add_argument(
        "-s",
        "--start-directory",
        default="tests",
        help="Directory to start discovery from. Default: %(default)s",
    )
    return parser


def run_local_tests(args: argparse.Namespace) -> int:
    suite = unittest.defaultTestLoader.discover(args.start_directory, pattern=args.pattern)

    runner = StatusTextRunner(verbosity=1)
    result: StatusTextResult = runner.run(suite)

    print()
    print("Summary")
    print(f"  Ran:      {result.testsRun}")
    print(f"  OK:       {len(result.successes)}")
    print(f"  Failed:   {len(result.failures) + len(result.errors)}")
    print(f"  Skipped:  {len(result.skipped)}")

    return 0 if result.wasSuccessful() else 1


def run_docker_tests(args: argparse.Namespace) -> int:
    command = [
        "docker",
        "compose",
        "exec",
        "-T",
        "api",
        "python",
        "scripts/run_tests.py",
        "--mode",
        "local",
        "-s",
        args.start_directory,
        "-p",
        args.pattern,
    ]
    completed = subprocess.run(command, cwd=PROJECT_ROOT, capture_output=True, text=True)
    if completed.stdout:
        print(completed.stdout, end="")
    if completed.stderr:
        print(completed.stderr, end="", file=sys.stderr)
    return completed.returncode


def main() -> int:
    args = build_parser().parse_args()

    if args.mode == "local":
        return run_local_tests(args)

    if args.mode == "docker":
        if is_running_in_container():
            return run_local_tests(args)
        return run_docker_tests(args)

    if is_running_in_container():
        return run_local_tests(args)

    try:
        docker_code = run_docker_tests(args)
        if docker_code == 0:
            return 0
        print("Docker test execution was unavailable or failed. Falling back to local test execution.")
        return run_local_tests(args)
    except FileNotFoundError:
        print("Docker is not available. Falling back to local test execution.")
        return run_local_tests(args)
    except KeyboardInterrupt:
        raise
    except Exception as exc:
        print(f"Docker test execution failed: {exc}")
        print("Falling back to local test execution.")
        return run_local_tests(args)


if __name__ == "__main__":
    sys.exit(main())
