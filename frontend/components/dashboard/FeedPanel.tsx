import { useEffect, useRef, useState } from "react";

import { FeedFilter, MediaAsset, SortMode } from "./types";
import {
  FILTER_OPTIONS,
  SORT_OPTIONS,
  formatDateTime,
  getAssetBadgeClasses,
  getAssetFrameClasses,
  getAssetSummary,
  getFilterCount,
  getStatusDetail,
} from "./utils";

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-[color:var(--accent-strong)] text-white shadow-[0_18px_40px_-30px_rgba(25,74,90,0.9)]"
          : "border border-[color:var(--line)] bg-white/80 text-[color:var(--foreground)] hover:bg-[color:var(--panel-muted)]"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function AssetCard({
  asset,
  animationDelayMs,
  isDeleting,
  isGeneratingRecap,
  onDelete,
  onGenerateRecap,
}: {
  asset: MediaAsset;
  animationDelayMs: number;
  isDeleting: boolean;
  isGeneratingRecap: boolean;
  onDelete: (assetId: number) => void;
  onGenerateRecap: (assetId: number) => void;
}) {
  const createdAt = formatDateTime(asset.created_at);
  const updatedAt = formatDateTime(asset.updated_at);
  const canGenerateRecap =
    Boolean(asset.transcript) && (asset.status === "completed" || asset.status === "alerted");

  return (
    <article
      className={`feed-card-enter relative overflow-hidden rounded-[1.9rem] border p-5 ${getAssetFrameClasses(asset.status)}`}
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(213,106,58,0.08),transparent_72%)]" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-lg font-semibold tracking-[-0.03em] text-[color:var(--accent-strong)]">
              {asset.original_filename}
            </h3>
            <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--panel-muted)] px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
              {asset.media_type}
            </span>
            <span className="rounded-full border border-[color:var(--line)] bg-white px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
              .{asset.extension}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            {createdAt ? <p>Created {createdAt}</p> : null}
            {updatedAt ? <p>Updated {updatedAt}</p> : null}
            <p>{asset.processing_stage}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-rose-800 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting}
            onClick={() => onDelete(asset.id)}
            type="button"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
          {asset.alert_count > 0 ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-amber-900">
              {asset.alert_count} alert{asset.alert_count === 1 ? "" : "s"}
            </span>
          ) : null}
          <span
            className={`rounded-full px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.2em] ${getAssetBadgeClasses(asset.status)}`}
          >
            {asset.status}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.28fr_0.72fr]">
        <div className="rounded-[1.55rem] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(239,232,219,0.78),rgba(255,255,255,0.84))] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
              Quick recap
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                {asset.entity_count} entities
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                {asset.alert_count} alerts
              </span>
            </div>
          </div>
          {canGenerateRecap ? (
            <div className="mt-3">
              <button
                className="rounded-full bg-[color:var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isGeneratingRecap}
                onClick={() => onGenerateRecap(asset.id)}
                type="button"
              >
                {isGeneratingRecap ? "Generating recap..." : asset.summary ? "Refresh recap" : "Generate recap"}
              </button>
            </div>
          ) : null}
          <p className="mt-4 text-[0.98rem] leading-7 text-[color:var(--foreground)]">
            {getAssetSummary(asset)}
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            {getStatusDetail(asset.status)}
          </p>
          {asset.transcript_excerpt ? (
            <div className="mt-4 rounded-[1.15rem] border border-white/70 bg-white/80 px-4 py-3">
              <p className="text-[0.63rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Transcript preview
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
                {asset.transcript_excerpt}
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4">
          <div className="rounded-[1.55rem] border border-[color:var(--line)] bg-white/88 p-4">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
              Entities
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {asset.entities.length > 0 ? (
                asset.entities.map((entity, index) => (
                  <span
                    className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1.5 text-sm font-medium text-[color:var(--accent-strong)]"
                    key={`${asset.id}-${entity.text}-${entity.label}-${index}`}
                  >
                    {entity.text}
                    <span className="ml-2 text-[0.7rem] uppercase tracking-[0.16em] text-[color:var(--muted)]">
                      {entity.label}
                    </span>
                  </span>
                ))
              ) : (
                <p className="text-sm leading-6 text-[color:var(--muted)]">
                  No entities extracted yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[1.55rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,245,226,0.86),rgba(255,237,210,0.82))] p-4">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-amber-800">
              Alert matches
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {asset.alert_matches.length > 0 ? (
                asset.alert_matches.map((match) => (
                  <span
                    className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-950"
                    key={`${asset.id}-${match}`}
                  >
                    {match}
                  </span>
                ))
              ) : (
                <p className="text-sm leading-6 text-amber-900">No matches.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {asset.transcript ? (
        <details className="mt-4 rounded-[1.4rem] border border-[color:var(--line)] bg-white/[0.86] p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold tracking-[0.01em] text-[color:var(--accent-strong)]">
            Open full transcript
          </summary>
          <p className="mt-4 text-sm leading-7 text-[color:var(--foreground)]">{asset.transcript}</p>
        </details>
      ) : null}

      {asset.error_message ? (
        <div className="mt-4 rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {asset.error_message}
        </div>
      ) : null}
    </article>
  );
}

function FeedSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          className="loading-shimmer rounded-[1.7rem] border border-[color:var(--line)] bg-white/70 p-5"
          key={index}
        >
          <div className="h-5 w-48 rounded-full bg-[color:var(--panel-muted)]" />
          <div className="mt-3 h-3 w-72 rounded-full bg-[color:var(--panel-muted)]" />
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="rounded-[1.35rem] bg-[color:var(--panel-muted)] p-4">
              <div className="h-3 w-24 rounded-full bg-white" />
              <div className="mt-3 h-3 w-full rounded-full bg-white" />
              <div className="mt-2 h-3 w-11/12 rounded-full bg-white" />
              <div className="mt-2 h-3 w-8/12 rounded-full bg-white" />
            </div>
            <div className="grid gap-4">
              <div className="rounded-[1.35rem] bg-[color:var(--panel-muted)] p-4">
                <div className="h-3 w-20 rounded-full bg-white" />
                <div className="mt-3 h-8 w-full rounded-2xl bg-white" />
              </div>
              <div className="rounded-[1.35rem] bg-[color:var(--panel-muted)] p-4">
                <div className="h-3 w-24 rounded-full bg-white" />
                <div className="mt-3 h-8 w-2/3 rounded-2xl bg-white" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FeedLoadingMore() {
  return (
    <div className="mt-4 grid gap-4">
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          className="loading-shimmer rounded-[1.7rem] border border-[color:var(--line)] bg-white/72 p-5"
          key={`load-more-${index}`}
        >
          <div className="h-5 w-52 rounded-full bg-[color:var(--panel-muted)]" />
          <div className="mt-3 h-3 w-60 rounded-full bg-[color:var(--panel-muted)]" />
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="rounded-[1.35rem] bg-[color:var(--panel-muted)] p-4">
              <div className="h-3 w-28 rounded-full bg-white" />
              <div className="mt-3 h-3 w-full rounded-full bg-white" />
              <div className="mt-2 h-3 w-9/12 rounded-full bg-white" />
            </div>
            <div className="rounded-[1.35rem] bg-[color:var(--panel-muted)] p-4">
              <div className="h-3 w-20 rounded-full bg-white" />
              <div className="mt-3 h-8 w-3/4 rounded-2xl bg-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyFeedState({
  hasSession,
  hasAssets,
  hasFilters,
}: {
  hasSession: boolean;
  hasAssets: boolean;
  hasFilters: boolean;
}) {
  let title = "Nothing here yet";
  let description = "Sign in and upload a file.";

  if (hasSession && !hasAssets) {
    title = "No uploads yet";
    description = "Upload your first file.";
  } else if (hasFilters) {
    title = "No results match this view";
    description = "Try another filter.";
  }

  return (
    <div className="relative overflow-hidden rounded-[1.8rem] border border-dashed border-[color:var(--line-strong)] bg-[linear-gradient(180deg,rgba(246,249,247,0.92),rgba(255,255,255,0.82))] px-6 py-10">
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[color:var(--accent-soft)] blur-3xl" />
      <div className="relative">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--accent)]">
          Feed
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--accent-strong)]">
          {title}
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

export function FeedPanel({
  assets,
  attentionAssets,
  deletingAssetId,
  deferredAssetsAreStale,
  deferredQueryIsStale,
  feedTotal,
  feedFilter,
  filteredAssets,
  hasFeedFilters,
  isInitializing,
  isLoadingMore,
  isRefreshing,
  isClearingAll,
  recapAssetId,
  onClearAll,
  onDeleteAsset,
  onFilterChange,
  onGenerateRecap,
  onLoadMore,
  onQueryChange,
  onRefresh,
  onSortChange,
  query,
  sessionActive,
  sortMode,
}: {
  assets: MediaAsset[];
  attentionAssets: MediaAsset[];
  deletingAssetId: number | null;
  deferredAssetsAreStale: boolean;
  deferredQueryIsStale: boolean;
  feedTotal: number;
  feedFilter: FeedFilter;
  filteredAssets: MediaAsset[];
  hasFeedFilters: boolean;
  isInitializing: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  isClearingAll: boolean;
  recapAssetId: number | null;
  onClearAll: () => void;
  onDeleteAsset: (assetId: number) => void;
  onFilterChange: (filter: FeedFilter) => void;
  onGenerateRecap: (assetId: number) => void;
  onLoadMore: () => void;
  onQueryChange: (value: string) => void;
  onRefresh: () => void;
  onSortChange: (value: SortMode) => void;
  query: string;
  sessionActive: boolean;
  sortMode: SortMode;
}) {
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);
  const canLoadMore = !hasFeedFilters && filteredAssets.length < feedTotal;
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (assets.length === 0 || isClearingAll) {
      setIsConfirmingClearAll(false);
    }
  }, [assets.length, isClearingAll]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !canLoadMore || isLoadingMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      {
        rootMargin: "240px 0px",
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [canLoadMore, isLoadingMore, onLoadMore]);

  return (
    <section className="section-shell glass-panel rounded-[2rem] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-[color:var(--accent)]">
            Review room
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--accent-strong)]">
            Analysis feed
          </h2>
          <p className="mt-2 text-sm font-medium text-[color:var(--muted)]">Scan the queue, open important items, and keep the feed under control.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {deferredAssetsAreStale || deferredQueryIsStale ? (
            <span className="rounded-full bg-[color:var(--accent-soft)] px-4 py-2 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-strong)]">
              Updating view
            </span>
          ) : null}
          <button
            className="rounded-full border border-[color:var(--line)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--foreground)] hover:border-[color:var(--line-strong)] hover:bg-[color:var(--panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!sessionActive || isRefreshing}
            onClick={onRefresh}
            type="button"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            className="rounded-full border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!sessionActive || assets.length === 0 || isClearingAll}
            onClick={() => setIsConfirmingClearAll(true)}
            type="button"
          >
            {isClearingAll ? "Clearing..." : "Clear all"}
          </button>
        </div>
      </div>

      {isConfirmingClearAll ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border border-rose-200 bg-rose-50 px-4 py-4">
          <div>
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-rose-800">
              Confirm clear all
            </p>
            <p className="mt-2 text-sm leading-6 text-rose-900">
              This removes every upload, transcript, and recap from your workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100"
              onClick={() => setIsConfirmingClearAll(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isClearingAll}
              onClick={onClearAll}
              type="button"
            >
              {isClearingAll ? "Clearing..." : "Yes, clear all"}
            </button>
          </div>
        </div>
      ) : null}

      {attentionAssets.length > 0 ? (
        <div className="mt-5 grid gap-3 xl:grid-cols-3">
          {attentionAssets.map((asset) => (
            <div
              className="rounded-[1.45rem] border border-amber-200 bg-[linear-gradient(180deg,rgba(255,245,226,0.98),rgba(255,232,204,0.94))] p-4 shadow-[0_18px_50px_-38px_rgba(255,107,61,0.35)]"
              key={`attention-${asset.id}`}
            >
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-amber-800">
                Priority
              </p>
              <h3 className="mt-2 line-clamp-2 text-lg font-semibold tracking-[-0.03em] text-amber-950">
                {asset.original_filename}
              </h3>
              <p className="mt-2 text-sm leading-6 text-amber-900">{asset.processing_stage}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {asset.alert_matches.slice(0, 3).map((match) => (
                  <span
                    className="rounded-full bg-amber-100 px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-amber-950"
                    key={`${asset.id}-${match}-attention`}
                  >
                    {match}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.55rem] border border-[color:var(--line)] bg-white/72 p-4">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
            Filters and search
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => (
              <FilterChip
                active={feedFilter === option.key}
                key={option.key}
                label={`${option.label} (${getFilterCount(assets, option.key)})`}
                onClick={() => onFilterChange(option.key)}
              />
            ))}
          </div>
          <input
            className="mt-4 w-full rounded-[1.15rem] border border-[color:var(--line)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none focus:border-[color:var(--line-strong)]"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search by file, stage, entities, or matches"
            type="search"
            value={query}
          />
        </div>

        <div className="rounded-[1.55rem] border border-[color:var(--line)] bg-white/72 p-4">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
            Sorting
          </p>
          <select
            className="mt-3 w-full rounded-[1.15rem] border border-[color:var(--line)] bg-white px-4 py-3 text-[color:var(--foreground)] outline-none focus:border-[color:var(--line-strong)]"
            onChange={(event) => onSortChange(event.target.value as SortMode)}
            value={sortMode}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-4 text-sm font-medium text-[color:var(--muted)]">
            {filteredAssets.length} visible of {feedTotal}
          </p>
        </div>
      </div>

      <div className="mt-5 max-h-[66vh] overflow-y-auto pr-1">
        {isInitializing ? (
          <FeedSkeleton />
        ) : filteredAssets.length === 0 ? (
          <EmptyFeedState
            hasAssets={assets.length > 0}
            hasFilters={hasFeedFilters}
            hasSession={sessionActive}
          />
          ) : (
          <div className={`grid gap-4 transition-opacity duration-300 ${deferredAssetsAreStale || deferredQueryIsStale ? "opacity-70" : "opacity-100"}`}>
            {filteredAssets.map((asset, index) => (
              <AssetCard
                asset={asset}
                animationDelayMs={Math.min(index * 36, 260)}
                isDeleting={deletingAssetId === asset.id}
                isGeneratingRecap={recapAssetId === asset.id}
                key={asset.id}
                onDelete={onDeleteAsset}
                onGenerateRecap={onGenerateRecap}
              />
            ))}
          </div>
        )}

        {!isInitializing && filteredAssets.length > 0 ? (
          <div className="mt-5 flex flex-col items-center gap-4">
            {isLoadingMore ? <FeedLoadingMore /> : null}
            {canLoadMore ? (
              <>
                <div
                  aria-hidden="true"
                  className="h-4 w-full rounded-full"
                  ref={loadMoreRef}
                />
                <p className="text-center text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  Scroll to load more
                </p>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
