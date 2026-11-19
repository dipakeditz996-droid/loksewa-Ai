"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  ExternalLink,
  Sparkles,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { schedulesApi, OfficialExamSchedule } from "@/lib/api/schedules";
import { formatNepaliDateDisplay } from "@/lib/nepali-date";
import { useOptionalStudentContext } from "@/contexts/StudentContext";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isValid: boolean;
}

// Shared query helpers for backward compatibility
export const nextOfficialExamQuery = {
  queryKey: ["next-official-exam", null],
  queryFn: () => schedulesApi.getNextOfficialExam(),
  staleTime: 5 * 60 * 1000,
} as const;

export const upcomingOfficialExamsQuery = {
  queryKey: ["upcoming-official-exams", null],
  queryFn: () => schedulesApi.getUpcomingSchedules(),
  staleTime: 5 * 60 * 1000,
} as const;

function calculateTimeLeft(schedule: OfficialExamSchedule, serverOffsetMs: number): TimeLeft {
  if (!schedule || !schedule.exam_date) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false, isValid: false };
  }

  let targetMs: number;
  if (schedule.exam_datetime) {
    targetMs = new Date(schedule.exam_datetime).getTime();
  } else {
    const timePart = schedule.exam_time || "08:00:00";
    // Localized to Nepal Standard Time (UTC+05:45)
    targetMs = new Date(`${schedule.exam_date}T${timePart}+05:45`).getTime();
  }

  if (isNaN(targetMs)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false, isValid: false };
  }

  const now = Date.now() + serverOffsetMs;
  const diff = targetMs - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, isValid: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds, isExpired: false, isValid: true };
}

/**
 * Strips literal "BS" text from formatted Nepali date string
 * e.g. "2083 Poush 20 BS (Jan 4, 2027)" -> "2083 Poush 20 (Jan 4, 2027)"
 */
function formatExamDateDisplay(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const raw = formatNepaliDateDisplay(dateStr, { showAd: true });
  return raw
    .replace(/\bBS\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

/**
 * Clean Countdown Timer Component (Reference-aligned 4 blocks)
 */
function ExamCountdownTimer({
  schedule,
  serverOffsetMs,
}: {
  schedule: OfficialExamSchedule;
  serverOffsetMs: number;
}) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(schedule, serverOffsetMs)
  );

  useEffect(() => {
    setTimeLeft(calculateTimeLeft(schedule, serverOffsetMs));
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(schedule, serverOffsetMs));
    }, 1000);
    return () => clearInterval(interval);
  }, [schedule, serverOffsetMs]);

  if (!timeLeft.isValid) return null;

  if (timeLeft.isExpired) {
    return (
      <div className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 px-4 py-2.5 rounded-xl text-center shadow-inner shrink-0 w-full md:w-auto">
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 block">Status</span>
        <span className="text-sm font-black tracking-tight text-white flex items-center justify-center gap-1.5 mt-0.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Exam Day / In Progress
        </span>
      </div>
    );
  }

  return (
    <>
      {/* DESKTOP (md and up): 4 horizontal blocks with colons */}
      <div className="hidden md:flex items-center gap-1.5 lg:gap-2.5 shrink-0">
        {/* Days */}
        <div className="flex flex-col items-center justify-center w-[64px] h-[76px] lg:w-[72px] lg:h-[84px] bg-white/5 backdrop-blur-sm rounded-2xl border border-white/15 shadow-inner">
          <span className="text-2xl lg:text-3xl font-black text-white leading-none">
            {String(timeLeft.days).padStart(2, "0")}
          </span>
          <span className="text-[9px] lg:text-[10px] font-bold uppercase text-slate-300 tracking-widest mt-1">
            Days
          </span>
        </div>

        <span className="text-sm font-bold text-slate-400/80 mb-2">:</span>

        {/* Hours */}
        <div className="flex flex-col items-center justify-center w-[64px] h-[76px] lg:w-[72px] lg:h-[84px] bg-white/5 backdrop-blur-sm rounded-2xl border border-white/15 shadow-inner">
          <span className="text-2xl lg:text-3xl font-black text-[#60A5FA] leading-none">
            {String(timeLeft.hours).padStart(2, "0")}
          </span>
          <span className="text-[9px] lg:text-[10px] font-bold uppercase text-[#60A5FA] tracking-widest mt-1">
            Hours
          </span>
        </div>

        <span className="text-sm font-bold text-slate-400/80 mb-2">:</span>

        {/* Mins */}
        <div className="flex flex-col items-center justify-center w-[64px] h-[76px] lg:w-[72px] lg:h-[84px] bg-white/5 backdrop-blur-sm rounded-2xl border border-white/15 shadow-inner">
          <span className="text-2xl lg:text-3xl font-black text-white leading-none">
            {String(timeLeft.minutes).padStart(2, "0")}
          </span>
          <span className="text-[9px] lg:text-[10px] font-bold uppercase text-slate-300 tracking-widest mt-1">
            Mins
          </span>
        </div>

        <span className="text-sm font-bold text-slate-400/80 mb-2">:</span>

        {/* Secs */}
        <div className="flex flex-col items-center justify-center w-[64px] h-[76px] lg:w-[72px] lg:h-[84px] bg-white/5 backdrop-blur-sm rounded-2xl border border-white/15 shadow-inner">
          <span className="text-2xl lg:text-3xl font-black text-[#60A5FA] leading-none">
            {String(timeLeft.seconds).padStart(2, "0")}
          </span>
          <span className="text-[9px] lg:text-[10px] font-bold uppercase text-[#60A5FA] tracking-widest mt-1">
            Secs
          </span>
        </div>
      </div>

      {/* MOBILE (< md): 4 equal blocks in a clean grid */}
      <div className="grid md:hidden grid-cols-4 gap-1.5 sm:gap-2 w-full mt-3">
        <div className="flex flex-col items-center justify-center py-2 bg-white/5 backdrop-blur-sm rounded-xl border border-white/15 shadow-inner">
          <span className="text-lg sm:text-xl font-black text-white leading-none">
            {String(timeLeft.days).padStart(2, "0")}
          </span>
          <span className="text-[8px] font-bold uppercase text-slate-300 tracking-wider mt-0.5">
            Days
          </span>
        </div>
        <div className="flex flex-col items-center justify-center py-2 bg-white/5 backdrop-blur-sm rounded-xl border border-white/15 shadow-inner">
          <span className="text-lg sm:text-xl font-black text-[#60A5FA] leading-none">
            {String(timeLeft.hours).padStart(2, "0")}
          </span>
          <span className="text-[8px] font-bold uppercase text-[#60A5FA] tracking-wider mt-0.5">
            Hours
          </span>
        </div>
        <div className="flex flex-col items-center justify-center py-2 bg-white/5 backdrop-blur-sm rounded-xl border border-white/15 shadow-inner">
          <span className="text-lg sm:text-xl font-black text-white leading-none">
            {String(timeLeft.minutes).padStart(2, "0")}
          </span>
          <span className="text-[8px] font-bold uppercase text-slate-300 tracking-wider mt-0.5">
            Mins
          </span>
        </div>
        <div className="flex flex-col items-center justify-center py-2 bg-white/5 backdrop-blur-sm rounded-xl border border-white/15 shadow-inner">
          <span className="text-lg sm:text-xl font-black text-[#60A5FA] leading-none">
            {String(timeLeft.seconds).padStart(2, "0")}
          </span>
          <span className="text-[8px] font-bold uppercase text-[#60A5FA] tracking-wider mt-0.5">
            Secs
          </span>
        </div>
      </div>
    </>
  );
}

/**
 * Premium NES Mastery Examination Schedule Card
 * Clean, wide horizontal card strictly matching the reference design:
 * - LEFT SECTION: Badge, Title, Date (no BS), Time, Category, Level, Fee/Description
 * - RIGHT SECTION: Large 4-block horizontal countdown (Days, Hours, Mins, Secs)
 * - SEPARATE BOTTOM AREA: Dedicated Official Exam Notice link with top divider
 */
export function ExamScheduleCard({
  schedule,
  serverOffsetMs,
  isSingle = false,
  onNoticeClick,
}: {
  schedule: OfficialExamSchedule;
  serverOffsetMs: number;
  isSingle?: boolean;
  onNoticeClick?: (e: React.MouseEvent) => void;
}) {
  const isHighlighted = schedule.is_active;
  const displayDate = formatExamDateDisplay(schedule.exam_date);
  const noticeLabel = "Official Exam Notice";

  return (
    <Card
      className={`relative overflow-hidden text-white border shadow-xl transition-all duration-300 flex flex-col justify-between w-full min-w-0 max-w-full ${
        isHighlighted
          ? "bg-gradient-to-br from-[#102D40] via-[#0E283C] to-[#0A1F2E] border-blue-400/30 ring-1 ring-blue-400/20"
          : "bg-gradient-to-br from-[#0D2435] via-[#0A1F2E] to-[#081824] border-blue-500/15"
      } w-full rounded-2xl`}
    >
      {/* Restrained subtle ambient glow */}
      <div className="absolute right-0 top-0 w-64 h-64 bg-[#60A5FA]/5 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12" />

      <CardContent className="p-4 sm:p-5 lg:p-6 relative z-10 flex flex-col justify-between h-full w-full min-w-0">
        {/* Main Section: Exam Information on Left, Countdown on Right */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 lg:gap-6 w-full min-w-0">
          {/* LEFT SECTION — EXAM INFORMATION */}
          <div className="space-y-2 flex-1 min-w-0">
            {/* 1. Official Examination Countdown badge */}
            <div className="flex items-center gap-2">
              {isHighlighted ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/15 border border-blue-400/25 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wider text-[#60A5FA] uppercase shadow-sm">
                  <Sparkles className="w-3 h-3 text-[#60A5FA] animate-pulse" />
                  <span>Official Examination Countdown</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/15 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-200 uppercase shadow-sm">
                  <Calendar className="w-3 h-3 text-[#60A5FA]" />
                  <span>Upcoming Exam Schedule</span>
                </div>
              )}
            </div>

            {/* 2. Exam title — never cut or truncated */}
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white tracking-tight leading-snug break-words">
              {schedule.title}
            </h2>

            {/* 3. Metadata Row: Date, Time, Exam Category, Level */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-300 font-medium">
              {/* Date */}
              <span className="inline-flex items-center gap-1.5 text-slate-200 font-medium">
                <Calendar className="w-3.5 h-3.5 text-[#60A5FA] shrink-0" />
                <span>{displayDate}</span>
              </span>

              {/* Time */}
              {schedule.exam_time && (
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span>{schedule.exam_time.slice(0, 5)} (NPT)</span>
                </span>
              )}

              {/* Category */}
              {schedule.category_name && (
                <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-slate-200 border border-white/10 text-[11px] sm:text-xs font-semibold whitespace-normal">
                  {schedule.category_name}
                </span>
              )}

              {/* Specific Exam / Level */}
              {schedule.exam_name && (
                <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-slate-200 border border-white/10 text-[11px] sm:text-xs font-semibold whitespace-normal">
                  {schedule.exam_name}
                </span>
              )}
            </div>

            {/* 4. Exam fee & additional details, if available */}
            {schedule.description && (
              <p className="text-xs sm:text-sm text-slate-300/85 font-medium max-w-2xl break-words">
                {schedule.description}
              </p>
            )}
          </div>

          {/* RIGHT SECTION — COUNTDOWN */}
          <div className="shrink-0 w-full md:w-auto">
            <ExamCountdownTimer schedule={schedule} serverOffsetMs={serverOffsetMs} />
          </div>
        </div>

        {/* 2. OFFICIAL EXAM NOTICE — SEPARATE BOTTOM AREA */}
        {schedule.official_notice_url && (
          <div className="pt-3 mt-3.5 border-t border-white/10 flex items-center">
            <a
              href={schedule.official_notice_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onNoticeClick}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#60A5FA] hover:text-blue-300 transition-colors group cursor-pointer"
            >
              <span>{noticeLabel}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Main Examination Schedule Section & Carousel
 */
export function LoksewaExamCountdown({
  className = "",
  courseId,
}: {
  className?: string;
  courseId?: number;
}) {
  const studentCtx = useOptionalStudentContext();
  const effectiveCourseId = courseId ?? studentCtx?.activeCourse?.id;
  const contextSchedule = !courseId ? studentCtx?.examSchedule : null;

  // Query all eligible upcoming schedules
  const { data, isLoading: loading, isError: error, refetch } = useQuery({
    queryKey: ["upcoming-official-exams", effectiveCourseId ?? null],
    queryFn: () => schedulesApi.getUpcomingSchedules(effectiveCourseId),
    initialData: contextSchedule
      ? {
          schedules: [contextSchedule],
          count: 1,
          server_time: new Date().toISOString(),
        }
      : undefined,
    staleTime: 5 * 60 * 1000,
  });

  const schedules = data?.schedules ?? [];
  const [serverOffsetMs, setServerOffsetMs] = useState(0);

  // Active slide index & autoplay control states
  const [activeIndex, setActiveIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [timerResetKey, setTimerResetKey] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  activeIndexRef.current = activeIndex;

  const schedulesCountRef = useRef(schedules.length);
  schedulesCountRef.current = schedules.length;

  const isAutoScrollingRef = useRef(false);
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const interactTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Drag coordinates & touch tracking
  const isMouseDownRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const wasDraggingRecentlyRef = useRef(false);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchDeltaXRef = useRef(0);
  const isSwipingHorizontallyRef = useRef(false);

  // Server offset calculation
  useEffect(() => {
    if (data?.server_time) {
      setServerOffsetMs(new Date(data.server_time).getTime() - Date.now());
    }
  }, [data]);

  // Reduced motion preference listener
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    if (mediaQuery.matches) {
      setUserPaused(true);
    }
    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      if (e.matches) setUserPaused(true);
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Browser tab visibility listener (pauses timer while tab is hidden)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Cleanup pending timeouts on unmount
  useEffect(() => {
    return () => {
      if (interactTimeoutRef.current) clearTimeout(interactTimeoutRef.current);
      if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
      if (autoScrollTimeoutRef.current) clearTimeout(autoScrollTimeoutRef.current);
    };
  }, []);

  // Reset autoplay timer key
  const resetAutoplayTimer = useCallback(() => {
    setTimerResetKey((prev) => prev + 1);
  }, []);

  // Scroll to a specific card index smoothly
  const scrollToCard = useCallback(
    (index: number, smooth = true) => {
      const container = containerRef.current;
      const total = schedulesCountRef.current;
      if (!container || total === 0) return;

      const targetIndex = ((index % total) + total) % total;
      const children = container.children;
      const targetElement = children[targetIndex] as HTMLElement | undefined;
      if (!targetElement) return;

      // Lock out onScroll event handler while programmatic scroll animation runs
      isAutoScrollingRef.current = true;
      if (autoScrollTimeoutRef.current) clearTimeout(autoScrollTimeoutRef.current);
      autoScrollTimeoutRef.current = setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, 700);

      // Compute exact static offset to align target card at container start
      let targetScrollLeft = targetElement.offsetLeft - container.offsetLeft;

      // Explicit edge anchoring
      if (targetIndex === 0) {
        targetScrollLeft = 0;
      } else {
        const maxScroll = container.scrollWidth - container.clientWidth;
        if (targetScrollLeft > maxScroll && maxScroll > 0) {
          targetScrollLeft = maxScroll;
        }
      }

      container.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: smooth && !prefersReducedMotion ? "smooth" : "auto",
      });

      activeIndexRef.current = targetIndex;
      setActiveIndex(targetIndex);
    },
    [prefersReducedMotion]
  );

  // Resume autoplay safely after user interaction ends
  const resumeAfterInteraction = useCallback(
    (durationMs = 2500) => {
      if (interactTimeoutRef.current) clearTimeout(interactTimeoutRef.current);
      interactTimeoutRef.current = setTimeout(() => {
        setIsInteracting(false);
        resetAutoplayTimer();
      }, durationMs);
    },
    [resetAutoplayTimer]
  );

  // Previous and Next handlers
  const handlePrev = useCallback(() => {
    const total = schedulesCountRef.current;
    if (total <= 1) return;
    const prevIndex = (activeIndexRef.current - 1 + total) % total;
    scrollToCard(prevIndex);
    resetAutoplayTimer();
  }, [scrollToCard, resetAutoplayTimer]);

  const handleNext = useCallback(() => {
    const total = schedulesCountRef.current;
    if (total <= 1) return;
    const nextIndex = (activeIndexRef.current + 1) % total;
    scrollToCard(nextIndex);
    resetAutoplayTimer();
  }, [scrollToCard, resetAutoplayTimer]);

  // Manual Play / Pause toggle
  const togglePlayPause = useCallback(() => {
    setUserPaused((prev) => !prev);
    resetAutoplayTimer();
  }, [resetAutoplayTimer]);

  // Synchronize activeIndex when schedule count changes
  useEffect(() => {
    if (activeIndex >= schedules.length && schedules.length > 0) {
      setActiveIndex(0);
      scrollToCard(0, false);
    }
  }, [schedules.length, activeIndex, scrollToCard]);

  // Keep active card snapped on window resize
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      scrollToCard(activeIndexRef.current, false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [scrollToCard]);

  // Determine whether autoplay is actively paused
  const isEffectivelyPaused =
    schedules.length <= 1 ||
    userPaused ||
    isHovered ||
    isInteracting ||
    isDragging ||
    prefersReducedMotion ||
    !isTabVisible;

  // 4.5s Timer-Based Autoplay Engine (Single clean interval, reliable continuous loop)
  useEffect(() => {
    if (isEffectivelyPaused) return;

    const timer = setInterval(() => {
      handleNext();
    }, 4500);

    return () => {
      clearInterval(timer);
    };
  }, [isEffectivelyPaused, timerResetKey, handleNext]);

  // Mobile Swipe Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    setIsInteracting(true);
    if (interactTimeoutRef.current) clearTimeout(interactTimeoutRef.current);
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    touchDeltaXRef.current = 0;
    isSwipingHorizontallyRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (touchStartXRef.current === null || !touch) return;
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    const deltaX = currentX - touchStartXRef.current;
    const deltaY = currentY - (touchStartYRef.current ?? currentY);

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwipingHorizontallyRef.current = true;
    }
    touchDeltaXRef.current = deltaX;
  };

  const handleTouchEnd = () => {
    if (isSwipingHorizontallyRef.current && Math.abs(touchDeltaXRef.current) > 40) {
      if (touchDeltaXRef.current < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchDeltaXRef.current = 0;
    isSwipingHorizontallyRef.current = false;
    resumeAfterInteraction(3000);
  };

  const handleTouchCancel = () => {
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchDeltaXRef.current = 0;
    isSwipingHorizontallyRef.current = false;
    setIsInteracting(false);
    resetAutoplayTimer();
  };

  // Desktop Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || schedules.length <= 1) return;
    const container = containerRef.current;
    if (!container) return;

    isMouseDownRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartScrollLeftRef.current = container.scrollLeft;
    hasDraggedRef.current = false;
    setIsDragging(true);
    setIsInteracting(true);
    if (interactTimeoutRef.current) clearTimeout(interactTimeoutRef.current);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDownRef.current || !containerRef.current) return;
    const deltaX = e.clientX - dragStartXRef.current;
    if (Math.abs(deltaX) > 5) {
      hasDraggedRef.current = true;
    }
    containerRef.current.scrollLeft = dragStartScrollLeftRef.current - deltaX;
  };

  const handleMouseUp = () => {
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    setIsDragging(false);

    if (hasDraggedRef.current) {
      wasDraggingRecentlyRef.current = true;
      setTimeout(() => {
        wasDraggingRecentlyRef.current = false;
      }, 150);
    }

    resumeAfterInteraction(2000);
  };

  // Keyboard Navigation Handler (Accessibility)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    } else if (e.key === " ") {
      e.preventDefault();
      togglePlayPause();
    }
  };

  // Click guard for notice links when user was dragging
  const handleNoticeClick = (e: React.MouseEvent) => {
    if (wasDraggingRecentlyRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Track scroll position to keep activeIndex in sync during inertial / manual scroll
  const handleScroll = useCallback(() => {
    if (isAutoScrollingRef.current) return;

    if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    scrollDebounceRef.current = setTimeout(() => {
      if (isAutoScrollingRef.current) return;
      const container = containerRef.current;
      const total = schedulesCountRef.current;
      if (!container || total === 0) return;

      const children = container.children;
      if (!children.length) return;

      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll > 0 && container.scrollLeft >= maxScroll - 20) {
        const lastIdx = total - 1;
        activeIndexRef.current = lastIdx;
        setActiveIndex(lastIdx);
        return;
      }

      if (container.scrollLeft <= 20) {
        activeIndexRef.current = 0;
        setActiveIndex(0);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      let closestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < total; i++) {
        const child = children[i] as HTMLElement | undefined;
        if (!child) continue;
        const childRect = child.getBoundingClientRect();
        const distance = Math.abs(childRect.left - containerRect.left);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }

      activeIndexRef.current = closestIndex;
      setActiveIndex(closestIndex);
    }, 50);
  }, []);

  // Loading Skeleton State
  if (loading) {
    return (
      <Card className={`bg-card border-border shadow-sm overflow-hidden ${className}`}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
            <div className="space-y-2 w-full md:w-1/2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-6 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="grid grid-cols-4 gap-2 w-full md:w-auto">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 w-14 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error State
  if (error) {
    return (
      <Card className={`bg-card border-border shadow-sm ${className}`}>
        <CardContent className="p-4 sm:p-5 flex items-center gap-3 text-muted-foreground">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-xs">Unable to load examination schedule right now.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="ml-auto text-xs font-semibold underline text-foreground hover:text-blue-500"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  // Zero-Schedule State
  if (schedules.length === 0) {
    return (
      <Card className={`bg-card border-border border-dashed shadow-sm ${className}`}>
        <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-muted rounded-xl text-muted-foreground">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Next Official Examination</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                No upcoming official examination scheduled at this moment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Single-Schedule State: Clean, static card (no carousel motion)
  if (schedules.length === 1) {
    return (
      <div className={className}>
        <ExamScheduleCard
          schedule={schedules[0]}
          serverOffsetMs={serverOffsetMs}
          isSingle={true}
        />
      </div>
    );
  }

  // Multiple Schedules: Active Autoplay Carousel
  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Section Header: OFFICIAL EXAM SCHEDULES */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">
            Official Exam Schedules
          </h3>
          <span className="hidden sm:inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
            {schedules.length} Active Schedules
          </span>
        </div>

        {/* Carousel Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous examination schedule"
            className="p-1 sm:p-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Previous schedule"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            type="button"
            onClick={togglePlayPause}
            aria-label={userPaused ? "Resume automatic scrolling" : "Pause automatic scrolling"}
            className="p-1 sm:p-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            title={userPaused ? "Resume auto-scroll" : "Pause auto-scroll"}
          >
            {userPaused ? (
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 fill-emerald-500/20" />
            ) : (
              <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 fill-amber-500/20" />
            )}
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next examination schedule"
            className="p-1 sm:p-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Next schedule"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Track Container */}
      <div
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          handleMouseUp();
        }}
      >
        {/* Scrollable Track - Shows exactly one schedule card at a time with smooth snap */}
        <div
          ref={containerRef}
          role="region"
          aria-label="Official Examination Schedules Carousel"
          aria-roledescription="carousel"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onScroll={handleScroll}
          className="w-full min-w-0 max-w-full flex overflow-x-auto scrollbar-none py-1 focus:outline-none focus:ring-1 focus:ring-blue-500/40 rounded-2xl select-none snap-x snap-mandatory gap-4 sm:gap-6 cursor-grab active:cursor-grabbing"
          style={{
            scrollBehavior: isDragging || prefersReducedMotion ? "auto" : "smooth",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {schedules.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${schedules.length}: ${item.title}`}
              className="w-full min-w-full max-w-full flex-none snap-start"
            >
              <ExamScheduleCard
                schedule={item}
                serverOffsetMs={serverOffsetMs}
                isSingle={false}
                onNoticeClick={handleNoticeClick}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Dots Indicator */}
      {schedules.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-1.5">
          {schedules.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                scrollToCard(idx);
                resetAutoplayTimer();
              }}
              aria-label={`Go to schedule ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeIndex === idx
                  ? "w-6 bg-[#60A5FA]"
                  : "w-1.5 bg-slate-300 dark:bg-white/20 hover:bg-slate-400 dark:hover:bg-white/40"
              }`}
            />
          ))}
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 ml-1.5 tabular-nums">
            {activeIndex + 1} / {schedules.length}
          </span>
        </div>
      )}
    </div>
  );
}
