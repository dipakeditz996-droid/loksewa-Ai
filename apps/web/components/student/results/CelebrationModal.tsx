"use client";

import React, { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { X, Share2, Award, Trophy, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CelebrationModalProps {
  rank: number;
  score: number;
  percentage: number;
  examTitle: string;
  participants: number | undefined;
  resultId: number;
}

export function CelebrationModal({
  rank,
  score,
  percentage,
  examTitle,
  participants,
  resultId,
}: CelebrationModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only show for top 3 ranks
    if (rank > 3) return;

    // Check if already celebrated
    const key = `student_result_celebrated_${resultId}`;
    const hasCelebrated = localStorage.getItem(key);

    if (!hasCelebrated) {
      setIsOpen(true);
      localStorage.setItem(key, "true");
    }
  }, [rank, resultId]);

  useEffect(() => {
    if (!isOpen) return;

    // Accessibility: check reduced motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    // Fire confetti based on rank
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: rank === 1 ? 5 : 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: rank === 1 ? ["#FFD700", "#FFA500"] : rank === 2 ? ["#C0C0C0", "#A9A9A9"] : ["#CD7F32", "#8B4513"],
        disableForReducedMotion: true,
        zIndex: 9999,
      });
      confetti({
        particleCount: rank === 1 ? 5 : 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: rank === 1 ? ["#FFD700", "#FFA500"] : rank === 2 ? ["#C0C0C0", "#A9A9A9"] : ["#CD7F32", "#8B4513"],
        disableForReducedMotion: true,
        zIndex: 9999,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, [isOpen, rank]);

  if (!isOpen) return null;

  let Icon = Trophy;
  let title = "";
  let subtitle = "";
  let iconColor = "";

  if (rank === 1) {
    title = "YOU DID IT! 🏆";
    subtitle = "Congratulations! You've secured the top rank in this examination.";
    iconColor = "text-[#D4A72C]";
  } else if (rank === 2) {
    Icon = Medal;
    title = "Outstanding Performance! 🎉";
    subtitle = "You're among the very best. Congratulations on an exceptional performance.";
    iconColor = "text-slate-400";
  } else if (rank === 3) {
    Icon = Award;
    title = "Brilliant Work! 🎉";
    subtitle = "An incredible achievement. You're among the top performers!";
    iconColor = "text-amber-700";
  }

  const handleShare = async () => {
    const text = `🏆 I secured Rank #${rank} in LoksewaAI's ${examTitle} with ${percentage.toFixed(1)}%.`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Achievement",
          text,
        });
      } catch (err) {
        // user cancelled or error
      }
    } else {
      navigator.clipboard.writeText(text);
      alert("Achievement copied to clipboard!");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-lg p-8 bg-card border shadow-2xl rounded-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-500"
        role="dialog"
        aria-modal="true"
        aria-labelledby="celebration-title"
      >
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
          aria-label="Close celebration"
        >
          <X className="h-5 w-5" />
        </button>

        <div className={`p-4 rounded-full bg-muted/50 mb-6 ${iconColor}`}>
          <Icon className="h-16 w-16" />
        </div>

        <h2 id="celebration-title" className="text-3xl font-black mb-2 tracking-tight">
          {title}
        </h2>
        <p className="text-xl font-semibold text-primary/80 mb-2">
          You're #{rank}!
        </p>
        <p className="text-muted-foreground mb-8 max-w-[80%]">
          {subtitle}
        </p>

        <div className="w-full bg-muted rounded-xl p-6 mb-8 flex flex-col gap-4">
          <div className="flex justify-between items-center pb-4 border-b border-border/50">
            <span className="text-sm font-medium text-muted-foreground">Examination</span>
            <span className="font-bold">{examTitle}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase">Rank</span>
              <p className="text-2xl font-black mt-1">#{rank}</p>
            </div>
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase">Score</span>
              <p className="text-2xl font-black mt-1">{score} <span className="text-sm font-bold text-muted-foreground">({percentage.toFixed(1)}%)</span></p>
            </div>
          </div>
          {participants !== undefined && (
            <div className="pt-4 border-t border-border/50 flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total Participants</span>
              <span className="font-bold">{participants}</span>
            </div>
          )}
        </div>

        <div className="flex gap-4 w-full">
          <Button 
            className="flex-1"
            size="lg"
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Continue
          </Button>
          <Button 
            className="flex-1 gap-2"
            size="lg"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>
    </div>
  );
}
