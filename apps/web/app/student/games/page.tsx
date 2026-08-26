// @ts-nocheck
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Swords, HeartPulse, Trophy, Clock, Flame, CircleDollarSign, 
  ChevronRight, Lock, BookOpen, Zap, Target, ArrowUp, Star,
  Calendar, Globe, Crown, ChevronLeft, Search, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { gamificationService } from "@/lib/api/gamification";
import { 
  PlayerStats, Achievement, GameLeaderboardEntry, RecentActivity, PerformanceDataPoint 
} from "@/lib/api/gamification";
import { gamesService, GameMode, FeaturedGame } from "@/lib/api/games";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

// --- Components ---

function DynamicIcon({ name, className }: { name: string, className?: string }) {
  const IconMap: any = {
    Swords, HeartPulse, Trophy, Clock, Flame, Zap, BookOpen, 
    Crown, Calendar, Globe, TrendingUp, Target, Star
  };
  const Icon = IconMap[name] || Star;
  return <Icon className={className} />;
}

function StatBox({ icon, label, value, highlight = false }: any) {
  return (
    <div className={cn(
      "flex flex-col p-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm",
      highlight && "bg-blue-500/10 border-blue-500/20"
    )}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}

function DifficultyBadge({ level }: { level: string }) {
  const colors: any = {
    Easy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    Hard: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    Expert: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };
  const dot: any = { Easy: "bg-emerald-400", Medium: "bg-amber-400", Hard: "bg-rose-400", Expert: "bg-purple-400" };
  
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold rounded-full border", colors[level])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[level])} />
      {level}
    </span>
  );
}

// --- Main Page ---

export default function GamesArena() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Gamification Data
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [leaderboard, setLeaderboard] = useState<GameLeaderboardEntry[]>([]);
  const [performance, setPerformance] = useState<PerformanceDataPoint[]>([]);

  // Games Data
  const [featured, setFeatured] = useState<FeaturedGame | null>(null);
  const [gameModes, setGameModes] = useState<GameMode[]>([]);
  const [recommended, setRecommended] = useState<GameMode[]>([]);
  
  // UI State
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [
          s, a, act, ld, perf,
          feat, modes, rec
        ] = await Promise.all([
          gamificationService.getPlayerStats(),
          gamificationService.getAchievements(),
          gamificationService.getRecentActivity(),
          gamificationService.getLeaderboard(),
          gamificationService.getPerformanceData(),
          gamesService.getFeaturedGame(),
          gamesService.getGameModes(),
          gamesService.getRecommendedGames()
        ]);
        
        setStats(s);
        setAchievements(a);
        setActivity(act);
        setLeaderboard(ld);
        setPerformance(perf);
        setFeatured(feat);
        setGameModes(modes);
        setRecommended(rec);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const categories = ["All", "Daily", "Speed", "Subject", "Battle", "Practice", "Special Events"];
  
  const filteredModes = (gameModes as any[]).filter(m => 
    (activeCategory === "All" || m.category === activeCategory) &&
    (m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading || !stats) {
    return (
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen">
        <Skeleton className="h-40 w-full rounded-2xl mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
          <div className="space-y-8">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const xpPercent = Math.min(100, (stats.xp / stats.nextLevelXp) * 100);

  return (
    <div className="min-h-screen bg-[#051024] pb-12">
      {/* 
        ========================================================================
        1. Player Profile / Progress Header (Dark Premium Theme) 
        ========================================================================
      */}
      <div className="bg-[#0B1A38] border-b border-white/5 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/3" />

        <div className="p-5 md:p-8 max-w-[1600px] mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Left: Titles & Level */}
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-[2px] shrink-0">
                <div className="h-full w-full bg-[#0B1A38] rounded-xl flex items-center justify-center overflow-hidden">
                  {stats.studentAvatar ? (
                    <img src={stats.studentAvatar} alt={stats.studentName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-white">{stats.studentName.charAt(0)}</span>
                  )}
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-[28px] font-black text-white tracking-tight">GAMES ARENA</h1>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" /> Live
                  </span>
                </div>
                <p className="text-blue-200/70 text-sm font-medium">Learn, compete, earn XP and become the ultimate Loksewa champion.</p>
              </div>
            </div>

            {/* Right: Stats Summary */}
            <div className="flex flex-wrap gap-3 md:justify-end">
              <StatBox 
                icon={<Star className="h-4 w-4 text-purple-400" />} 
                label="Level" 
                value={stats.level}
                highlight
              />
              <StatBox 
                icon={<Flame className="h-4 w-4 text-orange-400" />} 
                label="Streak" 
                value={`${stats.streak} Days`}
              />
              <StatBox 
                icon={<CircleDollarSign className="h-4 w-4 text-amber-400" />} 
                label="Coins" 
                value={stats.coins.toLocaleString()}
              />
              <StatBox 
                icon={<Crown className="h-4 w-4 text-emerald-400" />} 
                label="Rank" 
                value={`#${stats.rank}`}
              />
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="mt-8 bg-black/20 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Current Progress</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-white">{stats.xp.toLocaleString()}</span>
                  <span className="text-sm font-bold text-white/40">/ {stats.nextLevelXp.toLocaleString()} XP</span>
                </div>
              </div>
              <p className="text-[12px] font-bold text-purple-400">
                +{stats.nextLevelXp - stats.xp} XP to Level {stats.level + 1}
              </p>
            </div>
            <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-purple-400 transition-all duration-1000 ease-out"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 md:p-8 max-w-[1600px] mx-auto space-y-10 mt-4">
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="xl:col-span-2 space-y-10">
            
            {/* 
              ========================================================================
              4. Featured Game: Today's Challenge 
              ========================================================================
            */}
            {featured && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="h-5 w-5 text-orange-400" />
                  <h2 className="text-lg font-bold text-white tracking-wide">TODAY'S CHALLENGE</h2>
                </div>
                
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 border border-indigo-500/30 p-8 shadow-2xl group cursor-pointer transition-transform hover:scale-[1.01]">
                  <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
                    <DynamicIcon name={featured.icon} className="h-48 w-48 text-white" />
                  </div>
                  
                  <div className="relative z-10 flex flex-col items-start h-full">
                    <DifficultyBadge level={featured.difficulty} />
                    
                    <h3 className="text-3xl md:text-4xl font-black text-white mt-4 mb-2">{featured.title}</h3>
                    <p className="text-blue-200 text-sm md:text-base max-w-md mb-8">{featured.description}</p>
                    
                    <div className="flex flex-wrap gap-4 mb-8">
                      <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                        <Target className="h-4 w-4 text-blue-300" />
                        <span className="text-sm font-bold text-white">{featured.questionsCount} Questions</span>
                      </div>
                      <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                        <Clock className="h-4 w-4 text-blue-300" />
                        <span className="text-sm font-bold text-white">{featured.timeLimitMins} Minutes</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 mt-auto w-full">
                      <Button onClick={() => router.push(featured.route)} className="bg-white text-indigo-900 hover:bg-blue-50 font-bold px-8 py-6 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                        {featured.buttonText} <ChevronRight className="ml-2 h-5 w-5" />
                      </Button>
                      <div className="flex items-center gap-4 ml-auto">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xl font-black text-white">+{featured.xpReward}</span>
                          <span className="text-[11px] font-bold text-purple-300 uppercase">XP</span>
                        </div>
                        <div className="w-px h-6 bg-white/20" />
                        <div className="flex items-center gap-1.5">
                          <span className="text-xl font-black text-white">+{featured.coinReward}</span>
                          <span className="text-[11px] font-bold text-amber-300 uppercase">Coins</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 
              ========================================================================
              15. Game Categories & Search
              ========================================================================
            */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-lg font-bold text-white tracking-wide">GAME MODES</h2>
                
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search games..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0B1A38] border border-white/10 text-white placeholder:text-white/40 pl-9 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors border border-transparent",
                      activeCategory === cat 
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30" 
                        : "bg-[#0B1A38] text-white/60 hover:text-white hover:bg-white/5 border-white/5"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* 
                ========================================================================
                3. Main Game Cards Grid
                ========================================================================
              */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredModes.map((mode) => {
                  const isLocked = mode.status === "Locked";
                  const isCompleted = mode.status === "Completed today";
                  
                  return (
                    <div 
                      key={mode.id} 
                      className={cn(
                        "relative flex flex-col bg-[#0B1A38] rounded-2xl border transition-all p-5",
                        isLocked 
                          ? "border-white/5 opacity-70" 
                          : "border-white/10 hover:border-blue-500/30 hover:bg-white/5 hover:translate-y-[-2px]"
                      )}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center",
                          isLocked ? "bg-white/5 text-white/40" : "bg-blue-500/10 text-blue-400"
                        )}>
                          <DynamicIcon name={(mode as any).icon} className="h-6 w-6" />
                        </div>
                        <DifficultyBadge level={(mode as any).difficulty} />
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                        {mode.title} {isLocked && <Lock className="h-4 w-4 text-white/40" />}
                      </h3>
                      <p className="text-sm text-white/50 mb-5 min-h-[40px]">{mode.description}</p>
                      
                      <div className="grid grid-cols-2 gap-2 mb-6">
                        <div className="bg-black/20 p-2 rounded-lg border border-white/5 flex items-center gap-2">
                          <Target className="h-4 w-4 text-white/30" />
                          <span className="text-[12px] font-medium text-white/70">{(mode as any).questionsCount} Qs</span>
                        </div>
                        <div className="bg-black/20 p-2 rounded-lg border border-white/5 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-white/30" />
                          <span className="text-[12px] font-medium text-white/70">{(mode as any).timeLimitMins}m</span>
                        </div>
                      </div>
                      
                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-white/40 uppercase">Rewards</span>
                          <span className="text-sm font-bold text-white">+{(mode as any).xpReward} XP</span>
                        </div>
                        
                        <Button 
                          disabled={isLocked}
                          onClick={() => !isLocked && router.push((game as any).route)}
                          className={cn(
                            "rounded-xl font-bold transition-all",
                            isLocked ? "bg-white/5 text-white/30" :
                            isCompleted ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" :
                            "bg-blue-600 hover:bg-blue-500 text-white"
                          )}
                        >
                          {(mode as any).buttonText}
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {filteredModes.length === 0 && (
                  <div className="col-span-full py-16 text-center border border-dashed border-white/10 rounded-2xl bg-[#0B1A38]">
                    <Search className="h-8 w-8 text-white/20 mx-auto mb-3" />
                    <p className="text-white font-bold">No games found</p>
                    <p className="text-sm text-white/40">Try adjusting your filters.</p>
                  </div>
                )}
              </div>
            </section>

            {/* 
              ========================================================================
              13. Performance Chart
              ========================================================================
            */}
            <section className="bg-[#0B1A38] rounded-2xl border border-white/5 p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-white tracking-wide">GAME PERFORMANCE</h2>
                <select className="bg-black/30 border border-white/10 text-white/70 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                  <option>All Time</option>
                </select>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performance} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0B1A38', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="xp" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorXp)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

          </div>

          {/* Right Sidebar */}
          <div className="space-y-8">
            
            {/* 
              ========================================================================
              5. Daily Streak
              ========================================================================
            */}
            <section className="bg-[#0B1A38] rounded-2xl border border-white/5 p-6 text-center relative overflow-hidden">
              <div className="absolute -top-10 -right-10 opacity-5">
                <Flame className="w-40 h-40" />
              </div>
              
              <div className="flex items-center justify-center gap-2 mb-2">
                <Flame className="h-6 w-6 text-orange-500 animate-pulse" />
                <span className="text-3xl font-black text-white">{stats.streak}</span>
              </div>
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-6">Day Streak</p>
              
              <div className="flex justify-between items-center px-2">
                {stats.streakDays.map((isDone, idx) => {
                  const days = ['M','T','W','T','F','S','S'];
                  const isToday = idx === 6; // Mock assuming Sunday is today
                  return (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <div className={cn(
                        "flex items-center justify-center h-8 w-8 rounded-full border transition-colors",
                        isDone ? "bg-orange-500/20 border-orange-500/50 text-orange-400" : 
                        isToday ? "bg-white/10 border-white/20 text-white" :
                        "bg-white/5 border-transparent text-white/20"
                      )}>
                        {isDone ? <Flame className="h-4 w-4" /> : <span className="text-[10px]">{isToday ? "●" : ""}</span>}
                      </div>
                      <span className="text-[10px] font-bold text-white/40">{days[idx]}</span>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 pt-4 border-t border-white/5 text-sm text-orange-200/70">
                Play today to keep your streak alive!
              </div>
            </section>

            {/* 
              ========================================================================
              8. Game Leaderboard Preview
              ========================================================================
            */}
            <section className="bg-[#0B1A38] rounded-2xl border border-white/5 p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Crown className="h-4 w-4 text-emerald-400" /> Champions
                </h2>
                <button className="text-[11px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider">
                  Full List
                </button>
              </div>
              
              <div className="space-y-4">
                {leaderboard.map((lb) => (
                  <div key={lb.rank} className="flex items-center gap-3">
                    <div className={cn(
                      "flex items-center justify-center h-7 w-7 rounded-lg text-[11px] font-bold shrink-0",
                      lb.rank === 1 ? "bg-amber-500/20 text-amber-400" :
                      lb.rank === 2 ? "bg-slate-300/20 text-slate-300" :
                      lb.rank === 3 ? "bg-orange-700/20 text-orange-400" :
                      "bg-white/5 text-white/40"
                    )}>
                      {lb.rank}
                    </div>
                    <div className="flex-1 truncate">
                      <p className="text-sm font-bold text-white truncate">{lb.name}</p>
                    </div>
                    <div className="text-xs font-bold text-purple-300 shrink-0">
                      {lb.xp.toLocaleString()} <span className="text-[9px] opacity-70">XP</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 9. Current Player Ranking */}
              <div className="mt-5 pt-4 border-t border-white/10">
                <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500 text-white text-xs font-bold shrink-0">
                    {stats.rank}
                  </div>
                  <div className="flex-1 truncate">
                    <p className="text-sm font-bold text-white">You</p>
                    <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                      <ArrowUp className="h-3 w-3" /> {stats.previousRank - stats.rank} positions
                    </p>
                  </div>
                  <div className="text-xs font-bold text-purple-300 shrink-0">
                    {stats.xp.toLocaleString()} <span className="text-[9px] opacity-70">XP</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 
              ========================================================================
              10. Achievements Preview
              ========================================================================
            */}
            <section className="bg-[#0B1A38] rounded-2xl border border-white/5 p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-400" /> Achievements
                </h2>
                <button className="text-[11px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider">
                  View All
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {achievements.slice(0, 6).map((ach) => (
                  <div 
                    key={ach.id} 
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all",
                      ach.locked 
                        ? "bg-white/5 border-transparent opacity-50 grayscale" 
                        : "bg-gradient-to-b from-white/10 to-transparent border-white/10 hover:border-amber-500/30"
                    )}
                    title={ach.title}
                  >
                    <div className="text-2xl mb-1">{ach.icon}</div>
                    <span className="text-[9px] font-bold text-white line-clamp-1 w-full">{ach.title}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 
              ========================================================================
              12. Game Statistics 
              ========================================================================
            */}
            <section className="bg-[#0B1A38] rounded-2xl border border-white/5 p-6">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-5">Overall Stats</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Win Rate</p>
                  <p className="text-lg font-bold text-white">{stats.gamesWon}/{stats.gamesPlayed}</p>
                  <p className="text-[10px] font-bold text-emerald-400 mt-1">{Math.round((stats.gamesWon/stats.gamesPlayed)*100)}%</p>
                </div>
                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Accuracy</p>
                  <p className="text-lg font-bold text-white">{stats.accuracy}%</p>
                  <p className="text-[10px] text-white/40 mt-1">{stats.questionsAnswered.toLocaleString()} Qs</p>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
