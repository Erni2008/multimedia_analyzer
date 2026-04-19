import { ToastItem } from "./types";

function getToastClasses(tone: ToastItem["tone"]) {
  if (tone === "success") {
    return "border-emerald-200/80 bg-emerald-50/95 text-emerald-950 shadow-[0_28px_60px_-44px_rgba(16,185,129,0.55)]";
  }
  if (tone === "error") {
    return "border-rose-200/80 bg-rose-50/95 text-rose-950 shadow-[0_28px_60px_-44px_rgba(244,63,94,0.42)]";
  }
  return "border-[color:var(--line)] bg-white/95 text-[color:var(--foreground)] shadow-[0_28px_60px_-44px_rgba(25,74,90,0.34)]";
}

export function ToastStack({
  onDismiss,
  toasts,
}: {
  onDismiss: (id: number) => void;
  toasts: ToastItem[];
}) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(26rem,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          className={`toast-enter pointer-events-auto rounded-[1.35rem] border px-4 py-4 backdrop-blur-md ${getToastClasses(toast.tone)}`}
          key={toast.id}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="pr-2 text-sm font-medium leading-6">{toast.message}</p>
            <button
              className="rounded-full border border-current/10 bg-white/40 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] hover:bg-white/70"
              onClick={() => onDismiss(toast.id)}
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
