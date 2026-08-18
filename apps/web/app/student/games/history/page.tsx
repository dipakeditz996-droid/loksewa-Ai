"use client";

import React, { useEffect, useState } from "react";
import { gamesApi, GameMatch, SurvivalGame, GameProfile } from "@/lib/api/games";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Swords, HeartPulse, Loader2 } from "lucide-react";

export default function GameHistoryPage() {
  const [history, setHistory] = useState<{ matches: GameMatch[]; survivals: SurvivalGame[] } | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ top_1v1: GameProfile[]; top_survival: GameProfile[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hist, lead] = await Promise.all([
          gamesApi.getHistory(),
          gamesApi.getLeaderboard()
        ]);
        setHistory(hist);
        setLeaderboard(lead);
      } catch (err) {
        console.error("Failed to load history", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 min-h-[calc(100vh-72px)] bg-slate-50/50">
      <div>
        <h1 className="text-3xl font-bold text-[#0B2545]">Games History & Rankings</h1>
        <p className="text-muted-foreground mt-2">
          Track your performance and see where you stand among other students.
        </p>
      </div>

      <Tabs defaultValue="history">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="history">My History</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboards</TabsTrigger>
        </TabsList>
        
        <TabsContent value="history" className="mt-6 space-y-8">
          {/* 1v1 History */}
          <div>
            <h2 className="text-xl font-bold flex items-center mb-4 text-[#0B2545]">
              <Swords className="w-5 h-5 mr-2 text-[#0B2545]" /> Recent 1 vs 1 Matches
            </h2>
            {history?.matches.length === 0 ? (
              <div className="bg-white border rounded-xl p-8 text-center text-slate-500">
                No recent matches. Go play a game!
              </div>
            ) : (
              <div className="bg-white border rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b text-slate-500 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium">Opponent</th>
                      <th className="px-6 py-4 font-medium">Score</th>
                      <th className="px-6 py-4 font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history?.matches.map(match => (
                      <tr key={match.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-slate-600">
                          {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }).format(new Date(match.created_at))}
                        </td>
                        <td className="px-6 py-4 font-medium text-[#0B2545]">
                          {/* Determine if player 1 or 2 is the opponent. We don't have current user context, so we show both */}
                          {match.player1_name} vs {match.player2_name || 'TBD'}
                        </td>
                        <td className="px-6 py-4">
                          {match.player1_score} - {match.player2_score}
                        </td>
                        <td className="px-6 py-4">
                          {match.is_draw ? (
                            <span className="text-slate-500 font-medium">Draw</span>
                          ) : (
                            <span className="text-[#0B2545] font-semibold">{match.winner_name ? `Winner: ${match.winner_name}` : 'Unfinished'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Survival History */}
          <div>
            <h2 className="text-xl font-bold flex items-center mb-4 text-[#0B2545]">
              <HeartPulse className="w-5 h-5 mr-2 text-[#D4A72C]" /> Recent Solo Survival
            </h2>
            {history?.survivals.length === 0 ? (
              <div className="bg-white border rounded-xl p-8 text-center text-slate-500">
                No recent survival games.
              </div>
            ) : (
              <div className="bg-white border rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b text-slate-500 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium">Score</th>
                      <th className="px-6 py-4 font-medium">Questions Survived</th>
                      <th className="px-6 py-4 font-medium">Best Streak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history?.survivals.map(surv => (
                      <tr key={surv.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-slate-600">
                          {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }).format(new Date(surv.created_at))}
                        </td>
                        <td className="px-6 py-4 font-bold text-[#0B2545]">
                          {surv.score}
                        </td>
                        <td className="px-6 py-4">
                          {surv.questions_survived}
                        </td>
                        <td className="px-6 py-4 text-orange-500 font-medium">
                          {surv.highest_streak}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="leaderboard" className="mt-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* 1v1 Leaderboard */}
            <div className="bg-white border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#0B2545] flex items-center">
                  <Swords className="w-5 h-5 mr-2 text-[#0B2545]" /> Top Duelists
                </h2>
                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-medium">Most Wins</span>
              </div>
              
              {leaderboard?.top_1v1.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No rankings available yet.</p>
              ) : (
                <div className="space-y-4">
                  {leaderboard?.top_1v1.map((profile, idx) => (
                    <div key={profile.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex items-center space-x-4">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                          ${idx === 0 ? 'bg-[#D4A72C] text-white' : 
                            idx === 1 ? 'bg-slate-300 text-slate-700' : 
                            idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-600'}
                        `}>
                          {idx + 1}
                        </div>
                        <span className="font-semibold text-[#0B2545]">{profile.username}</span>
                      </div>
                      <div className="font-bold text-[#0B2545]">
                        {profile.total_1v1_wins} <span className="text-xs font-normal text-slate-500 ml-1">Wins</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Survival Leaderboard */}
            <div className="bg-white border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#0B2545] flex items-center">
                  <HeartPulse className="w-5 h-5 mr-2 text-[#D4A72C]" /> Top Survivors
                </h2>
                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-medium">Highest Score</span>
              </div>
              
              {leaderboard?.top_survival.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No rankings available yet.</p>
              ) : (
                <div className="space-y-4">
                  {leaderboard?.top_survival.map((profile, idx) => (
                    <div key={profile.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex items-center space-x-4">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                          ${idx === 0 ? 'bg-[#D4A72C] text-white' : 
                            idx === 1 ? 'bg-slate-300 text-slate-700' : 
                            idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-600'}
                        `}>
                          {idx + 1}
                        </div>
                        <span className="font-semibold text-[#0B2545]">{profile.username}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#0B2545]">{profile.best_survival_score}</div>
                        <div className="text-xs text-slate-500">Best Streak: {profile.best_survival_streak}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
