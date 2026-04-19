import { FormEvent } from "react";

import { Session } from "@/lib/auth";

import { AuthMode, BusyAction, FeedStats, StatusTone } from "./types";
import {
  PIPELINE_STEPS,
  formatLastUpdated,
  formatSessionExpiry,
  getActionSurfaceClasses,
  getStatusPanelClasses,
} from "./utils";

function SidebarCard({
  children,
  title,
  eyebrow,
}: {
  children: React.ReactNode;
  title: string;
  eyebrow: string;
}) {
  return (
    <section className="section-shell glass-panel rounded-[1.8rem] p-5">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--accent)]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--accent-strong)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function StatusPanel({
  lastUpdatedAt,
  onLogout,
  session,
  stats,
  status,
  statusTone,
}: {
  lastUpdatedAt: string | null;
  onLogout: () => void;
  session: Session | null;
  stats: FeedStats;
  status: string;
  statusTone: StatusTone;
}) {
  return (
    <section className="section-shell glass-panel relative overflow-hidden rounded-[2rem] p-5">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(25,74,90,0.12),transparent_70%)]" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--accent)]">
            Status
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--accent-strong)]">
            Workspace
          </h2>
        </div>
        {session ? (
          <button
            className="rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] hover:border-[color:var(--line-strong)] hover:bg-[color:var(--panel-muted)]"
            onClick={onLogout}
            type="button"
          >
            Log out
          </button>
        ) : null}
      </div>

      <div className={`mt-5 rounded-[1.55rem] border p-4 ${getStatusPanelClasses(statusTone)}`}>
        <p className="text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">
          System pulse
        </p>
        <p className="mt-3 text-sm font-medium leading-6">{status}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/80 p-4">
          <p className="text-[0.64rem] uppercase tracking-[0.2em] text-[color:var(--muted)]">
            User
          </p>
          <p className="mt-2 break-words text-base font-semibold text-[color:var(--accent-strong)]">
            {session?.email ?? "Guest"}
          </p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            {formatSessionExpiry(session?.expiresAt ?? null)}
          </p>
        </div>

        <div className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/80 p-4">
          <p className="text-[0.64rem] uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Last sync
          </p>
          <p className="mt-2 text-base font-semibold text-[color:var(--accent-strong)]">
            {formatLastUpdated(lastUpdatedAt) ?? "Not synced yet"}
          </p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            {stats.pending > 0 ? "Auto-refresh enabled" : "No active jobs"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-white px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
          {stats.pending} active
        </span>
        <span className="rounded-full bg-white px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
          {stats.alerted} alerted
        </span>
        <span className="rounded-full bg-white px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
          {stats.failed} failed
        </span>
      </div>
    </section>
  );
}

export function ControlSidebar({
  authMode,
  busyAction,
  controlsDisabled,
  email,
  isInitializing,
  lastUpdatedAt,
  onAuthModeChange,
  onEmailChange,
  onAuthSubmit,
  onLogout,
  onPasswordChange,
  onWatchlist,
  password,
  session,
  stats,
  status,
  statusTone,
  watchlistEntries,
  watchlistInput,
  onWatchlistChange,
  onWatchlistClear,
}: {
  authMode: AuthMode;
  busyAction: BusyAction;
  controlsDisabled: boolean;
  email: string;
  isInitializing: boolean;
  lastUpdatedAt: string | null;
  onAuthModeChange: (mode: AuthMode) => void;
  onEmailChange: (value: string) => void;
  onAuthSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onLogout: () => void;
  onPasswordChange: (value: string) => void;
  onWatchlist: (event: FormEvent<HTMLFormElement>) => void;
  password: string;
  session: Session | null;
  stats: FeedStats;
  status: string;
  statusTone: StatusTone;
  watchlistEntries: string[];
  watchlistInput: string;
  onWatchlistChange: (value: string) => void;
  onWatchlistClear: () => void;
}) {
  return (
    <div className="grid gap-5 xl:sticky xl:top-5 xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto xl:pr-1">
      <StatusPanel
        lastUpdatedAt={lastUpdatedAt}
        onLogout={onLogout}
        session={session}
        stats={stats}
        status={status}
        statusTone={statusTone}
      />

      {!session ? (
        <SidebarCard eyebrow="Access" title={authMode === "register" ? "Create Account" : "Sign In"}>
          <div className="mt-4 inline-flex rounded-full border border-[color:var(--line)] bg-white p-1">
            <button
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                authMode === "login"
                  ? "bg-[color:var(--accent-strong)] text-white"
                  : "text-[color:var(--muted)]"
              }`}
              onClick={() => onAuthModeChange("login")}
              type="button"
            >
              Sign in
            </button>
            <button
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                authMode === "register"
                  ? "bg-[color:var(--accent)] text-white"
                  : "text-[color:var(--muted)]"
              }`}
              onClick={() => onAuthModeChange("register")}
              type="button"
            >
              Create account
            </button>
          </div>

          <form className="mt-4" onSubmit={onAuthSubmit}>
            <div className="grid gap-3">
              <input
                autoComplete="email"
                className="w-full rounded-[1.15rem] border border-[color:var(--line)] bg-[color:var(--panel-muted)] px-4 py-3 text-[color:var(--foreground)] outline-none focus:border-[color:var(--line-strong)] focus:bg-white"
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="example@company.com"
                type="email"
                value={email}
              />
              <input
                autoComplete="new-password"
                className="w-full rounded-[1.15rem] border border-[color:var(--line)] bg-[color:var(--panel-muted)] px-4 py-3 text-[color:var(--foreground)] outline-none focus:border-[color:var(--line-strong)] focus:bg-white"
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder="Minimum 8 characters"
                type="password"
                value={password}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className={`rounded-full px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                  authMode === "register"
                    ? "bg-[color:var(--accent)] hover:bg-[#e75a31]"
                    : "bg-[color:var(--accent-strong)] hover:bg-[color:var(--accent)]"
                }`}
                disabled={controlsDisabled}
                type="submit"
              >
                {authMode === "register"
                  ? busyAction === "register"
                    ? "Creating account..."
                    : "Create account"
                  : busyAction === "login"
                    ? "Signing in..."
                    : "Sign in"}
              </button>
            </div>

            <p className="mt-3 text-sm text-[color:var(--muted)]">
              {authMode === "register" ? "New workspace access." : "Use your existing account."}
            </p>
          </form>
        </SidebarCard>
      ) : null}

      <SidebarCard eyebrow="Alerts" title="Watchlist">
        <form className="mt-4" onSubmit={onWatchlist}>
          <textarea
            className="min-h-48 w-full rounded-[1.4rem] border border-[color:var(--line)] bg-[color:var(--panel-muted)] px-4 py-4 text-[color:var(--foreground)] outline-none focus:border-[color:var(--line-strong)] focus:bg-white"
            disabled={!session || isInitializing}
            onChange={(event) => onWatchlistChange(event.target.value)}
            placeholder="OpenAI, Microsoft, European Union"
            value={watchlistInput}
          />

          <div className={`mt-4 rounded-[1.25rem] border p-4 transition-all duration-300 ${getActionSurfaceClasses(statusTone)}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[0.64rem] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Normalized list
              </p>
              <span className="rounded-full bg-white px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                {watchlistEntries.length} items
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {watchlistEntries.length > 0 ? (
                watchlistEntries.slice(0, 16).map((entity) => (
                  <span
                    className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-[color:var(--accent-strong)] ring-1 ring-[color:var(--line)]"
                    key={entity}
                  >
                    {entity}
                  </span>
                ))
              ) : (
                <p className="text-sm leading-6 text-[color:var(--muted)]">
                  Hint: names separated by commas.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className={`rounded-full px-5 py-3 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                busyAction === "watchlist"
                  ? "bg-emerald-700 shadow-[0_20px_50px_-34px_rgba(16,185,129,0.42)]"
                  : "bg-slate-950 hover:bg-slate-800"
              }`}
              disabled={controlsDisabled || !session || isInitializing}
              type="submit"
            >
              {busyAction === "watchlist" ? "Saving..." : "Save"}
            </button>
            <button
              className="rounded-full border border-[color:var(--line)] px-5 py-3 text-sm font-semibold text-[color:var(--foreground)] hover:bg-[color:var(--panel-muted)]"
              disabled={controlsDisabled}
              onClick={onWatchlistClear}
              type="button"
            >
              Clear
            </button>
          </div>
        </form>
      </SidebarCard>

      <section className="section-shell glass-panel rounded-[1.8rem] p-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--accent)]">
          Workflow
        </p>
        <div className="mt-4 grid gap-3">
          {PIPELINE_STEPS.map((step, index) => (
            <div
              className="rounded-[1.2rem] border border-[color:var(--line)] bg-white/66 px-4 py-3"
              key={step}
            >
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
                Step {index + 1}
              </p>
              <p className="mt-2 text-sm font-semibold text-[color:var(--accent-strong)]">
                {step}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
