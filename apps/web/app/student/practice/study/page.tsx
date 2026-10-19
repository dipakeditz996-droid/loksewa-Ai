"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Loader2, RotateCcw, Sparkles, AlertCircle, ChevronRight as ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { practiceApi, StudyPage } from "@/lib/api/practice";
import { syllabusApi, Subject } from "@/lib/api/syllabus";
import { TopicPracticeBrowser, QuestionSkeleton, readStoredPageSize } from "@/components/practice/TopicPracticeBrowser";
import { usePracticeExams, useSavedQuestions, practiceResultKey } from "@/lib/practice-hooks";
import { useOptionalStudentContext } from "@/contexts/StudentContext";
import { ExamListStatus } from "@/components/practice/ExamListStatus";
import { practiceError, PracticeError } from "@/lib/practice-errors";

interface TopicOption {
  id: number;
  name: string;
  title: string;
  chapter_id: number;
}

export default function TopicStudyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const studentCtx = useOptionalStudentContext();
  const courseId = studentCtx?.activeCourse?.id ?? null;

  // 1. Exam data flow
  const examsQuery = usePracticeExams(courseId);
  const exams = useMemo(() => examsQuery.data ?? [], [examsQuery.data]);
  const isLoadingExams = examsQuery.isPending;

  const { savedIds: savedQuestionIds, toggle: toggleSave } = useSavedQuestions();
  const [exam, setExam] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [shuffleQuestions, setShuffleQuestions] = useState(false);

  // 2. Explicit loading & error states for dependent selections
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [subjectOptions, setSubjectOptions] = useState<Subject[]>([]);

  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [topicOptions, setTopicOptions] = useState<TopicOption[]>([]);

  // Request sequence IDs to guard against rapid switching & out-of-order responses
  const examRequestIdRef = useRef(0);
  const subjectRequestIdRef = useRef(0);

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<PracticeError | null>(null);
  const [session, setSession] = useState<StudyPage | null>(null);

  // Load subjects for a newly selected exam
  const loadSubjectsForExam = useCallback(
    async (examId: string) => {
      const currentReqId = ++examRequestIdRef.current;
      if (!examId) {
        setSubjectOptions([]);
        setIsLoadingSubjects(false);
        setSubjectsError(null);
        return;
      }

      setIsLoadingSubjects(true);
      setSubjectsError(null);

      // Fast-path: reuse subjects already present in the authorized exams payload
      const matchedExam = exams.find((e) => e.id.toString() === examId);
      if (matchedExam && Array.isArray(matchedExam.subjects) && matchedExam.subjects.length > 0) {
        if (examRequestIdRef.current === currentReqId) {
          setSubjectOptions(matchedExam.subjects);
          setIsLoadingSubjects(false);
        }
        return;
      }

      // If matched exam has empty subjects in prefetch or needs explicit fetch
      try {
        const data = await syllabusApi.getSubjects(examId);
        if (examRequestIdRef.current === currentReqId) {
          setSubjectOptions(data || []);
        }
      } catch (err: unknown) {
        if (examRequestIdRef.current === currentReqId) {
          const msg = err instanceof Error ? err.message : "Failed to load subjects. Please try again.";
          setSubjectsError(msg);
          setSubjectOptions([]);
        }
      } finally {
        if (examRequestIdRef.current === currentReqId) {
          setIsLoadingSubjects(false);
        }
      }
    },
    [exams]
  );

  // Load topics for a newly selected subject
  const loadTopicsForSubject = useCallback(
    async (subjectId: string, availableSubjects: Subject[]) => {
      const currentReqId = ++subjectRequestIdRef.current;
      if (!subjectId) {
        setTopicOptions([]);
        setIsLoadingTopics(false);
        setTopicsError(null);
        return;
      }

      setIsLoadingTopics(true);
      setTopicsError(null);

      // Fast-path: extract chapters/units from the active subject if already loaded
      const matchedSubject = availableSubjects.find((s) => s.id.toString() === subjectId);
      const rawChapters = matchedSubject?.chapters ?? matchedSubject?.units;
      if (Array.isArray(rawChapters) && rawChapters.length > 0) {
        const flattened: TopicOption[] = [];
        for (const c of rawChapters) {
          if (Array.isArray(c.topics) && c.topics.length > 0) {
            for (const t of c.topics) {
              flattened.push({
                id: t.id,
                name: t.name || (t as { title?: string }).title || "Topic",
                title: t.name || (t as { title?: string }).title || "Topic",
                chapter_id: c.id,
              });
            }
          } else {
            flattened.push({
              id: c.id,
              name: c.title || (c as { name?: string }).name || "Unit",
              title: c.title || (c as { name?: string }).name || "Unit",
              chapter_id: c.id,
            });
          }
        }
        if (subjectRequestIdRef.current === currentReqId) {
          setTopicOptions(flattened);
          setIsLoadingTopics(false);
        }
        return;
      }

      // If not embedded, fetch topics from the endpoint
      try {
        const data = await syllabusApi.getTopics(subjectId);
        if (subjectRequestIdRef.current === currentReqId) {
          const mapped: TopicOption[] = (data || []).map((t) => ({
            id: t.id,
            name: t.name || (t as { title?: string }).title || "Topic",
            title: t.name || (t as { title?: string }).title || "Topic",
            chapter_id: t.chapter_id ?? t.id,
          }));
          setTopicOptions(mapped);
        }
      } catch (err: unknown) {
        if (subjectRequestIdRef.current === currentReqId) {
          const msg = err instanceof Error ? err.message : "Failed to load topics. Please try again.";
          setTopicsError(msg);
          setTopicOptions([]);
        }
      } finally {
        if (subjectRequestIdRef.current === currentReqId) {
          setIsLoadingTopics(false);
        }
      }
    },
    []
  );

  // Auto-select initial exam if available
  useEffect(() => {
    if (!exam && exams.length > 0) {
      const examWithSubjects = exams.find((e) => (e.subjects?.length ?? 0) > 0) ?? exams[0];
      if (examWithSubjects?.id) {
        const idStr = examWithSubjects.id.toString();
        setExam(idStr);
        loadSubjectsForExam(idStr);
      }
    }
  }, [exams, exam, loadSubjectsForExam]);

  // Handle Exam change
  const handleExamChange = (newExamId: string) => {
    setExam(newExamId);
    setSubject("");
    setTopic("");
    setTopicOptions([]);
    setTopicsError(null);
    loadSubjectsForExam(newExamId);
  };

  // Handle Subject change
  const handleSubjectChange = (newSubjectId: string) => {
    setSubject(newSubjectId);
    setTopic("");
    loadTopicsForSubject(newSubjectId, subjectOptions);
  };

  const activeExam = useMemo(() => exams.find((e) => e.id.toString() === exam), [exam, exams]);
  const activeSubject = useMemo(
    () => subjectOptions.find((s) => s.id.toString() === subject) || activeExam?.subjects?.find((s) => s.id.toString() === subject),
    [activeExam, subject, subjectOptions]
  );
  const activeUnit = useMemo(() => topicOptions.find((t) => t.id.toString() === topic), [topicOptions, topic]);

  const handleStart = async (restart = false) => {
    if (!topic || starting) return;
    setStarting(true);
    setError(null);
    try {
      const data = await practiceApi.startStudy({
        topic,
        subject,
        exam,
        course: courseId,
        restart,
        shuffle_questions: shuffleQuestions,
        page_size: readStoredPageSize(),
      });
      queryClient.removeQueries({ queryKey: ["practice-study-page"] });
      setShuffleQuestions(Boolean(data.session.shuffle_questions));
      setSession(data);
    } catch (e) {
      console.error(e);
      setError(practiceError(e, "start"));
    } finally {
      setStarting(false);
    }
  };

  // First load: skeleton screen when launching session
  if (starting && !session) {
    const topicLabel = activeUnit?.name || "Topic";
    return (
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6" aria-busy="true">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-primary dark:text-foreground">
            {topicLabel}
          </h1>
          <p className="text-muted-foreground text-[14px]">Loading your questions…</p>
        </div>
        <div className="max-w-[860px] mx-auto">
          <QuestionSkeleton count={3} />
        </div>
      </div>
    );
  }

  // Active study session
  if (session) {
    const topicName = activeUnit?.name || "Topic";
    return (
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6 animate-in fade-in-50 duration-500">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <nav className="flex items-center flex-wrap gap-1 text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              {[activeExam?.title, activeSubject?.name, activeUnit?.title, "Topic-wise Practice"]
                .filter(Boolean)
                .map((crumb, i, arr) => (
                  <span key={i} className="flex items-center gap-1">
                    {crumb}
                    {i < arr.length - 1 && <ChevronRightIcon className="w-3 h-3" />}
                  </span>
                ))}
            </nav>
            <h1 className="text-[22px] font-bold tracking-tight text-primary dark:text-foreground">
              {topicName}
            </h1>
            <p className="text-muted-foreground text-[14px]">
              Browse freely — no timer, no fixed count. Answer if you&apos;re confident, or View Answer to just learn it.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Shuffle {session.session.shuffle_questions ? "On" : "Off"}
            </span>
            {session.resumed && (
              <span className="text-xs font-bold uppercase tracking-wider text-[#D4A72C] bg-[#D4A72C]/10 px-3 py-1.5 rounded-full">
                Resumed
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => handleStart(true)}>
              <RotateCcw className="w-4 h-4 mr-2" /> Start Over
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSession(null)}>
              Change Topic
            </Button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 font-medium" role="alert">
            {error.message}
          </p>
        )}

        {starting ? (
          <div className="max-w-[860px] mx-auto">
            <QuestionSkeleton count={3} />
          </div>
        ) : (
          <TopicPracticeBrowser
            key={session.session.id}
            initial={session}
            savedQuestionIds={savedQuestionIds}
            onToggleSave={toggleSave}
            onFinish={async () => {
              const finished = await practiceApi.submitSession(session.session.id, 0);
              queryClient.setQueryData(practiceResultKey(session.session.id), finished);
              router.push(`/student/practice/results/${session.session.id}`);
            }}
          />
        )}
      </div>
    );
  }

  // Pre-conditions for Start Studying button
  const canStart = Boolean(
    exam &&
    subject &&
    topic &&
    !isLoadingExams &&
    !isLoadingSubjects &&
    !isLoadingTopics &&
    !starting
  );

  return (
    <div className="p-4 md:p-8 max-w-[700px] mx-auto space-y-8 animate-in fade-in-50 duration-500">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-primary dark:text-foreground flex items-center gap-3">
          <Sparkles className="w-7 h-7 text-[#D4A72C]" /> Study by Topic
        </h1>
        <p className="text-muted-foreground mt-1 text-[15px]">
          Pick a topic and go through its questions at your own pace. No timer, no required count, no exam pressure.
        </p>
      </div>

      <div className="bg-card rounded-[16px] border border-border shadow-sm p-6 md:p-8 space-y-5">
        {/* 1. EXAM SELECTION */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="practice-exam-select" className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider block">
              Exam
            </label>
            {isLoadingExams && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-primary dark:text-[#D4A72C]" aria-live="polite">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading exams…
              </span>
            )}
          </div>
          <select
            id="practice-exam-select"
            value={exam}
            onChange={(e) => handleExamChange(e.target.value)}
            disabled={isLoadingExams}
            className={`w-full h-12 px-3 bg-muted border rounded-[10px] text-[15px] font-medium text-foreground outline-none transition-colors ${
              isLoadingExams
                ? "border-primary/50 dark:border-[#D4A72C]/50 opacity-80 cursor-wait"
                : "border-border focus:border-primary focus:ring-1 focus:ring-primary dark:focus:border-[#D4A72C] dark:focus:ring-[#D4A72C]"
            }`}
          >
            {isLoadingExams ? (
              <option value="">Loading exams…</option>
            ) : exams.length === 0 ? (
              <option value="">No exams available</option>
            ) : (
              <option value="">Select an exam</option>
            )}
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.display_name ?? e.title}
              </option>
            ))}
          </select>
          <ExamListStatus
            isError={examsQuery.isError}
            isEmpty={!isLoadingExams && !examsQuery.isError && exams.length === 0}
            onRetry={() => examsQuery.refetch()}
          />
        </div>

        {/* 2. SUBJECT SELECTION */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="practice-subject-select" className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider block">
              Subject
            </label>
            {isLoadingSubjects && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-primary dark:text-[#D4A72C]" aria-live="polite">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading subjects…
              </span>
            )}
          </div>
          <select
            id="practice-subject-select"
            value={subject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            disabled={!exam || isLoadingSubjects || (subjectOptions.length === 0 && !isLoadingSubjects)}
            className={`w-full h-12 px-3 bg-muted border rounded-[10px] text-[15px] font-medium text-foreground outline-none transition-colors ${
              isLoadingSubjects
                ? "border-primary/50 dark:border-[#D4A72C]/50 opacity-80 cursor-wait"
                : !exam || (subjectOptions.length === 0 && !isLoadingSubjects)
                ? "opacity-60 cursor-not-allowed border-border"
                : "border-border focus:border-primary focus:ring-1 focus:ring-primary dark:focus:border-[#D4A72C] dark:focus:ring-[#D4A72C]"
            }`}
          >
            <option value="">
              {!exam
                ? "Select an exam first"
                : isLoadingSubjects
                ? "Loading subjects…"
                : subjectOptions.length === 0
                ? "No subjects available for this exam"
                : "Select a subject"}
            </option>
            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id.toString()}>
                {s.name || ("title" in s ? String((s as { title?: string }).title) : "") || "Subject"}
              </option>
            ))}
          </select>

          {subjectsError && (
            <div className="flex items-center gap-2 text-sm text-red-600 font-medium" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{subjectsError}</span>
              <button
                type="button"
                className="underline font-bold"
                onClick={() => loadSubjectsForExam(exam)}
              >
                Retry
              </button>
            </div>
          )}
          {!isLoadingSubjects && exam && subjectOptions.length === 0 && !subjectsError && (
            <p className="text-xs text-muted-foreground font-medium">
              No subjects are configured for this examination yet.
            </p>
          )}
        </div>

        {/* 3. TOPIC SELECTION */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="practice-topic-select" className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider block">
              Topic
            </label>
            {isLoadingTopics && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-primary dark:text-[#D4A72C]" aria-live="polite">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading topics…
              </span>
            )}
          </div>
          <select
            id="practice-topic-select"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={!subject || isLoadingTopics || (topicOptions.length === 0 && !isLoadingTopics)}
            className={`w-full h-12 px-3 bg-muted border rounded-[10px] text-[15px] font-medium text-foreground outline-none transition-colors ${
              isLoadingTopics
                ? "border-primary/50 dark:border-[#D4A72C]/50 opacity-80 cursor-wait"
                : !subject || (topicOptions.length === 0 && !isLoadingTopics)
                ? "opacity-60 cursor-not-allowed border-border"
                : "border-border focus:border-primary focus:ring-1 focus:ring-primary dark:focus:border-[#D4A72C] dark:focus:ring-[#D4A72C]"
            }`}
          >
            <option value="">
              {!subject
                ? "Select a subject first"
                : isLoadingTopics
                ? "Loading topics…"
                : topicOptions.length === 0
                ? "No topics available for this subject"
                : "Select a topic"}
            </option>
            {topicOptions.map((t) => (
              <option key={t.id} value={t.id.toString()}>
                {t.name || t.title}
              </option>
            ))}
          </select>

          {topicsError && (
            <div className="flex items-center gap-2 text-sm text-red-600 font-medium" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{topicsError}</span>
              <button
                type="button"
                className="underline font-bold"
                onClick={() => loadTopicsForSubject(subject, subjectOptions)}
              >
                Retry
              </button>
            </div>
          )}
          {!isLoadingTopics && subject && topicOptions.length === 0 && !topicsError && (
            <p className="text-xs text-muted-foreground font-medium">
              No topics are available for the selected subject.
            </p>
          )}
        </div>

        {/* SHUFFLE QUESTIONS */}
        <label className="flex items-center justify-between gap-4 border border-border rounded-[10px] px-4 py-3 text-sm font-medium text-primary dark:text-foreground">
          <span>Shuffle Questions</span>
          <span className="flex items-center gap-3 text-muted-foreground">
            {shuffleQuestions ? "On" : "Off"}
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(event) => setShuffleQuestions(event.target.checked)}
              className="h-4 w-4 accent-primary"
              aria-label="Shuffle Questions"
            />
          </span>
        </label>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 font-medium" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error.message}</span>
            {error.retryable && (
              <button type="button" className="underline font-bold" onClick={() => handleStart(false)}>
                Retry
              </button>
            )}
          </div>
        )}

        {/* START BUTTON & VALIDATION HINT */}
        <div className="space-y-2 pt-1">
          <Button
            id="start-study-button"
            onClick={() => handleStart(false)}
            disabled={!canStart}
            className="w-full h-14 rounded-[12px] bg-primary text-primary-foreground hover:bg-[#163E6B] text-white font-bold text-[16px] transition-all disabled:opacity-50"
          >
            {starting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <BookOpen className="w-5 h-5 mr-2" /> Start Studying
              </>
            )}
          </Button>
          {!canStart && !starting && (
            <p className="text-xs text-muted-foreground text-center" role="status">
              {!exam
                ? "Please select an examination to begin."
                : !subject
                ? "Please select a subject."
                : !topic
                ? "Please select a topic to start studying."
                : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
