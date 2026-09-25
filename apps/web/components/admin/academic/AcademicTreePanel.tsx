"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Layers,
  BookOpen,
  FileText,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Archive,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AcademicSubject,
  AcademicChapter,
  AcademicTopic,
} from "@/lib/api/admin-study-materials";

export type SelectedAcademicNodeType = "preparation" | "subject" | "chapter" | "topic";

export interface SelectedAcademicNode {
  type: SelectedAcademicNodeType;
  subject?: AcademicSubject | null;
  chapter?: AcademicChapter | null;
  topic?: AcademicTopic | null;
}

interface AcademicTreePanelProps {
  preparationId: number;
  preparationName: string;
  subjects: AcademicSubject[];
  loading: boolean;
  selectedNode: SelectedAcademicNode;
  onSelectNode: (node: SelectedAcademicNode) => void;
  onAddSubject: () => void;
  onEditSubject: (subject: AcademicSubject) => void;
  onDeleteSubject: (subject: AcademicSubject) => void;
  onArchiveSubject: (subject: AcademicSubject) => void;
  onAddChapter: (subject: AcademicSubject) => void;
  onEditChapter: (subject: AcademicSubject, chapter: AcademicChapter) => void;
  onDeleteChapter: (chapter: AcademicChapter) => void;
  onArchiveChapter: (chapter: AcademicChapter) => void;
  onAddTopic: (chapter: AcademicChapter, subject?: AcademicSubject) => void;
  onEditTopic: (chapter: AcademicChapter, topic: AcademicTopic) => void;
  onDeleteTopic: (topic: AcademicTopic) => void;
  onArchiveTopic: (topic: AcademicTopic) => void;
  onAddNoteForNode: (node: SelectedAcademicNode) => void;
}

export function AcademicTreePanel({
  preparationId,
  preparationName,
  subjects,
  loading,
  selectedNode,
  onSelectNode,
  onAddSubject,
  onEditSubject,
  onDeleteSubject,
  onArchiveSubject,
  onAddChapter,
  onEditChapter,
  onDeleteChapter,
  onArchiveChapter,
  onAddTopic,
  onEditTopic,
  onDeleteTopic,
  onArchiveTopic,
  onAddNoteForNode,
}: AcademicTreePanelProps) {
  const [search, setSearch] = useState("");
  const [expandedSubjects, setExpandedSubjects] = useState<Set<number>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());

  // Expand all subjects by default on first load
  React.useEffect(() => {
    if (subjects.length > 0) {
      setExpandedSubjects(new Set(subjects.map((s) => s.id)));
      const allChapIds = subjects.flatMap((s) => s.chapters.map((c) => c.id));
      setExpandedChapters(new Set(allChapIds));
    }
  }, [subjects]);

  const toggleSubject = (id: number) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleChapter = (id: number) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter subjects/chapters/topics by search term
  const filteredSubjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subjects;

    return subjects
      .map((sub) => {
        const subMatches =
          sub.name.toLowerCase().includes(q) || (sub.code && sub.code.toLowerCase().includes(q));

        const matchedChapters = sub.chapters
          .map((chap) => {
            const chapMatches = chap.title.toLowerCase().includes(q);
            const matchedTopics = chap.topics.filter((top) => top.name.toLowerCase().includes(q));

            if (chapMatches || matchedTopics.length > 0) {
              return {
                ...chap,
                topics: chapMatches ? chap.topics : matchedTopics,
              };
            }
            return null;
          })
          .filter(Boolean) as AcademicChapter[];

        if (subMatches || matchedChapters.length > 0) {
          return {
            ...sub,
            chapters: subMatches ? sub.chapters : matchedChapters,
          };
        }
        return null;
      })
      .filter(Boolean) as AcademicSubject[];
  }, [subjects, search]);

  const totalChapters = useMemo(
    () => subjects.reduce((sum, s) => sum + (s.chapters?.length || 0), 0),
    [subjects]
  );
  const totalTopics = useMemo(
    () =>
      subjects.reduce(
        (sum, s) => sum + s.chapters.reduce((cSum, c) => cSum + (c.topics?.length || 0), 0),
        0
      ),
    [subjects]
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D4A72C]" />
            <h3 className="font-extrabold text-sm text-[#0B2545] dark:text-white uppercase tracking-wider">
              Academic Tree
            </h3>
          </div>
          <Button
            size="sm"
            onClick={onAddSubject}
            className="h-7 text-xs bg-[#0B2545] hover:bg-[#163E6C] text-white px-2.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Subject
          </Button>
        </div>

        {/* Counts summary bar */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
          <span>{subjects.length} Subjects</span>
          <span>&bull;</span>
          <span>{totalChapters} Chapters</span>
          <span>&bull;</span>
          <span>{totalTopics} Topics</span>
        </div>

        {/* Search */}
        <div className="relative mt-2.5">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search subjects, chapters, topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
        </div>
      </div>

      {/* Tree Content */}
      <div className="p-2 overflow-y-auto max-h-[580px] space-y-1 text-sm select-none">
        {/* Preparation Root Node */}
        <div
          onClick={() => onSelectNode({ type: "preparation" })}
          className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
            selectedNode.type === "preparation"
              ? "bg-[#0B2545] text-white font-bold shadow-xs"
              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold"
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Layers
              className={`w-4 h-4 ${
                selectedNode.type === "preparation" ? "text-[#D4A72C]" : "text-[#0B2545] dark:text-[#C4A45C]"
              }`}
            />
            <span className="truncate">{preparationName}</span>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              selectedNode.type === "preparation"
                ? "bg-white/20 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500"
            }`}
          >
            Root
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading academic tree...</div>
        ) : filteredSubjects.length === 0 ? (
          <div className="py-12 text-center text-slate-400 px-4 space-y-2">
            <Layers className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-xs">No academic subjects yet.</p>
            <Button
              size="sm"
              variant="outline"
              onClick={onAddSubject}
              className="text-xs h-7 border-slate-300"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add First Subject
            </Button>
          </div>
        ) : (
          filteredSubjects.map((subject) => {
            const isSubExpanded = expandedSubjects.has(subject.id);
            const isSubSelected =
              selectedNode.type === "subject" && selectedNode.subject?.id === subject.id;

            return (
              <div key={subject.id} className="space-y-0.5">
                {/* Subject Node */}
                <div
                  className={`group flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-all ${
                    isSubSelected
                      ? "bg-blue-50 dark:bg-blue-950/40 text-[#0B2545] dark:text-blue-200 font-bold border border-blue-200 dark:border-blue-900"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                  }`}
                  onClick={() => onSelectNode({ type: "subject", subject })}
                >
                  <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSubject(subject.id);
                      }}
                      className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600"
                    >
                      {isSubExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <BookOpen
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSubSelected ? "text-[#0B2545] dark:text-[#C4A45C]" : "text-slate-500"
                      }`}
                    />

                    <span className="truncate text-xs font-semibold">{subject.name}</span>

                    {subject.code && (
                      <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 font-mono">
                        {subject.code}
                      </span>
                    )}

                    {subject.is_active === false && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-600 shrink-0 font-bold">
                        Archived
                      </span>
                    )}
                  </div>

                  {/* Badges & Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                      {subject.chapters?.length || 0} chaps
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 p-1 rounded text-slate-400 hover:text-slate-700">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 text-xs">
                        <DropdownMenuItem onClick={() => onAddChapter(subject)}>
                          <Plus className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Add Chapter
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAddNoteForNode({ type: "subject", subject })}>
                          <FileText className="w-3.5 h-3.5 mr-1.5 text-[#C4A45C]" /> Add Note
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEditSubject(subject)}>
                          <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit Subject
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onArchiveSubject(subject)}>
                          <Archive className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                          {subject.is_active === false ? "Activate Subject" : "Archive Subject"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeleteSubject(subject)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Subject
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Chapters List */}
                {isSubExpanded && (
                  <div className="pl-4 space-y-0.5 border-l-2 border-slate-100 dark:border-slate-800 ml-3">
                    {subject.chapters.length === 0 ? (
                      <div className="py-1 px-2 text-[11px] text-slate-400 italic flex items-center justify-between">
                        <span>No chapters yet</span>
                        <button
                          onClick={() => onAddChapter(subject)}
                          className="text-blue-600 font-bold hover:underline"
                        >
                          + Add
                        </button>
                      </div>
                    ) : (
                      subject.chapters.map((chapter) => {
                        const isChapExpanded = expandedChapters.has(chapter.id);
                        const isChapSelected =
                          selectedNode.type === "chapter" &&
                          selectedNode.chapter?.id === chapter.id;

                        return (
                          <div key={chapter.id} className="space-y-0.5">
                            {/* Chapter Node */}
                            <div
                              className={`group flex items-center justify-between py-1 px-2 rounded-lg cursor-pointer transition-all ${
                                isChapSelected
                                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold border border-amber-200 dark:border-amber-800"
                                  : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                              }`}
                              onClick={() =>
                                onSelectNode({
                                  type: "chapter",
                                  subject,
                                  chapter,
                                })
                              }
                            >
                              <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleChapter(chapter.id);
                                  }}
                                  className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600"
                                >
                                  {isChapExpanded ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3" />
                                  )}
                                </button>

                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />

                                <span className="truncate text-[11px] font-medium">
                                  {chapter.title || chapter.name}
                                </span>

                                {chapter.is_active === false && (
                                  <span className="text-[8px] px-1 py-0.2 rounded-full bg-slate-200 text-slate-600 shrink-0 font-bold">
                                    Archived
                                  </span>
                                )}
                              </div>

                              {/* Chapter Actions */}
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                                  {chapter.topics?.length || 0} top
                                </span>

                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    asChild
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button className="opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 p-0.5 rounded text-slate-400 hover:text-slate-700">
                                      <MoreVertical className="w-3 h-3" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-36 text-xs">
                                    <DropdownMenuItem
                                      onClick={() => onAddTopic(chapter, subject)}
                                    >
                                      <Plus className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Add
                                      Topic
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        onAddNoteForNode({
                                          type: "chapter",
                                          subject,
                                          chapter,
                                        })
                                      }
                                    >
                                      <FileText className="w-3.5 h-3.5 mr-1.5 text-[#C4A45C]" /> Add
                                      Note
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => onEditChapter(subject, chapter)}
                                    >
                                      <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onArchiveChapter(chapter)}>
                                      <Archive className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                                      {chapter.is_active === false ? "Activate" : "Archive"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => onDeleteChapter(chapter)}
                                      className="text-red-600 dark:text-red-400"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            {/* Topics List */}
                            {isChapExpanded && (
                              <div className="pl-4 space-y-0.5 border-l-2 border-slate-100 dark:border-slate-800 ml-2">
                                {chapter.topics.length === 0 ? (
                                  <div className="py-0.5 px-2 text-[10px] text-slate-400 italic flex items-center justify-between">
                                    <span>No topics yet</span>
                                    <button
                                      onClick={() => onAddTopic(chapter, subject)}
                                      className="text-blue-600 font-bold hover:underline"
                                    >
                                      + Add
                                    </button>
                                  </div>
                                ) : (
                                  chapter.topics.map((topic) => {
                                    const isTopSelected =
                                      selectedNode.type === "topic" &&
                                      selectedNode.topic?.id === topic.id;

                                    return (
                                      <div
                                        key={topic.id}
                                        className={`group flex items-center justify-between py-1 px-2 rounded-lg cursor-pointer transition-all ${
                                          isTopSelected
                                            ? "bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold border border-purple-200 dark:border-purple-800"
                                            : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400"
                                        }`}
                                        onClick={() =>
                                          onSelectNode({
                                            type: "topic",
                                            subject,
                                            chapter,
                                            topic,
                                          })
                                        }
                                      >
                                        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                                          <FileText
                                            className={`w-3 h-3 shrink-0 ${
                                              isTopSelected
                                                ? "text-purple-600 dark:text-purple-400"
                                                : "text-slate-400"
                                            }`}
                                          />
                                          <span className="truncate text-[11px]">{topic.name}</span>

                                          {topic.is_active === false && (
                                            <span className="text-[8px] px-1 py-0.2 rounded-full bg-slate-200 text-slate-600 shrink-0 font-bold">
                                              Archived
                                            </span>
                                          )}
                                        </div>

                                        {/* Topic Actions */}
                                        <div className="flex items-center gap-1 shrink-0">
                                          {topic.notes_count ? (
                                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold">
                                              {topic.notes_count} notes
                                            </span>
                                          ) : null}

                                          <DropdownMenu>
                                            <DropdownMenuTrigger
                                              asChild
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <button className="opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 p-0.5 rounded text-slate-400 hover:text-slate-700">
                                                <MoreVertical className="w-3 h-3" />
                                              </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-36 text-xs">
                                              <DropdownMenuItem
                                                onClick={() =>
                                                  onAddNoteForNode({
                                                    type: "topic",
                                                    subject,
                                                    chapter,
                                                    topic,
                                                  })
                                                }
                                              >
                                                <FileText className="w-3.5 h-3.5 mr-1.5 text-[#C4A45C]" />{" "}
                                                Upload Note
                                              </DropdownMenuItem>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem
                                                onClick={() => onEditTopic(chapter, topic)}
                                              >
                                                <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit Topic
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                onClick={() => onArchiveTopic(topic)}
                                              >
                                                <Archive className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                                                {topic.is_active === false ? "Activate" : "Archive"}
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                onClick={() => onDeleteTopic(topic)}
                                                className="text-red-600 dark:text-red-400"
                                              >
                                                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
