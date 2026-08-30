import { cn } from "@/lib/utils";

export type PillTone = "success" | "pending" | "error" | "neutral";

const TONE_CLASSES: Record<PillTone, string> = {
  success: "bg-[#E9F6F2] text-[#0F7A69] dark:bg-[#0F7A69]/20 dark:text-[#4ADE9C]",
  pending: "bg-[#FBF2DC] text-[#946B00] dark:bg-[#946B00]/20 dark:text-[#F2C94C]",
  error: "bg-[#FBEAEA] text-[#B23A3A] dark:bg-[#B23A3A]/20 dark:text-[#F2A399]",
  neutral: "bg-[#EEF1F6] text-[#667085] dark:bg-muted dark:text-muted-foreground",
};

/**
 * Maps every teacher-portal status string to one of the four reserved
 * semantic tones (green/gold/red/gray) — kept in one place so no page
 * invents its own ad-hoc status color.
 */
export function toneForStatus(status: string): PillTone {
  const s = status.toLowerCase().replace(/\s+/g, "_");
  if (["approved", "published", "completed", "active", "resolved", "open"].includes(s)) return "success";
  if (["pending", "pending_review", "in_review", "review"].includes(s)) return "pending";
  if (["changes_requested", "rejected", "error", "failed", "overdue"].includes(s)) return "error";
  return "neutral";
}

export function StatusPill({
  status,
  label,
  tone,
  className,
}: {
  status: string;
  label?: string;
  tone?: PillTone;
  className?: string;
}) {
  const resolvedTone = tone ?? toneForStatus(status);
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-[9px] py-[3px] text-[10.5px] font-bold uppercase tracking-[0.02em]",
        TONE_CLASSES[resolvedTone],
        className
      )}
    >
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}
