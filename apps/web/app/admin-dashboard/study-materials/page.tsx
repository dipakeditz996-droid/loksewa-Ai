"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BookOpen,
  Search,
  FileText,
  Eye,
  Edit,
  Trash2,
  Plus,
  Loader2,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Layers,
  Download,
  Filter,
  Sparkles,
  Clock,
  Shield,
  FolderTree,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import {
  adminStudyMaterialApi,
  CategoryHierarchyItem,
  LevelItem,
  PreparationItem,
  StudyMaterialListItem,
  ContentCategory,
  NoteType,
  AcademicSubject,
  AcademicChapter,
  AcademicTopic,
} from "@/lib/api/admin-study-materials";
import {
  adminAcademicApi,
  ApiSubject,
  ApiChapter,
  ApiTopic,
} from "@/lib/api/admin-academic-api";
import { adminSyllabusApi } from "@/lib/api/admin-syllabus";
import {
  AcademicTreePanel,
  SelectedAcademicNode,
} from "@/components/admin/academic/AcademicTreePanel";
import {
  AcademicNodeDetailsPanel,
} from "@/components/admin/academic/AcademicNodeDetailsPanel";
import {
  AddEditSubjectModal,
  AddEditChapterModal,
  AddEditTopicModal,
  AcademicSafeDeleteModal,
  DeleteNodeTarget,
} from "@/components/admin/academic/AcademicModals";

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

export function AdminContentManager() {
  // Hierarchy state
  const [hierarchy, setHierarchy] = useState<CategoryHierarchyItem[]>([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const [selectedPrepId, setSelectedPrepId] = useState<number | null>(null);

  // Canonical Academic Tree state
  const [academicTree, setAcademicTree] = useState<AcademicSubject[]>([]);
  const [loadingAcademicTree, setLoadingAcademicTree] = useState(false);
  const [selectedAcademicNode, setSelectedAcademicNode] = useState<SelectedAcademicNode>({
    type: "preparation",
  });

  // Content navigation & filter state
  const [activeSection, setActiveSection] = useState<ContentCategory>("subjective_topicwise");
  const [activeSubType, setActiveSubType] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Materials data
  const [materials, setMaterials] = useState<StudyMaterialListItem[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  // Modals state - Academic CRUD
  const [showSubjectModal, setShowSubjectModal] = useState<{
    mode: "add" | "edit";
    initialData?: Partial<ApiSubject> | null;
  } | null>(null);
  const [showChapterModal, setShowChapterModal] = useState<{
    mode: "add" | "edit";
    subject: AcademicSubject;
    initialData?: Partial<ApiChapter> | null;
  } | null>(null);
  const [showTopicModal, setShowTopicModal] = useState<{
    mode: "add" | "edit";
    chapter: AcademicChapter;
    subject?: AcademicSubject;
    initialData?: Partial<ApiTopic> | null;
  } | null>(null);
  const [safeDeleteTarget, setSafeDeleteTarget] = useState<DeleteNodeTarget | null>(null);

  // Modals state - Material CRUD
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadContext, setUploadContext] = useState<{
    subjectId?: number | null;
    chapterId?: number | null;
    topicId?: number | null;
  }>({});
  const [showEditModal, setShowEditModal] = useState<StudyMaterialListItem | null>(null);
  const [showReplaceModal, setShowReplaceModal] = useState<StudyMaterialListItem | null>(null);
  const [viewPdfMaterial, setViewPdfMaterial] = useState<StudyMaterialListItem | null>(null);
  const [deleteConfirmMaterial, setDeleteConfirmMaterial] = useState<StudyMaterialListItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modals state - Level / Prep management
  const [showAddLevelModal, setShowAddLevelModal] = useState(false);
  const [newLevelName, setNewLevelName] = useState("");
  const [isAddingLevel, setIsAddingLevel] = useState(false);

  const [showAddPrepModal, setShowAddPrepModal] = useState(false);
  const [newPrepName, setNewPrepName] = useState("");
  const [isAddingPrep, setIsAddingPrep] = useState(false);

  const [deleteNodeTarget, setDeleteNodeTarget] = useState<{
    type: "level" | "preparation";
    id: number;
    name: string;
  } | null>(null);
  const [isDeletingNode, setIsDeletingNode] = useState(false);

  // 1. Load Hierarchy
  const loadHierarchy = async (preserveSelection = true) => {
    setLoadingHierarchy(true);
    try {
      const data = await adminStudyMaterialApi.getHierarchy();
      setHierarchy(data);

      if (data.length > 0) {
        const pscCat = data.find((c) => c.name.toLowerCase().includes("psc")) || data[0];
        if (!pscCat) return;
        const initialCatId =
          preserveSelection && selectedCategoryId ? selectedCategoryId : pscCat.id;
        setSelectedCategoryId(initialCatId);

        const currentCat = data.find((c) => c.id === initialCatId) || pscCat;
        if (currentCat && currentCat.levels.length > 0) {
          const preferredLevel =
            currentCat.levels.find((l) => l.name.includes("5th")) || currentCat.levels[0];
          if (!preferredLevel) return;
          const initialLevelId =
            preserveSelection && selectedLevelId ? selectedLevelId : preferredLevel.id;
          setSelectedLevelId(initialLevelId);

          const currentLevel =
            currentCat.levels.find((l) => l.id === initialLevelId) || preferredLevel;
          if (currentLevel && currentLevel.preparations.length > 0) {
            const preferredPrep =
              currentLevel.preparations.find((p) => p.name.includes("Civil")) ||
              currentLevel.preparations[0];
            if (preferredPrep) {
              const initialPrepId =
                preserveSelection && selectedPrepId ? selectedPrepId : preferredPrep.id;
              setSelectedPrepId(initialPrepId);
            }
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load academic hierarchy");
    } finally {
      setLoadingHierarchy(false);
    }
  };

  useEffect(() => {
    loadHierarchy(false);
  }, []);

  // Derived active items
  const activeCategory = useMemo(
    () => hierarchy.find((c) => c.id === selectedCategoryId) || null,
    [hierarchy, selectedCategoryId]
  );

  const activeLevel = useMemo(
    () => activeCategory?.levels.find((l) => l.id === selectedLevelId) || null,
    [activeCategory, selectedLevelId]
  );

  const activePreparation = useMemo(
    () => activeLevel?.preparations.find((p) => p.id === selectedPrepId) || null,
    [activeLevel, selectedPrepId]
  );

  // 2. Load Academic Tree for selected preparation
  const loadAcademicTree = useCallback(
    async (prepId: number) => {
      setLoadingAcademicTree(true);
      try {
        const data = await adminStudyMaterialApi.getAcademicTree(prepId);
        setAcademicTree(data);

        // Keep selectedNode synchronized if its node was reloaded
        setSelectedAcademicNode((prev) => {
          if (prev.type === "subject" && prev.subject) {
            const updatedSub = data.find((s) => s.id === prev.subject!.id);
            return updatedSub ? { ...prev, subject: updatedSub } : { type: "preparation" };
          }
          if (prev.type === "chapter" && prev.chapter) {
            for (const s of data) {
              const updatedChap = s.chapters.find((c) => c.id === prev.chapter!.id);
              if (updatedChap) return { ...prev, subject: s, chapter: updatedChap };
            }
          }
          if (prev.type === "topic" && prev.topic) {
            for (const s of data) {
              for (const c of s.chapters) {
                const updatedTop = c.topics.find((t) => t.id === prev.topic!.id);
                if (updatedTop) return { ...prev, subject: s, chapter: c, topic: updatedTop };
              }
            }
          }
          return { type: "preparation" };
        });
      } catch {
        setAcademicTree([]);
      } finally {
        setLoadingAcademicTree(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!selectedPrepId) {
      setAcademicTree([]);
      setSelectedAcademicNode({ type: "preparation" });
      return;
    }
    loadAcademicTree(selectedPrepId);
  }, [selectedPrepId, loadAcademicTree]);

  // 3. Load materials for active node
  const loadMaterials = useCallback(async () => {
    if (!selectedPrepId) return;
    setLoadingMaterials(true);
    try {
      const params: any = {
        exam: selectedPrepId,
        content_category: activeSection,
        note_type: activeSubType !== "all" ? activeSubType : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
        pageSize: 100,
      };

      if (selectedAcademicNode.type === "topic" && selectedAcademicNode.topic) {
        params.topic = selectedAcademicNode.topic.id;
      } else if (selectedAcademicNode.type === "chapter" && selectedAcademicNode.chapter) {
        params.chapter = selectedAcademicNode.chapter.id;
      } else if (selectedAcademicNode.type === "subject" && selectedAcademicNode.subject) {
        params.subject = selectedAcademicNode.subject.id;
      }

      const res = await adminStudyMaterialApi.list(params);
      setMaterials(res.materials);
    } catch (err: any) {
      toast.error(err.message || "Failed to load materials");
    } finally {
      setLoadingMaterials(false);
    }
  }, [
    selectedPrepId,
    selectedAcademicNode,
    activeSection,
    activeSubType,
    statusFilter,
    searchQuery,
  ]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  // Handlers for Academic Tree Actions
  const handleOpenAddSubject = () => {
    setShowSubjectModal({ mode: "add" });
  };

  const handleOpenEditSubject = (sub: AcademicSubject) => {
    setShowSubjectModal({
      mode: "edit",
      initialData: {
        id: sub.id,
        name: sub.name,
        code: sub.code || "",
        description: sub.description || "",
        order: sub.order,
        is_active: sub.is_active ?? true,
      },
    });
  };

  const handleArchiveSubject = async (sub: AcademicSubject) => {
    try {
      await adminAcademicApi.archiveNode("subjects", sub.id, sub.is_active === false);
      toast.success(`"${sub.name}" ${sub.is_active === false ? "activated" : "archived"}`);
      if (selectedPrepId) loadAcademicTree(selectedPrepId);
    } catch (err: any) {
      toast.error(err.message || "Failed to update subject status");
    }
  };

  const handleDeleteSubject = (sub: AcademicSubject) => {
    setSafeDeleteTarget({
      modelType: "subjects",
      id: sub.id,
      name: sub.name,
    });
  };

  const handleOpenAddChapter = (sub: AcademicSubject) => {
    setShowChapterModal({ mode: "add", subject: sub });
  };

  const handleOpenEditChapter = (sub: AcademicSubject, chap: AcademicChapter) => {
    setShowChapterModal({
      mode: "edit",
      subject: sub,
      initialData: {
        id: chap.id,
        subject: sub.id,
        title: chap.title || chap.name || "",
        description: chap.description || "",
        order: chap.order,
        is_active: chap.is_active ?? true,
      },
    });
  };

  const handleArchiveChapter = async (chap: AcademicChapter) => {
    try {
      await adminAcademicApi.archiveNode("chapters", chap.id, chap.is_active === false);
      toast.success(
        `"${chap.title || chap.name}" ${chap.is_active === false ? "activated" : "archived"}`
      );
      if (selectedPrepId) loadAcademicTree(selectedPrepId);
    } catch (err: any) {
      toast.error(err.message || "Failed to update chapter status");
    }
  };

  const handleDeleteChapter = (chap: AcademicChapter) => {
    setSafeDeleteTarget({
      modelType: "chapters",
      id: chap.id,
      name: chap.title || chap.name || `Chapter ${chap.id}`,
    });
  };

  const handleOpenAddTopic = (chap: AcademicChapter, sub?: AcademicSubject) => {
    setShowTopicModal({ mode: "add", chapter: chap, subject: sub });
  };

  const handleOpenEditTopic = (chap: AcademicChapter, top: AcademicTopic) => {
    setShowTopicModal({
      mode: "edit",
      chapter: chap,
      initialData: {
        id: top.id,
        chapter: chap.id,
        name: top.name,
        description: top.description || "",
        order: top.order,
        is_active: top.is_active ?? true,
      },
    });
  };

  const handleArchiveTopic = async (top: AcademicTopic) => {
    try {
      await adminAcademicApi.archiveNode("topics", top.id, top.is_active === false);
      toast.success(`"${top.name}" ${top.is_active === false ? "activated" : "archived"}`);
      if (selectedPrepId) loadAcademicTree(selectedPrepId);
    } catch (err: any) {
      toast.error(err.message || "Failed to update topic status");
    }
  };

  const handleDeleteTopic = (top: AcademicTopic) => {
    setSafeDeleteTarget({
      modelType: "topics",
      id: top.id,
      name: top.name,
    });
  };

  // Open note upload pre-filled for a specific node
  const handleOpenUploadForNode = (node: SelectedAcademicNode) => {
    setUploadContext({
      subjectId: node.subject?.id ?? null,
      chapterId: node.chapter?.id ?? null,
      topicId: node.topic?.id ?? null,
    });
    setShowUploadModal(true);
  };

  // Toggle publish status on material
  const handleTogglePublish = async (mat: StudyMaterialListItem) => {
    const newStatus = mat.status === "published" ? "draft" : "published";
    try {
      await adminStudyMaterialApi.update(mat.id, { status: newStatus });
      toast.success(
        newStatus === "published" ? `"${mat.title}" published` : `"${mat.title}" saved as draft`
      );
      loadMaterials();
      loadHierarchy(true);
      if (selectedPrepId) loadAcademicTree(selectedPrepId);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  // Delete note material
  const handleDeleteMaterial = async () => {
    if (!deleteConfirmMaterial) return;
    setIsProcessing(true);
    try {
      await adminStudyMaterialApi.remove(deleteConfirmMaterial.id);
      toast.success("Material deleted successfully");
      setDeleteConfirmMaterial(null);
      loadMaterials();
      loadHierarchy(true);
      if (selectedPrepId) loadAcademicTree(selectedPrepId);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete material");
    } finally {
      setIsProcessing(false);
    }
  };

  // Add Level / Prep handlers
  const handleAddLevel = async () => {
    if (!selectedCategoryId || !newLevelName.trim()) return;
    setIsAddingLevel(true);
    try {
      const created = await adminSyllabusApi.createPosition({
        category: selectedCategoryId,
        parent: null,
        name: newLevelName.trim(),
      });
      toast.success(`"${created.name}" added.`);
      setShowAddLevelModal(false);
      setNewLevelName("");
      await loadHierarchy(true);
      setSelectedLevelId(created.id);
      setSelectedPrepId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to add level");
    } finally {
      setIsAddingLevel(false);
    }
  };

  const handleAddPrep = async () => {
    if (!selectedCategoryId || !selectedLevelId || !newPrepName.trim()) return;
    setIsAddingPrep(true);
    try {
      const created = await adminSyllabusApi.createPosition({
        category: selectedCategoryId,
        parent: selectedLevelId,
        name: newPrepName.trim(),
      });
      toast.success(`"${created.name}" added.`);
      setShowAddPrepModal(false);
      setNewPrepName("");
      await loadHierarchy(true);
      setSelectedPrepId(created.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to add preparation");
    } finally {
      setIsAddingPrep(false);
    }
  };

  const confirmDeleteNode = async () => {
    if (!deleteNodeTarget) return;
    setIsDeletingNode(true);
    try {
      await adminSyllabusApi.deletePosition(deleteNodeTarget.id);
      toast.success(`"${deleteNodeTarget.name}" deleted.`);
      if (deleteNodeTarget.type === "level" && selectedLevelId === deleteNodeTarget.id) {
        setSelectedLevelId(null);
        setSelectedPrepId(null);
      } else if (deleteNodeTarget.type === "preparation" && selectedPrepId === deleteNodeTarget.id) {
        setSelectedPrepId(null);
      }
      setDeleteNodeTarget(null);
      await loadHierarchy(true);
    } catch (err: any) {
      toast.error(err.message || `Failed to delete "${deleteNodeTarget.name}"`);
    } finally {
      setIsDeletingNode(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#C4A45C]">
            <Layers className="w-4 h-4" /> Master Academic Syllabus &amp; Notes
          </div>
          <h1 className="text-2xl font-extrabold text-[#0B2545] dark:text-white mt-1">
            Notes &amp; Academic Hierarchy
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Canonical taxonomy (Subject &rarr; Chapter &rarr; Topic) shared across Notes, Courses, Practice, Question Bank &amp; Exams.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadHierarchy(true);
              if (selectedPrepId) loadAcademicTree(selectedPrepId);
              loadMaterials();
            }}
            className="flex items-center gap-2 border-slate-200 dark:border-slate-700"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                loadingHierarchy || loadingAcademicTree || loadingMaterials ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>

          <Button
            onClick={() => handleOpenUploadForNode(selectedAcademicNode)}
            disabled={!activePreparation}
            className="bg-[#0B2545] hover:bg-[#163E6C] text-white shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Upload Note
          </Button>
        </div>
      </div>

      {/* TOP HIERARCHY SELECTOR STRIP: Category -> Level -> Preparation */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
        {/* Step 1: Category */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#0B2545] text-white text-[10px] inline-flex items-center justify-center font-bold">
                1
              </span>
              Exam Category
            </label>
            <span className="text-xs text-slate-400">{hierarchy.length} categories</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {hierarchy.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                    if (cat.levels.length > 0 && cat.levels[0]) {
                      setSelectedLevelId(cat.levels[0].id);
                      if (cat.levels[0].preparations.length > 0 && cat.levels[0].preparations[0]) {
                        setSelectedPrepId(cat.levels[0].preparations[0].id);
                      } else {
                        setSelectedPrepId(null);
                      }
                    } else {
                      setSelectedLevelId(null);
                      setSelectedPrepId(null);
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                    isSelected
                      ? "bg-[#0B2545] text-white border-[#0B2545] shadow-xs"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.2 rounded-full ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {cat.levels.length} levels
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Level Selection */}
        {activeCategory && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#C4A45C] text-black text-[10px] inline-flex items-center justify-center font-bold">
                  2
                </span>
                Level
              </label>

              <div className="flex items-center gap-3">
                {activeLevel && (
                  <button
                    onClick={() =>
                      setDeleteNodeTarget({
                        type: "level",
                        id: activeLevel.id,
                        name: activeLevel.name,
                      })
                    }
                    className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:underline"
                  >
                    <Trash2 className="w-3 h-3" /> Delete Level
                  </button>
                )}
                <button
                  onClick={() => setShowAddLevelModal(true)}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#0B2545] dark:text-[#C4A45C] hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add Level
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeCategory.levels.map((lvl) => {
                const isSelected = selectedLevelId === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    onClick={() => {
                      setSelectedLevelId(lvl.id);
                      if (lvl.preparations.length > 0 && lvl.preparations[0]) {
                        setSelectedPrepId(lvl.preparations[0].id);
                      } else {
                        setSelectedPrepId(null);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? "bg-[#C4A45C] text-black border-[#C4A45C] shadow-xs"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50"
                    }`}
                  >
                    {lvl.name} ({lvl.preparations.length})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Preparation Selection */}
        {activeLevel && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] inline-flex items-center justify-center font-bold">
                  3
                </span>
                Preparation / Service / Course
              </label>

              <div className="flex items-center gap-3">
                {activePreparation && (
                  <button
                    onClick={() =>
                      setDeleteNodeTarget({
                        type: "preparation",
                        id: activePreparation.id,
                        name: activePreparation.name,
                      })
                    }
                    className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:underline"
                  >
                    <Trash2 className="w-3 h-3" /> Delete Prep
                  </button>
                )}
                <button
                  onClick={() => setShowAddPrepModal(true)}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#0B2545] dark:text-[#C4A45C] hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add Preparation
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeLevel.preparations.map((prep) => {
                const isSelected = selectedPrepId === prep.id;
                return (
                  <button
                    key={prep.id}
                    onClick={() => {
                      setSelectedPrepId(prep.id);
                      setSelectedAcademicNode({ type: "preparation" });
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                      isSelected
                        ? "bg-[#0B2545] text-white border-[#0B2545] shadow-xs ring-2 ring-[#0B2545]/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <span>{prep.name}</span>
                    {prep.isComingSoon ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">
                        Coming Soon
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                          isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {prep.counts.total} notes
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* DUAL-PANE MAIN WORK AREA */}
      {activePreparation ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Master Academic Tree Panel (4 cols) */}
          <div className="lg:col-span-4 sticky top-24">
            <AcademicTreePanel
              preparationId={activePreparation.id}
              preparationName={activePreparation.name}
              subjects={academicTree}
              loading={loadingAcademicTree}
              selectedNode={selectedAcademicNode}
              onSelectNode={(node) => setSelectedAcademicNode(node)}
              onAddSubject={handleOpenAddSubject}
              onEditSubject={handleOpenEditSubject}
              onDeleteSubject={handleDeleteSubject}
              onArchiveSubject={handleArchiveSubject}
              onAddChapter={handleOpenAddChapter}
              onEditChapter={handleOpenEditChapter}
              onDeleteChapter={handleDeleteChapter}
              onArchiveChapter={handleArchiveChapter}
              onAddTopic={handleOpenAddTopic}
              onEditTopic={handleOpenEditTopic}
              onDeleteTopic={handleDeleteTopic}
              onArchiveTopic={handleArchiveTopic}
              onAddNoteForNode={handleOpenUploadForNode}
            />
          </div>

          {/* RIGHT COLUMN: Node Details, Actions & Notes Materials (8 cols) */}
          <div className="lg:col-span-8">
            <AcademicNodeDetailsPanel
              activeCategory={activeCategory!}
              activeLevel={activeLevel!}
              activePreparation={activePreparation}
              selectedNode={selectedAcademicNode}
              materials={materials}
              loadingMaterials={loadingMaterials}
              activeSection={activeSection}
              onSectionChange={(sec) => {
                setActiveSection(sec);
                setActiveSubType("all");
              }}
              activeSubType={activeSubType}
              onSubTypeChange={setActiveSubType}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onAddSubject={handleOpenAddSubject}
              onEditSubject={handleOpenEditSubject}
              onDeleteSubject={handleDeleteSubject}
              onArchiveSubject={handleArchiveSubject}
              onAddChapter={handleOpenAddChapter}
              onEditChapter={handleOpenEditChapter}
              onDeleteChapter={handleDeleteChapter}
              onArchiveChapter={handleArchiveChapter}
              onAddTopic={handleOpenAddTopic}
              onEditTopic={handleOpenEditTopic}
              onDeleteTopic={handleDeleteTopic}
              onArchiveTopic={handleArchiveTopic}
              onOpenUploadNote={() => handleOpenUploadForNode(selectedAcademicNode)}
              onViewPdf={setViewPdfMaterial}
              onReplacePdf={setShowReplaceModal}
              onEditMaterial={setShowEditModal}
              onTogglePublishMaterial={handleTogglePublish}
              onDeleteMaterial={setDeleteConfirmMaterial}
              onSelectNode={(node) => setSelectedAcademicNode(node)}
            />
          </div>
        </div>
      ) : (
        <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Please select a Preparation from the selector above.</p>
        </div>
      )}

      {/* ========================================================= */}
      {/* ACADEMIC MODALS                                          */}
      {/* ========================================================= */}

      {/* Add / Edit Subject Modal */}
      {showSubjectModal && activePreparation && (
        <AddEditSubjectModal
          isOpen={!!showSubjectModal}
          onClose={() => setShowSubjectModal(null)}
          preparationId={activePreparation.id}
          preparationName={activePreparation.name}
          initialData={showSubjectModal.initialData}
          onSuccess={() => {
            loadAcademicTree(activePreparation.id);
            loadHierarchy(true);
          }}
        />
      )}

      {/* Add / Edit Chapter Modal */}
      {showChapterModal && (
        <AddEditChapterModal
          isOpen={!!showChapterModal}
          onClose={() => setShowChapterModal(null)}
          subjectId={showChapterModal.subject.id}
          subjectName={showChapterModal.subject.name}
          initialData={showChapterModal.initialData}
          onSuccess={() => {
            if (selectedPrepId) loadAcademicTree(selectedPrepId);
          }}
        />
      )}

      {/* Add / Edit Topic Modal */}
      {showTopicModal && (
        <AddEditTopicModal
          isOpen={!!showTopicModal}
          onClose={() => setShowTopicModal(null)}
          chapterId={showTopicModal.chapter.id}
          chapterName={showTopicModal.chapter.title || showTopicModal.chapter.name || ""}
          subjectName={showTopicModal.subject?.name}
          initialData={showTopicModal.initialData}
          onSuccess={() => {
            if (selectedPrepId) loadAcademicTree(selectedPrepId);
          }}
        />
      )}

      {/* Academic Safe Delete Modal */}
      {safeDeleteTarget && (
        <AcademicSafeDeleteModal
          isOpen={!!safeDeleteTarget}
          onClose={() => setSafeDeleteTarget(null)}
          target={safeDeleteTarget}
          onSuccess={() => {
            if (selectedPrepId) loadAcademicTree(selectedPrepId);
            loadHierarchy(true);
            loadMaterials();
          }}
        />
      )}

      {/* ========================================================= */}
      {/* STUDY MATERIAL MODALS                                     */}
      {/* ========================================================= */}

      {/* Upload Material Modal */}
      {showUploadModal && activePreparation && (
        <UploadMaterialModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          activeCategory={activeCategory!}
          activeLevel={activeLevel!}
          activePreparation={activePreparation}
          activeSection={activeSection}
          activeSubType={
            activeSubType !== "all"
              ? (activeSubType as NoteType)
              : (SECTION_CONFIG.find((s) => s.id === activeSection)?.subTypes[0]?.value || "standard")
          }
          academicTree={academicTree}
          initialSubjectId={uploadContext.subjectId}
          initialChapterId={uploadContext.chapterId}
          initialTopicId={uploadContext.topicId}
          onSuccess={() => {
            setShowUploadModal(false);
            loadMaterials();
            loadHierarchy(true);
            if (selectedPrepId) loadAcademicTree(selectedPrepId);
          }}
        />
      )}

      {/* Edit Metadata Modal */}
      {showEditModal && (
        <EditMaterialModal
          material={showEditModal}
          academicTree={academicTree}
          onClose={() => setShowEditModal(null)}
          onSuccess={() => {
            setShowEditModal(null);
            loadMaterials();
            loadHierarchy(true);
            if (selectedPrepId) loadAcademicTree(selectedPrepId);
          }}
        />
      )}

      {/* Replace File Modal */}
      {showReplaceModal && (
        <ReplaceFileModal
          material={showReplaceModal}
          onClose={() => setShowReplaceModal(null)}
          onSuccess={() => {
            setShowReplaceModal(null);
            loadMaterials();
          }}
        />
      )}

      {/* View PDF Modal */}
      {viewPdfMaterial && (
        <ViewPdfModal
          material={viewPdfMaterial}
          onClose={() => setViewPdfMaterial(null)}
        />
      )}

      {/* Delete Note Confirmation Modal */}
      {deleteConfirmMaterial && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Confirm Deletion
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white">"{deleteConfirmMaterial.title}"</strong>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmMaterial(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isProcessing}
                onClick={handleDeleteMaterial}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Delete Material
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Level Modal */}
      {showAddLevelModal && activeCategory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-[#0B2545] dark:text-white">
              Add Level to {activeCategory.name}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Creates a new level (e.g. "4th Level", "5th Level") under this exam category.
            </p>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Level Name
              </label>
              <Input
                autoFocus
                placeholder="e.g. 8th Level"
                value={newLevelName}
                onChange={(e) => setNewLevelName(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddLevelModal(false);
                  setNewLevelName("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isAddingLevel || !newLevelName.trim()}
                onClick={handleAddLevel}
                className="bg-[#0B2545] hover:bg-[#163E6C] text-white"
              >
                {isAddingLevel ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Add Level
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Preparation Modal */}
      {showAddPrepModal && activeLevel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-[#0B2545] dark:text-white">
              Add Preparation to {activeLevel.name}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Creates a new preparation / service (e.g. "Computer / IT", "Electrical Engineering").
            </p>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Preparation Name
              </label>
              <Input
                autoFocus
                placeholder="e.g. Electrical Engineering"
                value={newPrepName}
                onChange={(e) => setNewPrepName(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddPrepModal(false);
                  setNewPrepName("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isAddingPrep || !newPrepName.trim()}
                onClick={handleAddPrep}
                className="bg-[#0B2545] hover:bg-[#163E6C] text-white"
              >
                {isAddingPrep ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Add Preparation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Level/Preparation Confirmation */}
      {deleteNodeTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Delete {deleteNodeTarget.type === "level" ? "Level" : "Preparation"}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white">"{deleteNodeTarget.name}"</strong>?
              {deleteNodeTarget.type === "level"
                ? " This also deletes every preparation, course link, and uploaded material under this level."
                : " This also deletes every notes file uploaded for this preparation."} This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteNodeTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeletingNode}
                onClick={confirmDeleteNode}
              >
                {isDeletingNode ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminNotesPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400">Loading notes &amp; academic hierarchy...</div>}>
      <AdminContentManager />
    </React.Suspense>
  );
}

// ==========================================
// UPLOAD MATERIAL MODAL (Context-Aware)
// ==========================================

function UploadMaterialModal({
  isOpen,
  onClose,
  activeCategory,
  activeLevel,
  activePreparation,
  activeSection,
  activeSubType,
  academicTree,
  initialSubjectId,
  initialChapterId,
  initialTopicId,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  activeCategory: CategoryHierarchyItem;
  activeLevel: LevelItem;
  activePreparation: PreparationItem;
  activeSection: ContentCategory;
  activeSubType: NoteType;
  academicTree: AcademicSubject[];
  initialSubjectId?: number | null;
  initialChapterId?: number | null;
  initialTopicId?: number | null;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSubType, setSelectedSubType] = useState<NoteType>(activeSubType);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | "">(
    initialSubjectId ?? ""
  );
  const [selectedChapterId, setSelectedChapterId] = useState<number | "">(
    initialChapterId ?? ""
  );
  const [selectedTopicId, setSelectedTopicId] = useState<number | "">(
    initialTopicId ?? ""
  );
  const [accessType, setAccessType] = useState<"free" | "premium">("free");
  const [materialStatus, setMaterialStatus] = useState<"published" | "draft">("published");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (initialSubjectId !== undefined) setSelectedSubjectId(initialSubjectId ?? "");
    if (initialChapterId !== undefined) setSelectedChapterId(initialChapterId ?? "");
    if (initialTopicId !== undefined) setSelectedTopicId(initialTopicId ?? "");
  }, [initialSubjectId, initialChapterId, initialTopicId]);

  // Available chapters for selected subject
  const availableChapters = useMemo(() => {
    if (!selectedSubjectId) return [];
    const sub = academicTree.find((s) => s.id === Number(selectedSubjectId));
    return sub ? sub.chapters : [];
  }, [academicTree, selectedSubjectId]);

  // Available topics for selected chapter
  const availableTopics = useMemo(() => {
    if (!selectedChapterId) return [];
    const chap = availableChapters.find((c) => c.id === Number(selectedChapterId));
    return chap ? chap.topics : [];
  }, [availableChapters, selectedChapterId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!file) {
      toast.error("Please attach a PDF note file");
      return;
    }

    setUploading(true);
    try {
      await adminStudyMaterialApi.create({
        title: title.trim(),
        description: description.trim(),
        exam: activePreparation.id,
        course: activePreparation.courseId,
        content_category: activeSection,
        note_type: selectedSubType,
        subject: selectedSubjectId ? Number(selectedSubjectId) : undefined,
        chapter: selectedChapterId ? Number(selectedChapterId) : undefined,
        topic: selectedTopicId ? Number(selectedTopicId) : undefined,
        access_type: accessType,
        status: materialStatus,
        file: file,
      });

      toast.success(
        materialStatus === "published"
          ? `"${title}" successfully uploaded and published!`
          : `"${title}" saved as draft`
      );
      onSuccess();
    } catch (err: any) {
      toast.error(err?.data?.error || err.message || "Failed to upload material");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
        {/* Modal Header */}
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="text-xs font-bold uppercase tracking-wider text-[#C4A45C]">
            Target Location Locked
          </div>
          <h2 className="text-xl font-extrabold text-[#0B2545] dark:text-white mt-0.5">
            Upload Note to {activePreparation.name}
          </h2>

          {/* Locked Hierarchy Info Badges */}
          <div className="flex flex-wrap gap-2 mt-2.5">
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs px-2.5 py-1 rounded-md font-medium">
              Category: <strong>{activeCategory.name}</strong>
            </span>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs px-2.5 py-1 rounded-md font-medium">
              Level: <strong>{activeLevel.name}</strong>
            </span>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs px-2.5 py-1 rounded-md font-medium">
              Preparation: <strong>{activePreparation.name}</strong>
            </span>
            <span className="bg-[#0B2545] text-white text-xs px-2.5 py-1 rounded-md font-medium">
              Section: <strong>{SECTION_CONFIG.find((s) => s.id === activeSection)?.label}</strong>
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {/* SubType Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Note Sub-Type
            </label>
            <div className="flex gap-2">
              {SECTION_CONFIG.find((s) => s.id === activeSection)?.subTypes.map((st) => (
                <button
                  type="button"
                  key={st.value}
                  onClick={() => setSelectedSubType(st.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    selectedSubType === st.value
                      ? "bg-[#0B2545] text-white border-[#0B2545]"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              required
              placeholder="e.g. Complete Notes on Structural Analysis & Mechanics"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Brief summary of what this document covers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0B2545]"
            />
          </div>

          {/* Dynamic Academic Placement Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Subject
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value ? Number(e.target.value) : "");
                  setSelectedChapterId("");
                  setSelectedTopicId("");
                }}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  -- Preparation Wide --
                </option>
                {academicTree.map((sub) => (
                  <option
                    key={sub.id}
                    value={sub.id}
                    className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Chapter
              </label>
              <select
                disabled={!selectedSubjectId}
                value={selectedChapterId}
                onChange={(e) => {
                  setSelectedChapterId(e.target.value ? Number(e.target.value) : "");
                  setSelectedTopicId("");
                }}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none disabled:opacity-50"
              >
                <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  -- All Chapters --
                </option>
                {availableChapters.map((chap) => (
                  <option
                    key={chap.id}
                    value={chap.id}
                    className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {chap.title || chap.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Topic
              </label>
              <select
                disabled={!selectedChapterId}
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value ? Number(e.target.value) : "")}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none disabled:opacity-50"
              >
                <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  -- All Topics --
                </option>
                {availableTopics.map((t) => (
                  <option
                    key={t.id}
                    value={t.id}
                    className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* File Upload Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              PDF Document <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 text-center bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100/50 transition-colors">
              <input
                type="file"
                accept=".pdf,application/pdf"
                id="file-upload-input"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) setFile(e.target.files[0]);
                }}
              />
              <label htmlFor="file-upload-input" className="cursor-pointer">
                <UploadCloud className="w-8 h-8 text-[#C4A45C] mx-auto mb-2" />
                {file ? (
                  <div>
                    <span className="text-xs font-bold text-[#0B2545] dark:text-white block">
                      Selected: {file.name}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB) — Click to change
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-bold text-[#0B2545] dark:text-white block">
                      Click to choose PDF file
                    </span>
                    <span className="text-[11px] text-slate-400">
                      PDF documents up to 20MB supported
                    </span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Access & Status */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Access Type
              </label>
              <select
                value={accessType}
                onChange={(e) => setAccessType(e.target.value as any)}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="free">Free Access</option>
                <option value="premium">Premium Access Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Initial Status
              </label>
              <select
                value={materialStatus}
                onChange={(e) => setMaterialStatus(e.target.value as any)}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="published">Publish Immediately</option>
                <option value="draft">Save as Draft</option>
              </select>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={uploading || !file}
              className="bg-[#0B2545] hover:bg-[#163E6C] text-white"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 mr-1.5" />
                  Upload Note
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// EDIT MATERIAL MODAL
// ==========================================

function EditMaterialModal({
  material,
  academicTree,
  onClose,
  onSuccess,
}: {
  material: StudyMaterialListItem;
  academicTree: AcademicSubject[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState(material.title);
  const [description, setDescription] = useState(material.description || "");
  const [subjectId, setSubjectId] = useState<number | "">(material.subjectId || "");
  const [chapterId, setChapterId] = useState<number | "">(material.chapterId || "");
  const [topicId, setTopicId] = useState<number | "">(material.topicId || "");
  const [accessType, setAccessType] = useState<"free" | "premium">(material.accessType);
  const [status, setStatus] = useState<string>(material.status);
  const [saving, setSaving] = useState(false);

  const availableChapters = useMemo(() => {
    if (!subjectId) return [];
    const sub = academicTree.find((s) => s.id === Number(subjectId));
    return sub ? sub.chapters : [];
  }, [academicTree, subjectId]);

  const availableTopics = useMemo(() => {
    if (!chapterId) return [];
    const chap = availableChapters.find((c) => c.id === Number(chapterId));
    return chap ? chap.topics : [];
  }, [availableChapters, chapterId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      await adminStudyMaterialApi.update(material.id, {
        title: title.trim(),
        description: description.trim(),
        subject: subjectId ? Number(subjectId) : null,
        chapter: chapterId ? Number(chapterId) : null,
        topic: topicId ? Number(topicId) : null,
        access_type: accessType,
        status: status as any,
      });
      toast.success("Metadata updated successfully");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to update metadata");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-[#0B2545] dark:text-white">
          Edit Material Metadata
        </h2>

        <form onSubmit={handleSave} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Title
            </label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          {/* Academic Placement */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Subject
              </label>
              <select
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value ? Number(e.target.value) : "");
                  setChapterId("");
                  setTopicId("");
                }}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="">-- None --</option>
                {academicTree.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Chapter
              </label>
              <select
                disabled={!subjectId}
                value={chapterId}
                onChange={(e) => {
                  setChapterId(e.target.value ? Number(e.target.value) : "");
                  setTopicId("");
                }}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:opacity-50"
              >
                <option value="">-- None --</option>
                {availableChapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title || c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Topic
              </label>
              <select
                disabled={!chapterId}
                value={topicId}
                onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : "")}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:opacity-50"
              >
                <option value="">-- None --</option>
                {availableTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Access
              </label>
              <select
                value={accessType}
                onChange={(e) => setAccessType(e.target.value as any)}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="free">Free</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="bg-[#0B2545] hover:bg-[#163E6C] text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// REPLACE FILE MODAL
// ==========================================

function ReplaceFileModal({
  material,
  onClose,
  onSuccess,
}: {
  material: StudyMaterialListItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [replacing, setReplacing] = useState(false);

  const handleReplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a new PDF file");
      return;
    }

    setReplacing(true);
    try {
      await adminStudyMaterialApi.update(material.id, { file });
      toast.success("PDF file replaced successfully!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to replace file");
    } finally {
      setReplacing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-[#0B2545] dark:text-white">Replace PDF Document</h2>
          <p className="text-xs text-slate-500 mt-1">
            Replace existing file for <strong className="text-slate-800 dark:text-slate-200">"{material.title}"</strong>.
          </p>
        </div>

        <form onSubmit={handleReplace} className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 text-center bg-slate-50/50 dark:bg-slate-800/50">
            <input
              type="file"
              accept=".pdf,application/pdf"
              id="replace-file-input"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) setFile(e.target.files[0]);
              }}
            />
            <label htmlFor="replace-file-input" className="cursor-pointer">
              <UploadCloud className="w-8 h-8 text-[#C4A45C] mx-auto mb-2" />
              {file ? (
                <div>
                  <span className="text-xs font-bold text-[#0B2545] dark:text-white block">
                    {file.name}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              ) : (
                <span className="text-xs font-bold text-[#0B2545] dark:text-white block">
                  Click to select replacement PDF
                </span>
              )}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={replacing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={replacing || !file}
              className="bg-[#0B2545] hover:bg-[#163E6C] text-white"
            >
              {replacing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Replace File
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// VIEW PDF MODAL
// ==========================================

function ViewPdfModal({
  material,
  onClose,
}: {
  material: StudyMaterialListItem;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full h-[88vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
          <div>
            <h3 className="font-bold text-[#0B2545] dark:text-white text-base">
              {material.title}
            </h3>
            <div className="text-xs text-slate-400">
              {material.examName} &bull; {material.contentCategory} ({material.noteType})
            </div>
          </div>

          <div className="flex items-center gap-2">
            {material.fileUrl && (
              <a
                href={material.fileUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-[#C4A45C] hover:bg-[#b09048] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </a>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              &#10005;
            </Button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-2 overflow-hidden">
          {material.fileUrl ? (
            <iframe
              src={`${material.fileUrl}#view=FitH`}
              className="w-full h-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white"
              title={material.title}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              No PDF file attached to this material.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
