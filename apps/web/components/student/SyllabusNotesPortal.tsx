"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen, FileText, Download, Eye, Sparkles,
  Search, ChevronRight, Layers,
  ExternalLink, X, Maximize2, Minimize2, Clock, AlertCircle, RefreshCw, Loader2
} from "lucide-react";
import { notesApi, StudyMaterial } from "@/lib/api/notes";
import dynamic from "next/dynamic";
import { sortNotesAscending } from "@/lib/utils/note-sorting";

const FirstPartyPdfViewer = dynamic(
  () => import("@/components/common/FirstPartyPdfViewer").then((m) => m.FirstPartyPdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 text-[#C4A45C] animate-spin" />
        <p className="text-sm font-medium animate-pulse text-slate-300">Opening PDF Document...</p>
      </div>
    ),
  }
);
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

import { useOptionalStudentContext } from "@/contexts/StudentContext";

interface SyllabusNotesPortalProps {
  initialSection?: 'syllabus' | 'subjective_topicwise' | 'objective_topicwise' | 'revision_notes';
  pageTitle?: string;
  pageSubtitle?: string;
}

export default function SyllabusNotesPortal({
  initialSection = 'syllabus',
  pageTitle = "Syllabus & Notes",
  pageSubtitle = "Access your official syllabus, topicwise detailed notes, and revision materials."
}: SyllabusNotesPortalProps) {
  const studentCtx = useOptionalStudentContext();
  const effectiveCourseId = studentCtx?.activeCourse?.id;

  // Active preparation ID - also doubles as the React Query cache key
  // discriminator, so switching back to a previously-viewed preparation is
  // itself an instant cache hit, not just the default view.
  const [activePrepId, setActivePrepId] = useState<number | null>(null);

  const {
    data,
    isLoading: loading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    // Syllabus/notes portal content is teacher/admin-authored and changes
    // infrequently - a 5 minute staleTime means returning to this page
    // shortly after leaving it (e.g. Dashboard -> Syllabus -> Dashboard ->
    // Syllabus) shows the cached real data immediately with no loading
    // state at all, only refetching in the background once actually stale.
    queryKey: ["syllabus-notes-portal", activePrepId, effectiveCourseId ?? null],
    queryFn: () => notesApi.getStudentPortalView(activePrepId ?? undefined, effectiveCourseId),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!activePrepId && data?.selectedPreparation) {
      setActivePrepId(data.selectedPreparation.id);
    } else if (
      activePrepId &&
      data?.authorizedPreparations &&
      !data.authorizedPreparations.some(p => p.id === activePrepId) &&
      data.selectedPreparation
    ) {
      setActivePrepId(data.selectedPreparation.id);
    }
  }, [data, activePrepId]);

  const error = queryError instanceof Error ? queryError.message : (queryError ? "Failed to load syllabus and notes. Please try again." : null);

  // Active section tab
  const [activeSection, setActiveSection] = useState<'syllabus' | 'subjective_topicwise' | 'objective_topicwise' | 'revision_notes'>(initialSection);

  // Sub-type filters
  const [subjectiveSubtype, setSubjectiveSubtype] = useState<'all' | 'standard' | 'ai'>('all');
  const [objectiveSubtype, setObjectiveSubtype] = useState<'all' | 'standard' | 'ai'>('all');
  const [revisionSubtype, setRevisionSubtype] = useState<'all' | 'subjective' | 'objective'>('all');

  // Search & Subject filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  // PDF Viewer Modal state
  const [viewingMaterial, setViewingMaterial] = useState<StudyMaterial | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  const handlePrepChange = (prepId: number) => {
    // Just switches the query key - React Query serves cached data
    // instantly if this prep was viewed before in this session, otherwise
    // fetches it fresh, same as the very first load.
    setActivePrepId(prepId);
  };

  // Get active materials based on section and sub-type (sorted ascending)
  const currentSectionMaterials = useMemo(() => {
    if (!data?.sections) return [];

    let materials: StudyMaterial[] = [];

    if (activeSection === 'syllabus') {
      materials = data.sections.syllabus || [];
    } else if (activeSection === 'subjective_topicwise') {
      const std = data.sections.subjective_topicwise?.standard || [];
      const ai = data.sections.subjective_topicwise?.ai || [];
      if (subjectiveSubtype === 'standard') materials = std;
      else if (subjectiveSubtype === 'ai') materials = ai;
      else materials = [...std, ...ai];
    } else if (activeSection === 'objective_topicwise') {
      const std = data.sections.objective_topicwise?.standard || [];
      const ai = data.sections.objective_topicwise?.ai || [];
      if (objectiveSubtype === 'standard') materials = std;
      else if (objectiveSubtype === 'ai') materials = ai;
      else materials = [...std, ...ai];
    } else if (activeSection === 'revision_notes') {
      const subj = data.sections.revision_notes?.subjective || [];
      const obj = data.sections.revision_notes?.objective || [];
      if (revisionSubtype === 'subjective') materials = subj;
      else if (revisionSubtype === 'objective') materials = obj;
      else materials = [...subj, ...obj];
    }

    return sortNotesAscending(materials);
  }, [data, activeSection, subjectiveSubtype, objectiveSubtype, revisionSubtype]);

  // Unique subjects for filtering
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    currentSectionMaterials.forEach(m => {
      if (m.subject_name) set.add(m.subject_name);
    });
    return Array.from(set);
  }, [currentSectionMaterials]);

  // Auto-reset stale subject filter when section or preparation changes
  useEffect(() => {
    if (selectedSubject !== 'all' && !availableSubjects.includes(selectedSubject)) {
      setSelectedSubject('all');
    }
  }, [availableSubjects, selectedSubject]);

  // Filtered materials (consistently sorted ascending)
  const filteredMaterials = useMemo(() => {
    const filtered = currentSectionMaterials.filter(m => {
      // Subject filter
      if (selectedSubject !== 'all' && m.subject_name !== selectedSubject) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = m.title?.toLowerCase().includes(q);
        const descMatch = m.description?.toLowerCase().includes(q);
        const subjMatch = m.subject_name?.toLowerCase().includes(q);
        const chapMatch = m.chapter_name?.toLowerCase().includes(q);
        const topicMatch = m.topic_name?.toLowerCase().includes(q);
        return titleMatch || descMatch || subjMatch || chapMatch || topicMatch;
      }
      return true;
    });
    return sortNotesAscending(filtered);
  }, [currentSectionMaterials, selectedSubject, searchQuery]);

  if (error && !data) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Access Restricted or Load Error</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">{error}</p>
        <Button onClick={() => refetch()} className="bg-[#1A2E44] text-white">
          <RefreshCw className="w-4 h-4 mr-2" /> Try Again
        </Button>
      </div>
    );
  }

  if (!loading && (!data?.authorizedPreparations || data.authorizedPreparations.length === 0)) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-20 h-20 bg-blue-50 text-[#1A2E44] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100">
          <BookOpen className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">No Active Enrollments Found</h2>
        <p className="text-muted-foreground max-w-lg mx-auto mb-8 leading-relaxed">
          You are not currently enrolled in any preparation courses. Enroll in a Loksewa PSC preparation course to access your official syllabus, topicwise detailed notes, and revision materials.
        </p>
        <Link href="/courses">
          <Button className="bg-[#1A2E44] hover:bg-[#2A4365] text-white px-6 py-2.5 rounded-xl font-medium shadow-md">
            Explore Preparation Courses
          </Button>
        </Link>
      </div>
    );
  }

  const activePrep = data?.selectedPreparation;

  return (
    <div className="max-w-[1400px] mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-8">

      {/* 1. HEADER & PREPARATION SELECTOR */}
      <div className="bg-gradient-to-br from-[#0F1E2E] via-[#162A3E] to-[#1E3A58] text-white rounded-2xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
        {/* Cached content stays on screen during a background revalidation
            (e.g. returning to this page after the 5 min staleTime) - this is
            the only visible sign a refresh is happening, never a full-page
            reload back to the loading state. */}
        {isFetching && !loading && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 text-[11px] font-medium text-white/60 bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-sm">
            <Loader2 className="w-3 h-3 animate-spin" /> Updating...
          </div>
        )}
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            {/* Breadcrumb pills */}
            {loading && !data ? (
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 w-20 rounded-md bg-white/10 animate-pulse" />
                <ChevronRight className="w-3.5 h-3.5 text-white/30" />
                <div className="h-6 w-24 rounded-md bg-white/10 animate-pulse" />
                <ChevronRight className="w-3.5 h-3.5 text-white/30" />
                <div className="h-6 w-36 rounded-md bg-[#C4A45C]/20 border border-[#C4A45C]/30 animate-pulse" />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#C4A45C] mb-3">
                <span className="bg-white/10 px-2.5 py-1 rounded-md backdrop-blur-sm">
                  {activePrep?.categoryName || "PSC Exams"}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-white/50" />
                <span className="bg-white/10 px-2.5 py-1 rounded-md backdrop-blur-sm">
                  {activePrep?.levelName || "Exam Level"}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-white/50" />
                <span className="bg-[#C4A45C]/20 text-[#E7CA85] border border-[#C4A45C]/30 px-2.5 py-1 rounded-md backdrop-blur-sm">
                  {activePrep?.name || "Preparation"}
                </span>
              </div>
            )}

            {loading && !data ? (
              <div className="h-8 w-64 bg-white/15 rounded-lg animate-pulse mb-2" />
            ) : (
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                {activePrep?.name ? `${activePrep.name} — ${pageTitle}` : pageTitle}
              </h1>
            )}
            <p className="text-sm text-slate-300 max-w-2xl">
              {pageSubtitle}
            </p>
          </div>

          {/* Preparation Switcher (if student has multiple enrollments) */}
          {(data?.authorizedPreparations?.length ?? 0) > 1 && (
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/15 shrink-0">
              <label className="text-xs font-medium text-slate-300 block mb-1.5 px-1">
                Switch Preparation:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {data?.authorizedPreparations?.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePrepChange(p.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      activePrep?.id === p.id
                        ? "bg-[#C4A45C] text-[#0A1118] shadow-sm font-bold"
                        : "bg-white/5 text-white/80 hover:bg-white/15"
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Real Database Content Counts Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Syllabus</div>
            {loading && !data ? (
              <div className="h-7 w-16 bg-white/10 rounded animate-pulse mt-1" />
            ) : (
              <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {data?.counts?.syllabus ?? 0} <span className="text-xs font-medium text-slate-400">files</span>
              </div>
            )}
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Subjective Topicwise</div>
            {loading && !data ? (
              <div className="h-7 w-16 bg-white/10 rounded animate-pulse mt-1" />
            ) : (
              <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {data?.counts?.subjective_topicwise ?? 0} <span className="text-xs font-medium text-slate-400">materials</span>
              </div>
            )}
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Objective Topicwise</div>
            {loading && !data ? (
              <div className="h-7 w-16 bg-white/10 rounded animate-pulse mt-1" />
            ) : (
              <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {data?.counts?.objective_topicwise ?? 0} <span className="text-xs font-medium text-slate-400">materials</span>
              </div>
            )}
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Revision Notes</div>
            {loading && !data ? (
              <div className="h-7 w-16 bg-white/10 rounded animate-pulse mt-1" />
            ) : (
              <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {data?.counts?.revision_notes ?? 0} <span className="text-xs font-medium text-slate-400">materials</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. SECTION TABS (The 4 core client sections) */}
      <div className="flex flex-col gap-4">
        <div className="border-b border-border bg-card rounded-xl p-1.5 shadow-sm">
          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <button
              onClick={() => setActiveSection('syllabus')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all whitespace-nowrap",
                activeSection === 'syllabus'
                  ? "bg-[#1A2E44] text-white shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <BookOpen className="w-4 h-4" />
              <span>Syllabus</span>
              <Badge className={cn("ml-1.5 text-xs py-0 px-2", activeSection === 'syllabus' ? "bg-[#C4A45C] text-[#0A1118]" : "bg-muted text-foreground")}>
                {data?.counts?.syllabus ?? 0}
              </Badge>
            </button>

            <button
              onClick={() => setActiveSection('subjective_topicwise')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all whitespace-nowrap",
                activeSection === 'subjective_topicwise'
                  ? "bg-[#1A2E44] text-white shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <FileText className="w-4 h-4" />
              <span>Subjective Topicwise Notes [Detailed]</span>
              <Badge className={cn("ml-1.5 text-xs py-0 px-2", activeSection === 'subjective_topicwise' ? "bg-[#C4A45C] text-[#0A1118]" : "bg-muted text-foreground")}>
                {data?.counts?.subjective_topicwise ?? 0}
              </Badge>
            </button>

            <button
              onClick={() => setActiveSection('objective_topicwise')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all whitespace-nowrap",
                activeSection === 'objective_topicwise'
                  ? "bg-[#1A2E44] text-white shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Layers className="w-4 h-4" />
              <span>Objective Topicwise Notes [Detailed]</span>
              <Badge className={cn("ml-1.5 text-xs py-0 px-2", activeSection === 'objective_topicwise' ? "bg-[#C4A45C] text-[#0A1118]" : "bg-muted text-foreground")}>
                {data?.counts?.objective_topicwise ?? 0}
              </Badge>
            </button>

            <button
              onClick={() => setActiveSection('revision_notes')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all whitespace-nowrap",
                activeSection === 'revision_notes'
                  ? "bg-[#1A2E44] text-white shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Sparkles className="w-4 h-4" />
              <span>Revision Notes</span>
              <Badge className={cn("ml-1.5 text-xs py-0 px-2", activeSection === 'revision_notes' ? "bg-[#C4A45C] text-[#0A1118]" : "bg-muted text-foreground")}>
                {data?.counts?.revision_notes ?? 0}
              </Badge>
            </button>
          </div>
        </div>

        {/* Sub-type Filters & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
          
          {/* Sub-type Switcher */}
          <div className="flex items-center gap-2">
            {activeSection === 'subjective_topicwise' && (
              <div className="inline-flex bg-muted p-1 rounded-lg">
                <button
                  onClick={() => setSubjectiveSubtype('all')}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-all", subjectiveSubtype === 'all' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  All ({data?.counts?.subjective_topicwise ?? 0})
                </button>
                <button
                  onClick={() => setSubjectiveSubtype('standard')}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-all", subjectiveSubtype === 'standard' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  Standard ({data?.sections?.subjective_topicwise?.standard?.length || 0})
                </button>
                <button
                  onClick={() => setSubjectiveSubtype('ai')}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1", subjectiveSubtype === 'ai' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  <Sparkles className="w-3 h-3 text-[#C4A45C]" /> AI ({data?.sections?.subjective_topicwise?.ai?.length || 0})
                </button>
              </div>
            )}

            {activeSection === 'objective_topicwise' && (
              <div className="inline-flex bg-muted p-1 rounded-lg">
                <button
                  onClick={() => setObjectiveSubtype('all')}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-all", objectiveSubtype === 'all' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  All ({data?.counts?.objective_topicwise ?? 0})
                </button>
                <button
                  onClick={() => setObjectiveSubtype('standard')}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-all", objectiveSubtype === 'standard' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  Standard ({data?.sections?.objective_topicwise?.standard?.length || 0})
                </button>
                <button
                  onClick={() => setObjectiveSubtype('ai')}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1", objectiveSubtype === 'ai' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  <Sparkles className="w-3 h-3 text-[#C4A45C]" /> AI ({data?.sections?.objective_topicwise?.ai?.length || 0})
                </button>
              </div>
            )}

            {activeSection === 'revision_notes' && (
              <div className="inline-flex bg-muted p-1 rounded-lg">
                <button
                  onClick={() => setRevisionSubtype('all')}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-all", revisionSubtype === 'all' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  All ({data?.counts?.revision_notes ?? 0})
                </button>
                <button
                  onClick={() => setRevisionSubtype('subjective')}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-all", revisionSubtype === 'subjective' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  Subjective ({data?.sections?.revision_notes?.subjective?.length || 0})
                </button>
                <button
                  onClick={() => setRevisionSubtype('objective')}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-all", revisionSubtype === 'objective' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  Objective ({data?.sections?.revision_notes?.objective?.length || 0})
                </button>
              </div>
            )}

            {activeSection === 'syllabus' && (
              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#1A2E44]" /> Official Syllabus Curriculum Documents
              </div>
            )}
          </div>

          {/* Search & Subject filter */}
          <div className="flex items-center gap-3">
            {availableSubjects.length > 1 && (
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="text-xs font-medium bg-muted border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-[#1A2E44]"
              >
                <option value="all">All Subjects</option>
                {availableSubjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search topic or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-muted/60 border-border"
              />
            </div>
          </div>

        </div>
      </div>

      {/* 3. MATERIAL CARDS LIST / GRID */}
      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`skeleton-card-${i}`}
              className="bg-card rounded-xl border border-border shadow-sm p-5 flex flex-col justify-between h-[270px] animate-pulse"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="h-5 w-24 bg-muted rounded-md" />
                  <div className="h-4 w-16 bg-muted/60 rounded-md" />
                </div>
                <div className="h-6 w-4/5 bg-muted rounded-md mb-2" />
                <div className="h-4 w-full bg-muted/50 rounded-md mb-4" />
                <div className="space-y-1.5 p-2 rounded-lg bg-muted/30 border border-border/40">
                  <div className="h-3.5 w-1/2 bg-muted/70 rounded" />
                  <div className="h-3 w-1/3 bg-muted/50 rounded" />
                </div>
              </div>
              <div className="pt-4 border-t border-border flex items-center justify-between gap-2">
                <div className="h-8 w-24 bg-muted rounded-lg" />
                <div className="h-8 w-28 bg-muted rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <Card className="border-dashed border-2 border-border p-12 text-center bg-card">
          <CardContent className="flex flex-col items-center justify-center p-0">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">No Materials Available</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              {searchQuery || selectedSubject !== 'all'
                ? "No study materials match your search filters."
                : "Content for this section is currently being prepared and verified by our faculty."}
            </p>
            {(searchQuery || selectedSubject !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSubject("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((material) => {
            const hasPdf = Boolean(material.file_url || material.file);

            return (
              <div
                key={material.id}
                className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden hover:border-primary/40 dark:hover:border-[#D4A72C]/40 group"
              >
                <div className="p-5 flex-1 flex flex-col">
                  {/* Category & Type badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      {material.note_type === 'ai' && (
                        <Badge variant="outline" className="bg-[#C4A45C]/15 text-[#8C6D23] border-[#C4A45C]/30 text-[11px] font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> AI Generated
                        </Badge>
                      )}
                      {material.note_type === 'standard' && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-bold">
                          Standard Note
                        </Badge>
                      )}
                      {material.note_type === 'subjective' && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-bold">
                          Subjective
                        </Badge>
                      )}
                      {material.note_type === 'objective' && (
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[11px] font-bold">
                          Objective
                        </Badge>
                      )}
                      {material.content_category === 'syllabus' && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[11px] font-bold">
                          Curriculum
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 mr-1" /> {material.estimated_reading_time || 5} min read
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-foreground group-hover:text-[#163E6B] dark:group-hover:text-[#D4A72C] transition-colors line-clamp-2 mb-2">
                    {material.title}
                  </h3>

                  {/* Hierarchy breadcrumbs (Subject > Chapter > Topic) */}
                  <div className="space-y-1 mb-3 text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border/40">
                    {material.subject_name && (
                      <div className="font-semibold text-foreground/80 truncate">
                        📚 {material.subject_name}
                      </div>
                    )}
                    {material.chapter_name && (
                      <div className="text-muted-foreground truncate pl-1">
                        ↳ 📖 {material.chapter_name}
                      </div>
                    )}
                    {material.topic_name && (
                      <div className="text-muted-foreground truncate pl-2">
                        ↳ 🔹 {material.topic_name}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {material.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                      {material.description}
                    </p>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="bg-muted/30 px-5 py-3 border-t border-border flex items-center justify-between gap-3 mt-auto">
                  {hasPdf ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setViewingMaterial(material)}
                        className="bg-[#1A2E44] hover:bg-[#2A4365] text-white text-xs font-semibold h-8 rounded-lg flex-1 shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" /> View PDF
                      </Button>

                      {hasPdf && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (material.is_downloadable === false) {
                              toast.error('Download is disabled for this material.');
                              return;
                            }
                            try {
                              await notesApi.downloadMaterial(material.id, `${material.slug || 'note'}.pdf`);
                              toast.success('Download started');
                            } catch (err: unknown) {
                              const errorObj = err as { data?: { detail?: string }; message?: string };
                              toast.error(errorObj?.data?.detail || errorObj?.message || 'Download not authorized or unavailable.');
                            }
                          }}
                          disabled={material.is_downloadable === false}
                          className={`inline-flex items-center justify-center h-8 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                            material.is_downloadable === false
                              ? "border-border/50 bg-muted/30 text-muted-foreground/40 cursor-not-allowed opacity-50"
                              : "border-border bg-card text-foreground hover:bg-muted"
                          }`}
                          title={material.is_downloadable === false ? "Downloads disabled for this note" : "Download PDF"}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  ) : (
                    <Link href={`/student/notes/${material.id}`} className="w-full">
                      <Button
                        size="sm"
                        className="bg-[#1A2E44] hover:bg-[#2A4365] text-white text-xs font-semibold h-8 rounded-lg w-full shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" /> Read Material
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. MODAL PDF / DOCUMENT VIEWER (STUDENT SAFE, ZERO ADMIN CONTROLS) */}
      {viewingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4">
          <div
            className={cn(
              "bg-card rounded-2xl shadow-2xl flex flex-col border border-border overflow-hidden transition-all duration-200",
              isMaximized ? "w-full h-full rounded-none" : "w-full max-w-5xl h-[88vh]"
            )}
          >
            {/* Modal Header */}
            <div className="relative bg-[#0F1E2E] text-white px-5 py-3.5 flex items-center justify-between border-b border-white/10 shrink-0 gap-4">
              {/* Left: Document Title */}
              <div className="min-w-0 pr-2 max-w-[50%] sm:max-w-[35%]">
                <h2 className="text-sm sm:text-base md:text-lg font-bold truncate text-white" title={viewingMaterial.title}>
                  {viewingMaterial.title}
                </h2>
                {/* Fallback for small screens (< sm) */}
                <div className="flex sm:hidden items-center gap-1.5 text-[10px] font-medium text-[#C4A45C] truncate mt-0.5">
                  <span className="truncate">{activePrep?.name}</span>
                  <span>•</span>
                  <span className="capitalize shrink-0">{viewingMaterial.content_category?.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Middle: Yellow color text centered in the header */}
              <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 text-xs font-semibold text-[#C4A45C] pointer-events-none max-w-[42%] truncate text-center">
                <span className="truncate">{activePrep?.name}</span>
                <span className="shrink-0">•</span>
                <span className="capitalize shrink-0">{viewingMaterial.content_category?.replace('_', ' ')}</span>
                {viewingMaterial.note_type && (
                  <>
                    <span className="shrink-0">•</span>
                    <span className="capitalize shrink-0">{viewingMaterial.note_type}</span>
                  </>
                )}
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-1.5 shrink-0 z-10">
                <button
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                  title={isMaximized ? "Restore window" : "Maximize"}
                >
                  {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => {
                    setViewingMaterial(null);
                    setIsMaximized(false);
                  }}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/80 hover:text-red-400 transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / First-Party PDF Viewer */}
            <div className="flex-1 bg-slate-900 relative overflow-hidden flex flex-col">
              {viewingMaterial.file || viewingMaterial.file_url ? (
                <FirstPartyPdfViewer
                  url={viewingMaterial.file || viewingMaterial.file_url}
                  title={viewingMaterial.title}
                  allowDownload={viewingMaterial.is_downloadable !== false}
                  onDownload={async () => {
                    try {
                      await notesApi.downloadMaterial(
                        viewingMaterial.id,
                        `${viewingMaterial.slug || viewingMaterial.title}.pdf`
                      );
                      toast.success('Download started');
                    } catch (err: unknown) {
                      const errorObj = err as { data?: { detail?: string }; message?: string };
                      toast.error(errorObj?.data?.detail || errorObj?.message || 'Download not authorized or unavailable.');
                    }
                  }}
                />
              ) : viewingMaterial.content ? (
                <div className="p-6 overflow-y-auto max-w-4xl mx-auto prose prose-slate dark:prose-invert">
                  <div dangerouslySetInnerHTML={{ __html: viewingMaterial.content }} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-400 mb-3" />
                  <p className="font-semibold text-base">File cannot be previewed directly.</p>
                  <p className="text-xs text-muted-foreground mt-1">Please use the download button to view the file on your device.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
