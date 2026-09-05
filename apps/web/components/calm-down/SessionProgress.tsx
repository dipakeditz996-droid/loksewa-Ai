"use client";

interface SessionProgressProps {
  secondsRemaining: number;
  totalSeconds: number;
}

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Session-wide time remaining - distinct from the per-second breathing phase countdown above it. */
export function SessionProgress({ secondsRemaining, totalSeconds }: SessionProgressProps) {
  const elapsed = totalSeconds - secondsRemaining;
  const progressPct = totalSeconds > 0 ? Math.min(100, Math.max(0, (elapsed / totalSeconds) * 100)) : 0;
  const totalMinutes = Math.round(totalSeconds / 60);

  return (
    <div className="flex w-full max-w-[220px] flex-col items-center gap-2">
      <span className="text-4xl font-black tabular-nums tracking-tight text-white sm:text-5xl">
        {formatMMSS(secondsRemaining)}
      </span>
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]"
        role="progressbar"
        aria-label="Calm Down session progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressPct)}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300/70 to-[#D4A72C]/80 transition-[width] duration-1000 ease-linear"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
        Calm breathing &middot; {totalMinutes} min
      </span>
    </div>
  );
}
