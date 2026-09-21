"use client";

import { useEffect, useRef, useState } from "react";
import { practiceApi, Question, AttemptState } from "@/lib/api/practice";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Star, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { practiceErrorMessage, ANSWER_FAILED_MESSAGE } from "@/lib/practice-errors";

interface RevealState {
  correct_option: string;
  explanation?: string;
}

interface StudyQuestionBrowserProps {
  sessionId: number;
  questions: Question[];
  // Saved state from a resumed session, so a refresh keeps answered
  // questions answered.
  initialAttempts?: AttemptState[];
  initialIndex?: number;
  savedQuestionIds: Record<number, boolean>;
  onToggleSave: (questionId: number) => void;
}

export function StudyQuestionBrowser({
  sessionId,
  questions,
  initialAttempts,
  initialIndex = 0,
  savedQuestionIds,
  onToggleSave,
}: StudyQuestionBrowserProps) {
  const [currentIdx, setCurrentIdx] = useState(Math.min(initialIndex, Math.max(questions.length - 1, 0)));
  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    (initialAttempts || []).forEach(a => { if (a.selected_option) map[a.question_id] = a.selected_option; });
    return map;
  });
  const [revealed, setRevealed] = useState<Record<number, RevealState>>(() => {
    const map: Record<number, RevealState> = {};
    (initialAttempts || []).forEach(a => {
      if (a.is_viewed && a.correct_option) map[a.question_id] = { correct_option: a.correct_option, explanation: a.explanation };
    });
    return map;
  });
  const [verdict, setVerdict] = useState<Record<number, boolean>>(() => {
    const map: Record<number, boolean> = {};
    (initialAttempts || []).forEach(a => { if (a.selected_option && a.is_correct !== null) map[a.question_id] = !!a.is_correct; });
    return map;
  });
  const [revealing, setRevealing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Sync guard: two clicks in one tick must send one request.
  const sending = useRef(false);

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
    if (currentReveal || sending.current) return; // already revealed/answered, or a save is in flight
    sending.current = true;
    const qid = currentQ.id;
    setAnswers(prev => ({ ...prev, [qid]: opt }));
    setSaving(true);
    setError(null);
    try {
      const result = await practiceApi.saveAnswer(sessionId, {
        question_id: qid,
        selected_option: opt,
        is_marked_for_review: false,
      });
      if (result.selected_option) setAnswers(prev => ({ ...prev, [qid]: result.selected_option! }));
      if (result.is_correct !== undefined) setVerdict(prev => ({ ...prev, [qid]: !!result.is_correct }));
      if (result.correct_option) {
        setRevealed(prev => ({ ...prev, [qid]: { correct_option: result.correct_option!, explanation: result.explanation } }));
      }
    } catch (e) {
      console.error(e);
      // Not saved: leave the question unlocked with a Retry, never show a
      // verdict the server didn't give.
      setError(practiceErrorMessage(e, "answer") || ANSWER_FAILED_MESSAGE);
    } finally {
      sending.current = false;
      setSaving(false);
    }
  };

  const handleShowAnswer = async () => {
    if (currentReveal || revealing) return;
    setRevealing(true);
    setError(null);
    try {
      const result = await practiceApi.reveal(sessionId, currentQ.id);
      setRevealed(prev => ({ ...prev, [currentQ.id]: result }));
    } catch (e) {
      console.error(e);
      setError(practiceErrorMessage(e, "reveal"));
    } finally {
      setRevealing(false);
    }
  };

  const goTo = (idx: number) => {
    setError(null);
    setCurrentIdx(idx);
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

        {currentReveal && currentAnswer && verdict[currentQ.id] !== undefined && (
          <div
            className={`mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${
              verdict[currentQ.id]
                ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
            }`}
            role="status"
          >
            {verdict[currentQ.id] ? (
              <><CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Correct Answer</>
            ) : (
              <><XCircle className="w-4 h-4" aria-hidden="true" /> Incorrect Answer</>
            )}
          </div>
        )}

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
                disabled={!!currentReveal || saving}
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

        {error && (
          <div className="mt-4 flex items-center gap-2 text-sm font-medium text-red-600" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <button
              type="button"
              className="underline font-bold"
              onClick={() => (currentAnswer ? handleSelect(currentAnswer) : handleShowAnswer())}
            >
              Retry
            </button>
          </div>
        )}

        {!currentReveal && (
          <Button variant="outline" size="sm" className="mt-6" onClick={handleShowAnswer} disabled={revealing || saving}>
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
          onClick={() => goTo(Math.max(0, currentIdx - 1))}
          disabled={currentIdx === 0}
          className="h-12 px-6 rounded-[10px]"
        >
          <ChevronLeft className="w-4 h-4 mr-2" /> Previous
        </Button>
        <Button
          onClick={() => goTo(Math.min(questions.length - 1, currentIdx + 1))}
          disabled={currentIdx === questions.length - 1}
          className="h-12 px-6 rounded-[10px] bg-primary text-primary-foreground hover:bg-[#163E6B]"
        >
          Next <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
