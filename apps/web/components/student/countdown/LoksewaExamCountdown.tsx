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
 * Desktop Countdown Component (Compact horizontal blocks)
 */
function DesktopCountdown({
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
      <div className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 px-3 py-2 rounded-xl text-center shadow-inner shrink-0">
        <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-300 block">Status</span>
        <span className="text-xs font-black tracking-tight text-white flex items-center justify-center gap-1 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Exam Day / In Progress
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* Days */}
      <div className="flex flex-col items-center justify-center w-12 h-14 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 shadow-inner">
        <span className="text-base font-black text-white leading-none">
          {String(timeLeft.days).padStart(2, "0")}
        </span>
        <span className="text-[8px] font-bold uppercase text-slate-300 tracking-wider mt-1">Days</span>
      </div>

      <span className="text-xs font-bold text-white/40 mb-1">:</span>

      {/* Hours */}
      <div className="flex flex-col items-center justify-center w-12 h-14 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 shadow-inner">
        <span className="text-base font-black text-[#60A5FA] leading-none">
          {String(timeLeft.hours).padStart(2, "0")}
        </span>
        <span className="text-[8px] font-bold uppercase text-slate-300 tracking-wider mt-1">Hours</span>
      </div>

      <span className="text-xs font-bold text-white/40 mb-1">:</span>

      {/* Mins */}
      <div className="flex flex-col items-center justify-center w-12 h-14 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 shadow-inner">
        <span className="text-base font-black text-white leading-none">
          {String(timeLeft.minutes).padStart(2, "0")}
        </span>
        <span className="text-[8px] font-bold uppercase text-slate-300 tracking-wider mt-1">Mins</span>
      </div>

      <span className="text-xs font-bold text-white/40 mb-1">:</span>

      {/* Secs */}
      <div className="flex flex-col items-center justify-center w-12 h-14 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 shadow-inner">
        <span className="text-base font-black text-blue-300 leading-none">
          {String(timeLeft.seconds).padStart(2, "0")}
        </span>
        <span className="text-[8px] font-bold uppercase text-slate-300 tracking-wider mt-1">Secs</span>
      </div>
    </div>
  );
}

/**
 * Mobile Countdown Component (4 balanced equal blocks, 100% width)
 */
function MobileCountdown({
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
      <div className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 px-3 py-1.5 rounded-lg text-center shadow-inner w-full">
        <span className="text-xs font-black tracking-tight text-white flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Exam Day / In Progress
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-1.5 w-full">
      <div className="flex flex-col items-center justify-center py-1.5 bg-white/10 backdrop-blur-md rounded-lg border border-white/15 shadow-inner">
        <span className="text-base font-black text-white leading-none">{String(timeLeft.days).padStart(2, "0")}</span>
        <span className="text-[8px] font-bold uppercase text-slate-300 tracking-wider mt-0.5">Days</span>
      </div>
      <div className="flex flex-col items-center justify-center py-1.5 bg-white/10 backdrop-blur-md rounded-lg border border-white/15 shadow-inner">
        <span className="text-base font-black text-[#60A5FA] leading-none">{String(timeLeft.hours).padStart(2, "0")}</span>
        <span className="text-[8px] font-bold uppercase text-slate-300 tracking-wider mt-0.5">Hours</span>
      </div>
      <div className="flex flex-col items-center justify-center py-1.5 bg-white/10 backdrop-blur-md rounded-lg border border-white/15 shadow-inner">
        <span className="text-base font-black text-white leading-none">{String(timeLeft.minutes).padStart(2, "0")}</span>
        <span className="text-[8px] font-bold uppercase text-slate-300 tracking-wider mt-0.5">Mins</span>
      </div>
      <div className="flex flex-col items-center justify-center py-1.5 bg-white/10 backdrop-blur-md rounded-lg border border-white/15 shadow-inner">
        <span className="text-base font-black text-blue-300 leading-none">{String(timeLeft.seconds).padStart(2, "0")}</span>
        <span className="text-[8px] font-bold uppercase text-slate-300 tracking-wider mt-0.5">Secs</span>
      </div>
    </div>
  );
}

/**
 * Premium NES Mastery Examination Schedule Card
 * Strictly follows the specified information hierarchy:
 * 1. Examination status label (Upcoming / Active)
 * 2. Examination title
 * 3. Examination category or level badge
 * 4. Official Exam Notice link (directly below the category badge)
 * 5. Examination date and time
 * 6. Short relevant details, if available
 * 7. Countdown timer
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
      className={`relative overflow-hidden text-white border shadow-xl transition-all duration-300 flex flex-col justify-between w-full min-w-0 max-w-full ${
        isHighlighted
          ? "bg-gradient-to-br from-[#0B2545] via-[#0E2E54] to-[#123966] border-blue-400/30 ring-1 ring-blue-400/20"
          : "bg-gradient-to-br from-[#081C35] via-[#0B2545] to-[#0E2E54] border-blue-500/15"
      } ${
        isSingle
          ? "max-w-4xl mx-auto rounded-2xl"
          : "md:w-[620px] lg:w-[680px] min-h-[195px] md:h-[215px] lg:h-[225px] rounded-2xl"
      }`}
    >
      {/* Restrained subtle ambient glow */}
      <div className="absolute right-0 top-0 w-60 h-60 bg-[#60A5FA]/5 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12" />

      <CardContent className="p-4 sm:p-5 relative z-10 flex flex-col justify-between h-full w-full min-w-0">
        {/* DESKTOP LAYOUT (md and up) */}
        <div className="hidden md:flex flex-col justify-between h-full">
          {/* Top Section: Items 1 to 4 */}
          <div className="space-y-1.5">
            {/* 1. Status Label */}
            <div className="flex items-center justify-between gap-2">
              {isHighlighted ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-500/20 border border-blue-400/35 rounded-full text-[10px] font-bold tracking-wider text-[#60A5FA] uppercase shadow-sm">
                  <Sparkles className="w-3 h-3 text-[#60A5FA] animate-pulse" /> Official Examination Countdown
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/10 border border-white/15 rounded-full text-[10px] font-bold tracking-wider text-slate-200 uppercase shadow-sm">
                  <Calendar className="w-3 h-3 text-[#60A5FA]" /> Upcoming Exam Schedule
                </div>
              )}
            </div>

            {/* 2. Examination Title */}
            <h2 className="text-base lg:text-lg font-black text-white tracking-tight leading-snug line-clamp-1">
              {schedule.title}
            </h2>

            {/* 3. Category / Level Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {schedule.category_name && (
                <span className="bg-white/10 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-200 border border-white/10">
                  {schedule.category_name}
                </span>
              )}
              {schedule.exam_name && (
                <span className="bg-white/10 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-200 border border-white/10">
                  {schedule.exam_name}
                </span>
              )}
            </div>

            {/* 4. Official Exam Notice Link (directly below category badge) */}
            {schedule.official_notice_url && (
              <div>
                <a
                  href={schedule.official_notice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onNoticeClick}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#60A5FA] hover:text-blue-300 underline transition-colors group"
                >
                  <span>Official Exam Notice</span>
                  <ExternalLink className="w-3 h-3 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            )}
          </div>

          {/* Bottom Section: 5. Date & Time + 6. Details on Left, 7. Countdown on Right */}
          <div className="flex items-end justify-between gap-4 pt-2.5 border-t border-white/10 mt-auto">
            <div className="space-y-1.5 flex-1 min-w-0">
              {/* 5. Date and Time */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-300 font-medium">
                <span className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded border border-white/5 text-[11px]">
                  <Calendar className="w-3 h-3 text-[#60A5FA] shrink-0" />
                  <span className="font-semibold text-white">
                    {formatNepaliDateDisplay(schedule.exam_date, { showAd: true })}
                  </span>
                </span>

                {schedule.exam_time && (
                  <span className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded border border-white/5 text-[11px]">
                    <Clock className="w-3 h-3 text-blue-300 shrink-0" />
                    <span>{schedule.exam_time.slice(0, 5)} (NPT)</span>
                  </span>
                )}
              </div>

              {/* 6. Short Details */}
              {schedule.description && (
                <p className="text-[11px] text-slate-300/80 line-clamp-1 max-w-sm">
                  {schedule.description}
                </p>
              )}
            </div>

            {/* 7. Countdown Timer */}
            <DesktopCountdown schedule={schedule} serverOffsetMs={serverOffsetMs} />
          </div>
        </div>

        {/* MOBILE LAYOUT (< md) - Strictly sequential, 100% width, never clipped */}
        <div className="flex md:hidden flex-col justify-between h-full space-y-2 w-full min-w-0">
          {/* 1. Status Label */}
          <div className="flex items-center justify-between gap-2">
            {isHighlighted ? (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/25 border border-blue-400/40 rounded-full text-[9px] font-bold tracking-wider text-[#60A5FA] uppercase shadow-sm">
                <Sparkles className="w-2.5 h-2.5 text-[#60A5FA] animate-pulse" /> Official Exam Countdown
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 border border-white/15 rounded-full text-[9px] font-bold tracking-wider text-slate-200 uppercase shadow-sm">
                <Calendar className="w-2.5 h-2.5 text-[#60A5FA]" /> Upcoming Exam Schedule
              </div>
            )}
          </div>

          {/* 2. Examination Title */}
          <h2 className="text-sm font-black text-white tracking-tight leading-snug line-clamp-2">
            {schedule.title}
          </h2>

          {/* 3. Category / Level Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {schedule.category_name && (
              <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-200 border border-white/10">
                {schedule.category_name}
              </span>
            )}
            {schedule.exam_name && (
              <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-200 border border-white/10">
                {schedule.exam_name}
              </span>
            )}
          </div>

          {/* 4. Official Notice Link directly below category badge */}
          {schedule.official_notice_url && (
            <div>
              <a
                href={schedule.official_notice_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onNoticeClick}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#60A5FA] hover:text-blue-300 underline transition-colors"
              >
                <span>Official Exam Notice</span>
                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
              </a>
            </div>
          )}

          {/* 5. Date & Time */}
          <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-300 font-medium">
            <span className="flex items-center gap-1 bg-black/30 px-1.5 py-0.5 rounded border border-white/5">
              <Calendar className="w-2.5 h-2.5 text-[#60A5FA] shrink-0" />
              <span className="font-semibold text-white">
                {formatNepaliDateDisplay(schedule.exam_date, { showAd: true })}
              </span>
            </span>

            {schedule.exam_time && (
              <span className="flex items-center gap-1 bg-black/30 px-1.5 py-0.5 rounded border border-white/5">
                <Clock className="w-2.5 h-2.5 text-blue-300 shrink-0" />
                <span>{schedule.exam_time.slice(0, 5)} (NPT)</span>
              </span>
            )}
          </div>

          {/* 6. Short Details (if available) */}
          {schedule.description && (
            <p className="text-[10px] text-slate-300/80 line-clamp-1">
              {schedule.description}
            </p>
          )}

          {/* 7. Mobile Countdown (4 balanced blocks, 100% full width) */}
          <div className="pt-1.5 border-t border-white/10 w-full min-w-0">
            <MobileCountdown schedule={schedule} serverOffsetMs={serverOffsetMs} />
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

  // Responsive state (Desktop vs Mobile)
  const [isDesktop, setIsDesktop] = useState(false);
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0);

  // Carousel & Animation States (Desktop only)
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

  // Viewport breakpoint listener
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateSize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

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

  // Items to display: On mobile, exact 1-to-1 list for scroll snapping; on desktop, cloned for infinite looping
  const repeatCount = schedules.length < 3 ? 4 : schedules.length < 5 ? 3 : 2;
  const displayItems = isDesktop && schedules.length >= 2
    ? Array.from({ length: repeatCount }, () => schedules).flat()
    : schedules;

  // Active pause state: hovered, focused, user paused, dragging, touching, reduced motion, or tab hidden
  const isPaused =
    !isDesktop || // Autoplay disabled on mobile
    isHovered ||
    isFocused ||
    userPaused ||
    isInteracting ||
    isDragging ||
    prefersReducedMotion ||
    !isTabVisible;

  // Smooth continuous auto-scrolling with RAF (Desktop only)
  useEffect(() => {
    if (!isDesktop || schedules.length < 2) return;

    let animationFrameId: number;
    const speed = 0.55; // ~33px/sec, smooth and comfortable reading speed

    const animate = () => {
      const container = containerRef.current;
      if (container && !isPaused) {
        accumulatedScrollRef.current += speed;
        container.scrollLeft = accumulatedScrollRef.current;

        // Loop seamlessly when single set of duplicates is traversed
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
  }, [schedules.length, isPaused, repeatCount, isDesktop]);

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

  // Navigation button controls (works on both Desktop and Mobile)
  const handleScrollBy = useCallback(
    (offset: number) => {
      const container = containerRef.current;
      if (!container) return;

      if (!isDesktop) {
        // Mobile snap card by card
        const targetIndex = offset > 0
          ? Math.min(mobileActiveIndex + 1, schedules.length - 1)
          : Math.max(mobileActiveIndex - 1, 0);
        container.scrollTo({
          left: targetIndex * container.clientWidth,
          behavior: "smooth",
        });
        setMobileActiveIndex(targetIndex);
      } else {
        // Desktop smooth scroll
        markUserInteracting(2500);
        container.scrollBy({ left: offset, behavior: "smooth" });
        setTimeout(() => {
          if (container) accumulatedScrollRef.current = container.scrollLeft;
        }, 400);
      }
    },
    [isDesktop, mobileActiveIndex, schedules.length, markUserInteracting]
  );

  const handlePrev = () => handleScrollBy(isDesktop ? -640 : -1);
  const handleNext = () => handleScrollBy(isDesktop ? 640 : 1);

  const toggleUserPause = () => {
    setUserPaused((prev) => !prev);
    if (containerRef.current) {
      accumulatedScrollRef.current = containerRef.current.scrollLeft;
    }
  };

  // Mouse drag handlers (Desktop only)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDesktop || !containerRef.current) return;
    dragStartXRef.current = e.clientX;
    scrollStartRef.current = containerRef.current.scrollLeft;
    hasDraggedRef.current = false;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDesktop || !isDragging || !containerRef.current) return;
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

  // Mobile scroll tracking for pagination dots
  const handleMobileScroll = () => {
    if (isDesktop || !containerRef.current) return;
    const { scrollLeft, clientWidth } = containerRef.current;
    if (clientWidth > 0) {
      const index = Math.round(scrollLeft / clientWidth);
      setMobileActiveIndex(Math.min(Math.max(index, 0), schedules.length - 1));
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

  // Multiple Schedules: Redesigned Carousel
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
            {schedules.length} Active {schedules.length === 1 ? "Schedule" : "Schedules"}
          </span>
        </div>

        {/* Carousel Controls */}
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

          {isDesktop && (
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
          )}

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
        onMouseEnter={() => isDesktop && setIsHovered(true)}
        onMouseLeave={() => {
          if (isDesktop) {
            setIsHovered(false);
            handleMouseUp();
          }
        }}
        onFocusCapture={() => isDesktop && setIsFocused(true)}
        onBlurCapture={() => isDesktop && setIsFocused(false)}
      >
        {/* Scrollable Track - Pure CSS snap on mobile, marquee on desktop */}
        <div
          ref={containerRef}
          role="region"
          aria-label="Official Examination Schedules Carousel"
          aria-roledescription="carousel"
          tabIndex={0}
          className="w-full min-w-0 max-w-full flex overflow-x-auto scrollbar-none py-1 px-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500/40 rounded-2xl select-none snap-x snap-mandatory md:snap-none gap-3 md:gap-5 md:cursor-grab md:active:cursor-grabbing"
          style={{ scrollBehavior: isDragging ? "auto" : "smooth" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onScroll={!isDesktop ? handleMobileScroll : undefined}
        >
          {displayItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${(index % schedules.length) + 1} of ${schedules.length}: ${item.title}`}
              className="w-full flex-none min-w-0 max-w-full snap-center md:snap-align-none md:w-auto"
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

      {/* Mobile Pagination Dots Indicator */}
      {!isDesktop && schedules.length > 1 && (
        <div className="flex md:hidden items-center justify-center gap-1.5 pt-1">
          {schedules.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (containerRef.current) {
                  containerRef.current.scrollTo({
                    left: idx * containerRef.current.clientWidth,
                    behavior: "smooth",
                  });
                  setMobileActiveIndex(idx);
                }
              }}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                mobileActiveIndex === idx
                  ? "w-5 bg-[#60A5FA]"
                  : "w-1.5 bg-slate-300 dark:bg-white/20 hover:bg-slate-400"
              }`}
            />
          ))}
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 ml-1.5">
            {mobileActiveIndex + 1} / {schedules.length}
          </span>
        </div>
      )}
    </div>
  );
}
