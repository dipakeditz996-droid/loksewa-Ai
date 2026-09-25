"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { gamesApi, GameMatch } from "@/lib/api/games";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Swords, 
  Trophy, 
  Bot, 
  User, 
  Clock, 
  XCircle, 
  Sparkles, 
  RotateCcw
} from "lucide-react";

export default function DuelGamePage() {
  const params = useParams();
  const router = useRouter();
  const matchId = parseInt(params.id as string, 10);
  
  const [match, setMatch] = useState<GameMatch | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [searchCountdown, setSearchCountdown] = useState<number>(20);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Polling ref
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const data = await gamesApi.getMatchState(matchId);
      setMatch(data);

      if (data.status === 'SEARCHING' && typeof data.time_remaining_matchmaking === 'number') {
        setSearchCountdown(data.time_remaining_matchmaking);
      }
      
      // Calculate time left if there's an active question
      if ((data.status === 'IN_PROGRESS' || data.status === 'MATCHED') && data.current_question?.deadline) {
        const diff = new Date(data.current_question.deadline).getTime() - new Date().getTime();
        setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
      }
      
      if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
        if (pollInterval.current) clearInterval(pollInterval.current);
      }
    } catch (err) {
      console.error(err);
    }
  }, [matchId]);

  useEffect(() => {
    // Initial fetch
    fetchState();
    
    // Poll every 1.5 seconds during active matchmaking and play
    pollInterval.current = setInterval(fetchState, 1500);
    
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [fetchState]);

  // Question timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Matchmaking countdown tick
  useEffect(() => {
    if (match?.status !== 'SEARCHING') return;
    const searchTimer = setInterval(() => {
      setSearchCountdown((prev) => {
        if (prev <= 1) {
          // Immediately trigger a fetch when timer hits 0 to transition to bot
          fetchState();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(searchTimer);
  }, [match?.status, fetchState]);

  const handleAnswer = async (option: string) => {
    if (selectedOption || match?.has_answered || timeLeft === 0 || isSubmitting) return;
    
    setSelectedOption(option);
    setIsSubmitting(true);
    try {
      await gamesApi.submitAnswer(matchId, option);
      await fetchState();
    } catch (err) {
      console.error(err);
      setSelectedOption(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSearch = async () => {
    setIsCancelling(true);
    try {
      await gamesApi.cancelMatch(matchId);
      if (pollInterval.current) clearInterval(pollInterval.current);
      router.push("/student/games");
    } catch (err) {
      console.error(err);
      router.push("/student/games");
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePlayAgain = async () => {
    try {
      const newMatch = await gamesApi.randomMatch();
      router.push(`/student/games/duel/${newMatch.id}`);
    } catch (err) {
      console.error(err);
      router.push("/student/games/duel");
    }
  };
  
  // Reset selected option when question changes
  useEffect(() => {
    if (match && !match.has_answered) {
      setSelectedOption(null);
    }
  }, [match]);

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-foreground mb-4" />
        <p className="text-muted-foreground">Loading match...</p>
      </div>
    );
  }

  // 1. SEARCHING State
  if (match.status === 'SEARCHING') {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8 min-h-[calc(100vh-72px)] flex flex-col justify-center items-center">
        <div className="bg-card border border-border shadow-lg rounded-2xl p-8 md:p-12 text-center w-full relative overflow-hidden">
          {/* Animated radar/searching indicator */}
          <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary/20 animate-ping opacity-75" />
            <span className="absolute inline-flex h-20 w-20 rounded-full bg-primary/30 animate-pulse" />
            <div className="relative w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md">
              <Swords className="w-8 h-8 animate-bounce" />
            </div>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Finding an Opponent
          </h2>
          <p className="text-muted-foreground text-sm md:text-base mb-6">
            Searching for another learner to match 1v1...
          </p>

          {/* Countdown & Progress */}
          <div className="bg-muted/60 border border-border/60 rounded-xl p-4 mb-6 max-w-md mx-auto">
            <div className="flex items-center justify-between text-sm font-medium mb-2">
              <span className="flex items-center text-muted-foreground">
                <Clock className="w-4 h-4 mr-1.5 text-primary" />
                Time remaining
              </span>
              <span className="font-mono text-base font-bold text-primary">
                00:{searchCountdown.toString().padStart(2, "0")}
              </span>
            </div>
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${Math.min(100, (searchCountdown / 20) * 100)}%` }}
              />
            </div>
          </div>

          {/* Fallback reassurance notice */}
          <div className="inline-flex items-center text-xs text-muted-foreground bg-primary/5 border border-primary/20 px-3.5 py-1.5 rounded-full mb-8">
            <Bot className="w-3.5 h-3.5 mr-1.5 text-primary" />
            We&apos;ll start with a computer opponent if no player is available.
          </div>

          {/* Cancel button */}
          <div>
            <Button
              variant="outline"
              onClick={handleCancelSearch}
              disabled={isCancelling}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel Search
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 2. MATCHED State (Short transition)
  if (match.status === 'MATCHED') {
    const isBot = match.is_bot_match || match.opponent_type === 'BOT';

    return (
      <div className="p-4 md:p-8 max-w-xl mx-auto space-y-8 min-h-[calc(100vh-72px)] flex flex-col justify-center items-center text-center">
        <div className="bg-card border border-border shadow-lg rounded-2xl p-8 md:p-10 w-full animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center bg-primary/10">
            {isBot ? (
              <Bot className="w-8 h-8 text-primary" />
            ) : (
              <Swords className="w-8 h-8 text-primary" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">
            {isBot ? "No player available right now" : "Opponent Found!"}
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            {isBot 
              ? "We've matched you with a computer opponent."
              : "Get ready for a live 1v1 battle!"}
          </p>

          {/* Versus Display */}
          <div className="grid grid-cols-5 items-center bg-muted/60 border border-border rounded-xl p-5 mb-6">
            <div className="col-span-2 text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary font-bold rounded-full flex items-center justify-center mx-auto mb-2">
                <User className="w-6 h-6" />
              </div>
              <p className="font-semibold text-sm truncate">{match.player1_name || "You"}</p>
              <Badge variant="secondary" className="text-[10px] mt-1">You</Badge>
            </div>

            <div className="col-span-1 text-center font-bold text-muted-foreground text-lg">
              VS
            </div>

            <div className="col-span-2 text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${isBot ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'}`}>
                {isBot ? <Bot className="w-6 h-6" /> : <User className="w-6 h-6" />}
              </div>
              <p className="font-semibold text-sm truncate">{match.player2_name || (isBot ? "LoksewaAI Bot" : "Opponent")}</p>
              <Badge variant={isBot ? "outline" : "default"} className={`text-[10px] mt-1 ${isBot ? 'border-amber-500/30 text-amber-600' : ''}`}>
                {isBot ? "🤖 Computer" : "👤 Student"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-center text-sm font-medium text-primary">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Starting Duel...
          </div>
        </div>
      </div>
    );
  }

  // 3. COMPLETED State
  if (match.status === 'COMPLETED') {
    const isBot = match.is_bot_match || match.opponent_type === 'BOT';
    const isP1Winner = match.winner_name === match.player1_name || (match.player1_score > match.player2_score && !match.is_draw);
    const isDraw = match.is_draw || match.player1_score === match.player2_score;

    return (
      <div className="max-w-xl mx-auto text-center space-y-6 pt-8 pb-16 px-4">
        <div className="w-20 h-20 bg-[#D4A72C]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-10 h-10 text-[#D4A72C]" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          {isDraw ? "It's a Draw!" : isP1Winner ? "🏆 Victory! You Won" : `Match Complete`}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isDraw 
            ? "Both players answered equally well!" 
            : isP1Winner 
              ? "Great job! You defeated your opponent in this challenge."
              : `${match.player2_name} scored higher this round. Keep practicing!`}
        </p>

        {/* Score Card */}
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 flex justify-between items-center my-6 shadow-sm">
          <div className="text-center flex-1">
            <div className="inline-flex items-center text-xs font-semibold text-muted-foreground mb-1">
              <User className="w-3.5 h-3.5 mr-1" />
              {match.player1_name || "You"}
            </div>
            <p className="text-4xl font-extrabold text-foreground">{match.player1_score}</p>
            <p className="text-xs text-muted-foreground mt-1">points</p>
          </div>

          <div className="text-xl font-bold text-muted-foreground/60 px-4">VS</div>

          <div className="text-center flex-1">
            <div className="inline-flex items-center text-xs font-semibold text-muted-foreground mb-1">
              {isBot ? <Bot className="w-3.5 h-3.5 mr-1 text-amber-500" /> : <User className="w-3.5 h-3.5 mr-1 text-blue-500" />}
              {match.player2_name}
            </div>
            <p className="text-4xl font-extrabold text-foreground">{match.player2_score}</p>
            <p className="text-xs text-muted-foreground mt-1">points</p>
          </div>
        </div>

        {/* Gamification / XP breakdown */}
        <div className="bg-muted/60 border border-border rounded-xl p-4 text-left space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center">
            <Sparkles className="w-4 h-4 mr-1.5 text-[#D4A72C]" />
            XP & Rewards Summary
          </h3>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Score Points ({match.player1_score} pts)</span>
            <span className="font-semibold text-foreground">+{match.player1_score} XP</span>
          </div>
          {isP1Winner && (
            <div className="flex justify-between text-xs text-[#D4A72C]">
              <span>Victory Bonus</span>
              <span className="font-semibold">+50 XP</span>
            </div>
          )}
          {isBot && (
            <p className="text-[11px] text-muted-foreground/80 pt-1 border-t border-border/60">
              ℹ️ Computer duel awards full personal XP. Competitive 1v1 leaderboard rankings reflect human-vs-human duels.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button onClick={handlePlayAgain} className="bg-primary text-primary-foreground">
            <RotateCcw className="w-4 h-4 mr-2" />
            Play Again
          </Button>
          <Button variant="outline" onClick={() => router.push("/student/games")}>
            Back to Games
          </Button>
        </div>
      </div>
    );
  }

  // 4. IN_PROGRESS State
  const q = match.current_question;
  const isAnswered = match.has_answered || selectedOption !== null;
  const isBot = match.is_bot_match || match.opponent_type === 'BOT';

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 min-h-[calc(100vh-72px)] bg-muted/30">
      {/* Game Header */}
      <div className="bg-card border border-border rounded-2xl p-4 md:p-6 flex flex-wrap gap-4 items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4 md:space-x-8">
          <div className="text-left">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{match.player1_name || "You"}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">You</Badge>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-foreground">{match.player1_score} <span className="text-xs font-normal text-muted-foreground">pts</span></p>
          </div>

          <div className="text-muted-foreground font-bold text-sm">VS</div>

          <div className="text-left">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{match.player2_name}</span>
              <Badge variant={isBot ? "outline" : "default"} className={`text-[10px] px-1.5 py-0 ${isBot ? 'border-amber-500/40 text-amber-600' : ''}`}>
                {isBot ? "🤖 Computer" : "👤 Student"}
              </Badge>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-foreground">{match.player2_score} <span className="text-xs font-normal text-muted-foreground">pts</span></p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1 flex items-center justify-end">
            <Clock className="w-3.5 h-3.5 mr-1 text-primary" />
            Time Left
          </p>
          <p className={`text-2xl md:text-3xl font-bold font-mono ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-foreground'}`}>
            00:{timeLeft.toString().padStart(2, '0')}
          </p>
        </div>
      </div>
      
      {/* Question Card */}
      {q && (
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-semibold text-[#D4A72C] bg-[#D4A72C]/10 px-3 py-1 rounded-full border border-[#D4A72C]/20">
              Question {match.current_question_index + 1} of 10
            </span>
            {isBot && (
              <span className="text-xs text-muted-foreground flex items-center">
                <Bot className="w-3.5 h-3.5 mr-1 text-amber-500" />
                Bot Match
              </span>
            )}
          </div>
          
          <h2 className="text-lg md:text-xl font-medium text-foreground mb-8 leading-relaxed">
            {q.question_text}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['A', 'B', 'C', 'D'].map((opt) => {
              const optionText = opt === 'A' ? q.option_a : opt === 'B' ? q.option_b : opt === 'C' ? q.option_c : q.option_d;
              const isSelected = selectedOption === opt || (match.has_answered && selectedOption === opt);
              
              return (
                <button
                  key={opt}
                  onClick={() => handleAnswer(opt)}
                  disabled={isAnswered || timeLeft === 0 || isSubmitting}
                  className={`
                    w-full text-left p-4 rounded-xl border-2 transition-all flex items-center group
                    ${isSelected 
                      ? 'border-primary bg-primary/10 shadow-sm' 
                      : 'border-border hover:border-primary/40 hover:bg-muted/60'}
                    ${(isAnswered || timeLeft === 0) && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <span className={`
                    w-8 h-8 rounded-full flex items-center justify-center mr-4 font-bold text-sm shrink-0 transition-colors
                    ${isSelected 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'}
                  `}>
                    {opt}
                  </span>
                  <span className="font-medium text-foreground text-sm md:text-base leading-snug">{optionText}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Real-time Opponent & Submission Status */}
      {isAnswered && (
        <div className="bg-card/60 border border-border/80 rounded-xl p-3.5 text-center text-sm font-medium text-muted-foreground flex items-center justify-center space-x-2">
          {isBot ? (
            match.bot_answered ? (
              <span className="text-emerald-600 flex items-center">
                <Bot className="w-4 h-4 mr-1.5" />
                🤖 LoksewaAI Bot has submitted an answer. Advancing...
              </span>
            ) : (
              <span className="flex items-center text-amber-600 animate-pulse">
                <Bot className="w-4 h-4 mr-1.5 animate-spin" />
                🤖 LoksewaAI Bot is thinking...
              </span>
            )
          ) : (
            <span className="flex items-center text-muted-foreground animate-pulse">
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              Your answer recorded! Waiting for opponent to respond...
            </span>
          )}
        </div>
      )}
    </div>
  );
}
