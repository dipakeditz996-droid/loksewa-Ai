"use client";

import React from "react";
import { Save, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UnsavedChangesBannerProps {
  show: boolean;
  onSave: () => void;
  onDiscard: () => void;
  isSaving?: boolean;
}

export function UnsavedChangesBanner({ show, onSave, onDiscard, isSaving = false }: UnsavedChangesBannerProps) {
  return (
    <div 
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0B2545] text-white p-4 rounded-xl shadow-2xl flex items-center justify-between gap-6 transition-all duration-300 border border-white/10",
        show ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
      )}
    >
      <div className="flex flex-col">
        <span className="font-bold text-sm">Careful — you have unsaved changes!</span>
        <span className="text-xs text-white/60">Don't forget to save before navigating away.</span>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button 
          variant="outline" 
          size="sm" 
          className="border-white/20 text-white bg-transparent hover:bg-white/10 hover:text-white"
          onClick={onDiscard}
          disabled={isSaving}
        >
          <XCircle className="w-4 h-4 mr-2" />
          Discard
        </Button>
        <Button 
          size="sm" 
          className="bg-[#D4A72C] text-[#0B2545] hover:bg-[#D4A72C]/90 font-bold"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-[#0B2545]/20 border-t-[#0B2545] rounded-full animate-spin mr-2" />
              Saving...
            </div>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
