import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "pending" | "error";

const ICON_CHIP_TONE: Record<Tone, string> = {
  neutral: "bg-gradient-to-br from-[#0B2545] to-[#163E6C] text-[#D4A72C]",
  success: "bg-[#E9F6F2] text-[#0F7A69] dark:bg-[#0F7A69]/15 dark:text-[#4ADE9C]",
  pending: "bg-[#FBF2DC] text-[#946B00] dark:bg-[#946B00]/20 dark:text-[#F2C94C]",
  error: "bg-[#FBEAEA] text-[#B23A3A] dark:bg-[#B23A3A]/20 dark:text-[#F2A399]",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "neutral",
  badge,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  tone?: Tone;
  badge?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5",
        "shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_1px_rgba(16,24,40,0.02)] dark:shadow-none",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-[10px]",
            ICON_CHIP_TONE[tone]
          )}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </div>
        {badge && (
          <span className="rounded-full bg-[#FBF2DC] px-2.5 py-1 text-[11px] font-bold text-[#946B00] dark:bg-[#946B00]/20 dark:text-[#F2C94C]">
            {badge}
          </span>
        )}
      </div>
      <div className="text-[12.5px] font-semibold text-muted-foreground">{label}</div>
      <div className="font-heading mt-0.5 text-[28px] font-extrabold leading-tight text-card-foreground">
        {value}
      </div>
    </div>
  );
}
