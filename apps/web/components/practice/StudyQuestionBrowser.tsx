"use client";

import { useEffect, useState } from "react";
import { practiceApi, Question } from "@/lib/api/practice";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Star, CheckCircle2, XCircle } from "lucide-react";

interface RevealState {
  correct_option: string;
  explanation?: string;
}

interface StudyQuestionBrowserProps {
  sessionId: number;
  questions: Question[];
  initialIndex?: number;
  savedQuestionIds: Record<number, boolean>;
  onToggleSave: (questionId: number) => void;
}

export function StudyQuestionBrowser({
  sessionId,
  questions,
  initialIndex = 0,
  savedQuestionIds,
  onToggleSave,
}: StudyQuestionBrowserProps) {
  const [currentIdx, setCurrentIdx] = useState(Math.min(initialIndex, Math.max(questions.length - 1, 0)));
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, RevealState>>({});
  const [revealing, setRevealing] = useState(false);

  const currentQ = questions[currentIdx];

  useEffect(() => {
    if (!currentQ) return;
    practiceApi.markViewed(sessionId, currentQ.id).catch(e => console.error(e));
  }, [sessionId, currentQ]);

  if (!currentQ) {
    return <div className="p-8 text-center text-muted-foreground">No questions here.</div>;
  }

  const currentReveal = revealed[currentQ.id];
  const currentAnswer = answers[currentQ.id];

  const handleSelect = async (opt: string) => {
    if (currentReveal) return; // already revealed/answered — no re-scoring on re-click
    setAnswers(prev => ({ ...prev, [currentQ.id]: opt }));
    try {
      const result = await practiceApi.saveAnswer(sessionId, {
        question_id: currentQ.id,
        selected_option: opt,
        is_marked_for_review: false,
      });
      if (result.correct_option) {
        setRevealed(prev => ({ ...prev, [currentQ.id]: { correct_option: result.correct_option!, explanation: result.explanation } }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleShowAnswer = async () => {
    if (currentReveal || revealing) return;
    setRevealing(true);
    try {
      const result = await practiceApi.reveal(sessionId, currentQ.id);
      setRevealed(prev => ({ ...prev, [currentQ.id]: result }));
    } catch (e) {
      console.error(e);
    } finally {
      setRevealing(false);
    }
  };

  const isSaved = !!savedQuestionIds[currentQ.id];

  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      <div className="bg-card rounded-[16px] border border-border shadow-sm p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <span className="text-sm font-bold text-muted-foreground tracking-widest uppercase">
            Question {currentIdx + 1} of {questions.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleSave(currentQ.id)}
            className={isSaved ? "text-[#D4A72C]" : "text-muted-foreground"}
          >
            <Star className="w-4 h-4 mr-2" fill={isSaved ? "currentColor" : "none"} />
            {isSaved ? "Saved" : "Save for Later"}
          </Button>
        </div>

        <h2 className="text-xl font-medium text-primary dark:text-foreground leading-relaxed mb-8">
          {currentQ.text}
        </h2>

        <div className="space-y-4">
          {(['a', 'b', 'c', 'd'] as const).map(opt => {
            const optionText = currentQ[`option_${opt}`];
            if (!optionText) return null;
            const isSelected = currentAnswer === opt;
            const isCorrectOption = currentReveal?.correct_option?.toLowerCase() === opt;

            let cls = "border-border bg-card hover:border-border hover:bg-muted";
            let icon = null;
            if (currentReveal) {
              if (isCorrectOption) {
                cls = "border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-900/50";
                icon = <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto shrink-0" />;
              } else if (isSelected) {
                cls = "border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50";
                icon = <XCircle className="w-4 h-4 text-red-600 ml-auto shrink-0" />;
              }
            } else if (isSelected) {
              cls = "border-[#0B2545] bg-muted";
            }

            return (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                disabled={!!currentReveal}
                className={`w-full flex items-center p-4 rounded-[12px] border-2 transition-all text-left ${cls} ${currentReveal ? "cursor-default" : ""}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 font-bold text-sm shrink-0 ${
                  isSelected && !currentReveal ? "bg-primary text-primary-foreground text-white" : "bg-muted/80 text-muted-foreground"
                }`}>
                  {opt.toUpperCase()}
                </div>
                <span className="text-[15px] font-medium text-primary dark:text-foreground">{optionText}</span>
                {icon}
              </button>
            );
          })}
        </div>

        {!currentReveal && (
          <Button variant="outline" size="sm" className="mt-6" onClick={handleShowAnswer} disabled={revealing}>
            {revealing ? "Loading..." : "Show Answer"}
          </Button>
        )}

        {currentReveal?.explanation && (
          <p className="mt-6 text-[13.5px] text-muted-foreground bg-muted/40 rounded-[10px] p-4">
            <strong className="text-primary dark:text-foreground">Explanation: </strong>{currentReveal.explanation}
          </p>
        )}
      </div>

      <div className="flex justify-between items-center bg-card p-4 rounded-[16px] border border-border shadow-sm">
        <Button
          variant="outline"
          onClick={() => setCurrentIdx(p => Math.max(0, p - 1))}
          disabled={currentIdx === 0}
          className="h-12 px-6 rounded-[10px]"
        >
          <ChevronLeft className="w-4 h-4 mr-2" /> Previous
        </Button>
        <Button
          onClick={() => setCurrentIdx(p => Math.min(questions.length - 1, p + 1))}
          disabled={currentIdx === questions.length - 1}
          className="h-12 px-6 rounded-[10px] bg-primary text-primary-foreground hover:bg-[#163E6B]"
        >
          Next <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
