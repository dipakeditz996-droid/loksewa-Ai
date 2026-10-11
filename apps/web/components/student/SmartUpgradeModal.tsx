"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Layers,
  BookOpen,
  Bot,
  Lock,
  ArrowRight,
  ArrowLeft,
  Zap,
} from "lucide-react";

export interface SmartUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: "exam_quota_exhausted" | "notes_restricted" | "ai_tutor_exhausted" | "feature_restricted" | string;
  category?: string;
  courseTitle?: string;
  featureName?: string;
  customMessage?: string;
  resetInfo?: string | null;
}

export function SmartUpgradeModal({
  isOpen,
  onClose,
  reason = "feature_restricted",
  category,
  courseTitle,
  featureName,
  customMessage,
  resetInfo,
}: SmartUpgradeModalProps) {
  const router = useRouter();

  const handleViewPackages = () => {
    onClose();
    router.push("/student/plans");
  };

  const handleBackToDashboard = () => {
    onClose();
    router.push("/student");
  };

  let title = "Upgrade Required";
  let description = customMessage || "Upgrade your package to unlock more features.";
  let icon = <Lock className="w-6 h-6 text-amber-500" />;
  let badgeLabel = "Premium Feature";
  let primaryActionLabel = "View Packages";
  let secondaryActionLabel = "Back to Dashboard";
  let secondaryAction = handleBackToDashboard;

  if (reason === "exam_quota_exhausted") {
    const examLabel = category === "past_year"
      ? "Past Year Question Exam"
      : category === "topicwise"
      ? "Topicwise Test"
      : category === "live"
      ? "Live Exam"
      : category === "free_mock"
      ? "Free Mock Test"
      : "Mock Exam";
    title = `You've used all your included ${examLabel} attempts`;
    description = customMessage || `You have reached your allocated attempts for ${examLabel}s in your current package. Upgrade your package to unlock additional attempts.`;
    icon = <Layers className="w-6 h-6 text-[#D4A72C]" />;
    badgeLabel = "Exam Quota Exhausted";
    primaryActionLabel = "View Packages";
  } else if (reason === "notes_restricted") {
    title = "This study material isn't included in your current package";
    description = customMessage || `Choose a package that includes access to ${courseTitle ? `"${courseTitle}"` : "this course's"} study notes and PDF materials.`;
    icon = <BookOpen className="w-6 h-6 text-blue-500" />;
    badgeLabel = "Study Material Locked";
    primaryActionLabel = "View Available Packages";
    secondaryActionLabel = "Back to Notes";
    secondaryAction = () => {
      onClose();
      router.push("/student/notes");
    };
  } else if (reason === "ai_tutor_exhausted") {
    title = "You've reached your current AI Tutor usage limit";
    description = customMessage || (resetInfo
      ? `Your allowance will reset ${resetInfo}, or you can explore packages with a higher AI allowance.`
      : "You have consumed all included AI Tutor credits. Upgrade your package to continue asking questions.");
    icon = <Bot className="w-6 h-6 text-purple-500" />;
    badgeLabel = "AI Allowance Exhausted";
    primaryActionLabel = "Explore Packages with Higher AI";
    secondaryActionLabel = "Close";
    secondaryAction = onClose;
  } else if (reason === "feature_restricted") {
    const feat = featureName || "This feature";
    title = `${feat} isn't included in your current package`;
    description = customMessage || `Upgrade to a higher tier LoksewaAI package to unlock ${feat.toLowerCase()} and comprehensive preparation tools.`;
    icon = <Zap className="w-6 h-6 text-amber-500" />;
    badgeLabel = "Upgrade Required";
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 rounded-[24px] border border-border shadow-2xl bg-card">
        <DialogHeader className="space-y-3 text-center sm:text-left">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-center shrink-0">
              {icon}
            </div>
            <Badge variant="outline" className="bg-[#D4A72C]/10 text-[#D4A72C] border-[#D4A72C]/30 text-[10px] font-bold uppercase tracking-wider">
              {badgeLabel}
            </Badge>
          </div>
          <DialogTitle className="text-xl font-extrabold text-foreground tracking-tight pt-1">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Benefits preview highlight */}
        <div className="my-2 p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-foreground text-[11px] uppercase tracking-wider text-[#D4A72C]">
            <Sparkles className="w-3.5 h-3.5" /> What you unlock with Premium
          </div>
          <ul className="space-y-1.5 text-muted-foreground text-[11px]">
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              Additional Mock Exams &amp; Topicwise Tests
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              Complete Syllabus Notes with PDF Download
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              High-capacity AI Tutor coaching &amp; instant explanations
            </li>
          </ul>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={secondaryAction}
            className="w-full sm:w-auto text-xs rounded-xl h-10 border-border"
          >
            {secondaryActionLabel}
          </Button>
          <Button
            type="button"
            onClick={handleViewPackages}
            className="w-full sm:flex-1 bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-95 text-[#0A1118] font-bold text-xs rounded-xl h-10 shadow-md gap-1.5"
          >
            {primaryActionLabel} <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
