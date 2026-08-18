"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Flag, Info, Play, Pause, AlertCircle, Target, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockMcqQuestions } from "@/lib/mock/dashboard-data";
import { cn } from "@/lib/utils";

export default function McqSessionPage() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  const question = mockMcqQuestions[currentIdx]!;
  const totalQuestions = mockMcqQuestions.length;
  const progress = ((currentIdx) / totalQuestions) * 100;

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
  };

  const handleCheckAnswer = () => {
    if (selectedOption === null) return;
    
    setIsAnswered(true);
    if (selectedOption === question.correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsSessionComplete(true);
    }
  };

  if (isSessionComplete) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto min-h-[80vh] flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
        <div className="bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center mb-6">
          <Trophy className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2 text-foreground">Session Complete!</h1>
        <p className="text-muted-foreground text-center mb-8">
          You've completed this practice session on {question?.subject || "General Knowledge"}.
        </p>
        
        <Card className="w-full border-border/60 bg-card mb-8 shadow-sm">
          <CardContent className="p-6 md:p-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Score</p>
                <p className="text-3xl font-bold text-primary">{Math.round((score/totalQuestions)*100)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Correct</p>
                <p className="text-2xl font-bold text-green-500">{score}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Incorrect</p>
                <p className="text-2xl font-bold text-destructive">{totalQuestions - score}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Time</p>
                <p className="text-2xl font-bold text-foreground">04:32</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex gap-4 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:w-48 h-12" onClick={() => window.location.reload()}>
            Practice Again
          </Button>
          <Link href="/student/mcq-study" className="flex-1 md:w-48">
            <Button className="w-full h-12">Return to Hub</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto min-h-[calc(100vh-4rem)] flex flex-col bg-background md:bg-transparent">
      
      {/* Session Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4 md:rounded-t-xl md:mt-4">
        <div className="flex items-center justify-between mb-4">
          <Link href="/student/mcq-study" className="text-muted-foreground hover:text-foreground transition-colors">
            <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex flex-col items-center">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{question.subject}</span>
            <span className="font-semibold">{question.topic}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
              <Flag className="h-4 w-4" />
            </Button>
            <div className="bg-muted px-3 py-1 rounded-full text-sm font-medium font-mono">
              12:45
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium whitespace-nowrap">Q {currentIdx + 1} / {totalQuestions}</span>
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Question Area */}
      <div className="flex-1 p-4 md:p-8 flex flex-col animate-in slide-in-from-right-4 duration-300" key={question.id}>
        <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full">
          
          <div className="flex justify-between items-start mb-6">
            <Badge variant="outline" className={cn(
              "font-normal",
              question.difficulty === "Easy" ? "text-green-500 border-green-500/30" : 
              question.difficulty === "Medium" ? "text-amber-500 border-amber-500/30" : "text-destructive border-destructive/30"
            )}>
              {question.difficulty}
            </Badge>
          </div>

          <h2 className="text-xl md:text-2xl font-medium leading-relaxed mb-8 text-foreground">
            {question.question}
          </h2>

          <div className="space-y-3">
            {question.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = idx === question.correctAnswer;
              
              let stateClass = "border-border hover:border-primary/50 hover:bg-muted/50";
              
              if (isAnswered) {
                if (isCorrect) {
                  stateClass = "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
                } else if (isSelected && !isCorrect) {
                  stateClass = "border-destructive bg-destructive/10 text-destructive";
                } else {
                  stateClass = "border-border opacity-50";
                }
              } else if (isSelected) {
                stateClass = "border-primary bg-primary/5 ring-1 ring-primary";
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswered}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4",
                    stateClass
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full border flex-shrink-0 flex items-center justify-center text-xs font-medium mt-0.5",
                    isAnswered && isCorrect ? "bg-green-500 border-green-500 text-white" :
                    isAnswered && isSelected && !isCorrect ? "bg-destructive border-destructive text-white" :
                    isSelected ? "border-primary text-primary" : "border-muted-foreground/30 text-muted-foreground"
                  )}>
                    {isAnswered && isCorrect ? <CheckCircle2 className="h-4 w-4" /> : 
                     isAnswered && isSelected && !isCorrect ? <XCircle className="h-4 w-4" /> : 
                     String.fromCharCode(65 + idx)}
                  </div>
                  <span className="text-base leading-relaxed">{option}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {isAnswered && (
            <div className="mt-8 p-5 bg-primary/5 border border-primary/20 rounded-xl animate-in slide-in-from-bottom-4 fade-in duration-300">
              <div className="flex items-center gap-2 text-primary font-medium mb-2">
                <Info className="h-5 w-5" />
                <span>Explanation</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {question.explanation}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Session Footer */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border p-4 md:rounded-b-xl flex justify-between items-center">
        <Button variant="ghost" className="text-muted-foreground">
          Pause Session
        </Button>
        
        {!isAnswered ? (
          <Button 
            size="lg" 
            onClick={handleCheckAnswer} 
            disabled={selectedOption === null}
            className="px-8"
          >
            Check Answer
          </Button>
        ) : (
          <Button 
            size="lg" 
            onClick={handleNext}
            className="px-8 gap-2"
          >
            {currentIdx < totalQuestions - 1 ? "Next Question" : "Finish Session"} <Target className="h-4 w-4" />
          </Button>
        )}
      </div>
      
    </div>
  );
}

// Dummy Trophy component since it's not imported above
function Trophy(props: any) {
  return <Target {...props} />;
}
