"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

type TestStatus = "ok" | "fail" | "skip";

type TestCaseResult = {
  id: string;
  suite: string;
  assignment: string;
  status: TestStatus;
  duration_ms: number;
  detail: string | null;
};

type TestRunSummary = {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  status: "ok" | "fail";
};

type SuiteGroup = {
  suite: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  results: TestCaseResult[];
};

const statusTone: Record<TestStatus, string> = {
  ok: "text-emerald-300 border-emerald-500/40 bg-emerald-500/12",
  fail: "text-rose-300 border-rose-500/40 bg-rose-500/12",
  skip: "text-amber-300 border-amber-500/40 bg-amber-500/12",
};

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }
  return `${(durationMs / 1000).toFixed(2)} s`;
}

function buildSuiteGroups(results: TestCaseResult[]): SuiteGroup[] {
  const groups = new Map<string, SuiteGroup>();

  for (const item of results) {
    const current = groups.get(item.suite) ?? {
      suite: item.suite,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration_ms: 0,
      results: [],
    };

    current.total += 1;
    current.duration_ms += item.duration_ms;
    current.results.push(item);

    if (item.status === "ok") current.passed += 1;
    if (item.status === "fail") current.failed += 1;
    if (item.status === "skip") current.skipped += 1;

    groups.set(item.suite, current);
  }

  return [...groups.values()].sort((left, right) => {
    if (left.failed !== right.failed) {
      return right.failed - left.failed;
    }
    return left.suite.localeCompare(right.suite);
  });
}

export default function TestsPage() {
  const [results, setResults] = useState<TestCaseResult[]>([]);
  const [summary, setSummary] = useState<TestRunSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [expectedTotal, setExpectedTotal] = useState<number>(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  function closeStream() {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }

  function resetRun() {
    setResults([]);
    setSummary(null);
    setError(null);
    setStartedAt(null);
    setGeneratedAt(null);
    setExpectedTotal(0);
  }

  function runTests() {
    closeStream();
    resetRun();
    setIsRunning(true);

    const stream = new EventSource("/backend/api/tests/stream");
    eventSourceRef.current = stream;

    stream.addEventListener("start", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as {
        total: number;
        started_at: string;
      };
      setExpectedTotal(payload.total);
      setStartedAt(payload.started_at);
    });

    stream.addEventListener("case", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as TestCaseResult;
      setResults((current) => [...current, payload]);
    });

    stream.addEventListener("summary", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as TestRunSummary;
      setSummary(payload);
    });

    stream.addEventListener("complete", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as {
        generated_at: string;
        summary: TestRunSummary;
        results: TestCaseResult[];
      };
      setGeneratedAt(payload.generated_at);
      setSummary(payload.summary);
      setResults(payload.results);
      setIsRunning(false);
      closeStream();
    });

    stream.addEventListener("error", (event) => {
      const maybeMessage = (event as MessageEvent).data;
      if (maybeMessage) {
        try {
          const payload = JSON.parse(maybeMessage) as { detail?: string };
          setError(payload.detail ?? "The live stream failed.");
        } catch {
          setError("The live stream failed.");
        }
      } else {
        setError("The live stream failed.");
      }
      setIsRunning(false);
      closeStream();
    });

    stream.onerror = () => {
      setIsRunning(false);
      closeStream();
    };
  }

  const suiteGroups = useMemo(() => buildSuiteGroups(results), [results]);
  const completedCount = results.length;
  const liveMessage = isRunning
    ? `Executing assignments... ${completedCount}/${expectedTotal || "?"} completed.`
    : error
      ? `Last error: ${error}`
      : summary
        ? `Run complete: ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped.`
        : "Press Run tests to start a live execution stream.";

  return (
    <main className="min-h-screen overflow-hidden bg-[#03110a] text-[#baffc9]">
      <div className="pointer-events-none fixed inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(32,255,136,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(42,188,255,0.12),transparent_28%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(80,255,157,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(80,255,157,0.05)_1px,transparent_1px)] bg-[size:34px_34px]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(16,185,129,0.05),transparent)] animate-[scanline_6s_linear_infinite]" />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-12">
        <header className="rounded-[2rem] border border-emerald-500/25 bg-black/45 p-6 shadow-[0_0_80px_rgba(16,185,129,0.08)] backdrop-blur-md">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="font-ui text-xs uppercase tracking-[0.44em] text-emerald-300/72">
                Multimedia Analyzer / Test Console
              </p>
              <h1 className="mt-3 font-ui text-4xl font-semibold tracking-[-0.08em] text-[#d8ffe3] sm:text-5xl">
                /tests
              </h1>
              <p className="mt-4 max-w-2xl font-mono text-sm leading-7 text-emerald-100/78 sm:text-base">
                Launch the backend suite manually and watch each assignment appear in real time as
                the runner completes it.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="rounded-full border border-emerald-400/25 bg-emerald-500/8 px-5 py-3 font-ui text-sm font-medium text-emerald-100/86 hover:border-emerald-300/45 hover:bg-emerald-500/14"
              >
                Return to dashboard
              </Link>
              <button
                type="button"
                onClick={runTests}
                disabled={isRunning}
                className="rounded-full border border-emerald-300/40 bg-emerald-300 px-6 py-3 font-ui text-sm font-semibold text-[#042b17] shadow-[0_0_24px_rgba(74,222,128,0.28)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isRunning ? "Streaming test run..." : "Run tests"}
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-[1.4rem] border border-emerald-500/20 bg-[#021109] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.04)]">
            <p className="font-mono text-sm text-emerald-100/82">
              <span className="mr-3 text-emerald-300">{">"}</span>
              {liveMessage}
            </p>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Queued", value: expectedTotal || "—" },
            { label: "Completed", value: completedCount || "—" },
            { label: "Passed", value: summary?.passed ?? "—" },
            { label: "Failed", value: summary?.failed ?? "—" },
            { label: "Runtime", value: summary ? formatDuration(summary.duration_ms) : "—" },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-[1.6rem] border border-emerald-500/16 bg-black/36 p-5 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.04)] backdrop-blur-sm"
            >
              <p className="font-ui text-xs uppercase tracking-[0.32em] text-emerald-300/58">
                {item.label}
              </p>
              <p className="mt-4 font-mono text-3xl font-semibold text-[#e5ffec]">{item.value}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_2.05fr]">
          <article className="rounded-[2rem] border border-emerald-500/20 bg-black/48 p-6 backdrop-blur-md">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-ui text-xs uppercase tracking-[0.3em] text-emerald-300/60">
                  Mission status
                </p>
                <h2 className="mt-3 font-ui text-2xl font-semibold tracking-[-0.06em] text-[#ebffee]">
                  {isRunning
                    ? "STREAM IN PROGRESS"
                    : summary
                      ? summary.status === "ok"
                        ? "SYSTEM STABLE"
                        : "BREACH DETECTED"
                      : "AWAITING EXECUTION"}
                </h2>
              </div>
            </div>

            <div className="mt-6 space-y-3 font-mono text-sm text-emerald-100/78">
              <p>{">"} suite target: `tests/`</p>
              <p>{">"} backend route: `GET /api/tests/stream`</p>
              <p>{">"} started: {startedAt ? new Date(startedAt).toLocaleString() : "not started"}</p>
              <p>{">"} completed: {generatedAt ? new Date(generatedAt).toLocaleString() : "not finished"}</p>
              <p>{">"} suite groups: {suiteGroups.length || "—"}</p>
            </div>

            {error ? (
              <div className="mt-6 rounded-[1.4rem] border border-rose-500/35 bg-rose-500/12 p-4 font-mono text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <div className="mt-6 space-y-3">
              {suiteGroups.length ? (
                suiteGroups.map((group) => (
                  <div
                    key={group.suite}
                    className="rounded-[1.2rem] border border-emerald-500/14 bg-[#03130b] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-ui text-[11px] uppercase tracking-[0.24em] text-emerald-300/54">
                          Suite
                        </p>
                        <p className="mt-2 font-mono text-sm text-[#e9fff0]">{group.suite}</p>
                      </div>
                      <span className="rounded-full border border-emerald-500/18 bg-emerald-500/8 px-3 py-1 font-mono text-xs text-emerald-100/76">
                        {formatDuration(group.duration_ms)}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-emerald-500/26 bg-emerald-500/12 px-3 py-1 font-ui text-[11px] uppercase tracking-[0.18em] text-emerald-200">
                        ok {group.passed}
                      </span>
                      <span className="rounded-full border border-rose-500/26 bg-rose-500/12 px-3 py-1 font-ui text-[11px] uppercase tracking-[0.18em] text-rose-200">
                        fail {group.failed}
                      </span>
                      <span className="rounded-full border border-amber-500/26 bg-amber-500/12 px-3 py-1 font-ui text-[11px] uppercase tracking-[0.18em] text-amber-200">
                        skip {group.skipped}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/4 px-3 py-1 font-ui text-[11px] uppercase tracking-[0.18em] text-emerald-100/70">
                        total {group.total}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.2rem] border border-dashed border-emerald-500/18 bg-[#03130b] p-4 font-mono text-sm text-emerald-100/70">
                  No output yet. Press `Run tests` to begin the live stream.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-[2rem] border border-emerald-500/20 bg-black/52 p-3 backdrop-blur-md">
            <div className="max-h-[68vh] space-y-5 overflow-y-auto pr-1">
              {suiteGroups.length ? (
                suiteGroups.map((group) => (
                  <section
                    key={group.suite}
                    className="rounded-[1.5rem] border border-emerald-500/12 bg-[#04150d]/95 p-4 shadow-[0_0_0_1px_rgba(16,185,129,0.03)]"
                  >
                    <div className="flex flex-col gap-3 border-b border-emerald-500/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-ui text-[11px] uppercase tracking-[0.28em] text-emerald-300/52">
                          {group.suite}
                        </p>
                        <p className="mt-2 font-mono text-sm text-emerald-100/72">
                          {group.total} assignments / {formatDuration(group.duration_ms)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-emerald-500/24 bg-emerald-500/10 px-3 py-1 font-ui text-[11px] uppercase tracking-[0.18em] text-emerald-200">
                          ok {group.passed}
                        </span>
                        <span className="rounded-full border border-rose-500/24 bg-rose-500/10 px-3 py-1 font-ui text-[11px] uppercase tracking-[0.18em] text-rose-200">
                          fail {group.failed}
                        </span>
                        <span className="rounded-full border border-amber-500/24 bg-amber-500/10 px-3 py-1 font-ui text-[11px] uppercase tracking-[0.18em] text-amber-200">
                          skip {group.skipped}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {group.results.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-[1.2rem] border border-emerald-500/10 bg-black/34 p-4"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <h3 className="font-mono text-base font-semibold text-[#ebfff1]">
                                {item.assignment}
                              </h3>
                              <p className="mt-2 break-all font-mono text-xs text-emerald-100/42">
                                {item.id}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-emerald-500/18 bg-emerald-500/8 px-3 py-1 font-mono text-xs text-emerald-100/76">
                                {formatDuration(item.duration_ms)}
                              </span>
                              <span
                                className={`rounded-full border px-3 py-1 font-ui text-xs font-semibold uppercase tracking-[0.22em] ${statusTone[item.status]}`}
                              >
                                {item.status}
                              </span>
                            </div>
                          </div>

                          {item.detail ? (
                            <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-[1rem] border border-white/6 bg-black/60 p-4 font-mono text-xs leading-6 text-emerald-100/72">
                              {item.detail}
                            </pre>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <div className="flex min-h-[24rem] items-center justify-center rounded-[1.6rem] border border-dashed border-emerald-500/18 bg-black/28 p-8 text-center">
                  <div>
                    <p className="font-ui text-xs uppercase tracking-[0.3em] text-emerald-300/56">
                      Console idle
                    </p>
                    <p className="mt-4 font-mono text-sm leading-7 text-emerald-100/72">
                      Nothing is loaded yet. Press `Run tests` and the results will start appearing
                      here one by one in live mode.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
