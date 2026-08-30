"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CALM_DOWN_COPY } from "@/lib/calmDown/config";

interface CalmDownPromptProps {
  open: boolean;
  onAccept: () => void;
  onSkip: () => void;
}

/** "Ready to Begin?" - shown once, before the exam or practice set actually starts. */
export function CalmDownPrompt({ open, onAccept, onSkip }: CalmDownPromptProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onSkip(); }}>
      <DialogContent className="max-w-md text-center sm:text-center">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#0B2545]/5 text-3xl dark:bg-white/10">
            🧘
          </div>
          <DialogTitle className="text-xl font-bold text-[#0B2545] dark:text-white text-center">
            {CALM_DOWN_COPY.promptTitle}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed px-2">
          {CALM_DOWN_COPY.promptBody}
        </p>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button
            onClick={onAccept}
            className="w-full h-12 bg-[#0B2545] hover:bg-[#133E6D] text-white font-bold"
          >
            {CALM_DOWN_COPY.promptAccept}
          </Button>
          <Button
            onClick={onSkip}
            variant="outline"
            className="w-full h-12 font-semibold"
          >
            {CALM_DOWN_COPY.promptSkip}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
