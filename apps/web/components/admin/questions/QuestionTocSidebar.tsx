'use client';

import React, { useState, useEffect } from 'react';
import { adminQuestionApi, QuestionTocResponse, QuestionTocSubject, QuestionTocChapter, QuestionTocTopic } from '@/lib/api/admin-questions';
import { BookOpen, ChevronDown, ChevronRight, Folder, FolderOpen, FileText, Search, X, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { InlineLoader } from '@/components/ui/loading-states';

interface QuestionTocSidebarProps {
  examId?: string | number | null;
  categoryId?: string | number | null;
  activeSubjectId?: string | number | null;
  activeChapterId?: string | number | null;
  activeTopicId?: string | number | null;
  onSelectNode: (selection: {
    subjectId?: number | null;
    chapterId?: number | null;
    topicId?: number | null;
    subjectName?: string;
    chapterName?: string;
    topicName?: string;
  }) => void;
  onClearFilter: () => void;
}

export function QuestionTocSidebar({
  examId,
  categoryId,
  activeSubjectId,
  activeChapterId,
  activeTopicId,
  onSelectNode,
  onClearFilter,
}: QuestionTocSidebarProps) {
  const [tocData, setTocData] = useState<QuestionTocResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedSubjects, setExpandedSubjects] = useState<Set<number>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!examId && !categoryId) {
      setTocData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    adminQuestionApi.getToc({
      exam: examId || undefined,
      category: categoryId || undefined,
    })
      .then((data) => {
        if (!isMounted) return;
        setTocData(data);
        // Default expand the first 3 subjects and all chapters with questions
        const subIds = new Set<number>();
        const chapIds = new Set<number>();
        (data.subjects || []).forEach((s, idx) => {
          if (idx < 2 || s.counts.total > 0 || (activeSubjectId && String(s.id) === String(activeSubjectId))) {
            subIds.add(s.id);
            s.chapters.forEach((c) => {
              if (c.counts.total > 0 || (activeChapterId && String(c.id) === String(activeChapterId))) {
                chapIds.add(c.id);
              }
            });
          }
        });
        setExpandedSubjects(subIds);
        setExpandedChapters(chapIds);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load Question TOC', err);
        setTocData(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [examId, categoryId]);

  // Keep active nodes expanded
  useEffect(() => {
    if (activeSubjectId) {
      setExpandedSubjects(prev => new Set(prev).add(Number(activeSubjectId)));
    }
    if (activeChapterId) {
      setExpandedChapters(prev => new Set(prev).add(Number(activeChapterId)));
    }
  }, [activeSubjectId, activeChapterId]);

  const toggleSubject = (sId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(sId)) next.delete(sId);
      else next.add(sId);
      return next;
    });
  };

  const toggleChapter = (cId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(cId)) next.delete(cId);
      else next.add(cId);
      return next;
    });
  };

  if (!examId && !categoryId) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm text-center">
        <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center mx-auto mb-3">
          <BookOpen className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">Curriculum Table of Contents</h3>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          Select an Exam Category &amp; Preparation above to browse textbook-style chapter and topic questions.
        </p>
      </div>
    );
  }

  const isScopeActive = Boolean(activeSubjectId || activeChapterId || activeTopicId);

  // Filter TOC by local search query
  const matchesQuery = (text: string) => text.toLowerCase().includes(searchQuery.toLowerCase());

  const filteredSubjects = (tocData?.subjects || []).filter(sub => {
    if (!searchQuery) return true;
    if (matchesQuery(sub.name) || matchesQuery(sub.code || '')) return true;
    return sub.chapters.some(chap => 
      matchesQuery(chap.title) || chap.topics.some(t => matchesQuery(t.name))
    );
  });

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col h-full max-h-[calc(100vh-140px)] sticky top-4">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50/70">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-4 h-4 text-blue-700 shrink-0" />
            <h3 className="text-sm font-bold text-gray-900 truncate" title={tocData?.exam?.name || 'Table of Contents'}>
              {tocData?.exam?.name || 'Curriculum TOC'}
            </h3>
          </div>
          {tocData && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 shrink-0">
              {tocData.counts.total} Qs
            </span>
          )}
        </div>

        {/* Quick Search inside TOC */}
        <div className="relative mt-2">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter subjects, chapters..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Active scope bar */}
        {isScopeActive && (
          <div className="mt-2.5 pt-2 border-t border-gray-200/60 flex items-center justify-between text-xs">
            <span className="text-blue-800 font-medium truncate">Filtering active scope</span>
            <button
              onClick={onClearFilter}
              className="text-blue-600 hover:text-blue-800 font-semibold underline shrink-0 ml-2"
            >
              Reset to All
            </button>
          </div>
        )}
      </div>

      {/* Tree Content */}
      <div className="p-2 overflow-y-auto flex-1 space-y-1 text-sm">
        {loading ? (
          <div className="py-8 text-center text-gray-400">
            <InlineLoader text="Loading curriculum..." className="justify-center text-xs" />
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="py-8 text-center px-4">
            <p className="text-xs text-gray-500">
              {searchQuery ? 'No matching subjects or chapters.' : 'No syllabus subjects configured for this preparation yet.'}
            </p>
          </div>
        ) : (
          filteredSubjects.map((sub) => {
            const isSubExpanded = expandedSubjects.has(sub.id) || Boolean(searchQuery);
            const isSubSelected = String(activeSubjectId) === String(sub.id) && !activeChapterId && !activeTopicId;

            return (
              <div key={sub.id} className="rounded-lg overflow-hidden border border-transparent">
                {/* Subject Row */}
                <div
                  onClick={() => onSelectNode({ subjectId: sub.id, subjectName: sub.name })}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-xs font-semibold ${
                    isSubSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-900 hover:bg-gray-100/80'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={(e) => toggleSubject(sub.id, e)}
                      className={`p-0.5 rounded hover:bg-black/10 shrink-0 ${isSubSelected ? 'text-white' : 'text-gray-400'}`}
                    >
                      {isSubExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                    {isSubExpanded ? (
                      <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${isSubSelected ? 'text-white' : 'text-blue-600'}`} />
                    ) : (
                      <Folder className={`w-3.5 h-3.5 shrink-0 ${isSubSelected ? 'text-white' : 'text-blue-500'}`} />
                    )}
                    <span className="truncate" title={sub.name}>{sub.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-1.5">
                    {sub.counts.pending > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSubSelected ? 'bg-amber-400 text-amber-950' : 'bg-amber-100 text-amber-800'
                        }`}
                        title={`${sub.counts.pending} pending review`}
                      >
                        {sub.counts.pending} rev
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        isSubSelected ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {sub.counts.total}
                    </span>
                  </div>
                </div>

                {/* Chapters inside Subject */}
                {isSubExpanded && sub.chapters.length > 0 && (
                  <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-gray-100 ml-4 my-0.5">
                    {sub.chapters.map((chap) => {
                      const isChapExpanded = expandedChapters.has(chap.id) || Boolean(searchQuery);
                      const isChapSelected = String(activeChapterId) === String(chap.id) && !activeTopicId;

                      return (
                        <div key={chap.id} className="space-y-0.5">
                          {/* Chapter Row */}
                          <div
                            onClick={() => onSelectNode({
                              subjectId: sub.id,
                              chapterId: chap.id,
                              subjectName: sub.name,
                              chapterName: chap.title,
                            })}
                            className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors text-xs ${
                              isChapSelected
                                ? 'bg-blue-100/90 text-blue-950 font-bold border border-blue-300'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              {chap.topics.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={(e) => toggleChapter(chap.id, e)}
                                  className="p-0.5 rounded hover:bg-black/10 text-gray-400 shrink-0"
                                >
                                  {isChapExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                </button>
                              ) : (
                                <span className="w-4 shrink-0" />
                              )}
                              <BookOpen className={`w-3 h-3 shrink-0 ${isChapSelected ? 'text-blue-800' : 'text-gray-400'}`} />
                              <span className="truncate" title={chap.title}>{chap.title}</span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 ml-1">
                              {chap.counts.pending > 0 && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                                  {chap.counts.pending}p
                                </span>
                              )}
                              <span className={`text-[10px] px-1 py-0.2 rounded font-medium ${isChapSelected ? 'bg-blue-200 text-blue-900' : 'bg-gray-100 text-gray-500'}`}>
                                {chap.counts.total}
                              </span>
                            </div>
                          </div>

                          {/* Topics inside Chapter */}
                          {isChapExpanded && chap.topics.length > 0 && (
                            <div className="pl-4 pr-1 py-0.5 space-y-0.5 border-l border-gray-200 ml-3">
                              {chap.topics.map((top) => {
                                const isTopSelected = String(activeTopicId) === String(top.id);

                                return (
                                  <div
                                    key={top.id}
                                    onClick={() => onSelectNode({
                                      subjectId: sub.id,
                                      chapterId: chap.id,
                                      topicId: top.id,
                                      subjectName: sub.name,
                                      chapterName: chap.title,
                                      topicName: top.name,
                                    })}
                                    className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors text-[11px] ${
                                      isTopSelected
                                        ? 'bg-blue-600 text-white font-semibold'
                                        : 'text-gray-600 hover:bg-gray-100/70'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <FileText className={`w-2.5 h-2.5 shrink-0 ${isTopSelected ? 'text-white' : 'text-gray-400'}`} />
                                      <span className="truncate" title={top.name}>{top.name}</span>
                                    </div>
                                    <span className={`text-[9px] px-1 py-0.2 rounded shrink-0 ${isTopSelected ? 'bg-blue-700 text-white' : 'text-gray-400'}`}>
                                      {top.counts.total}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Summary */}
      {tocData && (
        <div className="p-2.5 border-t border-gray-100 bg-gray-50/80 text-[11px] text-gray-500 flex items-center justify-between">
          <span>{filteredSubjects.length} Subjects</span>
          <span className="font-semibold text-gray-700">{tocData.counts.total} Total Questions</span>
        </div>
      )}
    </div>
  );
}
