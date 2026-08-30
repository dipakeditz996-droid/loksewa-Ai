"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BookOpen, Play, Calendar, Zap, RefreshCw, Bookmark,
  Target, Sparkles, LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { syllabusApi, Exam } from "@/lib/api/syllabus";
import { practiceApi, RevisionSummary } from "@/lib/api/practice";
import { useRouter } from "next/navigation";
import { useCalmDownGate } from "@/components/calm-down/useCalmDownGate";
import Link from "next/link";

export default function PracticeSetupPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  const [exam, setExam] = useState("all");
  const [subject, setSubject] = useState("all");
  const [topic, setTopic] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [questions, setQuestions] = useState("20");
  const [mode, setMode] = useState("flexible");
  const [revision, setRevision] = useState<RevisionSummary | null>(null);

  useEffect(() => {
    syllabusApi.getExams().then(data => {
      setExams(data);
      if (data.length > 0 && data[0]?.id) setExam(data[0].id.toString());
      setLoading(false);
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });

    practiceApi.getRevisionSummary().then(setRevision).catch(e => console.error(e));
  }, []);

  const sessionUrl = `/student/practice/session?exam=${exam}&subject=${subject}&topic=${topic}&diff=${difficulty}&q=${questions}&mode=${mode}`;
  const { requestStart, gate } = useCalmDownGate(() => router.push(sessionUrl));

  const handleStartPractice = () => {
    // Flexible practice has no countdown timer to protect, so the Calm Down
    // prompt is only offered ahead of Timed practice - matching "other timed
    // sessions where appropriate" rather than interrupting every start.
    if (mode === "timed") {
      requestStart();
    } else {
      router.push(sessionUrl);
    }
  };

  const activeExam = useMemo(() => exams.find(e => e.id.toString() === exam), [exam, exams]);
  const activeSubject = useMemo(() => activeExam?.subjects?.find(s => s.id.toString() === subject), [activeExam, subject]);

  const allTopics = useMemo(() => {
    if (!activeSubject) return [];
    return activeSubject.units?.flatMap(u => u.topics) || [];
  }, [activeSubject]);

  type QuickStart = {
    id: string;
    label: string;
    icon: LucideIcon;
    color: string;
    bg: string;
    onClick?: () => void;
    comingSoon?: boolean;
  };

  const quickStarts: QuickStart[] = [
    { id: "bookmark", label: "Saved Questions", icon: Bookmark, color: "text-primary dark:text-foreground", bg: "bg-primary text-primary-foreground/10", onClick: () => router.push("/student/practice/saved") },
    { id: "random", label: "Random Practice", icon: Zap, color: "text-purple-500", bg: "bg-purple-500/10", onClick: () => router.push(`/student/practice/session?exam=all&subject=all&topic=all&diff=all&q=20&mode=flexible`) },
    { id: "weak", label: "Weak Topics", icon: Target, color: "text-red-500", bg: "bg-red-500/10", onClick: () => router.push("/student/practice/revision?focus=weak_topics") },
    { id: "incorrect", label: "Recently Incorrect", icon: RefreshCw, color: "text-orange-500", bg: "bg-orange-500/10", onClick: () => router.push("/student/practice/revision?focus=recent_mistakes") },
    { id: "daily", label: "Daily Practice", icon: Calendar, color: "text-[#D4A72C]", bg: "bg-[#D4A72C]/10", comingSoon: true },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in-50 duration-500">
      
      {/* HEADER */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-primary dark:text-foreground">Practice</h1>
        <p className="text-muted-foreground mt-1 text-[15px]">Strengthen your preparation with focused objective practice.</p>
      </div>

      {/* MCQ STUDY ENTRY POINT — distinct from the scored quiz below: no
          fixed count, no timer, browse a topic at your own pace. */}
      <Link
        href="/student/practice/study"
        className="flex items-center justify-between gap-4 p-5 rounded-[14px] border border-[#D4A72C]/30 bg-[#D4A72C]/[0.06] hover:bg-[#D4A72C]/10 transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-[10px] bg-[#D4A72C]/15 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-[#D4A72C]" />
          </div>
          <div>
            <div className="font-bold text-primary dark:text-foreground text-[15px]">Study by Topic</div>
            <div className="text-[13px] text-muted-foreground">No timer, no fixed count — just learn at your own pace, with Show Answer whenever you want it.</div>
          </div>
        </div>
        <span className="text-[#D4A72C] font-bold text-[14px] shrink-0 group-hover:translate-x-1 transition-transform">Start →</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN - CONFIGURATION */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-[16px] border border-border shadow-sm p-6 md:p-8">
            <h2 className="text-[18px] font-bold text-primary dark:text-foreground mb-6 flex items-center gap-2">
              <SettingsIcon /> Choose your practice
            </h2>

            <div className="space-y-6">
              
              {/* Exam & Subject */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider block">Exam</label>
                  <select 
                    value={exam} 
                    onChange={(e) => { setExam(e.target.value); setSubject("all"); setTopic("all"); }}
                    className="w-full h-12 px-3 bg-muted border border-border rounded-[10px] text-[15px] font-medium text-primary dark:text-foreground outline-none focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545]"
                  >
                    <option value="all">All Exams</option>
                    {exams.map(e => (
                      <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider block">Subject</label>
                  <select 
                    value={subject} 
                    onChange={(e) => { setSubject(e.target.value); setTopic("all"); }}
                    className="w-full h-12 px-3 bg-muted border border-border rounded-[10px] text-[15px] font-medium text-primary dark:text-foreground outline-none focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545]"
                    disabled={!activeExam}
                  >
                    <option value="all">All Subjects</option>
                    {activeExam?.subjects?.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Topic & Difficulty */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider block">Topic</label>
                  <select 
                    value={topic} 
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full h-12 px-3 bg-muted border border-border rounded-[10px] text-[15px] font-medium text-primary dark:text-foreground outline-none focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545]"
                    disabled={!activeSubject}
                  >
                    <option value="all">All Topics</option>
                    {allTopics.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider block">Difficulty</label>
                  <select 
                    value={difficulty} 
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full h-12 px-3 bg-muted border border-border rounded-[10px] text-[15px] font-medium text-primary dark:text-foreground outline-none focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545]"
                  >
                    <option value="all">All Levels</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Number of Questions */}
              <div className="space-y-3 pt-2">
                <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider block">Number of Questions</label>
                <div className="flex flex-wrap gap-3">
                  {["10", "20", "30", "50", "100"].map((num) => (
                    <label key={num} className="relative cursor-pointer">
                      <input 
                        type="radio" 
                        name="questions" 
                        value={num}
                        checked={questions === num}
                        onChange={(e) => setQuestions(e.target.value)}
                        className="peer sr-only" 
                      />
                      <div className="flex items-center justify-center h-11 px-5 rounded-[10px] border border-border bg-card text-[15px] font-semibold text-muted-foreground transition-all peer-checked:border-[#0B2545] peer-checked:bg-primary text-primary-foreground peer-checked:text-white hover:bg-muted">
                        {num}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Practice Mode */}
              <div className="space-y-3 pt-2">
                <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider block">Practice Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="relative cursor-pointer">
                    <input 
                      type="radio" 
                      name="mode" 
                      value="flexible"
                      checked={mode === "flexible"}
                      onChange={(e) => setMode(e.target.value)}
                      className="peer sr-only" 
                    />
                    <div className="flex flex-col p-4 rounded-[12px] border-2 border-border bg-card transition-all peer-checked:border-[#D4A72C] peer-checked:bg-amber-50/30 hover:bg-muted">
                      <span className="font-bold text-primary dark:text-foreground text-[15px] mb-1">Flexible Practice</span>
                      <span className="text-[13px] text-muted-foreground font-medium">Take your time, no strict countdown. Best for learning.</span>
                    </div>
                  </label>
                  
                  <label className="relative cursor-pointer">
                    <input 
                      type="radio" 
                      name="mode" 
                      value="timed"
                      checked={mode === "timed"}
                      onChange={(e) => setMode(e.target.value)}
                      className="peer sr-only" 
                    />
                    <div className="flex flex-col p-4 rounded-[12px] border-2 border-border bg-card transition-all peer-checked:border-[#0B2545] peer-checked:bg-muted hover:bg-muted">
                      <span className="font-bold text-primary dark:text-foreground text-[15px] mb-1">Timed Practice</span>
                      <span className="text-[13px] text-muted-foreground font-medium">Simulate exam pressure with a strict countdown timer.</span>
                    </div>
                  </label>
                </div>
              </div>

            </div>
          </div>

          <Button
            onClick={handleStartPractice}
            disabled={loading}
            className="w-full h-14 rounded-[12px] bg-primary text-primary-foreground hover:bg-[#163E6B] text-white font-bold text-[16px] shadow-[0_8px_20px_rgba(11,37,69,0.2)] transition-all hover:-translate-y-0.5 group"
          >
            {loading ? "Loading..." : "Start Practice"}
            <Play className="w-5 h-5 ml-2 fill-white/20 group-hover:translate-x-1 transition-transform" />
          </Button>

        </div>

        {/* RIGHT COLUMN - SMART OPTIONS */}
        <div className="space-y-6">
          <div className="bg-card rounded-[16px] border border-border shadow-sm p-6">
            <h3 className="text-[14px] font-bold text-muted-foreground uppercase tracking-wider mb-5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4A72C]" /> Quick Start
            </h3>
            <div className="space-y-3">
              {quickStarts.map((item) => (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  disabled={item.comingSoon}
                  className={`w-full flex items-center gap-4 p-4 rounded-[12px] border border-border/50 bg-card transition-all group text-left ${
                    item.comingSoon ? "opacity-50 cursor-not-allowed" : "hover:border-border hover:bg-muted"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-[8px] flex items-center justify-center ${item.bg} shrink-0`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="font-semibold text-primary dark:text-foreground text-[14px]">{item.label}</div>
                    {item.comingSoon && (
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Coming soon</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#0B2545] to-[#163E6B] rounded-[16px] shadow-sm p-6 text-white">
            <h3 className="font-bold text-[16px] mb-2 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#D4A72C]" /> Revision Mode
            </h3>
            {revision === null ? (
              <p className="text-[13px] text-white/70 font-medium">Loading your revision queue...</p>
            ) : revision.total_available > 0 ? (
              <>
                <p className="text-[13px] text-white/80 font-medium leading-relaxed">
                  We picked <strong>{revision.total_available}</strong> question{revision.total_available === 1 ? "" : "s"} for you to revise, based on mistakes, weak topics, and what&apos;s due for another look.
                </p>
                <Button
                  onClick={() => router.push("/student/practice/revision")}
                  className="w-full mt-4 bg-[#D4A72C] text-[#0A1118] hover:bg-[#b58e23] font-bold h-10 rounded-[8px]"
                >
                  Start Revising
                </Button>
              </>
            ) : (
              <p className="text-[13px] text-white/80 font-medium leading-relaxed">
                Nothing to revise yet. As you practice, we&apos;ll build a queue here from what you get wrong and what&apos;s due for review.
              </p>
            )}
          </div>
        </div>

      </div>

      {gate}
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 20V10" stroke="#0B2545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 4V6" stroke="#0B2545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18 20V16" stroke="#0B2545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18 8V4" stroke="#0B2545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 20V16" stroke="#0B2545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 8V4" stroke="#0B2545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="8" r="2" stroke="#0B2545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="18" cy="12" r="2" stroke="#0B2545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="6" cy="12" r="2" stroke="#0B2545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
