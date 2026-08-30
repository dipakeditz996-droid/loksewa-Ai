"use client";

import React, { useState, useEffect } from "react";
import { Calendar, Clock, ExternalLink, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { schedulesApi, OfficialExamSchedule } from "@/lib/api/schedules";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export function LoksewaExamCountdown({ className = "" }: { className?: string }) {
  const [schedule, setSchedule] = useState<OfficialExamSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchSchedule() {
      try {
        setLoading(true);
        setError(false);
        const res = await schedulesApi.getNextOfficialExam();
        if (!isMounted) return;

        if (res.schedule) {
          setSchedule(res.schedule);
          if (res.server_time) {
            const serverMs = new Date(res.server_time).getTime();
            const clientMs = Date.now();
            setServerOffsetMs(serverMs - clientMs);
          }
        } else {
          setSchedule(null);
        }
      } catch (err) {
        console.error("Failed to load official exam schedule", err);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchSchedule();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!schedule || !schedule.exam_date) return;
    const currentSchedule = schedule;

    function calculateTimeLeft() {
      const now = Date.now() + serverOffsetMs;
      
      // Determine target timestamp: prefer exam_datetime if present, else combine exam_date and exam_time
      let targetMs: number;
      if (currentSchedule.exam_datetime) {
        targetMs = new Date(currentSchedule.exam_datetime).getTime();
      } else {
        const timePart = currentSchedule.exam_time || "08:00:00";
        // Localized to Nepal +05:45
        targetMs = new Date(`${currentSchedule.exam_date}T${timePart}+05:45`).getTime();
      }

      const diff = targetMs - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    }


    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [schedule, serverOffsetMs]);

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

  if (error) {
    return (
      <Card className={`bg-card border-border shadow-sm ${className}`}>
        <CardContent className="p-5 flex items-center gap-3 text-muted-foreground">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-xs">Unable to load exam schedule right now.</p>
        </CardContent>
      </Card>
    );
  }

  if (!schedule) {
    return (
      <Card className={`bg-card border-border border-dashed shadow-sm ${className}`}>
        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-muted rounded-xl text-muted-foreground">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Next Official Loksewa Exam</h4>
              <p className="text-xs text-muted-foreground mt-0.5">No upcoming Loksewa exam scheduled yet.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br from-[#0B2545] to-[#133E6D] text-white border-none shadow-md ${className}`}>
      {/* Decorative background glow */}
      <div className="absolute right-0 top-0 w-80 h-80 bg-[#D4A72C]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      <CardContent className="p-6 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Left Column: Info & Details */}
          <div className="space-y-2 flex-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-bold tracking-wider text-[#D4A72C] uppercase">
              <Sparkles className="w-3 h-3" /> Official Loksewa Countdown
            </div>

            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">
              {schedule.title}
            </h3>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#D4A72C]" />
                {new Date(schedule.exam_date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              {schedule.exam_time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-300" />
                  {schedule.exam_time.slice(0, 5)} (NPT)
                </span>
              )}
              {schedule.category_name && (
                <span className="bg-white/10 px-2 py-0.5 rounded text-[11px] text-slate-200">
                  {schedule.category_name}
                </span>
              )}
            </div>

            {schedule.description && (
              <p className="text-xs text-slate-300 line-clamp-2 max-w-xl">
                {schedule.description}
              </p>
            )}

            {schedule.official_notice_url && (
              <div className="pt-1">
                <a
                  href={schedule.official_notice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#D4A72C] hover:underline font-semibold"
                >
                  Official PSC Notice <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Right Column: Countdown Clocks or Expired Notice */}
          <div className="shrink-0 flex flex-col items-center lg:items-end">
            {timeLeft.isExpired ? (
              <div className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 px-6 py-4 rounded-2xl text-center">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-300 block mb-1">
                  Status
                </span>
                <span className="text-lg font-black tracking-tight text-white">
                  Exam Day / In Progress
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Days */}
                <div className="flex flex-col items-center justify-center w-16 sm:w-20 h-18 sm:h-20 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner">
                  <span className="text-2xl sm:text-3xl font-black text-white leading-none">
                    {String(timeLeft.days).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-300 tracking-wider mt-1">
                    Days
                  </span>
                </div>

                <span className="text-xl font-bold text-white/40 mb-3">:</span>

                {/* Hours */}
                <div className="flex flex-col items-center justify-center w-16 sm:w-20 h-18 sm:h-20 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner">
                  <span className="text-2xl sm:text-3xl font-black text-[#D4A72C] leading-none">
                    {String(timeLeft.hours).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-300 tracking-wider mt-1">
                    Hours
                  </span>
                </div>

                <span className="text-xl font-bold text-white/40 mb-3">:</span>

                {/* Minutes */}
                <div className="flex flex-col items-center justify-center w-16 sm:w-20 h-18 sm:h-20 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner">
                  <span className="text-2xl sm:text-3xl font-black text-white leading-none">
                    {String(timeLeft.minutes).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-300 tracking-wider mt-1">
                    Mins
                  </span>
                </div>

                <span className="text-xl font-bold text-white/40 mb-3">:</span>

                {/* Seconds */}
                <div className="flex flex-col items-center justify-center w-16 sm:w-20 h-18 sm:h-20 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner">
                  <span className="text-2xl sm:text-3xl font-black text-blue-300 leading-none">
                    {String(timeLeft.seconds).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-300 tracking-wider mt-1">
                    Secs
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
