import { FeedFilter, FeedStats, MediaAsset, SortMode, StatusTone } from "./types";

export const MAX_UPLOAD_SIZE_MB = 250;
export const SUPPORTED_UPLOAD_EXTENSIONS = [
  ".aac",
  ".avi",
  ".flac",
  ".m4a",
  ".mkv",
  ".mov",
  ".mp3",
  ".mp4",
  ".wav",
  ".webm",
];
export const PIPELINE_STEPS = [
  "Sign in",
  "Upload file",
  "Background analysis",
  "Review signals",
];
export const FILTER_OPTIONS: Array<{ key: FeedFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "attention", label: "Attention" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
];
export const SORT_OPTIONS: Array<{ key: SortMode; label: string }> = [
  { key: "recent", label: "Newest first" },
  { key: "alerts", label: "Most alerts" },
  { key: "entities", label: "Most entities" },
  { key: "name", label: "Filename" },
];
export const PENDING_STATUSES = new Set(["queued", "processing"]);

export function formatLastUpdated(timestamp: string | null): string | null {
  if (!timestamp) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

export function formatDateTime(timestamp: string | null): string | null {
  if (!timestamp) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function formatBytes(size: number): string {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatSessionExpiry(expiresAt: number | null): string {
  if (!expiresAt) {
    return "No session";
  }

  const minutes = Math.max(0, Math.round((expiresAt - Date.now()) / 60000));
  if (minutes === 0) {
    return "Expires soon";
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainder}m`;
}

export function normalizeWatchlistInput(value: string): string[] {
  return Array.from(
    new Map(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => [item.toLowerCase(), item]),
    ).values(),
  );
}

export function collectFeedStats(assets: MediaAsset[]): FeedStats {
  const stats: FeedStats = {
    total: assets.length,
    pending: 0,
    completed: 0,
    alerted: 0,
    failed: 0,
    entities: 0,
  };

  for (const asset of assets) {
    if (PENDING_STATUSES.has(asset.status)) {
      stats.pending += 1;
    }
    if (asset.status === "completed") {
      stats.completed += 1;
    }
    if (asset.status === "alerted") {
      stats.alerted += 1;
      stats.completed += 1;
    }
    if (asset.status === "failed") {
      stats.failed += 1;
    }
    stats.entities += asset.entity_count;
  }

  return stats;
}

export function getStatusPanelClasses(tone: StatusTone): string {
  switch (tone) {
    case "error":
      return "border-rose-200/80 bg-rose-50/92 text-rose-950";
    case "success":
      return "border-emerald-200/80 bg-emerald-50/92 text-emerald-950";
    default:
      return "border-[color:var(--line)] bg-white/84 text-[color:var(--foreground)]";
  }
}

export function getActionSurfaceClasses(tone: StatusTone): string {
  if (tone === "error") {
    return "border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,241,242,0.96),rgba(255,255,255,0.92))] shadow-[0_22px_60px_-42px_rgba(244,63,94,0.35)]";
  }
  if (tone === "success") {
    return "border-emerald-200/70 bg-[linear-gradient(180deg,rgba(236,253,245,0.96),rgba(255,255,255,0.92))] shadow-[0_22px_60px_-42px_rgba(16,185,129,0.28)]";
  }
  return "border-[color:var(--line)] bg-white/84 shadow-[0_22px_60px_-44px_rgba(25,74,90,0.2)]";
}

export function getAssetBadgeClasses(status: string): string {
  if (status === "failed") {
    return "bg-rose-100 text-rose-800 ring-1 ring-rose-200";
  }
  if (status === "alerted") {
    return "bg-amber-100 text-amber-900 ring-1 ring-amber-200";
  }
  if (status === "completed") {
    return "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200";
  }
  return "bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)] ring-1 ring-[color:var(--line-strong)]";
}

export function getAssetFrameClasses(status: string): string {
  if (status === "failed") {
    return "border-rose-200 bg-white shadow-[0_24px_70px_-40px_rgba(225,29,72,0.32)]";
  }
  if (status === "alerted") {
    return "border-amber-200 bg-white shadow-[0_24px_70px_-40px_rgba(245,158,11,0.34)]";
  }
  if (status === "completed") {
    return "border-emerald-200 bg-white shadow-[0_24px_70px_-40px_rgba(5,150,105,0.24)]";
  }
  return "border-[color:var(--line)] bg-white shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)]";
}

export function getAssetSummary(asset: MediaAsset): string {
  if (asset.summary) {
    return asset.summary;
  }
  if (asset.status === "failed") {
    return "Processing stopped before the transcript became available.";
  }
  if (PENDING_STATUSES.has(asset.status)) {
    return "Transcript is still being generated. The feed updates automatically while analysis is active.";
  }
  return "Full transcript is ready. Generate a short recap when you need one.";
}

export function getStatusDetail(status: string): string {
  if (status === "failed") {
    return "Check error and retry.";
  }
  if (status === "alerted") {
    return "Transcript ready. Watchlist match found.";
  }
  if (status === "completed") {
    return "Transcript ready.";
  }
  if (status === "processing") {
    return "Building transcript now.";
  }
  return "Waiting in queue.";
}

export function matchesAssetFilter(asset: MediaAsset, filter: FeedFilter): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter === "attention") {
    return asset.alert_count > 0;
  }
  if (filter === "active") {
    return PENDING_STATUSES.has(asset.status);
  }
  if (filter === "completed") {
    return asset.status === "completed" || asset.status === "alerted";
  }
  return asset.status === "failed";
}

export function matchesAssetSearch(asset: MediaAsset, query: string): boolean {
  if (!query) {
    return true;
  }

  const haystack = [
    asset.original_filename,
    asset.summary ?? "",
    asset.transcript_excerpt ?? "",
    asset.processing_stage,
    asset.entities.map((entity) => `${entity.text} ${entity.label}`).join(" "),
    asset.alert_matches.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function sortAssets(assets: MediaAsset[], sortMode: SortMode): MediaAsset[] {
  return [...assets].sort((left, right) => {
    if (sortMode === "alerts") {
      return (
        right.alert_count - left.alert_count ||
        right.entity_count - left.entity_count ||
        right.id - left.id
      );
    }
    if (sortMode === "entities") {
      return (
        right.entity_count - left.entity_count ||
        right.alert_count - left.alert_count ||
        right.id - left.id
      );
    }
    if (sortMode === "name") {
      return left.original_filename.localeCompare(right.original_filename);
    }
    return right.id - left.id;
  });
}

export function getFilterCount(assets: MediaAsset[], filter: FeedFilter): number {
  return assets.filter((asset) => matchesAssetFilter(asset, filter)).length;
}
