"use client";

import { useState, useEffect, useMemo } from "react";
import { BookOpen, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syllabusApi, Exam } from "@/lib/api/syllabus";
import { practiceApi, StudySessionResponse } from "@/lib/api/practice";
import { StudyQuestionBrowser } from "@/components/practice/StudyQuestionBrowser";

export default function TopicStudyPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [exam, setExam] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<StudySessionResponse | null>(null);
  const [savedQuestionIds, setSavedQuestionIds] = useState<Record<number, boolean>>({});

  useEffect(() => {
    syllabusApi.getExams().then(data => {
      setExams(data);
      if (data.length > 0 && data[0]?.id) setExam(data[0].id.toString());
      setLoadingExams(false);
    }).catch(e => {
      console.error(e);
      setLoadingExams(false);
    });

    practiceApi.listSavedQuestions().then(saved => {
      const map: Record<number, boolean> = {};
      saved.forEach(s => { map[s.question] = true; });
      setSavedQuestionIds(map);
    }).catch(e => console.error(e));
  }, []);

  const activeExam = useMemo(() => exams.find(e => e.id.toString() === exam), [exam, exams]);
  const activeSubject = useMemo(() => activeExam?.subjects?.find(s => s.id.toString() === subject), [activeExam, subject]);
  const allTopics = useMemo(() => activeSubject?.units?.flatMap(u => u.topics) || [], [activeSubject]);

  const handleStart = async (restart = false) => {
    if (!topic) return;
    setStarting(true);
    setError(null);
    try {
      const data = await practiceApi.startStudy({ topic, subject, exam, restart });
      setSession(data);
    } catch (e) {
      console.error(e);
      setError("Couldn't start studying this topic. Try a different one.");
    } finally {
      setStarting(false);
    }
  };

  const toggleSave = async (questionId: number) => {
    const wasSaved = !!savedQuestionIds[questionId];
    setSavedQuestionIds(prev => ({ ...prev, [questionId]: !wasSaved }));
    try {
      await practiceApi.toggleBookmark(questionId);
    } catch (e) {
      console.error(e);
      setSavedQuestionIds(prev => ({ ...prev, [questionId]: wasSaved }));
    }
  };

  if (session) {
    const topicName = allTopics.find(t => t.id.toString() === topic)?.name;
    return (
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6 animate-in fade-in-50 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-primary dark:text-foreground">
              Studying: {topicName || "Topic"}
            </h1>
            <p className="text-muted-foreground text-[14px]">
              Browse freely — no timer, no fixed count. Answer if you're confident, or Show Answer to just learn it.
            </p>
          </div>
          <div className="flex items-center gap-2">
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

        <StudyQuestionBrowser
          sessionId={session.session.id}
          questions={session.questions}
          initialIndex={session.resume_index}
          savedQuestionIds={savedQuestionIds}
          onToggleSave={toggleSave}
        />
      </div>
    );
  }

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
        <div className="space-y-2">
          <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider block">Exam</label>
          <select
            value={exam}
            onChange={(e) => { setExam(e.target.value); setSubject(""); setTopic(""); }}
            className="w-full h-12 px-3 bg-muted border border-border rounded-[10px] text-[15px] font-medium text-primary dark:text-foreground outline-none focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545]"
            disabled={loadingExams}
          >
            <option value="">Select an exam</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider block">Subject</label>
          <select
            value={subject}
            onChange={(e) => { setSubject(e.target.value); setTopic(""); }}
            className="w-full h-12 px-3 bg-muted border border-border rounded-[10px] text-[15px] font-medium text-primary dark:text-foreground outline-none focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545]"
            disabled={!activeExam}
          >
            <option value="">Select a subject</option>
            {activeExam?.subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider block">Topic</label>
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full h-12 px-3 bg-muted border border-border rounded-[10px] text-[15px] font-medium text-primary dark:text-foreground outline-none focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545]"
            disabled={!activeSubject}
          >
            <option value="">Select a topic</option>
            {allTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

        <Button
          onClick={() => handleStart(false)}
          disabled={!topic || starting}
          className="w-full h-14 rounded-[12px] bg-primary text-primary-foreground hover:bg-[#163E6B] text-white font-bold text-[16px]"
        >
          {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><BookOpen className="w-5 h-5 mr-2" /> Start Studying</>}
        </Button>
      </div>
    </div>
  );
}
