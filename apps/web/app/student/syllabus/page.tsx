"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { 
  BookOpen, Search, Filter, ChevronDown, ChevronRight, 
  CheckCircle2, Circle, Clock, Target, Sparkles, MessageSquare, 
  PlayCircle, MoreHorizontal, ArrowRight, Layout
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { syllabusApi, Exam, Subject, Topic, TopicStatus } from "@/lib/api/syllabus";
import { cn } from "@/lib/utils";

export default function SyllabusPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeExamId, setActiveExamId] = useState<number | "">("");
  const [activeSubjectId, setActiveSubjectId] = useState<number | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | TopicStatus | "weak">("all");
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      try {
        const data = await syllabusApi.getExams();
        setExams(data);
        if (data.length > 0 && data[0]) {
          setActiveExamId(data[0].id);
          if (data[0].subjects && data[0].subjects.length > 0) {
            setActiveSubjectId(data[0].subjects[0]?.id || "");
          }
        }
      } catch (e: any) {
        console.error("Failed to load syllabus:", e.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeExam = useMemo(() => exams.find(e => e.id === activeExamId), [activeExamId, exams]);
  const activeSubject = useMemo(() => activeExam?.subjects?.find(s => s.id === activeSubjectId), [activeExam, activeSubjectId]);

  // Handle subject change securely
  const handleSubjectChange = (id: number) => {
    setActiveSubjectId(id);
    setExpandedTopics({});
  };

  const toggleTopicExpand = (topicId: number) => {
    setExpandedTopics(prev => ({
      ...prev,
      [topicId]: !prev[topicId]
    }));
  };

  const handleStatusUpdate = async (topicId: number, currentStatus: TopicStatus) => {
    const newStatus = currentStatus === "completed" ? "not-started" : "completed";
    try {
      await syllabusApi.updateTopicProgress(topicId, newStatus);
      // Optimistically update the UI
      setExams(prev => {
        return prev.map(e => ({
          ...e,
          subjects: e.subjects.map(s => ({
            ...s,
            units: s.units.map(u => ({
              ...u,
              topics: u.topics.map(t => t.id === topicId ? { ...t, status: newStatus, progress: newStatus === "completed" ? 100 : 0 } : t)
            }))
          }))
        }));
      });
    } catch (e: any) {
      console.error("Failed to update status:", e.message || "Unknown error");
    }
  };

  // Derived stats
  const stats = useMemo(() => {
    if (!activeExam) return { totalTopics: 0, completedTopics: 0, progress: 0, streak: 12 };
    let total = 0;
    let completed = 0;
    
    activeExam.subjects.forEach(subject => {
      subject.units.forEach(unit => {
        unit.topics.forEach(topic => {
          total++;
          if (topic.status === "completed") completed++;
        });
      });
    });

    return {
      totalTopics: total,
      completedTopics: completed,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      streak: 12
    };
  }, [activeExam]);

  // Weak areas calculation
  const weakAreas = useMemo(() => {
    if (!activeExam) return [];
    const weak: { subject: string, topic: string, accuracy: number }[] = [];
    activeExam.subjects?.forEach(subject => {
      subject.units?.forEach(unit => {
        unit.topics?.forEach(topic => {
          if (topic.accuracy !== null && topic.accuracy !== undefined && topic.accuracy < 70) {
            weak.push({ subject: subject.name, topic: topic.name, accuracy: topic.accuracy });
          }
        });
      });
    });
    return weak.sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);
  }, [activeExam]);

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading Syllabus...</div>;
  if (!activeExam || !activeSubject) return <div className="p-8 text-center text-red-500 font-medium">No syllabus data available.</div>;

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6 bg-slate-50/50 min-h-[calc(100vh-72px)]">
      
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#0B2545] tracking-tight">Syllabus</h1>
          <p className="text-[14px] text-slate-500 font-medium mt-1">Track your preparation topic by topic and stay on course.</p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-white border-slate-200 text-[#0B2545] font-semibold flex items-center gap-2 h-10 px-4 shadow-sm hover:bg-slate-50">
              {activeExam.title} <ChevronDown className="w-4 h-4 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            {exams.map(exam => (
              <DropdownMenuItem 
                key={exam.id} 
                onClick={() => {
                  setActiveExamId(exam.id);
                  setActiveSubjectId(exam.subjects[0]?.id || "");
                }}
                className="font-medium text-[#0B2545]"
              >
                {exam.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 2. OVERVIEW STRIP */}
      <div className="bg-white rounded-[12px] border border-slate-200 p-4 md:p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12">
        <div className="flex-1 w-full">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[13px] font-bold text-slate-400 uppercase tracking-wider">Overall Progress</span>
            <span className="text-[15px] font-bold text-[#0B2545]">{stats.progress}%</span>
          </div>
          <Progress value={stats.progress} className="h-2 bg-slate-100" indicatorClassName="bg-[#D4A72C]" />
        </div>
        
        <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-8 shrink-0">
          <div>
            <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-1">Topics Completed</div>
            <div className="text-[20px] font-bold text-[#0B2545] leading-none">{stats.completedTopics} <span className="text-[14px] text-slate-400 font-medium">/ {stats.totalTopics}</span></div>
          </div>
          <div className="w-[1px] h-8 bg-slate-200 hidden md:block"></div>
          <div>
            <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-1">Topics Remaining</div>
            <div className="text-[20px] font-bold text-[#0B2545] leading-none">{stats.totalTopics - stats.completedTopics}</div>
          </div>
          <div className="w-[1px] h-8 bg-slate-200 hidden md:block"></div>
          <div>
            <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-1">Study Streak</div>
            <div className="text-[20px] font-bold text-[#0B2545] leading-none flex items-center gap-1">
              {stats.streak} <span className="text-orange-500 text-[14px]">🔥</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SEARCH & FILTER */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-[12px] border border-slate-200 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            type="text"
            placeholder="Search subjects or topics..." 
            className="pl-9 h-10 bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-[#0B2545]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Button 
            variant={activeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("all")}
            className={cn("h-9 rounded-[8px]", activeFilter === "all" ? "bg-[#0B2545] text-white" : "text-slate-500 border-slate-200 bg-white")}
          >
            All
          </Button>
          <Button 
            variant={activeFilter === "not-started" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("not-started")}
            className={cn("h-9 rounded-[8px]", activeFilter === "not-started" ? "bg-[#0B2545] text-white" : "text-slate-500 border-slate-200 bg-white")}
          >
            Not Started
          </Button>
          <Button 
            variant={activeFilter === "in-progress" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("in-progress")}
            className={cn("h-9 rounded-[8px]", activeFilter === "in-progress" ? "bg-[#D4A72C] text-[#0A1118] border-[#D4A72C] hover:bg-[#b58e23]" : "text-slate-500 border-slate-200 bg-white")}
          >
            In Progress
          </Button>
          <Button 
            variant={activeFilter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("completed")}
            className={cn("h-9 rounded-[8px]", activeFilter === "completed" ? "bg-[#22c55e] text-white border-[#22c55e] hover:bg-[#1ca34d]" : "text-slate-500 border-slate-200 bg-white")}
          >
            Completed
          </Button>
          <Button 
            variant={activeFilter === "weak" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("weak")}
            className={cn("h-9 rounded-[8px]", activeFilter === "weak" ? "bg-red-500 text-white border-red-500 hover:bg-red-600" : "text-slate-500 border-slate-200 bg-white")}
          >
            Weak Areas
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* 4. SYLLABUS NAVIGATION (LEFT SIDEBAR) */}
        <div className="lg:col-span-1 space-y-2">
          <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Subjects</div>
          <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {activeExam.subjects.map((subject, index) => {
              const isActive = subject.id === activeSubjectId;
              return (
                <button
                  key={subject.id}
                  onClick={() => handleSubjectChange(subject.id)}
                  className={cn(
                    "flex flex-col text-left p-3 rounded-[10px] transition-all min-w-[200px] lg:min-w-0 border",
                    isActive 
                      ? "bg-[#0B2545] text-white border-[#0B2545] shadow-md" 
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[14px] font-bold leading-tight">
                      {index + 1}. {subject.name}
                    </span>
                    {isActive && <ChevronRight className="w-4 h-4 text-[#D4A72C]" />}
                  </div>
                  <div className="w-full bg-black/10 rounded-full h-1 mt-auto">
                    <div 
                      className={cn("h-full rounded-full", isActive ? "bg-[#D4A72C]" : "bg-[#0B2545]/20")} 
                      style={{ width: `${subject.progress}%` }}
                    ></div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. MAIN SYLLABUS CONTENT (RIGHT COLUMN) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Active Subject Header */}
          <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm p-6 md:p-8">
            <h2 className="text-[24px] font-bold text-[#0B2545] mb-2">{activeSubject.name}</h2>
            <p className="text-[15px] text-slate-500 font-medium max-w-3xl mb-6 leading-relaxed">
              {activeSubject.description}
            </p>
            
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-[12px] border border-slate-100">
              <span className="text-[13px] font-bold text-[#0B2545] whitespace-nowrap">Subject Progress</span>
              <Progress value={activeSubject.progress} className="h-2 bg-slate-200 flex-1" indicatorClassName="bg-[#0B2545]" />
              <span className="text-[14px] font-bold text-[#0B2545] whitespace-nowrap">{activeSubject.progress}%</span>
            </div>
          </div>

          {/* Units and Topics */}
          {activeSubject.units.length > 0 ? (
            <div className="space-y-6">
              {activeSubject.units.map(unit => (
                <div key={unit.id} className="bg-white rounded-[16px] border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-50/80 p-4 border-b border-slate-100">
                    <h3 className="text-[15px] font-bold text-[#0B2545]">{unit.title}</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {unit.topics.map(topic => {
                      const isExpanded = expandedTopics[topic.id];
                      
                      // Status colors
                      const isCompleted = topic.status === "completed";
                      const isInProgress = topic.status === "in-progress";
                      
                      return (
                        <div key={topic.id} className="flex flex-col transition-colors hover:bg-slate-50/50">
                          {/* Topic Row */}
                          <div 
                            className="flex items-center justify-between p-4 cursor-pointer"
                            onClick={() => toggleTopicExpand(topic.id)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="shrink-0 mt-0.5">
                                {isCompleted && <CheckCircle2 className="w-5 h-5 text-[#22c55e]" />}
                                {isInProgress && <Circle className="w-5 h-5 text-[#D4A72C] fill-[#D4A72C]/10" />}
                                {!isCompleted && !isInProgress && <Circle className="w-5 h-5 text-slate-300" />}
                              </div>
                              <div>
                                <h4 className={cn("text-[15px] font-semibold transition-colors", isCompleted ? "text-[#0B2545]" : "text-[#0B2545]")}>
                                  {topic.name}
                                </h4>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className={cn(
                                    "text-[11px] font-bold uppercase tracking-wider",
                                    isCompleted ? "text-[#22c55e]" : isInProgress ? "text-[#D4A72C]" : "text-slate-400"
                                  )}>
                                    {topic.status.replace('-', ' ')}
                                  </span>
                                  {topic.accuracy !== null && (
                                    <>
                                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                      <span className="text-[12px] text-slate-500 font-medium">Accuracy: {topic.accuracy}%</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="hidden sm:flex items-center gap-2 w-24">
                                <Progress value={topic.progress} className="h-1.5 bg-slate-100" indicatorClassName={isCompleted ? "bg-[#22c55e]" : "bg-[#D4A72C]"} />
                              </div>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-slate-100 rounded-full shrink-0">
                                <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isExpanded ? "rotate-180" : "")} />
                              </Button>
                            </div>
                          </div>

                          {/* Expanded Actions */}
                          {isExpanded && (
                            <div className="p-4 pt-2 pb-5 pl-[52px] bg-slate-50/50 flex flex-wrap gap-3 border-t border-slate-50">
                              <Link href={`/student/notes?topic=${topic.id}`}>
                                <Button className="bg-[#0B2545] hover:bg-[#163E6B] text-white shadow-sm h-9 rounded-[8px] text-[13px] font-semibold gap-2">
                                  <BookOpen className="w-4 h-4" /> Study Notes
                                </Button>
                              </Link>
                              <Button className="bg-white border border-slate-200 hover:border-[#D4A72C] hover:text-[#0B2545] text-slate-600 shadow-sm h-9 rounded-[8px] text-[13px] font-semibold gap-2 transition-colors">
                                <Target className="w-4 h-4" /> Practice Questions
                              </Button>
                              <Button className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 shadow-sm h-9 rounded-[8px] text-[13px] font-semibold gap-2">
                                <Sparkles className="w-4 h-4 text-[#D4A72C]" /> Ask AI
                              </Button>
                              <div className="flex-1 min-w-[20px]"></div>
                              <Button 
                                onClick={(e) => { e.stopPropagation(); handleStatusUpdate(topic.id, topic.status); }}
                                variant="ghost" 
                                className={cn("h-9 rounded-[8px] text-[13px] font-semibold gap-2", isCompleted ? "text-slate-400 hover:text-slate-600" : "text-[#22c55e] hover:bg-[#22c55e]/10")}
                              >
                                <CheckCircle2 className="w-4 h-4" /> {isCompleted ? "Mark Incomplete" : "Mark Complete"}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm p-12 text-center">
              <Layout className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-[18px] font-bold text-[#0B2545] mb-2">Syllabus content coming soon</h3>
              <p className="text-[14px] text-slate-500 font-medium">The detailed units and topics for this subject are currently being prepared.</p>
            </div>
          )}

          {/* 6. WEAK AREAS */}
          {weakAreas.length > 0 && (
            <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm p-6 md:p-8 mt-8">
              <div className="flex items-center gap-2 mb-6">
                <Target className="w-5 h-5 text-red-500" />
                <h2 className="text-[18px] font-bold text-[#0B2545]">Focus Areas</h2>
              </div>
              <p className="text-[14px] text-slate-500 font-medium mb-6">Topics that need more attention based on your recent practice sessions.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {weakAreas.map((weak, idx) => (
                  <div key={idx} className="border border-slate-100 rounded-[12px] p-4 hover:border-slate-300 transition-colors bg-slate-50/50">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{weak.subject}</div>
                    <h4 className="text-[14px] font-bold text-[#0B2545] leading-tight mb-3">{weak.topic}</h4>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-[12px] font-semibold text-red-500">Accuracy: {weak.accuracy}%</span>
                      <Button variant="ghost" size="sm" className="h-7 text-[12px] font-semibold text-[#0B2545] hover:bg-slate-200 px-2 rounded-[6px]">Practice</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. AI TUTOR BANNER */}
          <section className="bg-gradient-to-r from-[#0B2545] to-[#163E6B] rounded-[16px] border border-[#163E6B] shadow-sm p-6 text-white relative overflow-hidden mt-8">
             <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-[#163E6B] to-transparent pointer-events-none"></div>
             
             <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
               <div>
                 <div className="flex items-center gap-2 mb-2">
                   <Sparkles className="w-5 h-5 text-[#D4A72C]" />
                   <h2 className="text-[18px] font-bold">Need help understanding a topic?</h2>
                 </div>
                 <p className="text-[14px] text-white/70 font-medium max-w-md">
                   Ask LoksewaAI to explain any syllabus concept in simple language, aligned perfectly with the exam framework.
                 </p>
               </div>
               <Button className="shrink-0 bg-[#D4A72C] text-[#0A1118] hover:bg-[#b58e23] h-10 px-6 rounded-[8px] font-bold text-[14px] shadow-sm transition-all hover:-translate-y-0.5">
                 Ask LoksewaAI
               </Button>
             </div>
          </section>

        </div>
      </div>
    </div>
  );
}
