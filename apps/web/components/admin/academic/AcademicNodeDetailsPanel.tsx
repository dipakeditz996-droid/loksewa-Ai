"use client";

import React, { useState } from "react";
import {
  BookOpen,
  FileText,
  Plus,
  Edit,
  Trash2,
  Archive,
  Eye,
  UploadCloud,
  CheckCircle2,
  Sparkles,
  Search,
  FolderTree,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CategoryHierarchyItem,
  LevelItem,
  PreparationItem,
  AcademicSubject,
  AcademicChapter,
  AcademicTopic,
  StudyMaterialListItem,
  ContentCategory,
  NoteType,
} from "@/lib/api/admin-study-materials";
import { SelectedAcademicNode } from "./AcademicTreePanel";

interface AcademicNodeDetailsPanelProps {
  activeCategory: CategoryHierarchyItem;
  activeLevel: LevelItem;
  activePreparation: PreparationItem;
  selectedNode: SelectedAcademicNode;
  materials: StudyMaterialListItem[];
  loadingMaterials: boolean;
  activeSection: ContentCategory;
  onSectionChange: (sec: ContentCategory) => void;
  activeSubType: string;
  onSubTypeChange: (sub: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  // Node CRUD callbacks
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
  // Notes Callbacks
  onOpenUploadNote: () => void;
  onViewPdf: (material: StudyMaterialListItem) => void;
  onReplacePdf: (material: StudyMaterialListItem) => void;
  onEditMaterial: (material: StudyMaterialListItem) => void;
  onTogglePublishMaterial: (material: StudyMaterialListItem) => void;
  onDeleteMaterial: (material: StudyMaterialListItem) => void;
  onSelectNode: (node: SelectedAcademicNode) => void;
}

const SECTION_CONFIG: {
  id: ContentCategory;
  label: string;
  subTypes: { value: NoteType; label: string }[];
}[] = [
  {
    id: "subjective_topicwise",
    label: "Subjective Topicwise Notes",
    subTypes: [
      { value: "standard", label: "Standard" },
      { value: "ai", label: "AI" },
    ],
  },
  {
    id: "objective_topicwise",
    label: "Objective Topicwise Notes",
    subTypes: [
      { value: "standard", label: "Standard" },
      { value: "ai", label: "AI" },
    ],
  },
  {
    id: "revision_notes",
    label: "Revision Notes",
    subTypes: [
      { value: "subjective", label: "Subjective" },
      { value: "objective", label: "Objective" },
    ],
  },
];

export function AcademicNodeDetailsPanel({
  activeCategory,
  activeLevel,
  activePreparation,
  selectedNode,
  materials,
  loadingMaterials,
  activeSection,
  onSectionChange,
  activeSubType,
  onSubTypeChange,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
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
  onOpenUploadNote,
  onViewPdf,
  onReplacePdf,
  onEditMaterial,
  onTogglePublishMaterial,
  onDeleteMaterial,
  onSelectNode,
}: AcademicNodeDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<"structure" | "notes">("structure");

  // Determine current node title, description, and stats
  const nodeTitle =
    selectedNode.type === "topic"
      ? selectedNode.topic?.name
      : selectedNode.type === "chapter"
      ? selectedNode.chapter?.title || selectedNode.chapter?.name
      : selectedNode.type === "subject"
      ? selectedNode.subject?.name
      : activePreparation.name;

  const nodeCode = selectedNode.type === "subject" ? selectedNode.subject?.code : undefined;
  const nodeDescription =
    selectedNode.type === "topic"
      ? selectedNode.topic?.description
      : selectedNode.type === "chapter"
      ? selectedNode.chapter?.description
      : selectedNode.type === "subject"
      ? selectedNode.subject?.description
      : activePreparation.courseTitle;

  const nodeIsActive =
    selectedNode.type === "topic"
      ? selectedNode.topic?.is_active ?? true
      : selectedNode.type === "chapter"
      ? selectedNode.chapter?.is_active ?? true
      : selectedNode.type === "subject"
      ? selectedNode.subject?.is_active ?? true
      : !activePreparation.isComingSoon;

  // Counts
  const chaptersCount =
    selectedNode.type === "subject"
      ? selectedNode.subject?.chapters?.length || 0
      : undefined;

  const topicsCount =
    selectedNode.type === "chapter"
      ? selectedNode.chapter?.topics?.length || 0
      : selectedNode.type === "subject"
      ? selectedNode.subject?.chapters?.reduce((sum, c) => sum + (c.topics?.length || 0), 0) || 0
      : undefined;

  const notesCount =
    selectedNode.type === "topic"
      ? selectedNode.topic?.notes_count ?? 0
      : selectedNode.type === "chapter"
      ? selectedNode.chapter?.notes_count ?? 0
      : selectedNode.type === "subject"
      ? selectedNode.subject?.notes_count ?? 0
      : activePreparation.counts.total;

  const questionsCount =
    selectedNode.type === "topic"
      ? selectedNode.topic?.questions_count ?? 0
      : selectedNode.type === "chapter"
      ? selectedNode.chapter?.questions_count ?? 0
      : selectedNode.type === "subject"
      ? selectedNode.subject?.questions_count ?? 0
      : undefined;

  const examsCount =
    selectedNode.type === "topic"
      ? selectedNode.topic?.exams_count ?? 0
      : selectedNode.type === "chapter"
      ? selectedNode.chapter?.exams_count ?? 0
      : selectedNode.type === "subject"
      ? selectedNode.subject?.exams_count ?? 0
      : undefined;

  // Primary action button config based on current selected node
  const renderPrimaryActionButton = () => {
    if (selectedNode.type === "preparation") {
      return (
        <Button
          onClick={onAddSubject}
          className="bg-[#0B2545] hover:bg-[#163E6C] text-white shadow-sm text-xs h-8 px-3"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Subject to Preparation
        </Button>
      );
    }
    if (selectedNode.type === "subject" && selectedNode.subject) {
      return (
        <Button
          onClick={() => onAddChapter(selectedNode.subject!)}
          className="bg-[#0B2545] hover:bg-[#163E6C] text-white shadow-sm text-xs h-8 px-3"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Chapter to {selectedNode.subject.name}
        </Button>
      );
    }
    if (selectedNode.type === "chapter" && selectedNode.chapter) {
      return (
        <Button
          onClick={() => onAddTopic(selectedNode.chapter!, selectedNode.subject || undefined)}
          className="bg-[#0B2545] hover:bg-[#163E6C] text-white shadow-sm text-xs h-8 px-3"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Topic to {selectedNode.chapter.title || selectedNode.chapter.name}
        </Button>
      );
    }
    if (selectedNode.type === "topic") {
      return (
        <Button
          onClick={onOpenUploadNote}
          className="bg-[#0B2545] hover:bg-[#163E6C] text-white shadow-sm text-xs h-8 px-3"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Upload Note to Topic
        </Button>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Header Banner & Breadcrumb */}
      <div className="bg-gradient-to-br from-[#0B2545] to-[#163E6C] text-white p-6 rounded-2xl shadow-md space-y-4">
        {/* Breadcrumb Path */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-white/70">
          <span className="text-[#C4A45C] font-bold">{activeCategory.name}</span>
          <span>&gt;</span>
          <span>{activeLevel.name}</span>
          <span>&gt;</span>
          <span
            onClick={() => onSelectNode({ type: "preparation" })}
            className="cursor-pointer hover:underline text-white font-medium"
          >
            {activePreparation.name}
          </span>
          {selectedNode.subject && (
            <>
              <span>&gt;</span>
              <span
                onClick={() => onSelectNode({ type: "subject", subject: selectedNode.subject })}
                className="cursor-pointer hover:underline text-white font-medium"
              >
                {selectedNode.subject.name}
              </span>
            </>
          )}
          {selectedNode.chapter && (
            <>
              <span>&gt;</span>
              <span
                onClick={() =>
                  onSelectNode({
                    type: "chapter",
                    subject: selectedNode.subject,
                    chapter: selectedNode.chapter,
                  })
                }
                className="cursor-pointer hover:underline text-white font-medium"
              >
                {selectedNode.chapter.title || selectedNode.chapter.name}
              </span>
            </>
          )}
          {selectedNode.topic && (
            <>
              <span>&gt;</span>
              <span className="text-white font-bold underline">
                {selectedNode.topic.name}
              </span>
            </>
          )}
        </div>

        {/* Title, Badges & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                {nodeTitle}
              </h2>
              {nodeCode && (
                <span className="text-xs px-2 py-0.5 rounded bg-white/20 font-mono text-[#D4A72C]">
                  {nodeCode}
                </span>
              )}
            </div>

            {nodeDescription && (
              <p className="text-xs text-white/75 mt-1 max-w-xl line-clamp-2">
                {nodeDescription}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {nodeIsActive ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active in Syllabus
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/30 border border-slate-400/30 text-slate-300">
                Archived / Inactive
              </span>
            )}

            {/* Quick Context Actions */}
            {selectedNode.type === "subject" && selectedNode.subject && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditSubject(selectedNode.subject!)}
                  className="h-8 px-2.5 text-xs bg-white/10 hover:bg-white/20 border-white/20 text-white"
                >
                  <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onArchiveSubject(selectedNode.subject!)}
                  className="h-8 px-2.5 text-xs bg-white/10 hover:bg-white/20 border-white/20 text-white"
                >
                  <Archive className="w-3.5 h-3.5 mr-1" />
                  {selectedNode.subject.is_active === false ? "Activate" : "Archive"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeleteSubject(selectedNode.subject!)}
                  className="h-8 px-2 text-xs hover:bg-red-500/20 text-red-300"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}

            {selectedNode.type === "chapter" && selectedNode.chapter && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditChapter(selectedNode.subject!, selectedNode.chapter!)}
                  className="h-8 px-2.5 text-xs bg-white/10 hover:bg-white/20 border-white/20 text-white"
                >
                  <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onArchiveChapter(selectedNode.chapter!)}
                  className="h-8 px-2.5 text-xs bg-white/10 hover:bg-white/20 border-white/20 text-white"
                >
                  <Archive className="w-3.5 h-3.5 mr-1" />
                  {selectedNode.chapter.is_active === false ? "Activate" : "Archive"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeleteChapter(selectedNode.chapter!)}
                  className="h-8 px-2 text-xs hover:bg-red-500/20 text-red-300"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}

            {selectedNode.type === "topic" && selectedNode.topic && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditTopic(selectedNode.chapter!, selectedNode.topic!)}
                  className="h-8 px-2.5 text-xs bg-white/10 hover:bg-white/20 border-white/20 text-white"
                >
                  <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onArchiveTopic(selectedNode.topic!)}
                  className="h-8 px-2.5 text-xs bg-white/10 hover:bg-white/20 border-white/20 text-white"
                >
                  <Archive className="w-3.5 h-3.5 mr-1" />
                  {selectedNode.topic.is_active === false ? "Activate" : "Archive"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeleteTopic(selectedNode.topic!)}
                  className="h-8 px-2 text-xs hover:bg-red-500/20 text-red-300"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Real Content Usage Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          {chaptersCount !== undefined && (
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
              <div className="text-[11px] text-white/70 font-medium">Chapters</div>
              <div className="text-xl font-black text-white mt-0.5">{chaptersCount}</div>
            </div>
          )}

          {topicsCount !== undefined && (
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
              <div className="text-[11px] text-white/70 font-medium">Topics</div>
              <div className="text-xl font-black text-white mt-0.5">{topicsCount}</div>
            </div>
          )}

          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
            <div className="text-[11px] text-white/70 font-medium">Notes</div>
            <div className="text-xl font-black text-[#D4A72C] mt-0.5">{notesCount}</div>
          </div>

          {questionsCount !== undefined && (
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
              <div className="text-[11px] text-white/70 font-medium">Questions</div>
              <div className="text-xl font-black text-white mt-0.5">{questionsCount}</div>
            </div>
          )}

          {examsCount !== undefined && (
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
              <div className="text-[11px] text-white/70 font-medium">Exams</div>
              <div className="text-xl font-black text-white mt-0.5">{examsCount}</div>
            </div>
          )}
        </div>
      </div>

      {/* Panel View Tabs: Structure vs Notes */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("structure")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "structure"
                  ? "bg-[#0B2545] text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FolderTree className="w-4 h-4" /> Academic Structure & Children
            </button>

            <button
              onClick={() => setActiveTab("notes")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "notes"
                  ? "bg-[#0B2545] text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FileText className="w-4 h-4" /> Notes in this Node
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#C4A45C] text-black font-bold">
                {notesCount}
              </span>
            </button>
          </div>

          <div>{renderPrimaryActionButton()}</div>
        </div>

        {/* TAB 1: ACADEMIC STRUCTURE & CHILDREN */}
        {activeTab === "structure" && (
          <div className="space-y-4 pt-1">
            {/* If Subject Selected: show list of chapters */}
            {selectedNode.type === "subject" && selectedNode.subject && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-[#0B2545] dark:text-white uppercase tracking-wider">
                    Chapters in {selectedNode.subject.name}
                  </h4>
                  <Button
                    size="sm"
                    onClick={() => onAddChapter(selectedNode.subject!)}
                    className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Chapter
                  </Button>
                </div>

                {selectedNode.subject.chapters.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                    <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">No chapters added to this subject yet.</p>
                    <Button
                      size="sm"
                      onClick={() => onAddChapter(selectedNode.subject!)}
                      className="mt-3 text-xs bg-[#0B2545] text-white"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Create Chapter
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedNode.subject.chapters.map((chap) => (
                      <div
                        key={chap.id}
                        className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div
                          className="cursor-pointer flex-1"
                          onClick={() =>
                            onSelectNode({
                              type: "chapter",
                              subject: selectedNode.subject,
                              chapter: chap,
                            })
                          }
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#0B2545] dark:text-white hover:underline">
                              {chap.title || chap.name}
                            </span>
                            {chap.is_active === false && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold">
                                Archived
                              </span>
                            )}
                          </div>
                          {chap.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                              {chap.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-medium">
                            <span>{chap.topics?.length || 0} topics</span>
                            <span>&bull;</span>
                            <span>{chap.notes_count ?? 0} notes</span>
                            <span>&bull;</span>
                            <span>{chap.questions_count ?? 0} questions</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAddTopic(chap, selectedNode.subject || undefined)}
                            className="h-7 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add Topic
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEditChapter(selectedNode.subject!, chap)}
                            className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onArchiveChapter(chap)}
                            className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDeleteChapter(chap)}
                            className="h-7 px-2 text-xs text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* If Chapter Selected: show list of topics */}
            {selectedNode.type === "chapter" && selectedNode.chapter && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-[#0B2545] dark:text-white uppercase tracking-wider">
                    Topics in {selectedNode.chapter.title || selectedNode.chapter.name}
                  </h4>
                  <Button
                    size="sm"
                    onClick={() => onAddTopic(selectedNode.chapter!, selectedNode.subject || undefined)}
                    className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Topic
                  </Button>
                </div>

                {selectedNode.chapter.topics.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                    <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">No topics added to this chapter yet.</p>
                    <Button
                      size="sm"
                      onClick={() => onAddTopic(selectedNode.chapter!, selectedNode.subject || undefined)}
                      className="mt-3 text-xs bg-[#0B2545] text-white"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Create Topic
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedNode.chapter.topics.map((topic) => (
                      <div
                        key={topic.id}
                        className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div
                          className="cursor-pointer flex-1"
                          onClick={() =>
                            onSelectNode({
                              type: "topic",
                              subject: selectedNode.subject,
                              chapter: selectedNode.chapter,
                              topic,
                            })
                          }
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#0B2545] dark:text-white hover:underline">
                              {topic.name}
                            </span>
                            {topic.is_active === false && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold">
                                Archived
                              </span>
                            )}
                          </div>
                          {topic.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                              {topic.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-medium">
                            <span>{topic.notes_count ?? 0} notes</span>
                            <span>&bull;</span>
                            <span>{topic.questions_count ?? 0} questions</span>
                            <span>&bull;</span>
                            <span>{topic.exams_count ?? 0} exams</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              onSelectNode({
                                type: "topic",
                                subject: selectedNode.subject,
                                chapter: selectedNode.chapter,
                                topic,
                              })
                            }
                            className="h-7 text-xs border-purple-200 text-purple-600 hover:bg-purple-50"
                          >
                            <FileText className="w-3 h-3 mr-1" /> Notes ({topic.notes_count ?? 0})
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEditTopic(selectedNode.chapter!, topic)}
                            className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onArchiveTopic(topic)}
                            className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDeleteTopic(topic)}
                            className="h-7 px-2 text-xs text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* If Topic Selected: overview of Topic */}
            {selectedNode.type === "topic" && selectedNode.topic && (
              <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Topic Level Selected
                  </h4>
                </div>
                <p className="text-xs text-slate-500">
                  This topic is ready for PDF notes, questions in Question Bank, topic-wise practice, and exam questions.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={onOpenUploadNote}
                    className="bg-[#0B2545] text-white text-xs h-8"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Upload Note for "{selectedNode.topic.name}"
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("notes")}
                    className="text-xs h-8"
                  >
                    View Associated Notes ({notesCount})
                  </Button>
                </div>
              </div>
            )}

            {/* If Preparation Selected: overview */}
            {selectedNode.type === "preparation" && (
              <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0B2545] dark:bg-[#C4A45C]" />
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Master Preparation Root
                  </h4>
                </div>
                <p className="text-xs text-slate-500">
                  Select an academic subject or chapter from the Academic Tree on the left to inspect and manage its children, or click below to add a new subject.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={onAddSubject}
                    className="bg-[#0B2545] text-white text-xs h-8"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Subject to Preparation
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("notes")}
                    className="text-xs h-8"
                  >
                    View All Notes ({notesCount})
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: NOTES MATERIALS */}
        {activeTab === "notes" && (
          <div className="space-y-4 pt-1">
            {/* Section tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 gap-2">
              {SECTION_CONFIG.map((sec) => {
                const isTabActive = activeSection === sec.id;
                const count = activePreparation.counts[sec.id] || 0;
                return (
                  <button
                    key={sec.id}
                    onClick={() => onSectionChange(sec.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                      isTabActive
                        ? "bg-[#0B2545] text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{sec.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        isTabActive
                          ? "bg-[#C4A45C] text-black"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sub-type filter & Search Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => onSubTypeChange("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    activeSubType === "all"
                      ? "bg-white dark:bg-slate-700 text-[#0B2545] dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  All Types
                </button>
                {SECTION_CONFIG.find((s) => s.id === activeSection)?.subTypes.map((st) => (
                  <button
                    key={st.value}
                    onClick={() => onSubTypeChange(st.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                      activeSubType === st.value
                        ? "bg-white dark:bg-slate-700 text-[#0B2545] dark:text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    }`}
                  >
                    {st.value === "ai" && <Sparkles className="w-3.5 h-3.5 text-purple-500" />}
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Filter & Search */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0B2545]"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => onStatusFilterChange(e.target.value)}
                  className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            {/* Materials List */}
            <div className="pt-2">
              {loadingMaterials ? (
                <div className="py-16 text-center text-slate-400 text-xs">Loading notes...</div>
              ) : materials.length === 0 ? (
                <div className="py-14 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                  <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    No notes in this node & section
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                    Upload notes specifically for this academic node.
                  </p>
                  <Button
                    onClick={onOpenUploadNote}
                    size="sm"
                    className="bg-[#0B2545] hover:bg-[#163E6C] text-white text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Upload Note
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {materials.map((mat) => (
                    <div
                      key={mat.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                              mat.noteType === "ai"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            }`}
                          >
                            {mat.noteType}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              mat.status === "published"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {mat.status === "published" ? "Published" : "Draft"}
                          </span>

                          {mat.accessType === "premium" && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              Premium
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-slate-900 dark:text-white text-base">
                          {mat.title}
                        </h3>

                        {mat.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                            {mat.description}
                          </p>
                        )}

                        {/* Breadcrumb placement metadata */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 pt-1">
                          {mat.subjectName && (
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              Subject: {mat.subjectName}
                            </span>
                          )}
                          {mat.chapterName && (
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              Chapter: {mat.chapterName}
                            </span>
                          )}
                          {mat.topicName && (
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              Topic: {mat.topicName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                        {mat.fileUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewPdf(mat)}
                            className="text-xs h-8 px-2.5 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> View PDF
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReplacePdf(mat)}
                          className="text-xs h-8 px-2.5 text-slate-600 dark:text-slate-300"
                        >
                          <UploadCloud className="w-3.5 h-3.5 mr-1" /> Replace PDF
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEditMaterial(mat)}
                          className="text-xs h-8 px-2.5 text-slate-600 dark:text-slate-300"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onTogglePublishMaterial(mat)}
                          className={`text-xs h-8 px-2.5 ${
                            mat.status === "published"
                              ? "text-amber-600 hover:text-amber-700"
                              : "text-emerald-600 hover:text-emerald-700"
                          }`}
                        >
                          {mat.status === "published" ? "Unpublish" : "Publish"}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteMaterial(mat)}
                          className="text-xs h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
