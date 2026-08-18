"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { gamesApi, GameMatch, GameQuestion } from "@/lib/api/games";
import { Button } from "@/components/ui/button";
import { Loader2, Swords, Trophy } from "lucide-react";

export default function DuelGamePage() {
  const params = useParams();
  const router = useRouter();
  const matchId = parseInt(params.id as string, 10);
  
  const [match, setMatch] = useState<GameMatch | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Polling ref
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchState = async () => {
    try {
      const data = await gamesApi.getMatchState(matchId);
      setMatch(data);
      
      // Calculate time left if there's an active question
      if (data.status === 'IN_PROGRESS' && data.current_question?.deadline) {
        const diff = new Date(data.current_question.deadline).getTime() - new Date().getTime();
        setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
      }
      
      if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
        if (pollInterval.current) clearInterval(pollInterval.current);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchState();
    
    // Start polling every 1.5 seconds
    pollInterval.current = setInterval(fetchState, 1500);
    
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [matchId]);

  useEffect(() => {
    // Local timer tick
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAnswer = async (option: string) => {
    if (selectedOption || match?.has_answered || timeLeft === 0 || isSubmitting) return;
    
    setSelectedOption(option);
    setIsSubmitting(true);
    try {
      await gamesApi.submitAnswer(matchId, option);
      // Fast refresh
      fetchState();
    } catch (err) {
      console.error(err);
      setSelectedOption(null);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Reset selected option when question changes
  useEffect(() => {
    if (match && !match.has_answered) {
      setSelectedOption(null);
    }
  }, [match?.current_question_index]);

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0B2545] mb-4" />
        <p className="text-muted-foreground">Loading match...</p>
      </div>
    );
  }

  if (match.status === 'SEARCHING' || match.status === 'MATCHED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-[#0B2545]/10 rounded-full flex items-center justify-center mb-6">
          <Swords className="w-10 h-10 text-[#0B2545]" />
        </div>
        <h2 className="text-2xl font-bold text-[#0B2545] mb-2">
          {match.status === 'SEARCHING' ? 'Finding Opponent...' : 'Opponent Found!'}
        </h2>
        <p className="text-slate-600 mb-8">
          {match.status === 'SEARCHING' 
            ? 'Waiting for another student to join the match.' 
            : 'Get ready! The match is about to begin.'}
        </p>
        
        {match.status === 'SEARCHING' && (
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#0B2545] w-1/3 animate-pulse rounded-full" />
          </div>
        )}
      </div>
    );
  }

  if (match.status === 'COMPLETED') {
    const isWinner = match.winner_name === match.player1_name || match.winner_name === match.player2_name; // We need to know who "I" am, but we can just use the fact if my name == winner_name
    // A better way is checking if the logged in user is the winner, but we don't have current user context easily here without another API. Let's just say "Winner: X"
    
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 pt-12">
        <div className="w-24 h-24 bg-[#D4A72C]/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trophy className="w-12 h-12 text-[#D4A72C]" />
        </div>
        <h1 className="text-4xl font-bold text-[#0B2545]">Match Complete</h1>
        
        <div className="bg-white rounded-xl border border-slate-200 p-8 flex justify-between items-center my-8">
          <div className="text-center flex-1">
            <p className="text-sm text-slate-500 mb-1">{match.player1_name}</p>
            <p className="text-4xl font-bold text-[#0B2545]">{match.player1_score}</p>
          </div>
          <div className="text-2xl font-bold text-slate-300 px-4">VS</div>
          <div className="text-center flex-1">
            <p className="text-sm text-slate-500 mb-1">{match.player2_name}</p>
            <p className="text-4xl font-bold text-[#0B2545]">{match.player2_score}</p>
          </div>
        </div>
        
        <div className="text-xl font-medium mb-8">
          {match.is_draw ? "It's a Draw!" : `Winner: ${match.winner_name}`}
        </div>
        
        <Button onClick={() => router.push("/student/games")} className="bg-[#0B2545]">
          Back to Games
        </Button>
      </div>
    );
  }

  const q = match.current_question;
  const isAnswered = match.has_answered || selectedOption !== null;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 min-h-[calc(100vh-72px)] bg-slate-50/50">
      {/* Game Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between mb-8 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="text-center px-4 border-r border-slate-200">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">{match.player1_name}</p>
            <p className="text-2xl font-bold text-[#0B2545]">{match.player1_score}</p>
          </div>
          <div className="text-center px-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">{match.player2_name}</p>
            <p className="text-2xl font-bold text-[#0B2545]">{match.player2_score}</p>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Time Left</p>
          <p className={`text-2xl font-bold font-mono ${timeLeft <= 5 ? 'text-red-500' : 'text-[#0B2545]'}`}>
            00:{timeLeft.toString().padStart(2, '0')}
          </p>
        </div>
      </div>
      
      {/* Question */}
      {q && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-semibold text-[#D4A72C] bg-[#D4A72C]/10 px-3 py-1 rounded-full">
              Question {match.current_question_index + 1} / 10
            </span>
          </div>
          
          <h2 className="text-xl font-medium text-slate-800 mb-8 leading-relaxed">
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
                    w-full text-left p-4 rounded-xl border-2 transition-all flex items-center
                    ${isSelected 
                      ? 'border-[#0B2545] bg-[#0B2545]/5' 
                      : 'border-slate-200 hover:border-[#0B2545]/30 hover:bg-slate-50'}
                    ${(isAnswered || timeLeft === 0) && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <span className={`
                    w-8 h-8 rounded-full flex items-center justify-center mr-4 font-bold
                    ${isSelected ? 'bg-[#0B2545] text-white' : 'bg-slate-100 text-slate-500'}
                  `}>
                    {opt}
                  </span>
                  <span className="font-medium text-slate-700">{optionText}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {isAnswered && (
        <div className="text-center text-slate-500 animate-pulse">
          Waiting for opponent to answer...
        </div>
      )}
    </div>
  );
}
