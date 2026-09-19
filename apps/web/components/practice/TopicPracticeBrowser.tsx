"use client";

import { useEffect, useMemo, useState } from "react";
import { practiceApi, Question, AttemptState } from "@/lib/api/practice";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Star, CheckCircle2, XCircle, AlertCircle, Flag } from "lucide-react";

interface QuestionState {
  selected_option?: string;
  is_correct?: boolean | null;
  is_viewed: boolean;
  correct_option?: string;
  explanation?: string;
  error?: string;
  saving?: boolean;
}

interface TopicPracticeBrowserProps {
  sessionId: number;
  questions: Question[];
  initialAttempts?: AttemptState[];
  initialIndex?: number;
  savedQuestionIds: Record<number, boolean>;
  onToggleSave: (questionId: number) => void;
  onFinish: () => void | Promise<void>;
}

const PAGE_SIZE_OPTIONS = [10, 20] as const;
const PAGE_SIZE_STORAGE_KEY = "loksewa.topicPractice.pageSize";

function buildInitialState(attempts?: AttemptState[]): Record<number, QuestionState> {
  const map: Record<number, QuestionState> = {};
  (attempts || []).forEach(a => {
    map[a.question_id] = {
      selected_option: a.selected_option || undefined,
      is_correct: a.is_correct,
      is_viewed: a.is_viewed,
      correct_option: a.correct_option,
      explanation: a.explanation,
    };
  });
  return map;
}

export function TopicPracticeBrowser({
  sessionId,
  questions,
  initialAttempts,
  initialIndex = 0,
  savedQuestionIds,
  onToggleSave,
  onFinish,
}: TopicPracticeBrowserProps) {
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState(0);
  const [state, setState] = useState<Record<number, QuestionState>>(() => buildInitialState(initialAttempts));
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
      if (stored === 10 || stored === 20) setPageSize(stored);
    } catch {
      // localStorage unavailable — keep default
    }
  }, []);

  useEffect(() => {
    // Land on the page containing the first unanswered/unviewed question so
    // resuming a session doesn't drop the student back at question 1.
    const page = Math.floor(Math.min(initialIndex, Math.max(questions.length - 1, 0)) / pageSize);
    setCurrentPage(page);
    // Only recompute when the underlying question set changes, not on every pageSize tweak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length]);

  const totalPages = Math.max(1, Math.ceil(questions.length / pageSize));
  const pageStart = currentPage * pageSize;
  const pageQuestions = questions.slice(pageStart, pageStart + pageSize);

  const stats = useMemo(() => {
    let answered = 0, correct = 0, wrong = 0;
    questions.forEach(q => {
      const s = state[q.id];
      if (s?.selected_option) {
        answered++;
        if (s.is_correct) correct++; else wrong++;
      }
    });
    return {
      answered,
      correct,
      wrong,
      accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0,
    };
  }, [state, questions]);

  const changePageSize = (size: number) => {
    setPageSize(size);
    setCurrentPage(0);
    try {
      localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size));
    } catch {
      // ignore — per-viewer convenience only
    }
  };

  const handleSelect = async (q: Question, opt: string) => {
    const existing = state[q.id];
    if (existing?.is_viewed) return; // already evaluated/revealed — locked in
    setState(prev => ({
      ...prev,
      [q.id]: { ...prev[q.id], is_viewed: false, selected_option: opt, saving: true, error: undefined },
    }));
    try {
      const result = await practiceApi.saveAnswer(sessionId, {
        question_id: q.id,
        selected_option: opt,
        is_marked_for_review: false,
      });
      setState(prev => ({
        ...prev,
        [q.id]: {
          selected_option: opt,
          is_correct: result.is_correct ?? null,
          is_viewed: true,
          correct_option: result.correct_option,
          explanation: result.explanation,
          saving: false,
        },
      }));
    } catch (e) {
      console.error(e);
      setState(prev => ({
        ...prev,
        [q.id]: { ...prev[q.id], is_viewed: false, selected_option: opt, saving: false, error: "Could not save your answer. Please try again." },
      }));
    }
  };

  const handleShowAnswer = async (q: Question) => {
    const existing = state[q.id];
    if (existing?.is_viewed || existing?.saving) return;
    setState(prev => ({ ...prev, [q.id]: { ...prev[q.id], is_viewed: false, saving: true, error: undefined } }));
    try {
      const result = await practiceApi.reveal(sessionId, q.id);
      setState(prev => ({
        ...prev,
        [q.id]: {
          ...prev[q.id],
          is_viewed: true,
          correct_option: result.correct_option,
          explanation: result.explanation,
          saving: false,
        },
      }));
    } catch (e) {
      console.error(e);
      setState(prev => ({
        ...prev,
        [q.id]: { ...prev[q.id], is_viewed: false, saving: false, error: "Could not load the answer. Please try again." },
      }));
    }
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await onFinish();
    } finally {
      setFinishing(false);
    }
  };

  if (questions.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No questions here.</div>;
  }

  const isLastPage = currentPage === totalPages - 1;

  return (
    <div className="max-w-[860px] mx-auto space-y-6 pb-8">
      {/* Progress + page-size controls */}
      <div className="bg-card rounded-[16px] border border-border shadow-sm p-4 md:p-5 sticky top-2 z-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-sm font-bold text-primary dark:text-foreground">
              Questions {pageStart + 1}–{Math.min(pageStart + pageSize, questions.length)} of {questions.length}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Per page:</span>
            {PAGE_SIZE_OPTIONS.map(size => (
              <button
                key={size}
                type="button"
                onClick={() => changePageSize(size)}
                className={`px-2.5 py-1 rounded-full border ${pageSize === size ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-lg font-black text-primary dark:text-foreground">{stats.answered}/{questions.length}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Answered</div>
          </div>
          <div>
            <div className="text-lg font-black text-green-600">{stats.correct}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Correct</div>
          </div>
          <div>
            <div className="text-lg font-black text-red-600">{stats.wrong}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Wrong</div>
          </div>
          <div>
            <div className="text-lg font-black text-[#D4A72C]">{stats.accuracy}%</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Accuracy</div>
          </div>
        </div>
      </div>

      {/* Continuous scroll of questions for this page */}
      {pageQuestions.map((q, idx) => {
        const qState = state[q.id];
        const isSaved = !!savedQuestionIds[q.id];
        const globalNumber = pageStart + idx + 1;
        const isEvaluated = !!qState?.is_viewed;

        return (
          <div key={q.id} className="bg-card rounded-[16px] border border-border shadow-sm p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm font-bold text-muted-foreground tracking-widest uppercase">
                Question {globalNumber}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleSave(q.id)}
                className={isSaved ? "text-[#D4A72C]" : "text-muted-foreground"}
              >
                <Star className="w-4 h-4 mr-2" fill={isSaved ? "currentColor" : "none"} />
                {isSaved ? "Saved" : "Save"}
              </Button>
            </div>

            <h2 className="text-xl font-medium text-primary dark:text-foreground leading-relaxed mb-8">
              {q.text}
            </h2>

            {isEvaluated && qState?.selected_option && (
              <div
                className={`mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${
                  qState.is_correct
                    ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                    : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                }`}
                role="status"
              >
                {qState.is_correct ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Correct Answer
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" aria-hidden="true" /> Incorrect Answer
                  </>
                )}
              </div>
            )}

            <fieldset className="space-y-4" disabled={qState?.saving} role="radiogroup">
              <legend className="sr-only">Answer options for question {globalNumber}</legend>
              {(['a', 'b', 'c', 'd'] as const).map(opt => {
                const optionText = q[`option_${opt}`];
                if (!optionText) return null;
                const isSelected = qState?.selected_option === opt;
                const isCorrectOption = qState?.correct_option?.toLowerCase() === opt;

                let cls = "border-border bg-card hover:border-border hover:bg-muted";
                let icon = null;
                let stateLabel = "";
                if (isEvaluated) {
                  if (isCorrectOption) {
                    cls = "border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-900/50";
                    icon = <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto shrink-0" aria-hidden="true" />;
                    stateLabel = " — correct answer";
                  } else if (isSelected) {
                    cls = "border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50";
                    icon = <XCircle className="w-4 h-4 text-red-600 ml-auto shrink-0" aria-hidden="true" />;
                    stateLabel = " — your answer, incorrect";
                  }
                } else if (isSelected) {
                  cls = "border-[#0B2545] bg-muted";
                }

                return (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`Option ${opt.toUpperCase()}: ${optionText}${stateLabel}`}
                    onClick={() => handleSelect(q, opt)}
                    disabled={isEvaluated}
                    className={`w-full flex items-center p-4 rounded-[12px] border-2 transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2545] focus-visible:ring-offset-2 ${cls} ${isEvaluated ? "cursor-default" : ""}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 font-bold text-sm shrink-0 ${
                      isSelected && !isEvaluated ? "bg-primary text-primary-foreground text-white" : "bg-muted/80 text-muted-foreground"
                    }`}>
                      {opt.toUpperCase()}
                    </div>
                    <span className="text-[15px] font-medium text-primary dark:text-foreground">{optionText}</span>
                    {icon}
                  </button>
                );
              })}
            </fieldset>

            {qState?.error && (
              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{qState.error}</span>
                {qState.selected_option ? (
                  <button
                    type="button"
                    className="underline font-bold"
                    onClick={() => handleSelect(q, qState.selected_option!)}
                  >
                    Retry
                  </button>
                ) : (
                  <button type="button" className="underline font-bold" onClick={() => handleShowAnswer(q)}>
                    Retry
                  </button>
                )}
              </div>
            )}

            {!isEvaluated && (
              <Button variant="outline" size="sm" className="mt-6" onClick={() => handleShowAnswer(q)} disabled={qState?.saving}>
                {qState?.saving ? "Loading..." : "View Answer"}
              </Button>
            )}

            {isEvaluated && qState?.explanation && (
              <p className="mt-6 text-[13.5px] text-muted-foreground bg-muted/40 rounded-[10px] p-4">
                <strong className="text-primary dark:text-foreground">Explanation: </strong>{qState.explanation}
              </p>
            )}
          </div>
        );
      })}

      {/* Page navigation */}
      <div className="flex justify-between items-center bg-card p-4 rounded-[16px] border border-border shadow-sm">
        <Button
          variant="outline"
          onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
          disabled={currentPage === 0}
          className="h-12 px-6 rounded-[10px]"
        >
          <ChevronLeft className="w-4 h-4 mr-2" /> Previous
        </Button>
        <span className="text-sm font-bold text-muted-foreground">
          Page {currentPage + 1} of {totalPages}
        </span>
        {isLastPage ? (
          <Button
            onClick={handleFinish}
            disabled={finishing}
            className="h-12 px-6 rounded-[10px] bg-primary text-primary-foreground hover:bg-[#163E6B]"
          >
            <Flag className="w-4 h-4 mr-2" /> {finishing ? "Finishing..." : "Finish Practice"}
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            className="h-12 px-6 rounded-[10px] bg-primary text-primary-foreground hover:bg-[#163E6B]"
          >
            Next Page <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
