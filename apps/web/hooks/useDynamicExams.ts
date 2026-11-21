"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { type PublicExamination } from "@/lib/api/public-api";
import { adToBs } from "@/lib/nepali-date";

export interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isZero: boolean;
}

export interface DynamicExamination extends PublicExamination {
  currentStatus: "LIVE" | "UPCOMING" | "COMPLETED";
  countdown: CountdownTime | null;
  formattedScheduleNpt: string;
  canStart: boolean;
}

export function formatNptDateTime(isoString?: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  // Format in Nepal Standard Time (UTC+05:45)
  const timeStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  const dateStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

  // Convert to BS date
  const yearMonthDay = date.toLocaleDateString("en-CA", { timeZone: "Asia/Kathmandu" });
  const bs = adToBs(yearMonthDay);
  if (bs) {
    return `${bs.formattedReadable} (${dateStr}) • ${timeStr} (NPT)`;
  }

  return `${dateStr} • ${timeStr} (NPT)`;
}

export function useDynamicExams(rawExams: PublicExamination[]) {
  // Calculate server time offset
  const serverOffsetRef = useRef<number>(0);

  useEffect(() => {
    if (rawExams.length > 0 && rawExams[0]?.server_time) {
      const serverMs = new Date(rawExams[0].server_time).getTime();
      if (!isNaN(serverMs)) {
        serverOffsetRef.current = serverMs - Date.now();
      }
    }
  }, [rawExams]);

  // Current timestamp updated every second based on real-time elapsed
  const [nowMs, setNowMs] = useState<number>(() => Date.now() + serverOffsetRef.current);

  useEffect(() => {
    const tick = () => {
      setNowMs(Date.now() + serverOffsetRef.current);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const { liveExams, upcomingExams, completedExams, allSortedExams } = useMemo(() => {
    const live: DynamicExamination[] = [];
    const upcoming: DynamicExamination[] = [];
    const completed: DynamicExamination[] = [];

    const now = nowMs;

    for (const exam of rawExams) {
      const startMs = exam.start_time ? new Date(exam.start_time).getTime() : null;
      let endMs = exam.end_time ? new Date(exam.end_time).getTime() : null;

      // If no end_time but start_time and duration exist, effective_end_time = start_time + duration*60000
      if (!endMs && startMs && exam.duration) {
        endMs = startMs + exam.duration * 60 * 1000;
      }

      let currentStatus: "LIVE" | "UPCOMING" | "COMPLETED" = "LIVE";
      let countdown: CountdownTime | null = null;
      let canStart = false;

      if (startMs && now < startMs) {
        // Exam is in the future
        currentStatus = "UPCOMING";
        canStart = false;
        const diff = Math.max(0, startMs - now);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        countdown = { days, hours, minutes, seconds, isZero: diff === 0 };
      } else if (endMs && now >= endMs) {
        // Exam window has passed
        currentStatus = "COMPLETED";
        canStart = false;
      } else {
        // Exam is currently ongoing or always available
        currentStatus = "LIVE";
        canStart = true;
      }

      const formattedScheduleNpt = formatNptDateTime(exam.start_time);

      const dynamicExam: DynamicExamination = {
        ...exam,
        currentStatus,
        countdown,
        formattedScheduleNpt,
        canStart,
      };

      if (currentStatus === "LIVE") {
        live.push(dynamicExam);
      } else if (currentStatus === "UPCOMING") {
        upcoming.push(dynamicExam);
      } else {
        completed.push(dynamicExam);
      }
    }

    // Sort Priority 1: LIVE exams by start_time (or ID/default order)
    live.sort((a, b) => {
      const timeA = a.start_time ? new Date(a.start_time).getTime() : 0;
      const timeB = b.start_time ? new Date(b.start_time).getTime() : 0;
      return timeB - timeA;
    });

    // Sort Priority 2: UPCOMING exams by nearest start_time ascending (soonest first)
    upcoming.sort((a, b) => {
      const timeA = a.start_time ? new Date(a.start_time).getTime() : Infinity;
      const timeB = b.start_time ? new Date(b.start_time).getTime() : Infinity;
      return timeA - timeB;
    });

    // Sort Priority 3: COMPLETED exams by end_time descending (most recently ended first)
    completed.sort((a, b) => {
      const timeA = a.end_time ? new Date(a.end_time).getTime() : 0;
      const timeB = b.end_time ? new Date(b.end_time).getTime() : 0;
      return timeB - timeA;
    });

    return {
      liveExams: live,
      upcomingExams: upcoming,
      completedExams: completed,
      allSortedExams: [...live, ...upcoming, ...completed],
    };
  }, [rawExams, nowMs]);

  return {
    liveExams,
    upcomingExams,
    completedExams,
    allSortedExams,
    counts: {
      live: liveExams.length,
      upcoming: upcomingExams.length,
      completed: completedExams.length,
      total: allSortedExams.length,
    },
    nowMs,
  };
}
