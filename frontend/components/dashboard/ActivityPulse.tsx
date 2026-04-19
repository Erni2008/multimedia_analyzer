import { BusyAction, FeedStats } from "./types";

function getActivityCopy(busyAction: BusyAction, stats: FeedStats) {
  if (busyAction === "upload") {
    return {
      eyebrow: "Uploading",
      title: "Sending media into the queue",
      detail: "The file is being transferred and prepared for analysis.",
      progress: 32,
      accentClass: "bg-[linear-gradient(90deg,#d56a3a,#f09c61)]",
    };
  }
  if (busyAction === "watchlist") {
    return {
      eyebrow: "Watchlist",
      title: "Saving tracked entities",
      detail: "Your alert targets are being normalized and stored.",
      progress: 56,
      accentClass: "bg-[linear-gradient(90deg,#194a5a,#4f7f8b)]",
    };
  }
  if (busyAction === "recap") {
    return {
      eyebrow: "Recap",
      title: "Compressing transcript into a brief",
      detail: "A short summary is being assembled from the latest transcript.",
      progress: 72,
      accentClass: "bg-[linear-gradient(90deg,#194a5a,#d56a3a)]",
    };
  }
  if (busyAction === "delete") {
    return {
      eyebrow: "Cleanup",
      title: "Removing selected items",
      detail: "The workspace is being updated and the feed will settle immediately after.",
      progress: 44,
      accentClass: "bg-[linear-gradient(90deg,#7f1d1d,#dc2626)]",
    };
  }
  if (busyAction === "login" || busyAction === "register") {
    return {
      eyebrow: "Access",
      title: "Preparing your workspace",
      detail: "Authentication is in progress and the dashboard will synchronize next.",
      progress: 40,
      accentClass: "bg-[linear-gradient(90deg,#194a5a,#d56a3a)]",
    };
  }
  if (stats.pending > 0) {
    return {
      eyebrow: "Background activity",
      title: `${stats.pending} job${stats.pending === 1 ? "" : "s"} processing now`,
      detail: "The feed will auto-refresh while analysis remains active in the queue.",
      progress: 88,
      accentClass: "bg-[linear-gradient(90deg,#194a5a,#7bb39c,#d56a3a)]",
    };
  }

  return {
    eyebrow: "Ready",
    title: "Workspace is idle and ready",
    detail: "Upload something new or review completed items already in the feed.",
    progress: 100,
    accentClass: "bg-[linear-gradient(90deg,#194a5a,#2f7758)]",
  };
}

export function ActivityPulse({
  busyAction,
  nextStepLabel,
  stats,
}: {
  busyAction: BusyAction;
  nextStepLabel: string;
  stats: FeedStats;
}) {
  const activity = getActivityCopy(busyAction, stats);

  return (
    <section className="section-shell glass-panel rounded-[1.75rem] border border-[color:var(--line)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-ui text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--accent)]">
            {activity.eyebrow}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--accent-strong)]">
            {activity.title}
          </p>
        </div>
        <span className="font-ui rounded-full border border-[color:var(--line)] bg-white px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
          {activity.progress}% signal
        </span>
      </div>

      <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">{activity.detail}</p>

      <div className="progress-rail mt-4 h-3 w-full overflow-hidden rounded-full bg-[color:var(--panel-muted)]">
        <div
          className={`progress-fill h-full rounded-full ${activity.accentClass}`}
          style={{ width: `${activity.progress}%` }}
        />
      </div>

      <p className="mt-4 text-sm leading-7 text-[color:var(--muted)]">{nextStepLabel}</p>
    </section>
  );
}
