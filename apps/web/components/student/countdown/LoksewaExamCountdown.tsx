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

// Shared query helper for backward compatibility
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
 * Isolated Countdown component for each card to prevent re-rendering the whole carousel every second.
 */
function ExamCardCountdown({
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

  if (!timeLeft.isValid) {
    return null;
  }

  if (timeLeft.isExpired) {
    return (
      <div className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-2xl text-center shadow-inner">
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 block mb-0.5">
          Current Status
        </span>
        <span className="text-sm sm:text-base font-black tracking-tight text-white flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Exam Day / In Progress
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {/* Days */}
      <div className="flex flex-col items-center justify-center w-12 sm:w-14 h-13 sm:h-16 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 shadow-inner">
        <span className="text-lg sm:text-2xl font-black text-white leading-none">
          {String(timeLeft.days).padStart(2, "0")}
        </span>
        <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-300 tracking-wider mt-0.5 sm:mt-1">
          Days
        </span>
      </div>

      <span className="text-sm sm:text-base font-bold text-white/40 mb-1">:</span>

      {/* Hours */}
      <div className="flex flex-col items-center justify-center w-12 sm:w-14 h-13 sm:h-16 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 shadow-inner">
        <span className="text-lg sm:text-2xl font-black text-[#60A5FA] leading-none">
          {String(timeLeft.hours).padStart(2, "0")}
        </span>
        <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-300 tracking-wider mt-0.5 sm:mt-1">
          Hours
        </span>
      </div>

      <span className="text-sm sm:text-base font-bold text-white/40 mb-1">:</span>

      {/* Minutes */}
      <div className="flex flex-col items-center justify-center w-12 sm:w-14 h-13 sm:h-16 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 shadow-inner">
        <span className="text-lg sm:text-2xl font-black text-white leading-none">
          {String(timeLeft.minutes).padStart(2, "0")}
        </span>
        <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-300 tracking-wider mt-0.5 sm:mt-1">
          Mins
        </span>
      </div>

      <span className="text-sm sm:text-base font-bold text-white/40 mb-1">:</span>

      {/* Seconds */}
      <div className="flex flex-col items-center justify-center w-12 sm:w-14 h-13 sm:h-16 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 shadow-inner">
        <span className="text-lg sm:text-2xl font-black text-blue-300 leading-none">
          {String(timeLeft.seconds).padStart(2, "0")}
        </span>
        <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-300 tracking-wider mt-0.5 sm:mt-1">
          Secs
        </span>
      </div>
    </div>
  );
}

/**
 * Premium NES Mastery Examination Schedule Card
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

  return (
    <Card
      className={`relative overflow-hidden text-white border border-blue-400/20 shadow-xl transition-all duration-300 flex flex-col justify-between ${
        isHighlighted
          ? "bg-gradient-to-br from-[#0B2545] via-[#10345E] to-[#174A68] ring-1 ring-blue-400/35"
          : "bg-gradient-to-br from-[#091E36] via-[#0D2847] to-[#123658]"
      } ${
        isSingle
          ? "w-full max-w-4xl mx-auto rounded-2xl sm:rounded-3xl"
          : "w-[310px] sm:w-[540px] lg:w-[620px] min-h-[320px] sm:min-h-[260px] sm:h-[260px] shrink-0 rounded-2xl"
      }`}
    >
      {/* Decorative ambient background glow */}
      <div className="absolute right-0 top-0 w-72 h-72 bg-[#60A5FA]/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
      <div className="absolute left-0 bottom-0 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl pointer-events-none -ml-10 -mb-10" />

      <CardContent className="p-4 sm:p-6 relative z-10 flex flex-col justify-between h-full">
        {/* Top Section: Badges & Full-width Title */}
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between gap-2">
            {isHighlighted ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-blue-500/25 border border-blue-400/40 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wider text-[#60A5FA] uppercase shadow-sm">
                <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-[#60A5FA] animate-pulse" /> Official Examination Countdown
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-white/10 border border-white/15 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-200 uppercase shadow-sm">
                <Calendar className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-[#60A5FA]" /> Upcoming Exam Schedule
              </div>
            )}
            {schedule.category_name && (
              <span className="hidden sm:inline-block bg-white/10 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-slate-200 border border-white/10">
                {schedule.category_name}
              </span>
            )}
          </div>

          <h2 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight leading-snug line-clamp-2">
            {schedule.title}
          </h2>
        </div>

        {/* Bottom Section: Details on Left, Countdown on Right */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 pt-2.5 sm:pt-3 border-t border-white/10 mt-auto">
          {/* Details */}
          <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-y-1 gap-x-1.5 sm:gap-x-2 text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1 sm:gap-1.5 bg-black/30 px-2 py-0.5 rounded border border-white/5 text-[11px] sm:text-xs">
                <Calendar className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-[#60A5FA] shrink-0" />
                <span className="font-semibold text-white">
                  {formatNepaliDateDisplay(schedule.exam_date, { showAd: true })}
                </span>
              </span>

              {schedule.exam_time && (
                <span className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded border border-white/5 text-[11px] sm:text-xs">
                  <Clock className="w-3 h-3 text-blue-300 shrink-0" />
                  <span>{schedule.exam_time.slice(0, 5)} (NPT)</span>
                </span>
              )}

              {schedule.exam_name && (
                <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold text-slate-200">
                  {schedule.exam_name}
                </span>
              )}
            </div>

            {schedule.description && (
              <p className="text-[11px] sm:text-xs text-slate-300/85 line-clamp-1 max-w-sm">
                {schedule.description}
              </p>
            )}

            {schedule.official_notice_url && (
              <div>
                <a
                  href={schedule.official_notice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onNoticeClick}
                  className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-[#60A5FA] hover:text-blue-200 underline font-semibold transition-colors group"
                >
                  Official Exam Notice
                  <ExternalLink className="w-3 h-3 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            )}
          </div>

          {/* Countdown Clock */}
          <div className="shrink-0 flex items-center justify-start sm:justify-end pt-1 sm:pt-0">
            <ExamCardCountdown schedule={schedule} serverOffsetMs={serverOffsetMs} />
          </div>
        </div>
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

  // Carousel & Animation States
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);

  // Drag coordinates and click-guarding
  const dragStartXRef = useRef(0);
  const scrollStartRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const wasDraggingRecentlyRef = useRef(false);
  const interactTimerRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedScrollRef = useRef(0);

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
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Browser tab visibility listener (pause RAF when tab hidden)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Multiplier for presentation-layer seamless looping
  const repeatCount = schedules.length < 3 ? 4 : schedules.length < 5 ? 3 : 2;
  const displayItems = schedules.length >= 2
    ? Array.from({ length: repeatCount }, () => schedules).flat()
    : schedules;

  // Active pause state: hovered, focused, user paused, dragging, touching, reduced motion, or tab hidden
  const isPaused =
    isHovered ||
    isFocused ||
    userPaused ||
    isInteracting ||
    isDragging ||
    prefersReducedMotion ||
    !isTabVisible;

  // Smooth continuous auto-scrolling with RAF
  useEffect(() => {
    if (schedules.length < 2) return;

    let animationFrameId: number;
    const speed = 0.65; // ~39px/sec, moderate, comfortable reading speed

    const animate = () => {
      const container = containerRef.current;
      if (container && !isPaused) {
        accumulatedScrollRef.current += speed;
        container.scrollLeft = accumulatedScrollRef.current;

        // Loop seamlessly when half of duplicate track is traversed
        const singleSetWidth = container.scrollWidth / repeatCount;
        if (accumulatedScrollRef.current >= singleSetWidth * (repeatCount - 1)) {
          accumulatedScrollRef.current -= singleSetWidth;
          container.scrollLeft = accumulatedScrollRef.current;
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [schedules.length, isPaused, repeatCount]);

  // Handle manual interaction pauses
  const markUserInteracting = useCallback((durationMs = 2000) => {
    setIsInteracting(true);
    if (interactTimerRef.current) clearTimeout(interactTimerRef.current);
    interactTimerRef.current = setTimeout(() => {
      setIsInteracting(false);
      if (containerRef.current) {
        accumulatedScrollRef.current = containerRef.current.scrollLeft;
      }
    }, durationMs);
  }, []);

  // Navigation button controls
  const handleScrollBy = useCallback(
    (offset: number) => {
      const container = containerRef.current;
      if (!container) return;
      markUserInteracting(2500);
      container.scrollBy({ left: offset, behavior: "smooth" });
      setTimeout(() => {
        if (container) accumulatedScrollRef.current = container.scrollLeft;
      }, 400);
    },
    [markUserInteracting]
  );

  const handlePrev = () => handleScrollBy(-480);
  const handleNext = () => handleScrollBy(480);

  const toggleUserPause = () => {
    setUserPaused((prev) => !prev);
    if (containerRef.current) {
      accumulatedScrollRef.current = containerRef.current.scrollLeft;
    }
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    dragStartXRef.current = e.clientX;
    scrollStartRef.current = containerRef.current.scrollLeft;
    hasDraggedRef.current = false;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const delta = e.clientX - dragStartXRef.current;
    if (Math.abs(delta) > 5) {
      hasDraggedRef.current = true;
    }
    containerRef.current.scrollLeft = scrollStartRef.current - delta;
    accumulatedScrollRef.current = containerRef.current.scrollLeft;
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      if (hasDraggedRef.current) {
        wasDraggingRecentlyRef.current = true;
        setTimeout(() => {
          wasDraggingRecentlyRef.current = false;
        }, 150);
      }
      if (containerRef.current) {
        accumulatedScrollRef.current = containerRef.current.scrollLeft;
      }
      markUserInteracting(1500);
    }
  };

  const handleTouchStart = () => {
    markUserInteracting(3000);
  };

  const handleTouchEnd = () => {
    markUserInteracting(2000);
    if (containerRef.current) {
      accumulatedScrollRef.current = containerRef.current.scrollLeft;
    }
  };

  const handleWheel = () => {
    markUserInteracting(1500);
    if (containerRef.current) {
      accumulatedScrollRef.current = containerRef.current.scrollLeft;
    }
  };

  const handleNoticeClick = (e: React.MouseEvent) => {
    if (wasDraggingRecentlyRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Loading Skeleton State
  if (loading) {
    return (
      <Card className={`bg-card border-border shadow-sm overflow-hidden ${className}`}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
            <div className="space-y-2 w-full md:w-1/2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-6 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="grid grid-cols-4 gap-2 w-full md:w-auto">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 w-16 bg-muted rounded-xl" />
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
        <CardContent className="p-5 flex items-center gap-3 text-muted-foreground">
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
        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
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

  // Multiple Schedules: Premium Auto-Scrolling Carousel
  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Carousel Control Bar */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500" />
          </span>
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">
            Official Exam Schedules
          </h3>
          <span className="hidden sm:inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
            {schedules.length} Active Schedules
          </span>
        </div>

        {/* Navigation & Pause Controls */}
        <div className="flex items-center gap-1 shrink-0">
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
            onClick={toggleUserPause}
            aria-label={userPaused ? "Resume automatic scrolling" : "Pause automatic scrolling"}
            className="p-1 sm:p-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            title={userPaused ? "Resume auto-scroll" : "Pause auto-scroll"}
          >
            {userPaused ? (
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
            ) : (
              <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
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

      {/* Marquee Carousel Container */}
      <div
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          handleMouseUp();
        }}
        onFocusCapture={() => setIsFocused(true)}
        onBlurCapture={() => setIsFocused(false)}
      >
        {/* Subtle Edge Fade Gradients */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 sm:w-12 bg-gradient-to-r from-slate-50 dark:from-[#020611] to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 sm:w-12 bg-gradient-to-l from-slate-50 dark:from-[#020611] to-transparent z-10" />

        {/* Scrollable Track */}
        <div
          ref={containerRef}
          role="region"
          aria-label="Official Examination Schedules Carousel"
          aria-roledescription="carousel"
          tabIndex={0}
          className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-none py-2 px-1 focus:outline-none focus:ring-1 focus:ring-blue-500/40 rounded-2xl cursor-grab active:cursor-grabbing select-none"
          style={{ scrollBehavior: isDragging ? "auto" : "smooth" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          {displayItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${(index % schedules.length) + 1} of ${schedules.length}: ${item.title}`}
              className="shrink-0"
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
    </div>
  );
}
