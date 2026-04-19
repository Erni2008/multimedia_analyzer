export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="section-shell glass-panel relative overflow-hidden rounded-[1.7rem] p-4">
      <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(213,106,58,0.18),transparent_72%)]" />
      <p className="font-ui relative text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-[color:var(--muted)]">
        {label}
      </p>
      <p className="relative mt-4 text-4xl font-semibold tracking-[-0.06em] text-[color:var(--accent-strong)]">
        {value}
      </p>
      <p className="font-ui relative mt-3 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">
        {detail}
      </p>
    </div>
  );
}
