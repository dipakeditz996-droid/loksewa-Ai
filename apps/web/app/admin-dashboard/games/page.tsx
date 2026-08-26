"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Gamepad2,
  Swords,
  Shield,
  Trophy,
  Search,
  Filter,
  Crown,
  Heart,
  RefreshCw,
  AlertCircle,
  type LucideIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/admin/stat-card";
import { gamesApi, GameProfile, AdminGameMatch, AdminSurvivalGame } from "@/lib/api/games";
import toast from "react-hot-toast";

type LoadState = "loading" | "ready" | "error";

const initials = (name?: string) =>
  (name || "?")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const formatDuration = (seconds: number | null) => {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

function LeaderboardList({
  title,
  icon: Icon,
  players,
  state,
  metric,
  metricLabel,
  emptyLabel,
}: {
  title: string;
  icon: LucideIcon;
  players: GameProfile[];
  state: LoadState;
  metric: (p: GameProfile) => number;
  metricLabel: string;
  emptyLabel: string;
}) {
  const medalColor = (rank: number) =>
    rank === 0
      ? "bg-[#D4A72C]/15 text-[#D4A72C]"
      : rank === 1
      ? "bg-slate-200 text-slate-600"
      : rank === 2
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-500";

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-[#D4A72C]" />
        <h3 className="text-sm font-bold text-[#0B2545]">{title}</h3>
        <span className="ml-auto text-[11px] font-medium text-slate-400">Top 10</span>
      </div>

      {state === "loading" && (
        <div className="p-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      )}

      {state === "error" && (
        <div className="p-8 text-center">
          <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Unable to load this section. Please try again.</p>
        </div>
      )}

      {state === "ready" && players.length === 0 && (
        <div className="p-8 text-center">
          <Icon className="w-8 h-8 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">No ranked players yet</p>
          <p className="text-xs text-slate-400 mt-1">{emptyLabel}</p>
        </div>
      )}

      {state === "ready" && players.length > 0 && (
        <div className="divide-y divide-slate-100">
          {players.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-5 py-3">
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${medalColor(i)}`}
              >
                {i + 1}
              </span>
              <Avatar className="h-8 w-8 border border-slate-200 shrink-0">
                <AvatarFallback className="bg-[#0B2545] text-white text-[11px] font-bold">
                  {initials(p.username)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold text-[#0B2545] truncate flex-1">
                {p.username || "Unknown player"}
              </span>
              <span className="text-sm font-bold text-[#0B2545] tabular-nums shrink-0">
                {metric(p).toLocaleString()}
                <span className="text-[10px] font-medium text-slate-400 ml-1">{metricLabel}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchesTable({
  matches,
  loading,
  error,
  pagination,
  onPageChange,
  onSearch,
  onStatusChange,
}: {
  matches: AdminGameMatch[];
  loading: boolean;
  error: boolean;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  onPageChange: (page: number) => void;
  onSearch: (search: string) => void;
  onStatusChange: (status: string) => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by player or match ID..."
            className="pl-9 h-10"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm flex-1 sm:flex-none"
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="SEARCHING">Searching</option>
          <option value="MATCHED">Matched</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <Button variant="outline" className="gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4" /> Filters
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead>Match</TableHead>
              <TableHead>Players</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Winner</TableHead>
              <TableHead>Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))}
              </>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Unable to load matches. Please try again.</p>
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && matches.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-sm text-slate-500">No 1v1 matches found.</p>
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && matches.length > 0 && (
              matches.map((match) => (
                <TableRow key={match.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-mono text-xs">#{match.id}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">{match.player1_username}</span>
                      <span className="text-slate-300">vs</span>
                      <span className="text-slate-600">{match.player2_username || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-sm font-bold">{match.player1_score} - {match.player2_score}</div>
                    <div className="text-xs text-slate-400">({match.question_count}q)</div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded">
                      {match.status.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {match.winner_username ? (
                      <span>{match.winner_username}</span>
                    ) : match.is_draw ? (
                      <span className="text-slate-400">Draw</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {match.started_at ? new Date(match.started_at).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && matches.length > 0 && (
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500">
          <div>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SurvivalTable({
  games,
  loading,
  error,
  pagination,
  onPageChange,
  onSearch,
  onStatusChange,
}: {
  games: AdminSurvivalGame[];
  loading: boolean;
  error: boolean;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  onPageChange: (page: number) => void;
  onSearch: (search: string) => void;
  onStatusChange: (status: string) => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by player or run ID..."
            className="pl-9 h-10"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm flex-1 sm:flex-none"
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <Button variant="outline" className="gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4" /> Filters
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead>Run</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead className="text-center">Survived</TableHead>
              <TableHead className="text-center">Streak</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))}
              </>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Unable to load survival runs. Please try again.</p>
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && games.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-sm text-slate-500">No survival runs found.</p>
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && games.length > 0 && (
              games.map((game) => (
                <TableRow key={game.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-mono text-xs">#{game.id}</TableCell>
                  <TableCell className="text-sm font-medium text-[#0B2545]">{game.player_username}</TableCell>
                  <TableCell className="text-center font-bold">{game.score}</TableCell>
                  <TableCell className="text-center text-sm">{game.questions_survived}</TableCell>
                  <TableCell className="text-center text-sm font-semibold">{game.highest_streak}</TableCell>
                  <TableCell>
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded">
                      {game.status.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{formatDuration(game.duration_seconds)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && games.length > 0 && (
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500">
          <div>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminGamesPage() {
  const [leaderboardState, setLeaderboardState] = useState<LoadState>("loading");
  const [top1v1, setTop1v1] = useState<GameProfile[]>([]);
  const [topSurvival, setTopSurvival] = useState<GameProfile[]>([]);

  // Matches state
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState(false);
  const [matches, setMatches] = useState<AdminGameMatch[]>([]);
  const [matchesPagination, setMatchesPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [matchSearch, setMatchSearch] = useState("");
  const [matchStatus, setMatchStatus] = useState("");

  // Survival state
  const [survivalLoading, setSurvivalLoading] = useState(false);
  const [survivalError, setSurvivalError] = useState(false);
  const [survivalGames, setSurvivalGames] = useState<AdminSurvivalGame[]>([]);
  const [survivalPagination, setSurvivalPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [survivalSearch, setSurvivalSearch] = useState("");
  const [survivalStatus, setSurvivalStatus] = useState("");

  const fetchLeaderboard = useCallback(async () => {
    setLeaderboardState("loading");
    try {
      const data = await gamesApi.getLeaderboard();
      setTop1v1(data.top_1v1 || []);
      setTopSurvival(data.top_survival || []);
      setLeaderboardState("ready");
    } catch (error) {
      console.error("Failed to load games leaderboard", error);
      setLeaderboardState("error");
    }
  }, []);

  const fetchMatches = useCallback(async (page: number, search: string, status: string) => {
    setMatchesLoading(true);
    setMatchesError(false);
    try {
      const data = await gamesApi.getAdminMatches({
        page,
        page_size: 20,
        search: search || undefined,
        status: status || undefined,
        order_by: "-created_at",
      });
      setMatches(data.results);
      setMatchesPagination({
        page: data.page,
        pageSize: data.page_size,
        total: data.total,
        totalPages: data.total_pages,
      });
    } catch (error) {
      console.error("Failed to load matches", error);
      setMatchesError(true);
    } finally {
      setMatchesLoading(false);
    }
  }, []);

  const fetchSurvivalGames = useCallback(async (page: number, search: string, status: string) => {
    setSurvivalLoading(true);
    setSurvivalError(false);
    try {
      const data = await gamesApi.getAdminSurvivalGames({
        page,
        page_size: 20,
        search: search || undefined,
        status: status || undefined,
        order_by: "-created_at",
      });
      setSurvivalGames(data.results);
      setSurvivalPagination({
        page: data.page,
        pageSize: data.page_size,
        total: data.total,
        totalPages: data.total_pages,
      });
    } catch (error) {
      console.error("Failed to load survival games", error);
      setSurvivalError(true);
    } finally {
      setSurvivalLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMatches(1, matchSearch, matchStatus);
    }, 300);
    return () => clearTimeout(timer);
  }, [matchSearch, matchStatus, fetchMatches]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSurvivalGames(1, survivalSearch, survivalStatus);
    }, 300);
    return () => clearTimeout(timer);
  }, [survivalSearch, survivalStatus, fetchSurvivalGames]);

  const handleRefresh = async () => {
    await fetchLeaderboard();
    toast.success("Leaderboard refreshed");
  };

  const topDuelist = top1v1[0];
  const topSurvivor = topSurvival[0];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2545] flex items-center gap-2.5">
            <Gamepad2 className="w-6 h-6 text-[#D4A72C]" />
            Game Center
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Monitor competitive 1v1 duels, solo survival runs, and the platform leaderboard.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 w-full sm:w-auto"
          onClick={handleRefresh}
          disabled={leaderboardState === "loading"}
        >
          <RefreshCw className={`w-4 h-4 ${leaderboardState === "loading" ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Top Duelist"
          value={topDuelist ? topDuelist.total_1v1_wins ?? 0 : "—"}
          subtitle={topDuelist ? `@${topDuelist.username} · wins` : "No ranked duels yet"}
          icon={Swords}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          loading={leaderboardState === "loading"}
        />
        <StatCard
          title="Top Survivor"
          value={topSurvivor ? topSurvivor.best_survival_score ?? 0 : "—"}
          subtitle={topSurvivor ? `@${topSurvivor.username} · best score` : "No survival runs yet"}
          icon={Shield}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
          loading={leaderboardState === "loading"}
        />
        <StatCard
          title="Duel Format"
          value="10 Rounds"
          subtitle="15s per question · +10 pts each"
          icon={Trophy}
          iconColor="text-[#D4A72C]"
          iconBg="bg-[#D4A72C]/10"
        />
        <StatCard
          title="Survival Lives"
          value="3 Lives"
          subtitle="Difficulty escalates every 5 correct"
          icon={Heart}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Workspace */}
      <Tabs defaultValue="leaderboard" className="w-full">
        <TabsList className="w-full sm:w-auto overflow-x-auto justify-start">
          <TabsTrigger value="leaderboard" className="gap-1.5">
            <Crown className="w-3.5 h-3.5" /> Leaderboard
          </TabsTrigger>
          <TabsTrigger value="duels" className="gap-1.5">
            <Swords className="w-3.5 h-3.5" /> 1v1 Duels
          </TabsTrigger>
          <TabsTrigger value="survival" className="gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Survival Runs
          </TabsTrigger>
        </TabsList>

        {/* Leaderboard */}
        <TabsContent value="leaderboard" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <LeaderboardList
              title="Top 1v1 Champions"
              icon={Swords}
              players={top1v1}
              state={leaderboardState}
              metric={(p) => p.total_1v1_wins ?? 0}
              metricLabel="wins"
              emptyLabel="Rankings populate once students complete ranked duels."
            />
            <LeaderboardList
              title="Top Survival Runs"
              icon={Shield}
              players={topSurvival}
              state={leaderboardState}
              metric={(p) => p.best_survival_score ?? 0}
              metricLabel="pts"
              emptyLabel="Rankings populate once students complete survival runs."
            />
          </div>
        </TabsContent>

        {/* 1v1 Duels */}
        <TabsContent value="duels" className="mt-4">
          <MatchesTable
            matches={matches}
            loading={matchesLoading}
            error={matchesError}
            pagination={matchesPagination}
            onPageChange={(page) => fetchMatches(page, matchSearch, matchStatus)}
            onSearch={setMatchSearch}
            onStatusChange={setMatchStatus}
          />
        </TabsContent>

        {/* Survival Runs */}
        <TabsContent value="survival" className="mt-4">
          <SurvivalTable
            games={survivalGames}
            loading={survivalLoading}
            error={survivalError}
            pagination={survivalPagination}
            onPageChange={(page) => fetchSurvivalGames(page, survivalSearch, survivalStatus)}
            onSearch={setSurvivalSearch}
            onStatusChange={setSurvivalStatus}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
