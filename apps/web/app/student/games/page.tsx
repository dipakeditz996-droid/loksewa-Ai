"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { 
  Swords, Shield, Trophy, Clock, Flame, 
  ChevronRight, Lock, BookOpen, Zap, Target, Star,
  Calendar, Crown, Search, History, CheckCircle2,
  RefreshCw, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { gamificationService, PlayerStats, GameLeaderboardEntry, PerformanceDataPoint } from "@/lib/api/gamification";
import { gamesApi, gamesService, GameMode, WeeklyQuiz } from "@/lib/api/games";
import { cn } from "@/lib/utils";

const GamePerformanceChart = dynamic(
  () => import("./_components/GamePerformanceChart"),
  { ssr: false, loading: () => <Skeleton className="h-full w-full bg-white/5 rounded-xl" /> }
);

// --- Subcomponents ---

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const IconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Swords, Shield, Trophy, Clock, Flame, Zap, BookOpen, 
    Crown, Calendar, Target, Star
  };
  const Icon = IconMap[name] || Star;
  return <Icon className={className} />;
}

function StatBox({ 
  icon, 
  label, 
  value, 
  highlight = false, 
  isLoading = false 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value?: string | number; 
  highlight?: boolean; 
  isLoading?: boolean;
}) {
  return (
    <div className={cn(
      "flex flex-col p-3 rounded-xl border border-white/10 bg-[#0B1A38] backdrop-blur-sm min-w-[110px]",
      highlight && "bg-blue-500/10 border-blue-500/20"
    )}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">{label}</span>
      </div>
      {isLoading ? (
        <Skeleton className="h-6 w-16 bg-white/10 rounded mt-0.5" />
      ) : (
        <div className="text-xl font-bold text-white tracking-tight">{value ?? "—"}</div>
      )}
    </div>
  );
}

function DifficultyBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    Easy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    Hard: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };
  const dot: Record<string, string> = {
    Easy: "bg-emerald-400",
    Medium: "bg-amber-400",
    Hard: "bg-rose-400",
  };

  const currentLevel = colors[level] ? level : "Medium";
  
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-bold rounded-full border", colors[currentLevel])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[currentLevel])} />
      {currentLevel}
    </span>
  );
}

// --- Main Page Component ---

export default function GamesArena() {
  const router = useRouter();
  
  // UI filter states
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [performancePeriod, setPerformancePeriod] = useState<"7days" | "30days" | "alltime">("7days");

  // 1. Player Profile & Stats Query (Cached, non-blocking)
  const { 
    data: stats, 
    isLoading: loadingStats, 
  } = useQuery<PlayerStats>({
    queryKey: ["gamification", "player-stats"],
    queryFn: () => gamificationService.getPlayerStats(),
    staleTime: 60 * 1000,
  });

  // 2. Active Weekly Quiz Query
  const { 
    data: weeklyQuiz, 
    isLoading: loadingQuiz, 
    isError: errorQuiz,
    refetch: refetchQuiz 
  } = useQuery<WeeklyQuiz>({
    queryKey: ["games", "weekly-quiz", "current"],
    queryFn: () => gamesApi.getCurrentWeeklyQuiz(),
    staleTime: 60 * 1000,
  });

  // 3. Available Game Modes
  const { data: gameModes = [] } = useQuery<GameMode[]>({
    queryKey: ["games", "modes"],
    queryFn: () => gamesService.getGameModes(),
    staleTime: Infinity,
  });

  // 3b. Today's Daily Drill Query
  const { data: dailyDrillData } = useQuery({
    queryKey: ["games", "daily-drill", "today"],
    queryFn: () => gamesApi.getDailyDrillToday(),
    staleTime: 30 * 1000,
  });

  // 4. Leaderboard Query
  const { data: leaderboard = [], isLoading: loadingLeaderboard } = useQuery<GameLeaderboardEntry[]>({
    queryKey: ["gamification", "leaderboard"],
    queryFn: () => gamificationService.getLeaderboard(),
    staleTime: 120 * 1000,
  });

  // 5. Performance History Query
  const { data: performance = [], isLoading: loadingPerformance } = useQuery<PerformanceDataPoint[]>({
    queryKey: ["gamification", "performance", performancePeriod],
    queryFn: () => gamificationService.getPerformanceData(performancePeriod),
    staleTime: 120 * 1000,
  });

  // 6. Recent Games History Query
  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ["games", "history"],
    queryFn: () => gamesApi.getHistory(),
    staleTime: 30 * 1000,
  });

  const categories = ["All", "Solo", "Challenge", "Battle"];

  const filteredModes = gameModes.filter((m) => {
    const matchesSearch = 
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      m.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeCategory === "All") return matchesSearch;
    if (activeCategory === "Solo") return matchesSearch && (m.players.includes("Single") || m.id === "weekly-quiz");
    if (activeCategory === "Battle" || activeCategory === "Challenge") return matchesSearch && m.players.includes("2 Players");
    return matchesSearch;
  });

  const xpPercent = stats && stats.nextLevelXp > 0
    ? Math.min(100, Math.round((stats.xp / stats.nextLevelXp) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-[#051024] pb-16 text-white">
      {/* 
        ========================================================================
        1. Player Profile / Progress Header (Dark Navy Theme)
        ========================================================================
      */}
      <div className="bg-[#0B1A38] border-b border-white/5 relative overflow-hidden">
        {/* Subtle decorative glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="p-5 md:p-8 max-w-[1600px] mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Title & Description */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-[2px] shrink-0">
                <div className="h-full w-full bg-[#0B1A38] rounded-[14px] flex items-center justify-center">
                  <Crown className="w-8 h-8 text-amber-400" />
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Game Arena</h1>
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" /> Live
                  </span>
                </div>
                <p className="text-blue-200/70 text-sm font-medium">
                  Challenge yourself, earn XP, and compete with other learners.
                </p>
              </div>
            </div>

            {/* Live Stats Row */}
            <div className="flex flex-wrap gap-2.5 md:justify-end">
              <StatBox 
                icon={<Star className="h-4 w-4 text-purple-400" />} 
                label="Level" 
                value={stats?.level}
                isLoading={loadingStats}
                highlight
              />
              <StatBox 
                icon={<Zap className="h-4 w-4 text-yellow-400" />} 
                label="Total XP" 
                value={stats?.xp?.toLocaleString()}
                isLoading={loadingStats}
              />
              <StatBox 
                icon={<Flame className="h-4 w-4 text-orange-400" />} 
                label="Streak" 
                value={stats ? `${stats.streak} Days` : undefined}
                isLoading={loadingStats}
              />
              <StatBox 
                icon={<Trophy className="h-4 w-4 text-emerald-400" />} 
                label="Rank" 
                value={stats?.rank ? `#${stats.rank}` : "Unranked"}
                isLoading={loadingStats}
              />
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="mt-6 bg-black/20 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider">XP Progression</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-black text-white">{stats ? stats.xp.toLocaleString() : "0"}</span>
                  <span className="text-xs font-bold text-white/40">
                    / {stats ? stats.nextLevelXp.toLocaleString() : "1,000"} XP
                  </span>
                </div>
              </div>
              <p className="text-xs font-bold text-purple-300">
                {stats ? `+${Math.max(0, stats.nextLevelXp - stats.xp)} XP to Level ${(stats.level || 1) + 1}` : "Level Progress"}
              </p>
            </div>
            <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-400 transition-all duration-700 ease-out"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        2. Main Arena Content Grid
        ========================================================================
      */}
      <div className="p-5 md:p-8 max-w-[1600px] mx-auto space-y-10 mt-2">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Left Column (2 Cols wide) */}
          <div className="xl:col-span-2 space-y-8">
            
            {/* 
              ========================================================================
              Featured Game: Weekly Quiz (Real Data from API)
              ========================================================================
            */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-amber-400" />
                  <h2 className="text-base font-bold text-white tracking-wide uppercase">Featured Challenge</h2>
                </div>
                <span className="text-xs text-white/50">Updated Weekly</span>
              </div>

              {loadingQuiz ? (
                <Skeleton className="h-64 w-full rounded-2xl bg-[#0B1A38] border border-white/5" />
              ) : errorQuiz || !weeklyQuiz ? (
                <div className="bg-[#0B1A38] border border-white/10 rounded-2xl p-6 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-white font-semibold">Weekly Quiz currently updating</p>
                  <p className="text-xs text-white/50">A new challenge from the Master Question Bank will be available shortly.</p>
                  <Button variant="outline" size="sm" onClick={() => refetchQuiz()} className="border-white/10 text-white">
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
                  </Button>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/80 via-[#0B1A38] to-[#051024] border border-indigo-500/30 p-6 md:p-8 shadow-2xl transition-all">
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Crown className="h-44 w-44 text-amber-400" />
                  </div>

                  <div className="relative z-10 flex flex-col items-start h-full space-y-4">
                    <div className="flex items-center gap-2">
                      <DifficultyBadge level="Medium" />
                      <span className="text-[11px] font-bold text-blue-300 px-2 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20">
                        Week {weeklyQuiz.week_number}
                      </span>
                      {weeklyQuiz.has_attempted && (
                        <span className="text-[11px] font-bold text-emerald-300 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Attempted
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                        {weeklyQuiz.title}
                      </h3>
                      <p className="text-blue-200/70 text-sm max-w-xl mt-1 leading-relaxed">
                        {weeklyQuiz.description || "Official weekly quiz generated from approved syllabus questions in the Master Question Bank."}
                      </p>
                    </div>

                    {/* Quiz Specs */}
                    <div className="flex flex-wrap gap-3 pt-1">
                      <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold text-white">
                        <Target className="h-3.5 w-3.5 text-blue-400" />
                        <span>{weeklyQuiz.questions_count || 15} Questions</span>
                      </div>
                      <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold text-white">
                        <Clock className="h-3.5 w-3.5 text-blue-400" />
                        <span>{weeklyQuiz.duration_minutes || 20} Minutes</span>
                      </div>
                      <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold text-purple-300">
                        <Zap className="h-3.5 w-3.5 text-purple-400" />
                        <span>+{weeklyQuiz.xp_reward || 100} XP</span>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="pt-2 flex flex-wrap items-center gap-4 w-full">
                      <Button
                        onClick={() => router.push("/student/games/weekly-quiz")}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg cursor-pointer"
                      >
                        {weeklyQuiz.has_attempted ? "View Quiz / Retake" : "Play Weekly Quiz"} <ChevronRight className="ml-1.5 h-4 w-4" />
                      </Button>
                      
                      {weeklyQuiz.has_attempted && weeklyQuiz.latest_attempt && (
                        <span className="text-xs text-white/60">
                          Last score: <strong className="text-amber-400">{weeklyQuiz.latest_attempt.score} pts</strong> ({weeklyQuiz.latest_attempt.correct_answers}/{weeklyQuiz.latest_attempt.total_questions} correct)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* 
              ========================================================================
              Available Games Grid
              ========================================================================
            */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-base font-bold text-white tracking-wide uppercase">Available Game Modes</h2>
                  <p className="text-xs text-white/50">Pick a game mode to test your speed and accuracy</p>
                </div>

                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
                  <input
                    type="text"
                    placeholder="Filter games..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0B1A38] border border-white/10 text-white placeholder:text-white/40 pl-8 pr-3 py-1.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs transition-all"
                  />
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border",
                      activeCategory === cat 
                        ? "bg-blue-600 text-white border-blue-500" 
                        : "bg-[#0B1A38] text-white/60 hover:text-white hover:bg-white/5 border-white/10"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredModes.map((mode) => {
                  const isComingSoon = mode.isComingSoon || mode.path === "#";
                  let displayBadge = mode.badge;
                  let buttonLabel = "Play";
                  let buttonColor = "bg-blue-600 hover:bg-blue-500";

                  if (mode.id === "daily-challenge") {
                    if (dailyDrillData?.exists && dailyDrillData.session?.status === "COMPLETED") {
                      displayBadge = "Completed";
                      buttonLabel = "View Result";
                      buttonColor = "bg-emerald-600 hover:bg-emerald-500";
                    } else if (dailyDrillData?.exists && dailyDrillData.session?.status === "IN_PROGRESS") {
                      displayBadge = "Continue";
                      buttonLabel = "Continue";
                      buttonColor = "bg-blue-600 hover:bg-blue-500";
                    } else {
                      buttonLabel = "Start Drill";
                      buttonColor = "bg-emerald-600 hover:bg-emerald-500";
                    }
                  }

                  return (
                    <div 
                      key={mode.id}
                      className={cn(
                        "relative flex flex-col bg-[#0B1A38] rounded-2xl border p-5 transition-all",
                        isComingSoon 
                          ? "border-white/5 opacity-75" 
                          : "border-white/10 hover:border-blue-500/40 hover:bg-[#0E2044] hover:-translate-y-0.5 shadow-lg"
                      )}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className={cn(
                          "h-11 w-11 rounded-xl flex items-center justify-center border",
                          isComingSoon 
                            ? "bg-white/5 border-white/5 text-white/40" 
                            : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        )}>
                          <DynamicIcon name={mode.icon} className="h-5 w-5" />
                        </div>

                        {displayBadge && (
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                            isComingSoon 
                              ? "bg-white/5 border-white/10 text-white/50" 
                              : displayBadge === "Completed"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                              : "bg-blue-500/10 border-blue-500/20 text-blue-300"
                          )}>
                            {displayBadge}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        {mode.title} {isComingSoon && <Lock className="h-3.5 w-3.5 text-white/40" />}
                      </h3>
                      <p className="text-xs text-white/60 mb-5 min-h-[34px] leading-relaxed">
                        {mode.description}
                      </p>

                      <div className="grid grid-cols-2 gap-2 mb-5">
                        <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-[11px] text-white/70 flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-white/40" />
                          <span>{mode.players}</span>
                        </div>
                        <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-[11px] text-white/70 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-white/40" />
                          <span>{mode.timeLimit}</span>
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-white/40 uppercase">Reward</span>
                          <span className="text-xs font-bold text-purple-300">{mode.xpReward}</span>
                        </div>

                        {isComingSoon ? (
                          <Button 
                            disabled 
                            size="sm"
                            className="bg-white/5 text-white/40 border border-white/5 rounded-xl cursor-not-allowed"
                          >
                            Coming Soon
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => router.push(mode.path)}
                            className={cn("text-white font-bold rounded-xl shadow cursor-pointer px-4", buttonColor)}
                          >
                            {buttonLabel} <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredModes.length === 0 && (
                  <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-2xl bg-[#0B1A38]">
                    <Search className="h-6 w-6 text-white/20 mx-auto mb-2" />
                    <p className="text-white font-bold text-sm">No game modes match your filter</p>
                    <p className="text-xs text-white/40">Try searching for something else.</p>
                  </div>
                )}
              </div>
            </section>

            {/* 
              ========================================================================
              Recent Games History
              ========================================================================
            */}
            <section className="bg-[#0B1A38] rounded-2xl border border-white/10 p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-400" />
                  <h2 className="text-base font-bold text-white uppercase tracking-wide">Recent Game Activity</h2>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => router.push("/student/games/history")}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:bg-white/5 -mr-2"
                >
                  View Full History
                </Button>
              </div>

              {loadingHistory ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full bg-white/5 rounded-xl" />
                  ))}
                </div>
              ) : !historyData || (
                (historyData.matches?.length === 0) && 
                (historyData.survivals?.length === 0) && 
                (!historyData.weekly_quizzes || historyData.weekly_quizzes.length === 0)
              ) ? (
                <div className="py-8 text-center border border-dashed border-white/5 rounded-xl bg-black/10">
                  <Trophy className="h-6 w-6 text-white/20 mx-auto mb-1.5" />
                  <p className="text-sm font-semibold text-white/80">No games played yet</p>
                  <p className="text-xs text-white/40 max-w-sm mx-auto mt-0.5">
                    Start your first challenge or Weekly Quiz to begin building your competitive history.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 divide-y divide-white/5">
                  {/* Show latest weekly quizzes if any */}
                  {historyData.weekly_quizzes?.slice(0, 3).map((wq) => (
                    <div key={`wq-${wq.id}`} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                          <Crown className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{wq.quiz_title}</p>
                          <p className="text-[10px] text-white/40">
                            {wq.completed_at ? new Date(wq.completed_at).toLocaleDateString() : "Completed"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-400">{wq.score} pts</p>
                        <p className="text-[10px] text-purple-300">+{wq.xp_awarded} XP</p>
                      </div>
                    </div>
                  ))}

                  {/* Show latest duels */}
                  {historyData.matches?.slice(0, 3).map((m) => (
                    <div key={`match-${m.id}`} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                          <Swords className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">1v1 Duel: vs {m.player2_name || "Opponent"}</p>
                          <p className="text-[10px] text-white/40">
                            Score: {m.player1_score} - {m.player2_score}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-400">
                          {m.is_draw ? "Draw" : m.winner_name ? `Winner: ${m.winner_name}` : m.status}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Show latest survivals */}
                  {historyData.survivals?.slice(0, 2).map((s) => (
                    <div key={`surv-${s.id}`} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                          <Shield className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">Survival Run</p>
                          <p className="text-[10px] text-white/40">
                            Survived {s.questions_survived} questions (Streak: {s.highest_streak})
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-400">{s.score} pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>

          {/* 
            ========================================================================
            Right Column (Sidebar Widgets)
            ========================================================================
          */}
          <div className="space-y-6">
            
            {/* Overall Player Performance Stats */}
            <section className="bg-[#0B1A38] rounded-2xl border border-white/10 p-5 space-y-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Overall Player Stats</h2>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-0.5">Win Rate</p>
                  <p className="text-lg font-black text-white">
                    {stats && stats.gamesPlayed > 0 
                      ? `${Math.round((stats.gamesWon / stats.gamesPlayed) * 100)}%` 
                      : "0%"}
                  </p>
                  <p className="text-[10px] text-emerald-400 mt-0.5">
                    {stats?.gamesWon || 0} won / {stats?.gamesPlayed || 0} played
                  </p>
                </div>

                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-0.5">Accuracy</p>
                  <p className="text-lg font-black text-white">{stats?.accuracy || 0}%</p>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    {stats?.questionsAnswered?.toLocaleString() || 0} answered
                  </p>
                </div>
              </div>
            </section>

            {/* Streak Tracker */}
            <section className="bg-[#0B1A38] rounded-2xl border border-white/10 p-5 text-center relative overflow-hidden">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Flame className="h-6 w-6 text-orange-500 animate-pulse" />
                <span className="text-3xl font-black text-white">{stats?.streak || 0}</span>
              </div>
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-4">Day Study Streak</p>

              <div className="flex justify-between items-center px-1">
                {(stats?.streakDays || [false, false, false, false, false, false, false]).map((isDone, idx) => {
                  const dayDate = new Date();
                  dayDate.setDate(dayDate.getDate() - (6 - idx));
                  const dayName = dayDate.toLocaleDateString("en-US", { weekday: "short" })[0];
                  const isToday = idx === 6;

                  return (
                    <div key={idx} className="flex flex-col items-center gap-1.5">
                      <div className={cn(
                        "flex items-center justify-center h-7 w-7 rounded-full border text-xs font-bold transition-colors",
                        isDone 
                          ? "bg-orange-500/20 border-orange-500/50 text-orange-400" 
                          : isToday 
                          ? "bg-white/10 border-white/20 text-white" 
                          : "bg-white/5 border-transparent text-white/20"
                      )}>
                        {isDone ? <Flame className="h-3.5 w-3.5" /> : "●"}
                      </div>
                      <span className="text-[9px] font-bold text-white/40">{dayName}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 text-xs text-orange-200/70">
                Play a game today to extend your streak!
              </div>
            </section>

            {/* Champions Leaderboard */}
            <section className="bg-[#0B1A38] rounded-2xl border border-white/10 p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-amber-400" /> Champions Leaderboard
                </h2>
                <button 
                  onClick={() => router.push("/student/leaderboard")}
                  className="text-[11px] font-semibold text-blue-400 hover:text-blue-300"
                >
                  Full Board
                </button>
              </div>

              {loadingLeaderboard ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-8 w-full bg-white/5 rounded" />
                  ))}
                </div>
              ) : leaderboard.length === 0 ? (
                <p className="text-xs text-white/40 text-center py-4">Leaderboard updating...</p>
              ) : (
                <div className="space-y-2.5">
                  {leaderboard.slice(0, 5).map((lb) => (
                    <div key={lb.rank} className="flex items-center gap-2.5 text-xs">
                      <div className={cn(
                        "flex items-center justify-center h-6 w-6 rounded text-[10px] font-black shrink-0",
                        lb.rank === 1 ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                        lb.rank === 2 ? "bg-slate-400/20 text-slate-200 border border-slate-400/30" :
                        lb.rank === 3 ? "bg-orange-700/20 text-orange-300 border border-orange-700/30" :
                        "bg-white/5 text-white/40"
                      )}>
                        {lb.rank}
                      </div>
                      <div className="flex-1 truncate">
                        <p className="font-semibold text-white truncate">{lb.name}</p>
                      </div>
                      <div className="font-bold text-purple-300 shrink-0 text-[11px]">
                        {lb.xp.toLocaleString()} <span className="text-[9px] opacity-70">XP</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Performance Analytics Chart */}
            <section className="bg-[#0B1A38] rounded-2xl border border-white/10 p-5 space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">XP Performance</h2>
                <select 
                  value={performancePeriod}
                  onChange={(e) => setPerformancePeriod(e.target.value as "7days" | "30days" | "alltime")}
                  className="bg-black/30 border border-white/10 text-white/80 text-[11px] rounded-lg px-2 py-1 focus:outline-none"
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="alltime">All Time</option>
                </select>
              </div>

              <div className="h-[180px] w-full pt-2">
                {loadingPerformance ? (
                  <Skeleton className="h-full w-full bg-white/5 rounded-xl" />
                ) : (
                  <GamePerformanceChart performance={performance} />
                )}
              </div>
            </section>

          </div>

        </div>
      </div>
    </div>
  );
}
