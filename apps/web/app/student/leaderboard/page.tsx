"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Trophy, Crown, Medal, Award,
  TrendingUp, TrendingDown, Minus,
  RefreshCw, Share2, Users, Star,
  BookOpen, ChevronLeft, ChevronRight,
  BarChart3, Target, Zap, Search,
  CheckCircle2, Sparkles, Wifi,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  leaderboardService,
  type LeaderboardStudent,
  type LeaderboardStats,
  type ScoreTrendPoint,
} from "@/lib/api/leaderboard";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

type PageStatus = "loading" | "success" | "empty" | "error";

// ─── Utility ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-white/5 animate-pulse",
        className
      )}
      style={style}
    />
  );
}

function SkeletonPodium() {
  return (
    <div className="flex justify-center items-end gap-4 px-4 py-8">
      {[180, 220, 150].map((h, i) => (
        <div key={i} className="flex flex-col items-center gap-3">
          <Sk className="w-16 h-16 rounded-full" />
          <Sk className="h-3 w-24" />
          <Sk className={`w-28 rounded-t-xl`} style={{ height: h }} />
        </div>
      ))}
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3">
          <Sk className="w-8 h-4" />
          <Sk className="w-9 h-9 rounded-full flex-shrink-0" />
          <Sk className="flex-1 h-4 max-w-[200px]" />
          <Sk className="w-16 h-4 ml-auto" />
          <Sk className="w-20 h-2 hidden sm:block" />
        </div>
      ))}
    </div>
  );
}

function SkeletonAnalytics() {
  return (
    <div className="space-y-4">
      <Sk className="h-44 w-full rounded-2xl" />
      <Sk className="h-32 w-full rounded-2xl" />
      <Sk className="h-56 w-full rounded-2xl" />
    </div>
  );
}

// ─── Confetti particles ───────────────────────────────────────────────────────

function Confetti() {
  const particles = Array.from({ length: 18 });
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((_, i) => {
        const colors = [
          "#D4A72C", "#FFD700", "#C0C0C0", "#CD7F32",
          "#7C3AED", "#10B981", "#3B82F6",
        ];
        const color = colors[i % colors.length]!;
        const left = `${5 + (i * 5.5) % 90}%`;
        const delay = `${(i * 0.18) % 2.4}s`;
        const dur = `${2.2 + (i % 4) * 0.4}s`;
        const size = i % 3 === 0 ? 10 : i % 3 === 1 ? 7 : 5;
        return (
          <div
            key={i}
            className="absolute top-0 rounded-sm opacity-0 lb-confetti"
            style={{
              left,
              width: size,
              height: size * (i % 2 === 0 ? 1 : 1.8),
              background: color,
              animationDelay: delay,
              animationDuration: dur,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Podium Card ──────────────────────────────────────────────────────────────

interface PodiumCardProps {
  entry: LeaderboardStudent;
  place: 1 | 2 | 3;
  animate: boolean;
}

function PodiumCard({ entry, place, animate }: PodiumCardProps) {
  const cfg: Record<1 | 2 | 3, {
    podiumH: number;
    podiumGradient: string;
    avatarRing: string;
    glow: string;
    badgeBg: string;
    badgeText: string;
    icon: React.ReactNode;
    wrapperMt: string;
    avatarSize: string;
    textColor: string;
  }> = {
    1: {
      podiumH: 220,
      podiumGradient: "linear-gradient(to top, #7C2D02, #D97706, #FCD34D)",
      avatarRing: "ring-4 ring-yellow-400",
      glow: "shadow-[0_0_40px_10px_rgba(212,167,44,0.35)]",
      badgeBg: "#D4A72C",
      badgeText: "#1a0e00",
      icon: <Crown className="w-5 h-5 text-yellow-300" />,
      wrapperMt: "-mt-10 z-20",
      avatarSize: "w-20 h-20 sm:w-24 sm:h-24",
      textColor: "#FCD34D",
    },
    2: {
      podiumH: 175,
      podiumGradient: "linear-gradient(to top, #1e293b, #64748b, #cbd5e1)",
      avatarRing: "ring-4 ring-slate-400",
      glow: "shadow-[0_0_24px_6px_rgba(148,163,184,0.2)]",
      badgeBg: "#94a3b8",
      badgeText: "#0f172a",
      icon: <Medal className="w-4 h-4 text-slate-300" />,
      wrapperMt: "mt-8 z-10",
      avatarSize: "w-16 h-16 sm:w-20 sm:h-20",
      textColor: "#cbd5e1",
    },
    3: {
      podiumH: 145,
      podiumGradient: "linear-gradient(to top, #431407, #92400e, #cd7f32)",
      avatarRing: "ring-4 ring-amber-600",
      glow: "shadow-[0_0_24px_6px_rgba(205,127,50,0.2)]",
      badgeBg: "#cd7f32",
      badgeText: "#fff",
      icon: <Award className="w-4 h-4 text-amber-400" />,
      wrapperMt: "mt-8 z-10",
      avatarSize: "w-16 h-16 sm:w-20 sm:h-20",
      textColor: "#FCA76A",
    },
  };

  const c = cfg[place];
  const initials = getInitials(entry.studentName);
  const translateClass = animate
    ? place === 1
      ? "lb-podium-rise-1"
      : place === 2
      ? "lb-podium-rise-2"
      : "lb-podium-rise-3"
    : "opacity-0";

  return (
    <div className={cn("flex flex-col items-center relative", c.wrapperMt, translateClass)}>
      {/* Badge icon */}
      <div
        className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full mb-2 border"
        style={{
          background: c.badgeBg + "22",
          borderColor: c.badgeBg + "55",
          color: c.textColor,
        }}
      >
        {c.icon}
        #{place}
      </div>

      {/* Avatar */}
      <div className={cn("relative mb-3", c.glow)}>
        <Avatar className={cn(c.avatarSize, c.avatarRing, "border-2 border-white/10")}>
          {entry.avatar && (
            <AvatarImage src={entry.avatar} alt={entry.studentName} className="object-cover" />
          )}
          <AvatarFallback
            className="font-bold text-lg"
            style={{ background: "#0D1F38", color: c.textColor }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        {place === 1 && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Crown className="w-7 h-7 text-yellow-400 drop-shadow-[0_0_8px_rgba(253,224,71,0.8)]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-center mb-3 px-1">
        <p
          className="font-bold text-sm truncate w-24 sm:w-32 mx-auto"
          style={{ color: c.textColor }}
          title={entry.studentName}
        >
          {entry.studentName}
          {entry.isCurrentUser && (
            <span className="ml-1 text-[9px] bg-white/10 text-white px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-bold">
              YOU
            </span>
          )}
        </p>
        <p className="text-white/80 text-xs mt-0.5">
          {entry.score}/{entry.maxScore} · {fmt(entry.percentage)}%
        </p>
        <p className="text-white/40 text-[10px]">
          {entry.examsAttempted} exam{entry.examsAttempted !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Podium block */}
      <div
        className="w-24 sm:w-32 rounded-t-xl flex items-start justify-center pt-3 relative overflow-hidden"
        style={{
          height: c.podiumH,
          background: c.podiumGradient,
        }}
      >
        <div className="absolute inset-0 bg-white/5" />
        <span className="text-white/10 font-black text-5xl select-none">
          {place}
        </span>
      </div>
    </div>
  );
}

// ─── Trend Badge ──────────────────────────────────────────────────────────────

function TrendBadge({ change, trend }: { change: number; trend: LeaderboardStudent["trend"] }) {
  if (trend === "up" && change > 0) {
    return (
      <span className="flex items-center gap-0.5 text-emerald-400 text-xs font-bold">
        <TrendingUp className="w-3.5 h-3.5" />↑{change}
      </span>
    );
  }
  if (trend === "down" && change < 0) {
    return (
      <span className="flex items-center gap-0.5 text-red-400 text-xs font-bold">
        <TrendingDown className="w-3.5 h-3.5" />↓{Math.abs(change)}
      </span>
    );
  }
  return <Minus className="w-3.5 h-3.5 text-white/30" />;
}

// ─── Your Rank Card ───────────────────────────────────────────────────────────

function YourRankCard({ user }: { user: LeaderboardStudent }) {
  const initials = getInitials(user.studentName);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-transparent p-4 sm:p-5">
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 to-transparent pointer-events-none" />
      <div className="flex items-center gap-4 relative">
        {/* Rank */}
        <div className="flex flex-col items-center min-w-[4rem]">
          <span className="text-[10px] text-white/40 font-semibold uppercase tracking-widest">
            Your Rank
          </span>
          <span className="text-3xl font-black text-yellow-400">#{user.rank}</span>
          {user.rankChange !== 0 && (
            <span
              className={cn(
                "text-[10px] font-bold",
                user.rankChange > 0 ? "text-emerald-400" : "text-red-400"
              )}
            >
              {user.rankChange > 0 ? `↑ ${user.rankChange}` : `↓ ${Math.abs(user.rankChange)}`} from #{user.previousRank}
            </span>
          )}
        </div>

        <div className="h-12 w-px bg-white/10 hidden sm:block" />

        {/* Avatar + name */}
        <div className="flex items-center gap-3">
          <Avatar className="w-11 h-11 ring-2 ring-yellow-400/40">
            {user.avatar && <AvatarImage src={user.avatar} className="object-cover" />}
            <AvatarFallback className="bg-yellow-400/10 text-yellow-300 font-bold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">{user.studentName}</span>
              <span className="text-[9px] bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-bold border border-yellow-400/20">
                YOU
              </span>
            </div>
            <p className="text-white/40 text-xs">Keep going to reach top 5!</p>
          </div>
        </div>

        {/* Stats */}
        <div className="ml-auto hidden sm:flex items-center gap-6">
          <div className="text-center">
            <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Score</div>
            <div className="text-white font-bold">{user.score}/{user.maxScore}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">%</div>
            <div className="text-white font-bold">{fmt(user.percentage)}%</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Exams</div>
            <div className="text-white font-bold">{user.examsAttempted}</div>
          </div>
        </div>
      </div>

      {/* Mobile stats */}
      <div className="flex sm:hidden gap-4 mt-3 pt-3 border-t border-white/5">
        <div className="text-center flex-1">
          <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Score</div>
          <div className="text-white font-bold text-sm">{user.score}/{user.maxScore}</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Percentage</div>
          <div className="text-white font-bold text-sm">{fmt(user.percentage)}%</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Exams</div>
          <div className="text-white font-bold text-sm">{user.examsAttempted}</div>
        </div>
      </div>

      {/* Progress mini bar */}
      <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full lb-bar-fill transition-all"
          style={{ width: `${user.percentage}%` }}
        />
      </div>
    </div>
  );
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────

interface AnalyticsPanelProps {
  stats: LeaderboardStats;
  trend: ScoreTrendPoint[];
  loading: boolean;
}

function AnalyticsPanel({ stats, trend, loading }: AnalyticsPanelProps) {
  if (loading) return <SkeletonAnalytics />;

  const statRows = [
    { label: "Current Rank", value: `#${stats.currentRank}`, icon: <Trophy className="w-3.5 h-3.5 text-yellow-400" />, accent: true },
    { label: "Total Students", value: stats.totalStudents.toLocaleString(), icon: <Users className="w-3.5 h-3.5 text-blue-400" /> },
    { label: "Your Score", value: `${stats.score}/${stats.maxScore}`, icon: <Star className="w-3.5 h-3.5 text-purple-400" /> },
    { label: "Percentile", value: `Top ${100 - stats.percentile + 1 <= stats.percentile ? stats.percentile : 100 - stats.percentile}%`, icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> },
    { label: "Rank Change", value: stats.rankChange > 0 ? `↑ ${stats.rankChange}` : stats.rankChange < 0 ? `↓ ${Math.abs(stats.rankChange)}` : "—", icon: <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />, rankDir: stats.rankChange },
    { label: "Best Rank", value: `#${stats.bestRank}`, icon: <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> },
  ];

  const perfRows = [
    { label: "Average Score", value: `${fmt(stats.averageScore)}%`, icon: <Target className="w-3.5 h-3.5" /> },
    { label: "Highest Score", value: `${fmt(stats.highestScore)}%`, icon: <Zap className="w-3.5 h-3.5" /> },
    { label: "Tests Taken", value: stats.testsTaken, icon: <BookOpen className="w-3.5 h-3.5" /> },
    { label: "Tests Cleared", value: stats.testsCleared, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { label: "Pass Rate", value: `${stats.passRate}%`, icon: <TrendingUp className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Rank Summary */}
      <div className="lb-glass rounded-2xl p-5">
        <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-4">
          Your Rank Summary
        </h3>
        <div className="space-y-3">
          {statRows.map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/50 text-xs">
                {r.icon}
                {r.label}
              </div>
              <span
                className={cn(
                  "text-sm font-bold",
                  r.accent
                    ? "text-yellow-400"
                    : "rankDir" in r && (r.rankDir ?? 0) > 0
                    ? "text-emerald-400"
                    : "rankDir" in r && (r.rankDir ?? 0) < 0
                    ? "text-red-400"
                    : "text-white"
                )}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Overview */}
      <div className="lb-glass rounded-2xl p-5">
        <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-4">
          Performance Overview
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {perfRows.map((r) => (
            <div
              key={r.label}
              className={cn(
                "rounded-xl p-3 border border-white/5 bg-white/3 flex flex-col gap-1",
                r.label === "Pass Rate" ? "col-span-2" : ""
              )}
            >
              <div className="flex items-center gap-1.5 text-white/40 text-[10px] font-semibold uppercase tracking-wider">
                {r.icon} {r.label}
              </div>
              <span className="text-base font-bold text-white">{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Score Trend Chart */}
      <div className="lb-glass rounded-2xl p-5">
        <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-4">
          Score Trend
        </h3>
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[50, 100]}
                tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#0D1F38",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#fff",
                }}
                itemStyle={{ color: "#a78bfa" }}
                labelStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#7C3AED"
                strokeWidth={2.5}
                fill="url(#trendGrad)"
                dot={{ r: 3, fill: "#7C3AED", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#a78bfa", strokeWidth: 0 }}
                isAnimationActive
                animationDuration={1200}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Performers */}
      <div className="lb-glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest">
            Top Performers
          </h3>
          <button className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold transition-colors">
            View all
          </button>
        </div>
        <div className="space-y-3">
          {[
            { rank: 1, icon: <Crown className="w-3.5 h-3.5 text-yellow-400" />, color: "#D4A72C" },
            { rank: 2, icon: <Medal className="w-3.5 h-3.5 text-slate-400" />, color: "#94a3b8" },
            { rank: 3, icon: <Award className="w-3.5 h-3.5 text-amber-600" />, color: "#cd7f32" },
          ].map(({ rank, icon, color }) => {
            // We don't have top students here — they come from the main data
            // Show placeholder structure (parent passes them in real usage)
            const names = ["Ramesh Thapa", "Sita Sharma", "Hari Poudel"];
            const scores = ["96/100", "94/100", "91/100"];
            const pcts = ["96%", "94%", "91%"];
            const initials = ["RT", "SS", "HP"];
            return (
              <div key={rank} className="flex items-center gap-3">
                <div className="flex-shrink-0">{icon}</div>
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarFallback
                    className="text-[9px] font-bold"
                    style={{ background: color + "22", color }}
                  >
                    {initials[rank - 1]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{names[rank - 1]}</p>
                  <p className="text-white/40 text-[10px]">{scores[rank - 1]}</p>
                </div>
                <span className="text-[10px] font-bold flex-shrink-0" style={{ color }}>
                  {pcts[rank - 1]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Rankings Table Row ───────────────────────────────────────────────────────

function TableRow({ entry, isMe }: { entry: LeaderboardStudent; isMe: boolean }) {
  const initials = getInitials(entry.studentName);
  const rankColors: Record<number, string> = {
    1: "#D4A72C",
    2: "#94a3b8",
    3: "#cd7f32",
  };
  const rankColor = rankColors[entry.rank] ?? "rgba(255,255,255,0.3)";

  return (
    <tr
      className={cn(
        "transition-all duration-200 group",
        isMe
          ? "bg-yellow-400/8 border-l-2 border-yellow-400/60"
          : "hover:bg-white/3 border-l-2 border-transparent"
      )}
    >
      {/* Rank */}
      <td className="px-4 py-3 text-center w-14">
        <span
          className={cn(
            "text-sm font-black",
            entry.rank <= 3 ? "text-base" : ""
          )}
          style={{ color: entry.rank <= 3 ? rankColor : "rgba(255,255,255,0.3)" }}
        >
          #{entry.rank}
        </span>
      </td>

      {/* Student */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8 flex-shrink-0">
            {entry.avatar && (
              <AvatarImage src={entry.avatar} className="object-cover" />
            )}
            <AvatarFallback
              className="text-[10px] font-bold"
              style={{
                background: isMe ? "rgba(212,167,44,0.15)" : "rgba(255,255,255,0.05)",
                color: isMe ? "#D4A72C" : "rgba(255,255,255,0.5)",
              }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "text-sm font-semibold truncate",
                  isMe ? "text-yellow-300" : "text-white/80"
                )}
              >
                {entry.studentName}
              </span>
              {isMe && (
                <span className="text-[9px] bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-bold border border-yellow-400/20 flex-shrink-0">
                  YOU
                </span>
              )}
            </div>
            <div className="text-[10px] text-white/25 hidden sm:block">
              {entry.examsAttempted} exam{entry.examsAttempted !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </td>

      {/* Score */}
      <td className="px-3 py-3 text-center">
        <span className="text-sm font-bold text-white/80">
          {entry.score}<span className="text-white/30 font-normal text-xs">/{entry.maxScore}</span>
        </span>
      </td>

      {/* Percentage */}
      <td className="px-3 py-3 text-center hidden sm:table-cell">
        <span className="text-sm font-bold text-white/70">{fmt(entry.percentage)}%</span>
      </td>

      {/* Exams */}
      <td className="px-3 py-3 text-center hidden md:table-cell">
        <span className="text-xs text-white/40">{entry.examsAttempted}</span>
      </td>

      {/* Progress bar */}
      <td className="px-3 py-3 hidden lg:table-cell" style={{ minWidth: 120 }}>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full lb-bar-fill"
              style={{
                width: `${entry.percentage}%`,
                background:
                  entry.percentage >= 80
                    ? "linear-gradient(to right, #10B981, #34D399)"
                    : entry.percentage >= 60
                    ? "linear-gradient(to right, #3B82F6, #60A5FA)"
                    : "linear-gradient(to right, #F59E0B, #FCD34D)",
              }}
            />
          </div>
        </div>
      </td>

      {/* Trend */}
      <td className="px-3 py-3 text-center w-12">
        <TrendBadge change={entry.rankChange} trend={entry.trend} />
      </td>
    </tr>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (ps: number) => void;
}

function Pagination({ page, totalPages, totalCount, pageSize, onPage, onPageSize }: PaginationProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  // Build page buttons with ellipsis
  const buildPages = (): (number | "...")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (page >= totalPages - 3) return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/5">
      <div className="flex items-center gap-2 text-xs text-white/40">
        <span>Showing {start}–{end} of {totalCount.toLocaleString()} students</span>
        <Select
          value={pageSize.toString()}
          onValueChange={(v) => onPageSize(Number(v))}
        >
          <SelectTrigger className="h-7 w-[80px] text-xs bg-white/5 border-white/10 text-white/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0D1F38] border-white/10 text-white">
            {[10, 20, 50].map((n) => (
              <SelectItem key={n} value={n.toString()} className="text-xs text-white/70 focus:bg-white/10 focus:text-white">
                {n} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20"
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {buildPages().map((p, i) =>
          p === "..." ? (
            <span key={`ell-${i}`} className="text-white/20 text-xs px-1">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className={cn(
                "h-8 w-8 rounded-lg text-xs font-bold transition-all",
                p === page
                  ? "bg-yellow-400/20 text-yellow-400 border border-yellow-400/30"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              {p}
            </button>
          )
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20"
          disabled={page === totalPages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Error / Empty states ─────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
        <RefreshCw className="w-7 h-7 text-red-400" />
      </div>
      <h2 className="text-lg font-bold text-white mb-2">Unable to Load Leaderboard</h2>
      <p className="text-white/40 text-sm mb-1 max-w-xs">Something went wrong while loading rankings.</p>
      {message && (
        <p className="text-xs text-red-400/70 font-mono bg-red-500/5 px-3 py-1.5 rounded mb-5 max-w-xs break-all">
          {message}
        </p>
      )}
      <Button
        onClick={onRetry}
        className="bg-white/10 hover:bg-white/15 text-white border border-white/10 gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center mb-5">
        <Trophy className="w-7 h-7 text-yellow-400" />
      </div>
      <h2 className="text-lg font-bold text-white mb-2">No Rankings Yet</h2>
      <p className="text-white/40 text-sm mb-6 max-w-xs">
        Complete an exam to appear on the leaderboard. Rankings update automatically.
      </p>
      <div className="flex gap-3">
        <a href="/student/exams">
          <Button className="bg-yellow-400/15 hover:bg-yellow-400/20 text-yellow-300 border border-yellow-400/20 gap-2">
            <BookOpen className="w-4 h-4" />
            Take an Exam
          </Button>
        </a>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [status, setStatus] = useState<PageStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const [students, setStudents] = useState<LeaderboardStudent[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardStudent | null>(null);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [trend, setTrend] = useState<ScoreTrendPoint[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [examFilter, setExamFilter] = useState("all");
  const [rankingType, setRankingType] = useState("overall");
  const [timeFilter, setTimeFilter] = useState<"week" | "month" | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [podiumAnimated, setPodiumAnimated] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const podiumRef = useRef<HTMLDivElement>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setStatus("loading");

    try {
      const result = await leaderboardService.fetchLeaderboard({
        page,
        pageSize,
        examFilter,
        rankingType,
        timeFilter,
        searchQuery,
      });

      setStudents(result.students);
      setCurrentUser(result.currentUser);
      setStats(result.stats);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
      setStatus(result.students.length === 0 ? "empty" : "success");

      // Animate podium on first successful load
      if (!podiumAnimated && result.students.length > 0) {
        setTimeout(() => setPodiumAnimated(true), 100);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Leaderboard]", msg);
      setStatus("error");
      setErrorMessage(msg);
    }
  }, [page, pageSize, examFilter, rankingType, timeFilter, searchQuery, podiumAnimated]);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const t = await leaderboardService.fetchScoreTrend();
      setTrend(t);
    } catch {
      // non-fatal
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData(true);
    setIsRefreshing(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  const onFilterChange = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const showPodium = page === 1 && !searchQuery && students.length > 0;
  const top3 = showPodium ? students.slice(0, 3) : [];
  const tableRows = showPodium ? students.slice(3) : students;
  const isCurrentUserInList = students.some(
    (s) => s.studentId === currentUser?.studentId
  );

  return (
    <>
      {/* ── Page-level styles ── */}
      <style>{`
        .lb-glass {
          background: rgba(13, 31, 56, 0.7);
          border: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(12px);
        }
        .lb-confetti {
          animation: lb-fall linear infinite;
        }
        @keyframes lb-fall {
          0%   { transform: translateY(-10px) rotate(0deg);   opacity: 0; }
          10%  { opacity: 0.7; }
          90%  { opacity: 0.5; }
          100% { transform: translateY(260px) rotate(360deg); opacity: 0; }
        }
        .lb-podium-rise-1 {
          animation: lb-rise 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both;
        }
        .lb-podium-rise-2 {
          animation: lb-rise 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.25s both;
        }
        .lb-podium-rise-3 {
          animation: lb-rise 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.4s both;
        }
        @keyframes lb-rise {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lb-bar-fill {
          transition: width 1s cubic-bezier(0.16,1,0.3,1);
        }
        @media (prefers-reduced-motion: reduce) {
          .lb-confetti,
          .lb-podium-rise-1,
          .lb-podium-rise-2,
          .lb-podium-rise-3 { animation: none !important; opacity: 1 !important; }
          .lb-bar-fill { transition: none !important; }
        }
      `}</style>

      {/* ── Dark navy page wrapper ── */}
      <div className="min-h-screen bg-[#070F1C] text-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

          {/* ── HEADER ── */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Leaderboard
                </h1>
                <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-full">
                  <Wifi className="w-3 h-3" />
                  Real-time
                </span>
              </div>
              <p className="text-white/40 text-sm">
                See how you performed compared with other students
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <Input
                  id="lb-search"
                  placeholder="Search students…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 h-9 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-yellow-400/40 w-full sm:w-52"
                />
              </form>

              {/* Filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 flex-nowrap">
                <Select value={examFilter} onValueChange={onFilterChange(setExamFilter)}>
                  <SelectTrigger id="lb-exam-filter" className="h-9 w-[130px] flex-shrink-0 text-xs bg-white/5 border-white/10 text-white/70">
                    <SelectValue placeholder="All Exams" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0D1F38] border-white/10 text-white">
                    <SelectItem value="all" className="text-xs text-white/70 focus:bg-white/10 focus:text-white">All Exams</SelectItem>
                    <SelectItem value="loksewa" className="text-xs text-white/70 focus:bg-white/10 focus:text-white">Loksewa</SelectItem>
                    <SelectItem value="model" className="text-xs text-white/70 focus:bg-white/10 focus:text-white">Model Exam</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={rankingType} onValueChange={onFilterChange(setRankingType)}>
                  <SelectTrigger id="lb-ranking-type" className="h-9 w-[130px] flex-shrink-0 text-xs bg-white/5 border-white/10 text-white/70">
                    <SelectValue placeholder="Overall" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0D1F38] border-white/10 text-white">
                    <SelectItem value="overall" className="text-xs text-white/70 focus:bg-white/10 focus:text-white">Overall</SelectItem>
                    <SelectItem value="subject" className="text-xs text-white/70 focus:bg-white/10 focus:text-white">Subject-wise</SelectItem>
                    <SelectItem value="best" className="text-xs text-white/70 focus:bg-white/10 focus:text-white">Best Attempt</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={timeFilter} onValueChange={onFilterChange((v) => setTimeFilter(v as "week" | "month" | "all"))}>
                  <SelectTrigger id="lb-time-filter" className="h-9 w-[120px] flex-shrink-0 text-xs bg-white/5 border-white/10 text-white/70">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0D1F38] border-white/10 text-white">
                    <SelectItem value="all" className="text-xs text-white/70 focus:bg-white/10 focus:text-white">All Time</SelectItem>
                    <SelectItem value="month" className="text-xs text-white/70 focus:bg-white/10 focus:text-white">This Month</SelectItem>
                    <SelectItem value="week" className="text-xs text-white/70 focus:bg-white/10 focus:text-white">This Week</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  id="lb-share-btn"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 flex-shrink-0 text-white/40 hover:text-white hover:bg-white/5 border border-white/10"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                </Button>

                <Button
                  id="lb-refresh-btn"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 flex-shrink-0 text-white/40 hover:text-white hover:bg-white/5 border border-white/10"
                  title="Refresh"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                </Button>
              </div>
            </div>
          </div>

          {/* ── MAIN CONTENT ── */}
          {status === "error" ? (
            <ErrorState message={errorMessage} onRetry={() => fetchData()} />
          ) : (
            <div className="flex flex-col xl:flex-row gap-6">

              {/* ── LEFT / MAIN COLUMN ── */}
              <div className="flex-1 min-w-0 space-y-5">

                {/* PODIUM */}
                {status === "loading" ? (
                  <div className="lb-glass rounded-2xl overflow-hidden">
                    <SkeletonPodium />
                  </div>
                ) : showPodium && top3.length > 0 ? (
                  <div
                    ref={podiumRef}
                    className="lb-glass rounded-2xl overflow-hidden relative"
                  >
                    <Confetti />
                    <div className="flex justify-center items-end gap-2 sm:gap-4 pt-14 pb-0 px-4">
                      {top3[1] && <PodiumCard entry={top3[1]} place={2} animate={podiumAnimated} />}
                      {top3[0] && <PodiumCard entry={top3[0]} place={1} animate={podiumAnimated} />}
                      {top3[2] && <PodiumCard entry={top3[2]} place={3} animate={podiumAnimated} />}
                    </div>
                  </div>
                ) : null}

                {/* YOUR RANK CARD */}
                {status === "loading" ? (
                  <Sk className="h-24 w-full rounded-2xl" />
                ) : currentUser ? (
                  <YourRankCard user={currentUser} />
                ) : null}

                {/* Not-in-list callout (only when user is not in current page) */}
                {status === "success" && currentUser && !isCurrentUserInList && (
                  <div className="lb-glass rounded-xl p-3 text-center text-sm text-white/40 border border-yellow-400/10">
                    You're on page {Math.ceil(currentUser.rank / pageSize)} (rank #{currentUser.rank})
                    <button
                      className="ml-2 text-yellow-400/70 hover:text-yellow-400 text-xs underline"
                      onClick={() => setPage(Math.ceil(currentUser.rank / pageSize))}
                    >
                      Go there
                    </button>
                  </div>
                )}

                {/* RANKINGS TABLE */}
                <div className="lb-glass rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                    <h2 className="text-sm font-bold text-white/60">Rankings</h2>
                    <span className="text-[11px] text-white/25">
                      {totalCount > 0 ? `${totalCount.toLocaleString()} students` : ""}
                    </span>
                  </div>

                  {status === "loading" ? (
                    <SkeletonTable />
                  ) : status === "empty" ? (
                    <EmptyState />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left" style={{ minWidth: 480 }}>
                        <thead>
                          <tr className="text-[10px] font-bold text-white/25 uppercase tracking-widest border-b border-white/5">
                            <th className="px-4 py-3 text-center w-14">Rank</th>
                            <th className="px-3 py-3">Student</th>
                            <th className="px-3 py-3 text-center">Score</th>
                            <th className="px-3 py-3 text-center hidden sm:table-cell">%</th>
                            <th className="px-3 py-3 text-center hidden md:table-cell">Exams</th>
                            <th className="px-3 py-3 hidden lg:table-cell">Performance</th>
                            <th className="px-3 py-3 text-center w-12">Trend</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {tableRows.map((entry) => (
                            <TableRow
                              key={entry.studentId}
                              entry={entry}
                              isMe={entry.studentId === currentUser?.studentId || !!entry.isCurrentUser}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* PAGINATION */}
                  {status === "success" && totalPages > 1 && (
                    <div className="px-5 pb-4">
                      <Pagination
                        page={page}
                        totalPages={totalPages}
                        totalCount={totalCount}
                        pageSize={pageSize}
                        onPage={(p) => setPage(p)}
                        onPageSize={(ps) => {
                          setPageSize(ps);
                          setPage(1);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* ── RIGHT ANALYTICS PANEL ── */}
              <div className="xl:w-80 flex-shrink-0 space-y-4">
                {stats ? (
                  <AnalyticsPanel
                    stats={stats}
                    trend={trend}
                    loading={analyticsLoading}
                  />
                ) : (
                  <SkeletonAnalytics />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
