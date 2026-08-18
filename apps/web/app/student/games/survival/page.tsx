"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { gamesApi, ActiveSurvivalGame, SurvivalGame } from "@/lib/api/games";
import { Button } from "@/components/ui/button";
import { Loader2, Heart, HeartCrack, Trophy, Flame } from "lucide-react";

export default function SurvivalGamePage() {
  const router = useRouter();
  
  const [game, setGame] = useState<ActiveSurvivalGame | SurvivalGame | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startNewGame = async () => {
    setIsStarting(true);
    try {
      const newGame = await gamesApi.startSurvival();
      setGame(newGame);
      setFeedback(null);
      setSelectedOption(null);
      startTimer(newGame.question_deadline);
    } catch (err) {
      alert("Failed to start game");
    } finally {
      setIsStarting(false);
    }
  };

  const startTimer = (deadline: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const updateTimer = () => {
      const diff = new Date(deadline).getTime() - new Date().getTime();
      const secs = Math.max(0, Math.floor(diff / 1000));
      setTimeLeft(secs);
      
      if (secs === 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleAnswerTimeout();
      }
    };
    
    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleAnswerTimeout = () => {
    if (!isSubmitting && game?.status === 'IN_PROGRESS') {
      submitAnswer(""); // Timeout counts as incorrect
    }
  };

  const submitAnswer = async (option: string) => {
    if (!game || game.status !== 'IN_PROGRESS' || isSubmitting) return;
    
    setSelectedOption(option);
    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    
    try {
      const result = await gamesApi.submitSurvivalAnswer(game.id, option);
      
      if (result.status === 'CONTINUE') {
        setFeedback(result.is_correct ? 'correct' : 'incorrect');
        setTimeout(() => {
          setGame(result.game);
          setFeedback(null);
          setSelectedOption(null);
          if ('question_deadline' in result.game) {
            startTimer(result.game.question_deadline);
          }
          setIsSubmitting(false);
        }, 1500);
      } else if (result.status === 'GAME_OVER') {
        setFeedback('incorrect'); // Last life lost
        setTimeout(() => {
          setGame(result.game);
          setIsSubmitting(false);
        }, 1500);
      }
    } catch (err) {
      alert("Error submitting answer");
      setIsSubmitting(false);
    }
  };

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-[#D4A72C]/10 rounded-full flex items-center justify-center mb-6">
          <Heart className="w-10 h-10 text-[#D4A72C]" />
        </div>
        <h2 className="text-2xl font-bold text-[#0B2545] mb-2">Ready to Survive?</h2>
        <p className="text-slate-600 mb-8">
          You have 3 lives. Answer carefully. The difficulty will increase as you progress!
        </p>
        
        <Button 
          className="w-full bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-white py-6 text-lg"
          onClick={startNewGame}
          disabled={isStarting}
        >
          {isStarting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
          Start Challenge
        </Button>
      </div>
    );
  }

  if (game.status === 'COMPLETED') {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 pt-12">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <HeartCrack className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-4xl font-bold text-[#0B2545]">Game Over</h1>
        
        <div className="bg-white rounded-xl border border-slate-200 p-8 my-8">
          <p className="text-sm text-slate-500 mb-2 uppercase tracking-wider font-medium">Final Score</p>
          <p className="text-5xl font-bold text-[#0B2545] mb-8">{game.score}</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Questions Survived</p>
              <p className="text-2xl font-semibold text-[#0B2545]">{game.questions_survived}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Highest Streak</p>
              <p className="text-2xl font-semibold text-[#0B2545]">{game.highest_streak}</p>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-4">
          <Button onClick={startNewGame} className="flex-1 bg-[#D4A72C] hover:bg-[#D4A72C]/90">
            Play Again
          </Button>
          <Button variant="outline" onClick={() => router.push("/student/games")} className="flex-1">
            Back to Games
          </Button>
        </div>
      </div>
    );
  }

  const activeGame = game as ActiveSurvivalGame;
  
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 min-h-[calc(100vh-72px)] bg-slate-50/50">
      {/* Game Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between mb-8 shadow-sm">
        <div className="flex items-center space-x-6">
          {/* Score */}
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Score</p>
            <p className="text-2xl font-bold text-[#0B2545] flex items-center">
              <Trophy className="w-5 h-5 text-[#D4A72C] mr-2" />
              {game.score}
            </p>
          </div>
          
          {/* Streak */}
          <div className="pl-6 border-l border-slate-200">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Streak</p>
            <p className="text-xl font-bold text-orange-500 flex items-center">
              <Flame className="w-5 h-5 mr-1" />
              {game.current_streak}
            </p>
          </div>
        </div>
        
        {/* Lives & Timer */}
        <div className="flex items-center space-x-8">
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1 text-right">Lives</p>
            <div className="flex space-x-1">
              {[1, 2, 3].map((i) => (
                <Heart 
                  key={i} 
                  className={`w-6 h-6 ${i <= game.lives_remaining ? 'fill-red-500 text-red-500' : 'text-slate-200'}`} 
                />
              ))}
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Time Left</p>
            <p className={`text-2xl font-bold font-mono ${timeLeft <= 5 ? 'text-red-500' : 'text-[#0B2545]'}`}>
              00:{timeLeft.toString().padStart(2, '0')}
            </p>
          </div>
        </div>
      </div>
      
      {/* Question */}
      <div className="bg-white border border-slate-200 rounded-xl p-8 mb-8 shadow-sm relative overflow-hidden">
        
        {/* Feedback Overlay */}
        {feedback && (
          <div className={`absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm ${feedback === 'correct' ? 'text-green-500' : 'text-red-500'}`}>
            <div className="text-center animate-in zoom-in duration-300">
              <p className="text-5xl font-black uppercase tracking-widest">{feedback === 'correct' ? '+ POINTS' : '- 1 LIFE'}</p>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-semibold text-[#0B2545] bg-[#0B2545]/10 px-3 py-1 rounded-full">
            Question {game.questions_survived + 1}
          </span>
          
          <span className="text-sm font-semibold text-slate-500">
            Difficulty: {
              game.questions_survived < 5 ? 'Easy' : 
              game.questions_survived < 10 ? 'Medium' : 
              game.questions_survived < 20 ? 'Hard' : 'Advanced'
            }
          </span>
        </div>
        
        <h2 className="text-xl font-medium text-slate-800 mb-8 leading-relaxed">
          {activeGame.question_text}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['A', 'B', 'C', 'D'].map((opt) => {
            const optionText = activeGame[`option_${opt.toLowerCase()}` as keyof ActiveSurvivalGame];
            const isSelected = selectedOption === opt;
            
            return (
              <button
                key={opt}
                onClick={() => submitAnswer(opt)}
                disabled={isSubmitting || feedback !== null}
                className={`
                  w-full text-left p-4 rounded-xl border-2 transition-all flex items-center
                  ${isSelected 
                    ? 'border-[#0B2545] bg-[#0B2545]/5' 
                    : 'border-slate-200 hover:border-[#0B2545]/30 hover:bg-slate-50'}
                  ${(isSubmitting || feedback !== null) && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}
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
    </div>
  );
}
