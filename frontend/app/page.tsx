"use client";

import Link from "next/link";
import {
  FormEvent,
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";

import { FeedPanel } from "@/components/dashboard/FeedPanel";
import { ControlSidebar } from "@/components/dashboard/ControlSidebar";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickUploadPanel } from "@/components/dashboard/QuickUploadPanel";
import { ToastStack } from "@/components/dashboard/ToastStack";
import { ActivityPulse } from "@/components/dashboard/ActivityPulse";
import {
  AuthMode,
  BusyAction,
  DashboardProfile,
  FeedFilter,
  MediaAsset,
  MediaListResponse,
  MediaListResult,
  SortMode,
  StatusTone,
  ToastItem,
} from "@/components/dashboard/types";
import {
  MAX_UPLOAD_SIZE_MB,
  matchesAssetFilter,
  matchesAssetSearch,
  normalizeWatchlistInput,
  sortAssets,
  SUPPORTED_UPLOAD_EXTENSIONS,
  collectFeedStats,
} from "@/components/dashboard/utils";
import api, { getApiErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearToken, getSession, Session, storeToken } from "@/lib/auth";

const FEED_PAGE_SIZE = 12;

function optimisticAssetFromFile(file: File): MediaAsset {
  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() ?? "" : "";
  const mediaType = [".mp4", ".mov", ".avi", ".mkv", ".webm"].includes(`.${extension}`)
    ? "video"
    : "audio";
  const now = new Date().toISOString();

  return {
    id: -Date.now(),
    original_filename: file.name,
    extension,
    media_type: mediaType,
    status: "queued",
    processing_stage: "Uploading file",
    transcript: null,
    transcript_excerpt: null,
    summary: null,
    entities: [],
    entity_count: 0,
    alert_matches: [],
    alert_count: 0,
    error_message: null,
    processing_started_at: null,
    processing_finished_at: null,
    processing_duration_ms: null,
    retry_count: 0,
    created_at: now,
    updated_at: now,
  };
}

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [watchlistInput, setWatchlistInput] = useState("");
  const [savedWatchlist, setSavedWatchlist] = useState<string[]>([]);
  const [status, setStatus] = useState("Sign in to start.");
  const [statusTone, setStatusTone] = useState<StatusTone>("neutral");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [feedTotal, setFeedTotal] = useState(0);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [recapAssetId, setRecapAssetId] = useState<number | null>(null);
  const [deletingAssetId, setDeletingAssetId] = useState<number | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [query, setQuery] = useState("");
  const syncDashboardRef = useRef<(options?: { quiet?: boolean }) => Promise<void>>(async () => {});
  const refreshAssetsRef = useRef<(options?: { quiet?: boolean }) => Promise<void>>(async () => {});

  const deferredAssets = useDeferredValue(assets);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const liveStats = collectFeedStats(assets);
  const watchlistEntries = normalizeWatchlistInput(watchlistInput);
  const attentionAssets = sortAssets(
    assets.filter((asset) => asset.alert_count > 0),
    "alerts",
  ).slice(0, 3);
  const filteredAssets = sortAssets(
    deferredAssets.filter(
      (asset) => matchesAssetFilter(asset, feedFilter) && matchesAssetSearch(asset, deferredQuery),
    ),
    sortMode,
  );

  function updateStatus(message: string, tone: StatusTone = "neutral") {
    setStatus(message);
    setStatusTone(tone);
  }

  function dismissToast(toastId: number) {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }

  function notify(message: string, tone: StatusTone = "neutral") {
    const toastId = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current.slice(-2), { id: toastId, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== toastId));
    }, 3200);
  }

  function announce(message: string, tone: StatusTone = "neutral") {
    updateStatus(message, tone);
    notify(message, tone);
  }

  function applySession(nextSession: Session | null) {
    setSession(nextSession);
  }

  function resetSession(message: string) {
    clearToken();
    applySession(null);
    setAssets([]);
    setFeedTotal(0);
    setWatchlistInput("");
    setSavedWatchlist([]);
    setPassword("");
    setFile(null);
    setFileInputKey((value) => value + 1);
    setLastUpdatedAt(null);
    announce(message, "error");
  }

  async function fetchProfile(): Promise<DashboardProfile> {
    const response = await api.get("/api/auth/me");
    const watchedEntities = Array.isArray(response.data.watched_entities)
      ? (response.data.watched_entities as string[])
      : [];

    return {
      email: response.data.email ?? null,
      watchedEntities,
    };
  }

  async function fetchAssets(offset = 0, limit = FEED_PAGE_SIZE): Promise<MediaListResult> {
    const response = await api.get("/api/media", { params: { limit, offset } });
    const payload = response.data as Partial<MediaListResponse> | MediaAsset[];
    if (Array.isArray(payload)) {
      return {
        items: payload,
        limit,
        offset,
        total: payload.length,
      };
    }
    return {
      items: Array.isArray(payload.items) ? payload.items : [],
      limit: typeof payload.limit === "number" ? payload.limit : limit,
      offset: typeof payload.offset === "number" ? payload.offset : offset,
      total: typeof payload.total === "number" ? payload.total : 0,
    };
  }

  async function syncDashboard(options?: { quiet?: boolean }) {
    if (!options?.quiet) {
      setIsRefreshing(true);
    }

    try {
      const [profile, nextAssets] = await Promise.all([fetchProfile(), fetchAssets(0, FEED_PAGE_SIZE)]);

      startTransition(() => {
        setWatchlistInput(profile.watchedEntities.join(", "));
        setSavedWatchlist(profile.watchedEntities);
        setAssets(nextAssets.items);
        setFeedTotal(nextAssets.total);
        setLastUpdatedAt(new Date().toISOString());
      });

      if (!options?.quiet) {
        announce("Dashboard data synchronized.", "success");
      }
    } catch (error) {
      if (isUnauthorizedError(error)) {
        resetSession("Session expired. Sign in again.");
      } else if (!options?.quiet) {
        announce(getApiErrorMessage(error), "error");
      }
    } finally {
      setIsInitializing(false);
      if (!options?.quiet) {
        setIsRefreshing(false);
      }
    }
  }

  async function refreshAssets(options?: { quiet?: boolean }) {
    if (!options?.quiet) {
      setIsRefreshing(true);
    }

    try {
      const nextAssets = await fetchAssets(0, FEED_PAGE_SIZE);
      startTransition(() => {
        setAssets(nextAssets.items);
        setFeedTotal(nextAssets.total);
        setLastUpdatedAt(new Date().toISOString());
      });

      if (!options?.quiet) {
        announce("Analysis feed refreshed.", "success");
      }
    } catch (error) {
      if (isUnauthorizedError(error)) {
        resetSession("Session expired. Sign in again.");
      } else if (!options?.quiet) {
        announce(getApiErrorMessage(error), "error");
      }
    } finally {
      if (!options?.quiet) {
        setIsRefreshing(false);
      }
    }
  }

  async function handleLoadMore() {
    if (!session || isLoadingMore || assets.length >= feedTotal) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const nextPage = await fetchAssets(assets.length, FEED_PAGE_SIZE);
      startTransition(() => {
        setAssets((current) => {
          const seen = new Set(current.map((asset) => asset.id));
          const merged = [...current];
          for (const item of nextPage.items) {
            if (!seen.has(item.id)) {
              merged.push(item);
            }
          }
          return merged;
        });
        setFeedTotal(nextPage.total);
        setLastUpdatedAt(new Date().toISOString());
      });
    } catch (error) {
      if (isUnauthorizedError(error)) {
        resetSession("Session expired. Sign in again.");
      } else {
        announce(getApiErrorMessage(error), "error");
      }
    } finally {
      setIsLoadingMore(false);
    }
  }

  syncDashboardRef.current = syncDashboard;
  refreshAssetsRef.current = refreshAssets;

  useEffect(() => {
    const restored = getSession();
    if (!restored) {
      setIsInitializing(false);
      return;
    }

    applySession(restored);
    updateStatus("Workspace ready.", "success");
    void syncDashboardRef.current({ quiet: true });
  }, []);

  useEffect(() => {
    if (!session || liveStats.pending === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }
      void refreshAssetsRef.current({ quiet: true });
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, [liveStats.pending, session]);

  async function handleRegister() {
    if (!email || !password) {
      announce("Email and password are required.", "error");
      return;
    }
    if (password.length < 8) {
      announce("Password must be at least 8 characters.", "error");
      return;
    }

    setBusyAction("register");
    try {
      const response = await api.post("/api/auth/register", { email, password });
      storeToken(response.data.access_token);
      applySession(getSession());
      setPassword("");
      setAuthMode("login");
      announce("Account ready.", "success");
      await syncDashboard({ quiet: true });
    } catch (error) {
      announce(getApiErrorMessage(error), "error");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password) {
      announce("Email and password are required.", "error");
      return;
    }
    if (password.length < 8) {
      announce("Password must be at least 8 characters.", "error");
      return;
    }

    setBusyAction("login");
    try {
      const response = await api.post("/api/auth/login", { email, password });
      storeToken(response.data.access_token);
      applySession(getSession());
      setPassword("");
      announce("Authenticated.", "success");
      await syncDashboard({ quiet: true });
    } catch (error) {
      announce(getApiErrorMessage(error), "error");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    if (authMode === "register") {
      event.preventDefault();
      await handleRegister();
      return;
    }
    await handleLogin(event);
  }

  async function handleWatchlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      announce("Sign in before editing the watchlist.", "error");
      return;
    }

    const entities = normalizeWatchlistInput(watchlistInput);
    const previousWatchlist = savedWatchlist;

    setBusyAction("watchlist");
    setSavedWatchlist(entities);
    setWatchlistInput(entities.join(", "));
    updateStatus("Saving watchlist...", "success");

    try {
      const response = await api.post("/api/media/watchlist/settings", { entities });
      const nextWatchlist = Array.isArray(response.data.entities)
        ? (response.data.entities as string[])
        : entities;
      setSavedWatchlist(nextWatchlist);
      setWatchlistInput(nextWatchlist.join(", "));
      announce("Watchlist saved.", "success");
    } catch (error) {
      setSavedWatchlist(previousWatchlist);
      setWatchlistInput(previousWatchlist.join(", "));
      if (isUnauthorizedError(error)) {
        resetSession("Session expired. Sign in again.");
      } else {
        announce(getApiErrorMessage(error), "error");
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      announce("Sign in before uploading media.", "error");
      return;
    }
    if (!file) {
      announce("Select a file first.", "error");
      return;
    }

    const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!SUPPORTED_UPLOAD_EXTENSIONS.includes(extension)) {
      announce("Unsupported file type selected.", "error");
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
      announce(`File exceeds the ${MAX_UPLOAD_SIZE_MB} MB limit.`, "error");
      return;
    }

    const tempAsset = optimisticAssetFromFile(file);

    setBusyAction("upload");
    setAssets((current) => [tempAsset, ...current]);
    setFeedTotal((current) => current + 1);
    updateStatus("Uploading...", "success");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/api/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFile(null);
      setFileInputKey((value) => value + 1);
      announce(response.data.message || "Queued.", "success");
      await refreshAssets({ quiet: true });
    } catch (error) {
      setAssets((current) => current.filter((asset) => asset.id !== tempAsset.id));
      setFeedTotal((current) => Math.max(0, current - 1));
      if (isUnauthorizedError(error)) {
        resetSession("Session expired. Sign in again.");
      } else {
        announce(getApiErrorMessage(error), "error");
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGenerateRecap(assetId: number) {
    if (!session) {
      announce("Sign in before generating a recap.", "error");
      return;
    }

    setBusyAction("recap");
    setRecapAssetId(assetId);
    updateStatus("Generating recap...", "success");

    try {
      const response = await api.post(`/api/media/${assetId}/recap`);
      const nextAsset = response.data as MediaAsset;
      setAssets((current) =>
        current.map((asset) => (asset.id === assetId ? nextAsset : asset)),
      );
      announce("Recap ready.", "success");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        resetSession("Session expired. Sign in again.");
      } else {
        announce(getApiErrorMessage(error), "error");
      }
    } finally {
      setBusyAction(null);
      setRecapAssetId(null);
    }
  }

  async function handleDeleteAsset(assetId: number) {
    if (!session) {
      announce("Sign in before deleting uploads.", "error");
      return;
    }

    setBusyAction("delete");
    setDeletingAssetId(assetId);

    try {
      await api.delete(`/api/media/${assetId}`);
      setAssets((current) => current.filter((asset) => asset.id !== assetId));
      setFeedTotal((current) => Math.max(0, current - 1));
      if (recapAssetId === assetId) {
        setRecapAssetId(null);
      }
      announce("Upload deleted.", "success");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        resetSession("Session expired. Sign in again.");
      } else {
        announce(getApiErrorMessage(error), "error");
      }
    } finally {
      setBusyAction(null);
      setDeletingAssetId(null);
    }
  }

  async function handleClearAll() {
    if (!session) {
      announce("Sign in before clearing uploads.", "error");
      return;
    }
    if (assets.length === 0) {
      announce("There is nothing to clear.", "neutral");
      return;
    }

    setBusyAction("delete");
    setIsClearingAll(true);

    try {
      await api.delete("/api/media");
      setAssets([]);
      setFeedTotal(0);
      setRecapAssetId(null);
      announce("All uploads cleared.", "success");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        resetSession("Session expired. Sign in again.");
      } else {
        announce(getApiErrorMessage(error), "error");
      }
    } finally {
      setBusyAction(null);
      setIsClearingAll(false);
    }
  }

  function handleLogout() {
    clearToken();
    applySession(null);
    setAssets([]);
    setWatchlistInput("");
    setSavedWatchlist([]);
    setPassword("");
    setFile(null);
    setFileInputKey((value) => value + 1);
    setLastUpdatedAt(null);
    announce("Signed out.", "neutral");
  }

  const controlsDisabled = busyAction !== null;
  const hasFeedFilters = feedFilter !== "all" || query.trim().length > 0;
  const nextStepLabel = !session
    ? authMode === "register"
      ? "Create your account to open the workspace."
      : "Sign in to continue into upload."
    : file
      ? "Your file is staged. Send it to the analysis queue."
      : liveStats.pending > 0
        ? "Uploads are processing. Review the feed below."
        : "Choose a file or review the latest completed items.";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[108rem] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
      <ToastStack onDismiss={dismissToast} toasts={toasts} />
      <section className="section-shell glass-panel relative overflow-hidden rounded-[2.2rem] p-5 sm:p-6">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(213,106,58,0.45),transparent)]" />
        <div className="absolute -right-6 top-4 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(25,74,90,0.12),transparent_70%)] blur-2xl" />
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="font-ui text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--accent)]">
              Multimedia Analyzer
            </p>
            <h1 className="font-display mt-4 max-w-4xl text-4xl leading-[0.92] tracking-[-0.06em] text-[color:var(--accent-strong)] sm:text-5xl lg:text-6xl">
              Media review that feels organized from the first click.
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-[color:var(--muted)] sm:text-base">
              One workspace for uploads, alerts, transcripts, and fast recaps. The interface is tuned for quick intake and low-friction review, not for hunting around the screen.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="font-ui rounded-full border border-[color:var(--line)] bg-white/76 px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                Authenticate
              </span>
              <span className="font-ui rounded-full border border-[color:var(--line)] bg-white/76 px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                Upload
              </span>
              <span className="font-ui rounded-full border border-[color:var(--line)] bg-white/76 px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                Review
              </span>
              <span className="font-ui rounded-full border border-[color:var(--line)] bg-white/76 px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                Recap
              </span>
              <Link
                href="/tests"
                className="font-ui rounded-full border border-[color:var(--line-strong)] bg-[color:var(--warm-soft)] px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]"
              >
                Test console
              </Link>
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-[rgba(255,255,255,0.45)] bg-[linear-gradient(145deg,#16343e,#194a5a,#d56a3a)] px-5 py-5 text-white shadow-[0_34px_90px_-48px_rgba(25,74,90,0.55)] xl:max-w-sm">
            <p className="font-ui text-[0.64rem] uppercase tracking-[0.24em] text-white/50">Next action</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
              {session?.email ?? "Guest mode"}
            </p>
            <p className="mt-3 text-sm leading-7 text-white/76">
              {nextStepLabel}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="font-ui rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-white/82">
                {liveStats.pending > 0 ? "Processing live" : "Queue clear"}
              </span>
              <span className="font-ui rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-white/82">
                {liveStats.alerted} alerted
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white/66 p-4">
            <p className="font-ui text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--accent)]">
              How to use it
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["1", "Get access", "Sign in or create an account to unlock upload and saved watchlists."],
                ["2", "Send media", "Drop a file into the intake panel and let the queue pick it up."],
                ["3", "Review output", "Watch alerts, open transcript previews, and generate a recap on demand."],
              ].map(([step, title, detail]) => (
                <div className="rounded-[1.35rem] border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-4" key={step}>
                  <p className="font-ui text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">
                    Step {step}
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[color:var(--accent-strong)]">
                    {title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                    {detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(220,231,225,0.92),rgba(255,255,255,0.8))] p-4">
            <p className="font-ui text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--accent)]">
              Focus
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--accent-strong)]">
              Keep the queue moving.
            </p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
              The top section is for action. The center feed is for review. The right rail is for status and watchlist control.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <ActivityPulse busyAction={busyAction} nextStepLabel={nextStepLabel} stats={liveStats} />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            detail="all jobs"
            label="Tracked jobs"
            value={liveStats.total}
          />
          <MetricCard
            detail="running now"
            label="In progress"
            value={liveStats.pending}
          />
          <MetricCard
            detail="watch hits"
            label="Alerted"
            value={liveStats.alerted}
          />
          <MetricCard
            detail="extracted"
            label="Entities"
            value={liveStats.entities}
          />
        </div>
      </section>

      <QuickUploadPanel
        authMode={authMode}
        busyAction={busyAction}
        controlsDisabled={controlsDisabled}
        email={email}
        file={file}
        fileInputKey={fileInputKey}
        isInitializing={isInitializing}
        onAuthModeChange={setAuthMode}
        onAuthSubmit={handleAuthSubmit}
        onEmailChange={setEmail}
        onFileChange={setFile}
        onFileClear={() => {
          setFile(null);
          setFileInputKey((value) => value + 1);
        }}
        onPasswordChange={setPassword}
        onRefresh={() => void syncDashboard()}
        onUpload={handleUpload}
        password={password}
        session={session}
        statusTone={statusTone}
      />

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.82fr] xl:items-start">
        <FeedPanel
          assets={deferredAssets}
          attentionAssets={attentionAssets}
          deletingAssetId={deletingAssetId}
          deferredAssetsAreStale={deferredAssets !== assets}
          deferredQueryIsStale={deferredQuery !== query.trim().toLowerCase()}
          feedTotal={feedTotal}
          feedFilter={feedFilter}
          filteredAssets={filteredAssets}
          hasFeedFilters={hasFeedFilters}
          isInitializing={isInitializing}
          isLoadingMore={isLoadingMore}
          isRefreshing={isRefreshing}
          isClearingAll={isClearingAll}
          recapAssetId={recapAssetId}
          onClearAll={handleClearAll}
          onDeleteAsset={handleDeleteAsset}
          onFilterChange={setFeedFilter}
          onGenerateRecap={handleGenerateRecap}
          onLoadMore={handleLoadMore}
          onQueryChange={setQuery}
          onRefresh={() => void syncDashboard()}
          onSortChange={setSortMode}
          query={query}
          sessionActive={Boolean(session)}
          sortMode={sortMode}
        />

        <ControlSidebar
          authMode={authMode}
          busyAction={busyAction}
          controlsDisabled={controlsDisabled}
          email={email}
          isInitializing={isInitializing}
          lastUpdatedAt={lastUpdatedAt}
          onAuthModeChange={setAuthMode}
          onEmailChange={setEmail}
          onAuthSubmit={handleAuthSubmit}
          onLogout={handleLogout}
          onPasswordChange={setPassword}
          onWatchlist={handleWatchlist}
          password={password}
          session={session}
          stats={liveStats}
          status={status}
          statusTone={statusTone}
          watchlistEntries={watchlistEntries}
          watchlistInput={watchlistInput}
          onWatchlistChange={setWatchlistInput}
          onWatchlistClear={() => setWatchlistInput("")}
        />
      </section>
    </main>
  );
}
