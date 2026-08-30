"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, Play, AlertCircle, FileText, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { schedulesApi, UpcomingMockExam } from "@/lib/api/schedules";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isZero: boolean;
}

export function MockExamCountdown({ className = "" }: { className?: string }) {
  const [mockExam, setMockExam] = useState<UpcomingMockExam | null>(null);
  const [status, setStatus] = useState<"UPCOMING" | "LIVE" | "COMPLETED" | "NONE">("NONE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isZero: false,
  });

  const fetchUpcomingMock = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await schedulesApi.getUpcomingMockExam();
      if (res.mock_exam) {
        setMockExam(res.mock_exam);
        setStatus(res.status);
        if (res.server_time) {
          const serverMs = new Date(res.server_time).getTime();
          const clientMs = Date.now();
          setServerOffsetMs(serverMs - clientMs);
        }
      } else {
        setMockExam(null);
        setStatus("NONE");
      }
    } catch (err) {
      console.error("Failed to load upcoming mock exam", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcomingMock();
  }, []);

  useEffect(() => {
    if (!mockExam || !mockExam.start_time) return;
    const currentExam = mockExam;

    function calculateTime() {
      const now = Date.now() + serverOffsetMs;
      const startMs = new Date(currentExam.start_time!).getTime();
      const endMs = currentExam.end_time ? new Date(currentExam.end_time).getTime() : Infinity;

      // Status transitions
      if (now < startMs) {
        setStatus("UPCOMING");
        const diff = startMs - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds, isZero: false });
      } else if (now >= startMs && now <= endMs) {
        setStatus("LIVE");
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isZero: true });
      } else {
        setStatus("COMPLETED");
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isZero: true });
      }
    }


    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [mockExam, serverOffsetMs]);

  if (loading) {
    return (
      <Card className={`bg-card border-border shadow-sm ${className}`}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
            <div className="space-y-2 w-full sm:w-2/3">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-6 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="h-10 bg-muted rounded-xl w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !mockExam || status === "NONE") {
    return null; // Gracefully hidden if no upcoming mock test exists
  }

  return (
    <Card className={`bg-card border-border shadow-sm overflow-hidden ${className}`}>
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          {/* Left info */}
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              {status === "LIVE" ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  LIVE NOW
                </Badge>
              ) : status === "UPCOMING" ? (
                <Badge variant="outline" className="text-blue-600 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-xs font-bold">
                  UPCOMING MOCK EXAM
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  COMPLETED
                </Badge>
              )}

              {mockExam.category_name && (
                <span className="text-xs text-muted-foreground font-medium">
                  {mockExam.category_name}
                </span>
              )}
            </div>

            <h4 className="text-base sm:text-lg font-bold text-foreground leading-tight">
              {mockExam.title}
            </h4>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {mockExam.duration_minutes} Mins
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> {mockExam.total_questions} Questions
              </span>
              {mockExam.start_time && (
                <span>
                  Starts: {new Date(mockExam.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          {/* Right Action / Countdown */}
          <div className="shrink-0 w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
            {status === "UPCOMING" && (
              <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-2 rounded-xl border border-border">
                <span className="text-xs font-bold text-muted-foreground mr-1">Starts in:</span>
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 bg-background rounded border text-foreground">
                  {String(timeLeft.days).padStart(2, "0")}d
                </span>
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 bg-background rounded border text-foreground">
                  {String(timeLeft.hours).padStart(2, "0")}h
                </span>
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 bg-background rounded border text-foreground">
                  {String(timeLeft.minutes).padStart(2, "0")}m
                </span>
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 bg-background rounded border text-primary">
                  {String(timeLeft.seconds).padStart(2, "0")}s
                </span>
              </div>
            )}

            {mockExam.has_attempted ? (
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                <Button asChild variant="outline" size="sm" className="w-full sm:w-auto text-xs font-semibold">
                  <Link href="/student/results">View Result</Link>
                </Button>
                <Button disabled className="w-full sm:w-auto bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-70 pointer-events-none font-bold gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Already Taken
                </Button>
              </div>
            ) : status === "LIVE" ? (
              <Button asChild className="w-full md:w-auto bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0B2545] font-black shadow-md gap-2">
                <Link href={`/student/exams/${mockExam.id}`}>
                  <Play className="w-4 h-4 fill-current" />
                  {mockExam.active_attempt_id ? "Resume Exam" : "Start Exam Now"}
                </Link>
              </Button>
            ) : status === "UPCOMING" ? (
              <Button disabled variant="outline" className="w-full md:w-auto text-xs font-bold">
                Opens at Scheduled Time
              </Button>
            ) : (
              <Button asChild variant="outline" className="w-full md:w-auto text-xs font-bold">
                <Link href="/student/exams">View Past Results</Link>
              </Button>
            )}
          </div>


        </div>
      </CardContent>
    </Card>
  );
}
