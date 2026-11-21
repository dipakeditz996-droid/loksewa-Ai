"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Clock,
  ArrowRight,
  AlertCircle,
  PlayCircle,
  Calendar,
  Lock,
} from "lucide-react";
import { type DynamicExamination } from "@/hooks/useDynamicExams";
import { useAuth } from "@/contexts/AuthContext";

interface DynamicExamCardProps {
  exam: DynamicExamination;
  compact?: boolean;
}

export function DynamicExamCard({ exam, compact = false }: DynamicExamCardProps) {
  const { user } = useAuth();

  const startHref = user
    ? `/student/exams/${exam.id}`
    : `/login?redirect=${encodeURIComponent(`/student/exams/${exam.id}`)}`;

  const isLive = exam.currentStatus === "LIVE";
  const isUpcoming = exam.currentStatus === "UPCOMING";
  const isCompleted = exam.currentStatus === "COMPLETED";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="p-6 rounded-[20px] bg-slate-50/70 dark:bg-[#060E18] border border-slate-200 dark:border-white/[0.08] hover:border-[#163E6B]/40 dark:hover:border-white/25 hover:shadow-xl transition-all duration-300 group cursor-pointer flex flex-col h-full relative overflow-hidden text-left">
          {/* Top Type Badge & Live Indicator */}
          <div className="flex justify-between items-start mb-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-300 text-[10px] font-[800] uppercase tracking-wider">
              {exam.type}
            </div>

            {isLive ? (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                </span>
                <span className="text-[11px] font-[800] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Live Now
                </span>
              </div>
            ) : isUpcoming ? (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <span className="text-[11px] font-[800] text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Upcoming
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                <span className="text-[11px] font-[700] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Ended
                </span>
              </div>
            )}
          </div>

          {/* Title & Level */}
          <h3 className="text-[17px] sm:text-lg font-[800] text-slate-900 dark:text-white mb-1.5 group-hover:text-[#163E6B] dark:group-hover:text-[#D4A72C] transition-colors leading-snug">
            {exam.title}
          </h3>
          <p className="text-sm font-[600] text-slate-500 dark:text-slate-400 mb-4">
            {exam.level || "General"} {exam.paper ? `• ${exam.paper}` : ""}
          </p>

          {/* Countdown Block for UPCOMING exams */}
          {isUpcoming && exam.countdown && (
            <div className="mb-5 p-3.5 rounded-[12px] bg-amber-500/10 border border-amber-500/20">
              <div className="text-[10.5px] font-[800] text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Starts In</span>
                {exam.formattedScheduleNpt && (
                  <span className="text-[10px] font-[600] text-slate-500 dark:text-slate-400 normal-case flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {exam.formattedScheduleNpt}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white/80 dark:bg-black/30 rounded-[8px] py-1.5 px-1 border border-amber-500/10">
                  <div className="text-base font-[900] text-slate-900 dark:text-white leading-tight">
                    {String(exam.countdown.days).padStart(2, "0")}
                  </div>
                  <div className="text-[9px] font-[700] uppercase text-slate-500 dark:text-slate-400">
                    Days
                  </div>
                </div>
                <div className="bg-white/80 dark:bg-black/30 rounded-[8px] py-1.5 px-1 border border-amber-500/10">
                  <div className="text-base font-[900] text-slate-900 dark:text-white leading-tight">
                    {String(exam.countdown.hours).padStart(2, "0")}
                  </div>
                  <div className="text-[9px] font-[700] uppercase text-slate-500 dark:text-slate-400">
                    Hours
                  </div>
                </div>
                <div className="bg-white/80 dark:bg-black/30 rounded-[8px] py-1.5 px-1 border border-amber-500/10">
                  <div className="text-base font-[900] text-slate-900 dark:text-white leading-tight">
                    {String(exam.countdown.minutes).padStart(2, "0")}
                  </div>
                  <div className="text-[9px] font-[700] uppercase text-slate-500 dark:text-slate-400">
                    Mins
                  </div>
                </div>
                <div className="bg-white/80 dark:bg-black/30 rounded-[8px] py-1.5 px-1 border border-amber-500/10">
                  <div className="text-base font-[900] text-amber-600 dark:text-amber-400 leading-tight">
                    {String(exam.countdown.seconds).padStart(2, "0")}
                  </div>
                  <div className="text-[9px] font-[700] uppercase text-slate-500 dark:text-slate-400">
                    Secs
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Questions & Duration stats */}
          <div className="grid grid-cols-2 gap-3 mb-5 mt-auto">
            <div className="bg-white dark:bg-[#04080F] p-3 rounded-[12px] border border-slate-200/60 dark:border-white/5">
              <div className="text-[10px] font-[800] text-slate-400 uppercase tracking-wider mb-1">
                Questions
              </div>
              <div className="text-sm font-[800] text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#163E6B] dark:text-[#D4A72C]" />{" "}
                {exam.questions} Qs
              </div>
            </div>
            <div className="bg-white dark:bg-[#04080F] p-3 rounded-[12px] border border-slate-200/60 dark:border-white/5">
              <div className="text-[10px] font-[800] text-slate-400 uppercase tracking-wider mb-1">
                Duration
              </div>
              <div className="text-sm font-[800] text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#163E6B] dark:text-[#D4A72C]" />{" "}
                {exam.duration}m
              </div>
            </div>
          </div>

          {/* Bottom Status & CTA Action */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200/70 dark:border-white/5">
            <span
              className={`text-xs font-[800] px-2.5 py-1 rounded-[6px] ${
                isLive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : isUpcoming
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                  : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400"
              }`}
            >
              {isLive ? "LIVE" : isUpcoming ? "UPCOMING" : "COMPLETED"}
            </span>

            {isLive ? (
              <span className="text-sm font-[800] text-[#163E6B] dark:text-[#D4A72C] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Start Exam <PlayCircle className="w-4 h-4 ml-1" />
              </span>
            ) : isUpcoming ? (
              <span className="text-xs font-[700] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Starts Soon
              </span>
            ) : (
              <span className="text-sm font-[800] text-slate-500 dark:text-slate-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                View Details <ArrowRight className="w-4 h-4 ml-1" />
              </span>
            )}
          </div>
        </div>
      </DialogTrigger>

      {/* Exam Detail Preview Modal */}
      <DialogContent className="max-w-2xl bg-white dark:bg-[#0B1521] border-slate-200 dark:border-white/10 rounded-[24px] p-0 overflow-hidden shadow-2xl">
        <div className="bg-slate-50 dark:bg-[#0A1420] p-6 md:p-8 border-b border-slate-200 dark:border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A72C]/10 rounded-bl-full pointer-events-none"></div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#163E6B]/10 dark:bg-white/10 text-[#163E6B] dark:text-white text-xs font-[800] uppercase tracking-wider mb-4 border border-[#163E6B]/20 dark:border-white/20">
            Exam Overview
          </div>
          <DialogTitle className="text-2xl md:text-3xl font-[900] text-slate-900 dark:text-white mb-2 leading-tight">
            {exam.title}
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400 font-[500]">
            {exam.level || "General"} • {exam.type} {exam.paper ? `• ${exam.paper}` : ""}
          </DialogDescription>
        </div>

        <div className="p-6 md:p-8">
          {/* Metrics grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-50 dark:bg-[#0A1118] p-4 rounded-[14px] border border-slate-100 dark:border-white/5 text-center">
              <div className="text-xs font-[800] text-slate-500 uppercase mb-1">
                Questions
              </div>
              <div className="text-2xl font-[900] text-slate-900 dark:text-white">
                {exam.questions}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-[#0A1118] p-4 rounded-[14px] border border-slate-100 dark:border-white/5 text-center">
              <div className="text-xs font-[800] text-slate-500 uppercase mb-1">
                Duration
              </div>
              <div className="text-2xl font-[900] text-slate-900 dark:text-white">
                {exam.duration}m
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-[#0A1118] p-4 rounded-[14px] border border-slate-100 dark:border-white/5 text-center col-span-2 md:col-span-1">
              <div className="text-xs font-[800] text-slate-500 uppercase mb-1">
                Status
              </div>
              <div
                className={`text-xl font-[900] ${
                  isLive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isUpcoming
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {isLive ? "LIVE NOW" : isUpcoming ? "UPCOMING" : "ENDED"}
              </div>
            </div>
          </div>

          {/* Schedule Banner if available */}
          {exam.formattedScheduleNpt && (
            <div className="mb-6 p-4 rounded-[12px] bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <div className="text-xs font-[700] text-blue-900 dark:text-blue-300">
                  Scheduled Start Time (Nepal Standard Time)
                </div>
                <div className="text-sm font-[800] text-blue-950 dark:text-blue-100">
                  {exam.formattedScheduleNpt}
                </div>
              </div>
            </div>
          )}

          {/* Subjects covered */}
          {exam.subjects && exam.subjects.length > 0 && (
            <div className="mb-8">
              <h4 className="text-xs font-[800] text-slate-900 dark:text-white mb-3 uppercase tracking-wider">
                Subjects Covered
              </h4>
              <div className="flex flex-wrap gap-2">
                {exam.subjects.map((sub, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[8px] text-xs font-[600] text-slate-700 dark:text-slate-300"
                  >
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Examination Rules & Guidelines */}
          <div className="mb-8 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-[14px] p-5">
            <h4 className="text-xs font-[800] text-amber-900 dark:text-amber-500 mb-3 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Examination Rules & Guidelines
            </h4>
            <ul className="space-y-2 text-xs font-[500] text-amber-800 dark:text-amber-200/70">
              <li className="flex items-start gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                Read each question carefully before submitting your answer.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                You can navigate freely between questions using the question palette.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                Timed simulation replicates the real exam; auto-submits when time expires.
              </li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {isLive ? (
              <Link href={startHref} className="flex-1">
                <Button className="w-full h-12 rounded-[12px] bg-[#163E6B] dark:bg-[#D4A72C] hover:bg-[#163E6B]/90 dark:hover:bg-[#D4A72C]/90 text-white dark:text-[#0A1118] font-[800] text-[15px] shadow-[0_0_20px_rgba(22,62,107,0.25)] dark:shadow-[0_0_20px_rgba(212,167,44,0.3)]">
                  Start Examination <PlayCircle className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            ) : isUpcoming ? (
              <Button
                disabled
                className="flex-1 h-12 rounded-[12px] bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 font-[800] text-[15px] cursor-not-allowed"
              >
                <Lock className="w-4 h-4 mr-2" /> Exam Opens at Scheduled Time
              </Button>
            ) : (
              <Link href={user ? "/student/exams" : "/login"} className="flex-1">
                <Button className="w-full h-12 rounded-[12px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 font-[800] text-[15px]">
                  View Past Results / Solutions
                </Button>
              </Link>
            )}

            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-12 px-6 rounded-[12px] border-slate-300 dark:border-white/20 text-slate-700 dark:text-slate-300 font-[700]"
              >
                Close
              </Button>
            </DialogTrigger>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
