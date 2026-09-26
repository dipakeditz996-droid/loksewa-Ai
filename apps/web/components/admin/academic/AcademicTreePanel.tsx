"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
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
  GripVertical,
  Move,
  ArrowUp,
  ArrowDown,
  Loader2,
  FolderInput,
  Folder,
  Check,
  X,
  AlertCircle,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AcademicSubject,
  AcademicChapter,
  AcademicTopic,
} from "@/lib/api/admin-study-materials";
import { adminSyllabusApi } from "@/lib/api/admin-syllabus";
import { toast } from "sonner";

export type SelectedAcademicNodeType = "preparation" | "subject" | "chapter" | "topic";

export interface SelectedAcademicNode {
  type: SelectedAcademicNodeType;
  subject?: AcademicSubject | null;
  chapter?: AcademicChapter | null;
  topic?: AcademicTopic | null;
}

export interface PreparationOption {
  id: number;
  name: string;
  categoryName?: string;
  levelName?: string;
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
  onRefreshTree?: () => void | Promise<void>;
  allPreparations?: PreparationOption[];
}

interface DragPayload {
  type: "subject" | "chapter" | "topic";
  id: number;
  subjectId?: number;
  chapterId?: number;
  title: string;
}

interface DropIndicator {
  type: "subject" | "chapter" | "topic";
  id: number;
  subjectId?: number;
  chapterId?: number;
  position: "before" | "after" | "inside";
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
  onRefreshTree,
  allPreparations = [],
}: AcademicTreePanelProps) {
  const [search, setSearch] = useState("");
  const [expandedSubjects, setExpandedSubjects] = useState<Set<number>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [localSubjects, setLocalSubjects] = useState<AcademicSubject[]>(subjects);
  const [isUpdating, setIsUpdating] = useState(false);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<DragPayload | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const autoExpandTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Move Modal state
  const [moveModal, setMoveModal] = useState<{
    isOpen: boolean;
    nodeType: "subject" | "chapter" | "topic";
    item: any;
    currentSubjectId?: number;
    currentChapterId?: number;
    targetSubjectId?: number;
    targetChapterId?: number;
    targetPrepId?: number;
  } | null>(null);

  // Keep localSubjects synced with parent prop
  useEffect(() => {
    setLocalSubjects(subjects);
  }, [subjects]);

  // Expand all subjects by default on first load
  useEffect(() => {
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
    if (!q) return localSubjects;

    return localSubjects
      .map((sub) => {
        const subMatches =
          sub.name.toLowerCase().includes(q) || (sub.code && sub.code.toLowerCase().includes(q));

        const matchedChapters = sub.chapters
          .map((chap) => {
            const chapMatches = (chap.title || chap.name || "").toLowerCase().includes(q);
            const matchedTopics = chap.topics.filter((top) =>
              top.name.toLowerCase().includes(q)
            );

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
  }, [localSubjects, search]);

  const totalChapters = useMemo(
    () => localSubjects.reduce((sum, s) => sum + (s.chapters?.length || 0), 0),
    [localSubjects]
  );
  const totalTopics = useMemo(
    () =>
      localSubjects.reduce(
        (sum, s) => sum + s.chapters.reduce((cSum, c) => cSum + (c.topics?.length || 0), 0),
        0
      ),
    [localSubjects]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // DRAG & DROP LOGIC
  // ──────────────────────────────────────────────────────────────────────────

  const clearDragState = () => {
    setDraggedItem(null);
    setDropIndicator(null);
    if (autoExpandTimerRef.current) {
      clearTimeout(autoExpandTimerRef.current);
      autoExpandTimerRef.current = null;
    }
  };

  const handleDragStart = (e: React.DragEvent, payload: DragPayload) => {
    e.stopPropagation();
    setDraggedItem(payload);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
  };

  const scheduleAutoExpand = (type: "subject" | "chapter", id: number) => {
    if (autoExpandTimerRef.current) return;
    autoExpandTimerRef.current = setTimeout(() => {
      if (type === "subject") {
        setExpandedSubjects((prev) => new Set(prev).add(id));
      } else {
        setExpandedChapters((prev) => new Set(prev).add(id));
      }
      autoExpandTimerRef.current = null;
    }, 600);
  };

  const calculatePosition = (
    e: React.DragEvent<HTMLElement>,
    allowInside = false
  ): "before" | "after" | "inside" => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const height = rect.height;

    if (allowInside) {
      if (offsetY > height * 0.25 && offsetY < height * 0.75) {
        return "inside";
      }
    }
    return offsetY < height / 2 ? "before" : "after";
  };

  // Reorder Subjects
  const executeReorderSubjects = async (
    draggedSubId: number,
    targetSubId: number,
    pos: "before" | "after"
  ) => {
    if (draggedSubId === targetSubId) return;
    const current = [...localSubjects];
    const dragIdx = current.findIndex((s) => s.id === draggedSubId);
    const targetIdx = current.findIndex((s) => s.id === targetSubId);
    if (dragIdx === -1 || targetIdx === -1) return;

    const [draggedObj] = current.splice(dragIdx, 1);
    if (!draggedObj) return;
    let insertIdx = current.findIndex((s) => s.id === targetSubId);
    if (pos === "after") insertIdx += 1;
    current.splice(insertIdx, 0, draggedObj);

    setLocalSubjects(current);
    setIsUpdating(true);

    try {
      const payload = current.map((s, idx) => ({ id: s.id, order: idx + 1 }));
      await adminSyllabusApi.reorderSubjects(payload);
      adminSyllabusApi.clearTreeCache();
      toast.success("Subject reordered successfully");
      await onRefreshTree?.();
    } catch (err: any) {
      setLocalSubjects(subjects);
      toast.error(err.message || "Failed to reorder subjects");
    } finally {
      setIsUpdating(false);
    }
  };

  // Reorder / Move Chapters
  const executeMoveChapter = async (
    chapterId: number,
    sourceSubjectId: number,
    targetSubjectId: number,
    targetChapterId: number | null,
    pos: "before" | "after" | "inside"
  ) => {
    const clonedSubjects: AcademicSubject[] = JSON.parse(JSON.stringify(localSubjects));
    const sourceSub = clonedSubjects.find((s) => s.id === sourceSubjectId);
    const targetSub = clonedSubjects.find((s) => s.id === targetSubjectId);
    if (!sourceSub || !targetSub) return;

    const chapIdx = sourceSub.chapters.findIndex((c) => c.id === chapterId);
    if (chapIdx === -1) return;
    const [chapObj] = sourceSub.chapters.splice(chapIdx, 1);
    if (!chapObj) return;
    chapObj.subject_id = targetSubjectId;

    if (pos === "inside" || targetChapterId === null) {
      targetSub.chapters.push(chapObj);
    } else {
      let destIdx = targetSub.chapters.findIndex((c) => c.id === targetChapterId);
      if (destIdx === -1) {
        targetSub.chapters.push(chapObj);
      } else {
        if (pos === "after") destIdx += 1;
        targetSub.chapters.splice(destIdx, 0, chapObj);
      }
    }

    setLocalSubjects(clonedSubjects);
    setIsUpdating(true);

    try {
      if (sourceSubjectId !== targetSubjectId) {
        await adminSyllabusApi.updateChapter(chapterId, {
          subject: targetSubjectId,
        });
      }
      const reorderPayload = targetSub.chapters.map((c, idx) => ({
        id: c.id,
        order: idx + 1,
      }));
      await adminSyllabusApi.reorderChapters(reorderPayload);

      if (sourceSubjectId !== targetSubjectId && sourceSub.chapters.length > 0) {
        await adminSyllabusApi.reorderChapters(
          sourceSub.chapters.map((c, idx) => ({ id: c.id, order: idx + 1 }))
        );
      }

      adminSyllabusApi.clearTreeCache();
      toast.success(
        sourceSubjectId === targetSubjectId
          ? "Chapter reordered successfully"
          : `Moved chapter "${chapObj.title || chapObj.name}" to "${targetSub.name}"`
      );
      setExpandedSubjects((prev) => new Set(prev).add(targetSubjectId));
      await onRefreshTree?.();
    } catch (err: any) {
      setLocalSubjects(subjects);
      toast.error(err.message || "Failed to move chapter");
    } finally {
      setIsUpdating(false);
    }
  };

  // Reorder / Move Topics
  const executeMoveTopic = async (
    topicId: number,
    sourceChapterId: number,
    targetSubjectId: number,
    targetChapterId: number,
    targetTopicId: number | null,
    pos: "before" | "after" | "inside"
  ) => {
    const clonedSubjects: AcademicSubject[] = JSON.parse(JSON.stringify(localSubjects));

    let sourceChap: AcademicChapter | null = null;
    let targetChap: AcademicChapter | null = null;

    for (const sub of clonedSubjects) {
      for (const chap of sub.chapters) {
        if (chap.id === sourceChapterId) sourceChap = chap;
        if (chap.id === targetChapterId) targetChap = chap;
      }
    }

    if (!sourceChap || !targetChap) return;

    const topIdx = sourceChap.topics.findIndex((t) => t.id === topicId);
    if (topIdx === -1) return;
    const [topObj] = sourceChap.topics.splice(topIdx, 1);
    if (!topObj) return;
    topObj.chapter_id = targetChapterId;

    if (pos === "inside" || targetTopicId === null) {
      targetChap.topics.push(topObj);
    } else {
      let destIdx = targetChap.topics.findIndex((t) => t.id === targetTopicId);
      if (destIdx === -1) {
        targetChap.topics.push(topObj);
      } else {
        if (pos === "after") destIdx += 1;
        targetChap.topics.splice(destIdx, 0, topObj);
      }
    }

    setLocalSubjects(clonedSubjects);
    setIsUpdating(true);

    try {
      if (sourceChapterId !== targetChapterId) {
        await adminSyllabusApi.updateTopic(topicId, {
          chapter: targetChapterId,
          unit: targetChapterId,
        } as any);
      }
      const reorderPayload = targetChap.topics.map((t, idx) => ({
        id: t.id,
        order: idx + 1,
      }));
      await adminSyllabusApi.reorderTopics(reorderPayload);

      if (sourceChapterId !== targetChapterId && sourceChap.topics.length > 0) {
        await adminSyllabusApi.reorderTopics(
          sourceChap.topics.map((t, idx) => ({ id: t.id, order: idx + 1 }))
        );
      }

      adminSyllabusApi.clearTreeCache();
      toast.success(
        sourceChapterId === targetChapterId
          ? "Topic reordered successfully"
          : `Moved topic "${topObj.name}" to "${targetChap.title || targetChap.name}"`
      );
      setExpandedChapters((prev) => new Set(prev).add(targetChapterId));
      await onRefreshTree?.();
    } catch (err: any) {
      setLocalSubjects(subjects);
      toast.error(err.message || "Failed to move topic");
    } finally {
      setIsUpdating(false);
    }
  };

  // Quick Move (Up / Down) for Subjects
  const moveSubjectDirection = async (subjectId: number, direction: "up" | "down") => {
    const list = [...localSubjects];
    const idx = list.findIndex((s) => s.id === subjectId);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === list.length - 1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const temp = list[idx]!;
    list[idx] = list[targetIdx]!;
    list[targetIdx] = temp;

    setLocalSubjects(list);
    setIsUpdating(true);

    try {
      const payload = list.map((s, i) => ({ id: s.id, order: i + 1 }));
      await adminSyllabusApi.reorderSubjects(payload);
      adminSyllabusApi.clearTreeCache();
      toast.success(`Subject moved ${direction}`);
      await onRefreshTree?.();
    } catch (err: any) {
      setLocalSubjects(subjects);
      toast.error(err.message || "Failed to move subject");
    } finally {
      setIsUpdating(false);
    }
  };

  // Move Subject to another preparation
  const handleMoveSubjectToPrep = async (subjectId: number, newPrepId: number) => {
    setIsUpdating(true);
    try {
      await adminSyllabusApi.updateSubject(subjectId, {
        exam: newPrepId,
      } as any);
      adminSyllabusApi.clearTreeCache();
      toast.success("Subject moved to new preparation successfully");
      setMoveModal(null);
      await onRefreshTree?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to move subject to preparation");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full relative">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D4A72C]" />
            <h3 className="font-extrabold text-sm text-[#0B2545] dark:text-white uppercase tracking-wider">
              Academic Tree
            </h3>
            {isUpdating && (
              <span className="flex items-center gap-1 text-[11px] text-blue-600 font-medium animate-pulse ml-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </span>
            )}
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
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
          <div className="flex items-center gap-1.5">
            <span>{localSubjects.length} Subjects</span>
            <span>&bull;</span>
            <span>{totalChapters} Chapters</span>
            <span>&bull;</span>
            <span>{totalTopics} Topics</span>
          </div>
          <span className="text-[10px] text-slate-400 italic">Drag items to move/reorder</span>
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

      {/* Dragging Active Notice */}
      {draggedItem && (
        <div className="bg-blue-600 text-white text-[11px] font-medium px-3 py-1.5 flex items-center justify-between shadow-inner animate-fadeIn">
          <div className="flex items-center gap-1.5 truncate">
            <Move className="w-3 h-3 shrink-0" />
            <span className="truncate">
              Dragging {draggedItem.type}: <strong>{draggedItem.title}</strong>
            </span>
          </div>
          <button
            onClick={clearDragState}
            className="text-[10px] underline hover:text-blue-100 shrink-0 ml-2"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Tree Content */}
      <div className="p-2 overflow-y-auto max-h-[600px] space-y-1 text-sm select-none">
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
                selectedNode.type === "preparation"
                  ? "text-[#D4A72C]"
                  : "text-[#0B2545] dark:text-[#C4A45C]"
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
          <div
            className="space-y-2 p-2"
            role="status"
            aria-busy="true"
            aria-label="Loading academic tree"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 p-1.5">
                <Skeleton className="h-4 w-4 rounded shrink-0" />
                <Skeleton className="h-4 flex-1 rounded" />
                <Skeleton className="h-3 w-8 rounded shrink-0" />
              </div>
            ))}
          </div>
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
            const isSubBeingDragged =
              draggedItem?.type === "subject" && draggedItem.id === subject.id;

            // Drop indicators for subject
            const isSubDropBefore =
              dropIndicator?.type === "subject" &&
              dropIndicator.id === subject.id &&
              dropIndicator.position === "before";
            const isSubDropAfter =
              dropIndicator?.type === "subject" &&
              dropIndicator.id === subject.id &&
              dropIndicator.position === "after";
            const isSubDropInside =
              dropIndicator?.type === "subject" &&
              dropIndicator.id === subject.id &&
              dropIndicator.position === "inside";

            return (
              <div
                key={subject.id}
                className={`space-y-0.5 relative transition-all ${
                  isSubBeingDragged ? "opacity-40 scale-[0.99]" : ""
                }`}
              >
                {/* Visual line before subject */}
                {isSubDropBefore && (
                  <div className="h-1 bg-blue-500 rounded-full my-0.5 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
                )}

                {/* Subject Node Row */}
                <div
                  draggable={!isUpdating}
                  onDragStart={(e) =>
                    handleDragStart(e, {
                      type: "subject",
                      id: subject.id,
                      title: subject.name,
                    })
                  }
                  onDragEnd={clearDragState}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!draggedItem) return;

                    if (draggedItem.type === "subject") {
                      if (draggedItem.id === subject.id) return;
                      const pos = calculatePosition(e, false);
                      setDropIndicator({
                        type: "subject",
                        id: subject.id,
                        position: pos,
                      });
                    } else if (draggedItem.type === "chapter") {
                      setDropIndicator({
                        type: "subject",
                        id: subject.id,
                        position: "inside",
                      });
                      scheduleAutoExpand("subject", subject.id);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (
                      !e.currentTarget.contains(e.relatedTarget as Node) &&
                      dropIndicator?.id === subject.id &&
                      dropIndicator.type === "subject"
                    ) {
                      setDropIndicator(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!draggedItem) return;

                    if (draggedItem.type === "subject" && dropIndicator) {
                      executeReorderSubjects(
                        draggedItem.id,
                        subject.id,
                        dropIndicator.position === "before" ? "before" : "after"
                      );
                    } else if (draggedItem.type === "chapter" && draggedItem.subjectId) {
                      executeMoveChapter(
                        draggedItem.id,
                        draggedItem.subjectId,
                        subject.id,
                        null,
                        "inside"
                      );
                    }
                    clearDragState();
                  }}
                  className={`group flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-all border ${
                    isSubDropInside
                      ? "ring-2 ring-blue-500 bg-blue-50/80 dark:bg-blue-900/40 border-blue-400"
                      : isSubSelected
                      ? "bg-blue-50 dark:bg-blue-950/40 text-[#0B2545] dark:text-blue-200 font-bold border-blue-200 dark:border-blue-900"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 border-transparent"
                  }`}
                  onClick={() => onSelectNode({ type: "subject", subject })}
                >
                  <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                    {/* Drag Handle */}
                    <span
                      title="Drag to reorder subjects or drop chapters inside"
                      className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300 opacity-60 group-hover:opacity-100 p-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </span>

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

                    {isSubDropInside && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-bold animate-pulse ml-1">
                        Drop Chapter Here
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
                      <DropdownMenuContent align="end" className="w-48 text-xs">
                        <DropdownMenuItem onClick={() => onAddChapter(subject)}>
                          <Plus className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Add Chapter
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onAddNoteForNode({ type: "subject", subject })}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1.5 text-[#C4A45C]" /> Add Note
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => moveSubjectDirection(subject.id, "up")}
                          disabled={localSubjects[0]?.id === subject.id}
                        >
                          <ArrowUp className="w-3.5 h-3.5 mr-1.5 text-slate-600" /> Move Up
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => moveSubjectDirection(subject.id, "down")}
                          disabled={localSubjects[localSubjects.length - 1]?.id === subject.id}
                        >
                          <ArrowDown className="w-3.5 h-3.5 mr-1.5 text-slate-600" /> Move Down
                        </DropdownMenuItem>
                        {allPreparations.length > 1 && (
                          <DropdownMenuItem
                            onClick={() =>
                              setMoveModal({
                                isOpen: true,
                                nodeType: "subject",
                                item: subject,
                                targetPrepId: preparationId,
                              })
                            }
                          >
                            <FolderInput className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Move to
                            Another Prep...
                          </DropdownMenuItem>
                        )}
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

                {/* Visual line after subject */}
                {isSubDropAfter && (
                  <div className="h-1 bg-blue-500 rounded-full my-0.5 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
                )}

                {/* Chapters List */}
                {isSubExpanded && (
                  <div
                    className="pl-4 space-y-0.5 border-l-2 border-slate-100 dark:border-slate-800 ml-3 py-0.5"
                    onDragOver={(e) => {
                      if (draggedItem?.type === "chapter" && subject.chapters.length === 0) {
                        e.preventDefault();
                        e.stopPropagation();
                        setDropIndicator({
                          type: "subject",
                          id: subject.id,
                          position: "inside",
                        });
                      }
                    }}
                    onDrop={(e) => {
                      if (
                        draggedItem?.type === "chapter" &&
                        draggedItem.subjectId &&
                        subject.chapters.length === 0
                      ) {
                        e.preventDefault();
                        e.stopPropagation();
                        executeMoveChapter(
                          draggedItem.id,
                          draggedItem.subjectId,
                          subject.id,
                          null,
                          "inside"
                        );
                        clearDragState();
                      }
                    }}
                  >
                    {subject.chapters.length === 0 ? (
                      <div
                        className={`py-1.5 px-2 text-[11px] italic rounded-md flex items-center justify-between ${
                          isSubDropInside
                            ? "bg-blue-50 border border-dashed border-blue-400 text-blue-700 font-semibold"
                            : "text-slate-400"
                        }`}
                      >
                        <span>
                          {isSubDropInside ? "Drop Chapter to add here" : "No chapters yet"}
                        </span>
                        <button
                          onClick={() => onAddChapter(subject)}
                          className="text-blue-600 font-bold hover:underline not-italic ml-2"
                        >
                          + Add Chapter
                        </button>
                      </div>
                    ) : (
                      subject.chapters.map((chapter) => {
                        const isChapExpanded = expandedChapters.has(chapter.id);
                        const isChapSelected =
                          selectedNode.type === "chapter" &&
                          selectedNode.chapter?.id === chapter.id;
                        const isChapBeingDragged =
                          draggedItem?.type === "chapter" && draggedItem.id === chapter.id;

                        // Drop indicators for chapter
                        const isChapDropBefore =
                          dropIndicator?.type === "chapter" &&
                          dropIndicator.id === chapter.id &&
                          dropIndicator.position === "before";
                        const isChapDropAfter =
                          dropIndicator?.type === "chapter" &&
                          dropIndicator.id === chapter.id &&
                          dropIndicator.position === "after";
                        const isChapDropInside =
                          dropIndicator?.type === "chapter" &&
                          dropIndicator.id === chapter.id &&
                          dropIndicator.position === "inside";

                        return (
                          <div
                            key={chapter.id}
                            className={`space-y-0.5 relative transition-all ${
                              isChapBeingDragged ? "opacity-40 scale-[0.99]" : ""
                            }`}
                          >
                            {/* Visual line before chapter */}
                            {isChapDropBefore && (
                              <div className="h-0.5 bg-blue-500 rounded-full my-0.5 shadow-[0_0_6px_rgba(59,130,246,0.8)] animate-pulse" />
                            )}

                            {/* Chapter Node Row */}
                            <div
                              draggable={!isUpdating}
                              onDragStart={(e) =>
                                handleDragStart(e, {
                                  type: "chapter",
                                  id: chapter.id,
                                  subjectId: subject.id,
                                  title: chapter.title || chapter.name || "",
                                })
                              }
                              onDragEnd={clearDragState}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!draggedItem) return;

                                if (draggedItem.type === "chapter") {
                                  if (draggedItem.id === chapter.id) return;
                                  const pos = calculatePosition(e, false);
                                  setDropIndicator({
                                    type: "chapter",
                                    id: chapter.id,
                                    subjectId: subject.id,
                                    position: pos,
                                  });
                                } else if (draggedItem.type === "topic") {
                                  setDropIndicator({
                                    type: "chapter",
                                    id: chapter.id,
                                    subjectId: subject.id,
                                    position: "inside",
                                  });
                                  scheduleAutoExpand("chapter", chapter.id);
                                }
                              }}
                              onDragLeave={(e) => {
                                if (
                                  !e.currentTarget.contains(e.relatedTarget as Node) &&
                                  dropIndicator?.id === chapter.id &&
                                  dropIndicator.type === "chapter"
                                ) {
                                  setDropIndicator(null);
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!draggedItem) return;

                                if (draggedItem.type === "chapter" && dropIndicator) {
                                  executeMoveChapter(
                                    draggedItem.id,
                                    draggedItem.subjectId || subject.id,
                                    subject.id,
                                    chapter.id,
                                    dropIndicator.position
                                  );
                                } else if (draggedItem.type === "topic" && draggedItem.chapterId) {
                                  executeMoveTopic(
                                    draggedItem.id,
                                    draggedItem.chapterId,
                                    subject.id,
                                    chapter.id,
                                    null,
                                    "inside"
                                  );
                                }
                                clearDragState();
                              }}
                              className={`group flex items-center justify-between py-1 px-2 rounded-lg cursor-pointer transition-all border ${
                                isChapDropInside
                                  ? "ring-2 ring-blue-500 bg-blue-50/80 dark:bg-blue-900/40 border-blue-400"
                                  : isChapSelected
                                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold border-amber-200 dark:border-amber-800"
                                  : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-transparent"
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
                                {/* Grip Handle */}
                                <span
                                  title="Drag to reorder or move chapter to another subject"
                                  className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300 opacity-60 group-hover:opacity-100 p-0.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <GripVertical className="w-3 h-3" />
                                </span>

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

                                {isChapDropInside && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-bold animate-pulse ml-1">
                                    Drop Topic Here
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
                                  <DropdownMenuContent align="end" className="w-44 text-xs">
                                    <DropdownMenuItem onClick={() => onAddTopic(chapter, subject)}>
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
                                      onClick={() =>
                                        setMoveModal({
                                          isOpen: true,
                                          nodeType: "chapter",
                                          item: chapter,
                                          currentSubjectId: subject.id,
                                          targetSubjectId: subject.id,
                                        })
                                      }
                                    >
                                      <FolderInput className="w-3.5 h-3.5 mr-1.5 text-blue-600" />{" "}
                                      Move to Subject...
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => onEditChapter(subject, chapter)}
                                    >
                                      <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit Chapter
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

                            {/* Visual line after chapter */}
                            {isChapDropAfter && (
                              <div className="h-0.5 bg-blue-500 rounded-full my-0.5 shadow-[0_0_6px_rgba(59,130,246,0.8)] animate-pulse" />
                            )}

                            {/* Topics List */}
                            {isChapExpanded && (
                              <div
                                className="pl-4 space-y-0.5 border-l-2 border-slate-100 dark:border-slate-800 ml-2 py-0.5"
                                onDragOver={(e) => {
                                  if (
                                    draggedItem?.type === "topic" &&
                                    chapter.topics.length === 0
                                  ) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDropIndicator({
                                      type: "chapter",
                                      id: chapter.id,
                                      subjectId: subject.id,
                                      position: "inside",
                                    });
                                  }
                                }}
                                onDrop={(e) => {
                                  if (
                                    draggedItem?.type === "topic" &&
                                    draggedItem.chapterId &&
                                    chapter.topics.length === 0
                                  ) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    executeMoveTopic(
                                      draggedItem.id,
                                      draggedItem.chapterId,
                                      subject.id,
                                      chapter.id,
                                      null,
                                      "inside"
                                    );
                                    clearDragState();
                                  }
                                }}
                              >
                                {chapter.topics.length === 0 ? (
                                  <div
                                    className={`py-1 px-2 text-[10px] italic rounded flex items-center justify-between ${
                                      isChapDropInside
                                        ? "bg-blue-50 border border-dashed border-blue-400 text-blue-700 font-semibold"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    <span>
                                      {isChapDropInside
                                        ? "Drop Topic to add here"
                                        : "No topics yet"}
                                    </span>
                                    <button
                                      onClick={() => onAddTopic(chapter, subject)}
                                      className="text-blue-600 font-bold hover:underline not-italic ml-2"
                                    >
                                      + Add Topic
                                    </button>
                                  </div>
                                ) : (
                                  chapter.topics.map((topic) => {
                                    const isTopSelected =
                                      selectedNode.type === "topic" &&
                                      selectedNode.topic?.id === topic.id;
                                    const isTopBeingDragged =
                                      draggedItem?.type === "topic" && draggedItem.id === topic.id;

                                    // Drop indicators for topic
                                    const isTopDropBefore =
                                      dropIndicator?.type === "topic" &&
                                      dropIndicator.id === topic.id &&
                                      dropIndicator.position === "before";
                                    const isTopDropAfter =
                                      dropIndicator?.type === "topic" &&
                                      dropIndicator.id === topic.id &&
                                      dropIndicator.position === "after";

                                    return (
                                      <div
                                        key={topic.id}
                                        className={`space-y-0.5 relative transition-all ${
                                          isTopBeingDragged ? "opacity-40 scale-[0.99]" : ""
                                        }`}
                                      >
                                        {/* Visual line before topic */}
                                        {isTopDropBefore && (
                                          <div className="h-0.5 bg-blue-500 rounded-full my-0.5 shadow-[0_0_6px_rgba(59,130,246,0.8)] animate-pulse" />
                                        )}

                                        {/* Topic Row */}
                                        <div
                                          draggable={!isUpdating}
                                          onDragStart={(e) =>
                                            handleDragStart(e, {
                                              type: "topic",
                                              id: topic.id,
                                              subjectId: subject.id,
                                              chapterId: chapter.id,
                                              title: topic.name,
                                            })
                                          }
                                          onDragEnd={clearDragState}
                                          onDragOver={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (!draggedItem || draggedItem.type !== "topic") return;
                                            if (draggedItem.id === topic.id) return;

                                            const pos = calculatePosition(e, false);
                                            setDropIndicator({
                                              type: "topic",
                                              id: topic.id,
                                              subjectId: subject.id,
                                              chapterId: chapter.id,
                                              position: pos,
                                            });
                                          }}
                                          onDragLeave={(e) => {
                                            if (
                                              !e.currentTarget.contains(
                                                e.relatedTarget as Node
                                              ) &&
                                              dropIndicator?.id === topic.id &&
                                              dropIndicator.type === "topic"
                                            ) {
                                              setDropIndicator(null);
                                            }
                                          }}
                                          onDrop={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (!draggedItem || draggedItem.type !== "topic") return;
                                            if (!dropIndicator || !draggedItem.chapterId) return;

                                            executeMoveTopic(
                                              draggedItem.id,
                                              draggedItem.chapterId,
                                              subject.id,
                                              chapter.id,
                                              topic.id,
                                              dropIndicator.position
                                            );
                                            clearDragState();
                                          }}
                                          className={`group flex items-center justify-between py-1 px-2 rounded-lg cursor-pointer transition-all border ${
                                            isTopSelected
                                              ? "bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold border-purple-200 dark:border-purple-800"
                                              : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-transparent"
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
                                            {/* Grip Handle */}
                                            <span
                                              title="Drag to reorder or move topic to another chapter"
                                              className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300 opacity-60 group-hover:opacity-100 p-0.5"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <GripVertical className="w-2.5 h-2.5" />
                                            </span>

                                            <FileText
                                              className={`w-3 h-3 shrink-0 ${
                                                isTopSelected
                                                  ? "text-purple-600 dark:text-purple-400"
                                                  : "text-slate-400"
                                              }`}
                                            />
                                            <span className="truncate text-[11px]">
                                              {topic.name}
                                            </span>

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
                                              <DropdownMenuContent
                                                align="end"
                                                className="w-44 text-xs"
                                              >
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
                                                  onClick={() =>
                                                    setMoveModal({
                                                      isOpen: true,
                                                      nodeType: "topic",
                                                      item: topic,
                                                      currentSubjectId: subject.id,
                                                      currentChapterId: chapter.id,
                                                      targetSubjectId: subject.id,
                                                      targetChapterId: chapter.id,
                                                    })
                                                  }
                                                >
                                                  <FolderInput className="w-3.5 h-3.5 mr-1.5 text-purple-600" />{" "}
                                                  Move to Chapter...
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
                                                  {topic.is_active === false
                                                    ? "Activate"
                                                    : "Archive"}
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

                                        {/* Visual line after topic */}
                                        {isTopDropAfter && (
                                          <div className="h-0.5 bg-blue-500 rounded-full my-0.5 shadow-[0_0_6px_rgba(59,130,246,0.8)] animate-pulse" />
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
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MOVE MODAL (Accessible point-and-click alternative to drag & drop)   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Dialog
        open={!!moveModal?.isOpen}
        onOpenChange={(open) => {
          if (!open) setMoveModal(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0B2545] dark:text-white flex items-center gap-2">
              <Move className="w-4 h-4 text-blue-600" />
              {moveModal?.nodeType === "chapter" && "Move Chapter"}
              {moveModal?.nodeType === "topic" && "Move Topic"}
              {moveModal?.nodeType === "subject" && "Move Subject"}
            </DialogTitle>
            <DialogDescription>
              {moveModal?.nodeType === "chapter" && (
                <>
                  Move chapter &quot;<strong>{moveModal.item?.title || moveModal.item?.name}</strong>&quot; to another Subject.
                </>
              )}
              {moveModal?.nodeType === "topic" && (
                <>
                  Move topic &quot;<strong>{moveModal.item?.name}</strong>&quot; to another Chapter.
                </>
              )}
              {moveModal?.nodeType === "subject" && (
                <>
                  Move subject &quot;<strong>{moveModal.item?.name}</strong>&quot; to another Examination / Preparation.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Moving Chapter to another Subject */}
            {moveModal?.nodeType === "chapter" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Subject
                </label>
                <select
                  value={moveModal.targetSubjectId ?? moveModal.currentSubjectId}
                  onChange={(e) =>
                    setMoveModal((prev) =>
                      prev ? { ...prev, targetSubjectId: Number(e.target.value) } : null
                    )
                  }
                  className="w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 font-medium"
                >
                  {localSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ""} {s.id === moveModal.currentSubjectId ? "• Current" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Moving Topic to another Chapter */}
            {moveModal?.nodeType === "topic" && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Target Subject
                  </label>
                  <select
                    value={moveModal.targetSubjectId ?? moveModal.currentSubjectId}
                    onChange={(e) => {
                      const newSubId = Number(e.target.value);
                      const targetSub = localSubjects.find((s) => s.id === newSubId);
                      const firstChap = targetSub?.chapters?.[0]?.id;
                      setMoveModal((prev) =>
                        prev
                          ? {
                              ...prev,
                              targetSubjectId: newSubId,
                              targetChapterId: firstChap,
                            }
                          : null
                      );
                    }}
                    className="w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 font-medium"
                  >
                    {localSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.code ? `(${s.code})` : ""} {s.id === moveModal.currentSubjectId ? "• Current" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Target Chapter
                  </label>
                  {(() => {
                    const selSub = localSubjects.find(
                      (s) => s.id === (moveModal.targetSubjectId ?? moveModal.currentSubjectId)
                    );
                    const chapList = selSub?.chapters || [];

                    if (chapList.length === 0) {
                      return (
                        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                          This subject has no chapters yet. Please create a chapter first or choose a different subject.
                        </p>
                      );
                    }

                    return (
                      <select
                        value={moveModal.targetChapterId ?? moveModal.currentChapterId}
                        onChange={(e) =>
                          setMoveModal((prev) =>
                            prev ? { ...prev, targetChapterId: Number(e.target.value) } : null
                          )
                        }
                        className="w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 font-medium"
                      >
                        {chapList.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title || c.name} {c.id === moveModal.currentChapterId ? "• Current" : ""}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
              </>
            )}

            {/* Moving Subject to another Preparation */}
            {moveModal?.nodeType === "subject" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Preparation
                </label>
                <select
                  value={moveModal.targetPrepId ?? preparationId}
                  onChange={(e) =>
                    setMoveModal((prev) =>
                      prev ? { ...prev, targetPrepId: Number(e.target.value) } : null
                    )
                  }
                  className="w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 font-medium"
                >
                  {allPreparations.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.levelName ? `(${p.levelName})` : ""} {p.id === preparationId ? "• Current" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMoveModal(null)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#0B2545] hover:bg-[#163E6C] text-white"
              disabled={
                isUpdating ||
                (moveModal?.nodeType === "topic" && !moveModal?.targetChapterId) ||
                (moveModal?.nodeType === "chapter" &&
                  moveModal?.targetSubjectId === moveModal?.currentSubjectId) ||
                (moveModal?.nodeType === "topic" &&
                  moveModal?.targetChapterId === moveModal?.currentChapterId) ||
                (moveModal?.nodeType === "subject" &&
                  moveModal?.targetPrepId === preparationId)
              }
              onClick={async () => {
                if (!moveModal) return;

                if (moveModal.nodeType === "chapter" && moveModal.targetSubjectId) {
                  await executeMoveChapter(
                    moveModal.item.id,
                    moveModal.currentSubjectId!,
                    moveModal.targetSubjectId,
                    null,
                    "inside"
                  );
                  setMoveModal(null);
                } else if (
                  moveModal.nodeType === "topic" &&
                  moveModal.targetSubjectId &&
                  moveModal.targetChapterId
                ) {
                  await executeMoveTopic(
                    moveModal.item.id,
                    moveModal.currentChapterId!,
                    moveModal.targetSubjectId,
                    moveModal.targetChapterId,
                    null,
                    "inside"
                  );
                  setMoveModal(null);
                } else if (moveModal.nodeType === "subject" && moveModal.targetPrepId) {
                  await handleMoveSubjectToPrep(moveModal.item.id, moveModal.targetPrepId);
                }
              }}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Moving...
                </>
              ) : (
                "Confirm Move"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
