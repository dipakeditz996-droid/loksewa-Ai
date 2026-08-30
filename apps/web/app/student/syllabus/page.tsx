"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { 
  BookOpen, Search, Filter, ChevronDown, ChevronRight, 
  CheckCircle2, Circle, Clock, Target, Sparkles, MessageSquare, 
  PlayCircle, MoreHorizontal, ArrowRight, Layout, FileText, AlertCircle
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

  const [topicContents, setTopicContents] = useState<Record<number, any | 'loading' | 'error'>>({});

  const toggleTopicExpand = async (topicId: number) => {
    setExpandedTopics(prev => {
      const isCurrentlyExpanded = prev[topicId];
      if (!isCurrentlyExpanded && !topicContents[topicId]) {
        // Fetch content if expanding and we don't have it yet
        fetchTopicContent(topicId);
      }
      return { ...prev, [topicId]: !isCurrentlyExpanded };
    });
  };

  const fetchTopicContent = async (topicId: number) => {
    setTopicContents(prev => ({ ...prev, [topicId]: 'loading' }));
    try {
      const content = await syllabusApi.getTopicContent(topicId);
      setTopicContents(prev => ({ ...prev, [topicId]: content }));
    } catch (error) {
      console.error("Failed to fetch topic content:", error);
      setTopicContents(prev => ({ ...prev, [topicId]: 'error' }));
    }
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
    
    activeExam.subjects?.forEach(subject => {
      subject.units?.forEach(unit => {
        unit.topics?.forEach(topic => {
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

  if (loading) return <div className="p-8 text-center text-muted-foreground font-medium">Loading Syllabus...</div>;
  if (!activeExam || !activeSubject) return <div className="p-8 text-center text-red-500 font-medium">No syllabus data available.</div>;

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6 bg-muted/50 min-h-[calc(100vh-72px)]">
      
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-primary dark:text-foreground tracking-tight">Syllabus</h1>
          <p className="text-[14px] text-muted-foreground font-medium mt-1">Track your preparation topic by topic and stay on course.</p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-card border-border text-primary dark:text-foreground font-semibold flex items-center gap-2 h-10 px-4 shadow-sm hover:bg-muted">
              {activeExam.title} <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            {exams.map(exam => (
              <DropdownMenuItem 
                key={exam.id} 
                onClick={() => {
                  setActiveExamId(exam.id);
                  setActiveSubjectId(exam.subjects?.[0]?.id || "");
                }}
                className="font-medium text-primary dark:text-foreground"
              >
                {exam.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 2. OVERVIEW STRIP */}
      <div className="bg-card rounded-[12px] border border-border p-4 md:p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12">
        <div className="flex-1 w-full">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider">Overall Progress</span>
            <span className="text-[15px] font-bold text-primary dark:text-foreground">{stats.progress}%</span>
          </div>
          <Progress value={stats.progress} className="h-2 bg-muted/80" indicatorClassName="bg-[#D4A72C]" />
        </div>
        
        <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-8 shrink-0">
          <div>
            <div className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Topics Completed</div>
            <div className="text-[20px] font-bold text-primary dark:text-foreground leading-none">{stats.completedTopics} <span className="text-[14px] text-muted-foreground font-medium">/ {stats.totalTopics}</span></div>
          </div>
          <div className="w-[1px] h-8 bg-muted/80 hidden md:block"></div>
          <div>
            <div className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Topics Remaining</div>
            <div className="text-[20px] font-bold text-primary dark:text-foreground leading-none">{stats.totalTopics - stats.completedTopics}</div>
          </div>
          <div className="w-[1px] h-8 bg-muted/80 hidden md:block"></div>
          <div>
            <div className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Study Streak</div>
            <div className="text-[20px] font-bold text-primary dark:text-foreground leading-none flex items-center gap-1">
              {stats.streak} <span className="text-orange-500 text-[14px]">🔥</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SEARCH & FILTER */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-[12px] border border-border shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            type="text"
            placeholder="Search subjects or topics..." 
            className="pl-9 h-10 bg-muted border-border focus-visible:ring-1 focus-visible:ring-[#0B2545]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Button 
            variant={activeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("all")}
            className={cn("h-9 rounded-[8px]", activeFilter === "all" ? "bg-primary text-primary-foreground text-white" : "text-muted-foreground border-border bg-card")}
          >
            All
          </Button>
          <Button 
            variant={activeFilter === "not-started" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("not-started")}
            className={cn("h-9 rounded-[8px]", activeFilter === "not-started" ? "bg-primary text-primary-foreground text-white" : "text-muted-foreground border-border bg-card")}
          >
            Not Started
          </Button>
          <Button 
            variant={activeFilter === "in-progress" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("in-progress")}
            className={cn("h-9 rounded-[8px]", activeFilter === "in-progress" ? "bg-[#D4A72C] text-[#0A1118] border-[#D4A72C] hover:bg-[#b58e23]" : "text-muted-foreground border-border bg-card")}
          >
            In Progress
          </Button>
          <Button 
            variant={activeFilter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("completed")}
            className={cn("h-9 rounded-[8px]", activeFilter === "completed" ? "bg-[#22c55e] text-white border-[#22c55e] hover:bg-[#1ca34d]" : "text-muted-foreground border-border bg-card")}
          >
            Completed
          </Button>
          <Button 
            variant={activeFilter === "weak" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("weak")}
            className={cn("h-9 rounded-[8px]", activeFilter === "weak" ? "bg-red-500 text-white border-red-500 hover:bg-red-600" : "text-muted-foreground border-border bg-card")}
          >
            Weak Areas
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* 4. SYLLABUS NAVIGATION (LEFT SIDEBAR) */}
        <div className="lg:col-span-1 space-y-2">
          <div className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2">Subjects</div>
          <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {activeExam.subjects?.map((subject, index) => {
              const isActive = subject.id === activeSubjectId;
              return (
                <button
                  key={subject.id}
                  onClick={() => handleSubjectChange(subject.id)}
                  className={cn(
                    "flex flex-col text-left p-3 rounded-[10px] transition-all min-w-[200px] lg:min-w-0 border",
                    isActive 
                      ? "bg-primary text-primary-foreground text-white border-[#0B2545] shadow-md" 
                      : "bg-card text-muted-foreground border-border hover:border-border hover:bg-muted"
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
                      className={cn("h-full rounded-full", isActive ? "bg-[#D4A72C]" : "bg-primary text-primary-foreground/20")} 
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
          <div className="bg-card rounded-[16px] border border-border shadow-sm p-6 md:p-8">
            <h2 className="text-[24px] font-bold text-primary dark:text-foreground mb-2">{activeSubject.name}</h2>
            <p className="text-[15px] text-muted-foreground font-medium max-w-3xl mb-6 leading-relaxed">
              {activeSubject.description}
            </p>
            
            <div className="flex items-center gap-4 bg-muted p-4 rounded-[12px] border border-border/50">
              <span className="text-[13px] font-bold text-primary dark:text-foreground whitespace-nowrap">Subject Progress</span>
              <Progress value={activeSubject.progress} className="h-2 bg-muted/80 flex-1" indicatorClassName="bg-primary text-primary-foreground" />
              <span className="text-[14px] font-bold text-primary dark:text-foreground whitespace-nowrap">{activeSubject.progress}%</span>
            </div>
          </div>

          {/* Units and Topics */}
          {(activeSubject.units?.length || 0) > 0 ? (
            <div className="space-y-6">
              {activeSubject.units?.map(unit => (
                <div key={unit.id} className="bg-card rounded-[16px] border border-border shadow-sm overflow-hidden">
                  <div className="bg-muted/80 p-4 border-b border-border/50">
                    <h3 className="text-[15px] font-bold text-primary dark:text-foreground">{unit.title}</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {unit.topics?.map(topic => {
                      const isExpanded = expandedTopics[topic.id];
                      
                      // Status colors
                      const isCompleted = topic.status === "completed";
                      const isInProgress = topic.status === "in-progress";
                      
                      return (
                        <div key={topic.id} className="flex flex-col transition-colors hover:bg-muted/50">
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
                                <h4 className={cn("text-[15px] font-semibold transition-colors", isCompleted ? "text-primary dark:text-foreground" : "text-primary dark:text-foreground")}>
                                  {topic.name}
                                </h4>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className={cn(
                                    "text-[11px] font-bold uppercase tracking-wider",
                                    isCompleted ? "text-[#22c55e]" : isInProgress ? "text-[#D4A72C]" : "text-muted-foreground"
                                  )}>
                                    {topic.status.replace('-', ' ')}
                                  </span>
                                  {topic.accuracy !== null && (
                                    <>
                                      <span className="w-1 h-1 rounded-full bg-secondary"></span>
                                      <span className="text-[12px] text-muted-foreground font-medium">Accuracy: {topic.accuracy}%</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="hidden sm:flex items-center gap-2 w-24">
                                <Progress value={topic.progress} className="h-1.5 bg-muted/80" indicatorClassName={isCompleted ? "bg-[#22c55e]" : "bg-[#D4A72C]"} />
                              </div>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted/80 rounded-full shrink-0">
                                <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isExpanded ? "rotate-180" : "")} />
                              </Button>
                            </div>
                          </div>

                          {/* Expanded Actions */}
                          {isExpanded && (
                            <div className="p-4 pt-2 pb-5 pl-[52px] bg-muted/50 flex flex-col gap-4 border-t border-slate-50">
                              
                              {topicContents[topic.id] === 'loading' && (
                                <div className="space-y-3 animate-pulse py-2">
                                  <div className="h-4 bg-muted-foreground/20 rounded w-3/4"></div>
                                  <div className="h-4 bg-muted-foreground/20 rounded w-1/2"></div>
                                  <div className="h-4 bg-muted-foreground/20 rounded w-5/6"></div>
                                  <div className="flex gap-2 mt-4">
                                    <div className="h-9 bg-muted-foreground/20 rounded w-28"></div>
                                    <div className="h-9 bg-muted-foreground/20 rounded w-28"></div>
                                  </div>
                                </div>
                              )}

                              {topicContents[topic.id] === 'error' && (
                                <div className="text-[13px] text-red-500 py-2 flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4" /> 
                                  Failed to load content. 
                                  <Button variant="link" className="text-red-500 h-auto p-0" onClick={(e) => { e.stopPropagation(); fetchTopicContent(topic.id); }}>Retry</Button>
                                </div>
                              )}

                              {topicContents[topic.id] && topicContents[topic.id] !== 'loading' && topicContents[topic.id] !== 'error' && (
                                <>
                                  {topicContents[topic.id].description ? (
                                    <div 
                                      className="text-[14px] text-muted-foreground leading-relaxed prose dark:prose-invert max-w-none"
                                      dangerouslySetInnerHTML={{ __html: topicContents[topic.id].description }}
                                    />
                                  ) : (
                                    (!topicContents[topic.id].materials || topicContents[topic.id].materials.length === 0) && (
                                      <div className="text-[14px] text-muted-foreground italic py-2 text-center bg-card rounded-md border border-border/50">
                                        No learning material available yet. Check back later or explore other topics.
                                      </div>
                                    )
                                  )}

                                  {topicContents[topic.id].materials && topicContents[topic.id].materials.length > 0 && (
                                    <div className="flex flex-col gap-2 mt-2">
                                      <h4 className="text-[13px] font-semibold text-foreground mb-1">Study Materials</h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {topicContents[topic.id].materials.map((material: any) => (
                                          <Link key={material.id} href={material.material_type === 'video' || material.material_type === 'external' ? (material.external_url || '#') : `/student/notes/${material.slug}`} target={material.material_type === 'video' || material.material_type === 'external' ? "_blank" : "_self"}>
                                            <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer group">
                                              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                {material.material_type === 'video' ? <PlayCircle className="w-4 h-4" /> : 
                                                 material.material_type === 'pdf' ? <FileText className="w-4 h-4" /> : 
                                                 <BookOpen className="w-4 h-4" />}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-medium text-foreground truncate">{material.title}</p>
                                                <p className="text-[11px] text-muted-foreground capitalize">{material.material_type}</p>
                                              </div>
                                            </div>
                                          </Link>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}

                              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border/50">
                                <Button className="bg-card border border-border hover:border-[#D4A72C] hover:text-primary dark:text-foreground text-muted-foreground shadow-sm h-9 rounded-[8px] text-[13px] font-semibold gap-2 transition-colors">
                                  <Target className="w-4 h-4" /> Practice Questions
                                </Button>
                                <Button className="bg-card border border-border hover:bg-muted/80 text-muted-foreground shadow-sm h-9 rounded-[8px] text-[13px] font-semibold gap-2">
                                  <Sparkles className="w-4 h-4 text-[#D4A72C]" /> Ask AI
                                </Button>
                                <div className="flex-1 min-w-[20px]"></div>
                                <Button 
                                  onClick={(e) => { e.stopPropagation(); handleStatusUpdate(topic.id, topic.status); }}
                                  variant="ghost" 
                                  className={cn("h-9 rounded-[8px] text-[13px] font-semibold gap-2", isCompleted ? "text-muted-foreground hover:text-muted-foreground" : "text-[#22c55e] hover:bg-[#22c55e]/10")}
                                >
                                  <CheckCircle2 className="w-4 h-4" /> {isCompleted ? "Mark Incomplete" : "Mark Complete"}
                                </Button>
                              </div>
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
            <div className="bg-card rounded-[16px] border border-border shadow-sm p-12 text-center">
              <Layout className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-[18px] font-bold text-primary dark:text-foreground mb-2">Syllabus content coming soon</h3>
              <p className="text-[14px] text-muted-foreground font-medium">The detailed units and topics for this subject are currently being prepared.</p>
            </div>
          )}

          {/* 6. WEAK AREAS */}
          {weakAreas.length > 0 && (
            <div className="bg-card rounded-[16px] border border-border shadow-sm p-6 md:p-8 mt-8">
              <div className="flex items-center gap-2 mb-6">
                <Target className="w-5 h-5 text-red-500" />
                <h2 className="text-[18px] font-bold text-primary dark:text-foreground">Focus Areas</h2>
              </div>
              <p className="text-[14px] text-muted-foreground font-medium mb-6">Topics that need more attention based on your recent practice sessions.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {weakAreas.map((weak, idx) => (
                  <div key={idx} className="border border-border/50 rounded-[12px] p-4 hover:border-border transition-colors bg-muted/50">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{weak.subject}</div>
                    <h4 className="text-[14px] font-bold text-primary dark:text-foreground leading-tight mb-3">{weak.topic}</h4>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-[12px] font-semibold text-red-500">Accuracy: {weak.accuracy}%</span>
                      <Button variant="ghost" size="sm" className="h-7 text-[12px] font-semibold text-primary dark:text-foreground hover:bg-muted/80 px-2 rounded-[6px]">Practice</Button>
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
