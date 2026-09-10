"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen, Search, FileText, Eye, Edit, Trash2, Plus, Loader2,
  UploadCloud, CheckCircle2, AlertCircle, RefreshCw, ChevronRight,
  Layers, Download, Filter, FileCheck, Sparkles, Brain, Clock, Shield
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
  AcademicTopic
} from "@/lib/api/admin-study-materials";
import { adminSyllabusApi } from "@/lib/api/admin-syllabus";

const SECTION_CONFIG: {
  id: ContentCategory;
  label: string;
  subTypes: { value: NoteType; label: string }[];
}[] = [
  {
    id: "syllabus",
    label: "Syllabus",
    subTypes: [{ value: "standard", label: "Official PDF" }],
  },
  {
    id: "subjective_topicwise",
    label: "Subjective Topicwise Notes [Detailed]",
    subTypes: [
      { value: "standard", label: "Standard" },
      { value: "ai", label: "AI" },
    ],
  },
  {
    id: "objective_topicwise",
    label: "Objective Topicwise Notes [Detailed]",
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

export default function AdminSyllabusNotesPage() {
  // Hierarchy state
  const [hierarchy, setHierarchy] = useState<CategoryHierarchyItem[]>([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const [selectedPrepId, setSelectedPrepId] = useState<number | null>(null);

  // Content navigation state
  const [activeSection, setActiveSection] = useState<ContentCategory>("syllabus");
  const [activeSubType, setActiveSubType] = useState<string>("all"); // 'all' or NoteType
  const [statusFilter, setStatusFilter] = useState<string>("all"); // 'all', 'published', 'draft'
  const [searchQuery, setSearchQuery] = useState("");

  // Materials data
  const [materials, setMaterials] = useState<StudyMaterialListItem[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  // Academic tree for selected preparation (for form dropdowns)
  const [academicTree, setAcademicTree] = useState<AcademicSubject[]>([]);

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<StudyMaterialListItem | null>(null);
  const [showReplaceModal, setShowReplaceModal] = useState<StudyMaterialListItem | null>(null);
  const [viewPdfMaterial, setViewPdfMaterial] = useState<StudyMaterialListItem | null>(null);
  const [deleteConfirmMaterial, setDeleteConfirmMaterial] = useState<StudyMaterialListItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Load Hierarchy
  const loadHierarchy = async (preserveSelection = true) => {
    setLoadingHierarchy(true);
    try {
      const data = await adminStudyMaterialApi.getHierarchy();
      setHierarchy(data);

      if (data.length > 0) {
        const pscCat = data.find(c => c.name.toLowerCase().includes("psc")) || data[0];
        if (!pscCat) return;
        const initialCatId = preserveSelection && selectedCategoryId ? selectedCategoryId : pscCat.id;
        setSelectedCategoryId(initialCatId);

        const currentCat = data.find(c => c.id === initialCatId) || pscCat;
        if (currentCat && currentCat.levels.length > 0) {
          // Prefer 5th level if first load
          const preferredLevel = currentCat.levels.find(l => l.name.includes("5th")) || currentCat.levels[0];
          if (!preferredLevel) return;
          const initialLevelId = preserveSelection && selectedLevelId ? selectedLevelId : preferredLevel.id;
          setSelectedLevelId(initialLevelId);

          const currentLevel = currentCat.levels.find(l => l.id === initialLevelId) || preferredLevel;
          if (currentLevel && currentLevel.preparations.length > 0) {
            // Prefer Civil Engineering if first load
            const preferredPrep = currentLevel.preparations.find(p => p.name.includes("Civil")) || currentLevel.preparations[0];
            if (preferredPrep) {
              const initialPrepId = preserveSelection && selectedPrepId ? selectedPrepId : preferredPrep.id;
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
    () => hierarchy.find(c => c.id === selectedCategoryId) || null,
    [hierarchy, selectedCategoryId]
  );

  const activeLevel = useMemo(
    () => activeCategory?.levels.find(l => l.id === selectedLevelId) || null,
    [activeCategory, selectedLevelId]
  );

  const activePreparation = useMemo(
    () => activeLevel?.preparations.find(p => p.id === selectedPrepId) || null,
    [activeLevel, selectedPrepId]
  );

  // Load academic tree when preparation changes
  useEffect(() => {
    if (!selectedPrepId) {
      setAcademicTree([]);
      return;
    }
    adminStudyMaterialApi.getAcademicTree(selectedPrepId)
      .then(setAcademicTree)
      .catch(() => setAcademicTree([]));
  }, [selectedPrepId]);

  // Load materials when preparation, section, subtype, or status changes
  const loadMaterials = async () => {
    if (!selectedPrepId) return;
    setLoadingMaterials(true);
    try {
      const res = await adminStudyMaterialApi.list({
        exam: selectedPrepId,
        content_category: activeSection,
        note_type: activeSubType !== "all" ? activeSubType : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
        pageSize: 100,
      });
      setMaterials(res.materials);
    } catch (err: any) {
      toast.error(err.message || "Failed to load materials");
    } finally {
      setLoadingMaterials(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, [selectedPrepId, activeSection, activeSubType, statusFilter, searchQuery]);

  // Handle section change
  const handleSectionChange = (section: ContentCategory) => {
    setActiveSection(section);
    setActiveSubType("all");
  };

  // Toggle publish status
  const handleTogglePublish = async (mat: StudyMaterialListItem) => {
    const newStatus = mat.status === "published" ? "draft" : "published";
    try {
      await adminStudyMaterialApi.update(mat.id, { status: newStatus });
      toast.success(newStatus === "published" ? `"${mat.title}" published` : `"${mat.title}" saved as draft`);
      loadMaterials();
      loadHierarchy(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  // Publish a "Coming Soon" preparation's underlying course so students can
  // access it (and admins can start uploading real content against it).
  const [publishingCourseId, setPublishingCourseId] = useState<number | null>(null);
  const handleSetCourseStatus = async (courseId: number, prepName: string, newStatus: "published" | "coming_soon") => {
    setPublishingCourseId(courseId);
    try {
      await adminStudyMaterialApi.setCourseStatus(courseId, newStatus);
      toast.success(
        newStatus === "published"
          ? `"${prepName}" is now live for students.`
          : `"${prepName}" is now marked Coming Soon.`
      );
      await loadHierarchy(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to update course status");
    } finally {
      setPublishingCourseId(null);
    }
  };
  const handlePublishCourse = (courseId: number, prepName: string) => handleSetCourseStatus(courseId, prepName, "published");
  const handleMarkComingSoon = (courseId: number, prepName: string) => handleSetCourseStatus(courseId, prepName, "coming_soon");

  // Delete a Level or Preparation/Service node (an Exam row). Cascades to
  // any papers/subjects/chapters/topics and study materials under it on the
  // backend, so this is confirmed before firing.
  const [deleteNodeTarget, setDeleteNodeTarget] = useState<{ type: "level" | "preparation"; id: number; name: string } | null>(null);
  const [isDeletingNode, setIsDeletingNode] = useState(false);

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

  // Add a new Level under the selected Exam Category (a top-level, parent-less
  // Exam row — see exams.models.Exam for why this doubles as "Level").
  const [showAddLevelModal, setShowAddLevelModal] = useState(false);
  const [newLevelName, setNewLevelName] = useState("");
  const [isAddingLevel, setIsAddingLevel] = useState(false);

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

  // Add a new Preparation/Service under the selected Level (a child Exam row
  // — see exams.models.Exam). Materials are keyed off this Exam id directly,
  // so no Course needs to exist before an admin can start uploading content.
  const [showAddPrepModal, setShowAddPrepModal] = useState(false);
  const [newPrepName, setNewPrepName] = useState("");
  const [isAddingPrep, setIsAddingPrep] = useState(false);

  const handleAddPrep = async () => {
    if (!selectedCategoryId || !selectedLevelId || !newPrepName.trim()) return;
    setIsAddingPrep(true);
    try {
      const created = await adminSyllabusApi.createPosition({
        category: selectedCategoryId,
        parent: selectedLevelId,
        name: newPrepName.trim(),
      });
      toast.success(`"${created.name}" added — you can now upload materials for it.`);
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

  // Delete material
  const handleDelete = async () => {
    if (!deleteConfirmMaterial) return;
    setIsProcessing(true);
    try {
      await adminStudyMaterialApi.remove(deleteConfirmMaterial.id);
      toast.success("Material deleted successfully");
      setDeleteConfirmMaterial(null);
      loadMaterials();
      loadHierarchy(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete material");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#C4A45C]">
            <Layers className="w-4 h-4" /> Real Content Management System
          </div>
          <h1 className="text-2xl font-extrabold text-[#0B2545] dark:text-white mt-1">
            Syllabus & Notes Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage official syllabus PDFs, topicwise detailed notes (Standard / AI), and revision notes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadHierarchy(true);
              loadMaterials();
            }}
            className="flex items-center gap-2 border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${loadingHierarchy || loadingMaterials ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            onClick={() => setShowUploadModal(true)}
            disabled={!activePreparation}
            className="bg-[#0B2545] hover:bg-[#163E6C] text-white shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Upload Material
          </Button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Hierarchy Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                1. Exam Category
              </label>
              <div className="space-y-1">
                {hierarchy.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      if (cat.levels.length > 0 && cat.levels[0]) {
                        setSelectedLevelId(cat.levels[0].id);
                        if (cat.levels[0].preparations.length > 0 && cat.levels[0].preparations[0]) {
                          setSelectedPrepId(cat.levels[0].preparations[0].id);
                        }
                      }
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${
                      selectedCategoryId === cat.id
                        ? "bg-[#0B2545] text-white shadow-sm"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${selectedCategoryId === cat.id ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                      {cat.levels.length} levels
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Level Selector */}
            {activeCategory && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    2. Level Selection
                  </label>
                  <div className="flex items-center gap-3">
                    {activeLevel && (
                      <button
                        onClick={() => setDeleteNodeTarget({ type: "level", id: activeLevel.id, name: activeLevel.name })}
                        className="flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
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
                <div className="grid grid-cols-3 gap-2">
                  {activeCategory.levels.map(lvl => (
                    <button
                      key={lvl.id}
                      onClick={() => {
                        setSelectedLevelId(lvl.id);
                        if (lvl.preparations.length > 0 && lvl.preparations[0]) {
                          setSelectedPrepId(lvl.preparations[0].id);
                        }
                      }}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold text-center transition-all border ${
                        selectedLevelId === lvl.id
                          ? "bg-[#C4A45C] text-white border-[#C4A45C] shadow-sm"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50"
                      }`}
                    >
                      {lvl.name.replace("Exam", "").trim()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Preparations Selector */}
            {activeLevel && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    3. Preparation / Service
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{activeLevel.preparations.length} available</span>
                    {activePreparation && (
                      <button
                        onClick={() => setDeleteNodeTarget({ type: "preparation", id: activePreparation.id, name: activePreparation.name })}
                        className="flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    )}
                    <button
                      onClick={() => setShowAddPrepModal(true)}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#0B2545] dark:text-[#C4A45C] hover:underline"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {activeLevel.preparations.map(prep => {
                    const isSelected = selectedPrepId === prep.id;
                    const isCS = prep.isComingSoon;
                    return (
                      <button
                        key={prep.id}
                        onClick={() => setSelectedPrepId(prep.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-slate-50 dark:bg-slate-800 border-[#0B2545] dark:border-[#C4A45C] ring-2 ring-[#0B2545]/10 dark:ring-[#C4A45C]/20"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <div>
                          <div className={`font-bold text-sm ${ isCS ? "text-amber-700 dark:text-amber-400" : "text-[#0B2545] dark:text-white" } flex items-center gap-1.5`}>
                            {prep.name}
                          </div>
                          {prep.courseTitle && (
                            <div className="text-xs text-slate-400 truncate max-w-[180px]">
                              {prep.courseTitle}
                            </div>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          {isCS ? (
                            <span className="inline-block px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              Coming Soon
                            </span>
                          ) : (
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                              isSelected
                                ? "bg-[#0B2545] text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            }`}>
                              {prep.counts.total} files
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Preparation Content Area */}
        <div className="lg:col-span-8 space-y-6">
          {activePreparation ? (
            <>
              {/* Selected Preparation Overview Card */}
              <div className="bg-gradient-to-br from-[#0B2545] to-[#163E6C] text-white p-6 rounded-2xl shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#C4A45C]">
                      <span>{activeCategory?.name}</span>
                      <span>•</span>
                      <span>{activeLevel?.name}</span>
                    </div>
                    <h2 className="text-2xl font-extrabold mt-1">{activePreparation.name}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {activePreparation.isComingSoon && (
                      <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 pl-3 pr-1.5 py-1.5 rounded-xl text-xs font-bold text-amber-300">
                        <Clock className="w-3.5 h-3.5" />
                        Coming Soon — Content pre-loading enabled
                        {activePreparation.courseId && (
                          <Button
                            size="sm"
                            disabled={publishingCourseId === activePreparation.courseId}
                            onClick={() => handlePublishCourse(activePreparation.courseId!, activePreparation.name)}
                            className="h-7 px-3 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold rounded-lg"
                          >
                            {publishingCourseId === activePreparation.courseId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Publish Now
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                    {!activePreparation.isComingSoon && activePreparation.courseId && (
                      <Button
                        size="sm"
                        disabled={publishingCourseId === activePreparation.courseId}
                        onClick={() => handleMarkComingSoon(activePreparation.courseId!, activePreparation.name)}
                        className="h-8 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-300 text-[11px] font-bold rounded-xl"
                      >
                        {publishingCourseId === activePreparation.courseId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 mr-1" /> Mark Coming Soon
                          </>
                        )}
                      </Button>
                    )}
                    <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-xl text-xs font-medium text-white/90">
                      <Shield className="w-4 h-4 text-[#C4A45C]" />
                      <span>Real Database Content Counts</span>
                    </div>
                  </div>
                </div>

                {/* Real Counts Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
                    <div className="text-xs text-white/70 font-medium">Syllabus</div>
                    <div className="text-2xl font-black text-[#C4A45C] mt-0.5">
                      {activePreparation.counts.syllabus}
                    </div>
                    <div className="text-[11px] text-white/50">official files</div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
                    <div className="text-xs text-white/70 font-medium">Subjective Notes</div>
                    <div className="text-2xl font-black text-white mt-0.5">
                      {activePreparation.counts.subjective_topicwise}
                    </div>
                    <div className="text-[11px] text-white/50">detailed materials</div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
                    <div className="text-xs text-white/70 font-medium">Objective Notes</div>
                    <div className="text-2xl font-black text-white mt-0.5">
                      {activePreparation.counts.objective_topicwise}
                    </div>
                    <div className="text-[11px] text-white/50">detailed materials</div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
                    <div className="text-xs text-white/70 font-medium">Revision Notes</div>
                    <div className="text-2xl font-black text-white mt-0.5">
                      {activePreparation.counts.revision_notes}
                    </div>
                    <div className="text-[11px] text-white/50">summary materials</div>
                  </div>
                </div>
              </div>

              {/* Section Tabs */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-4">
                <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 gap-2">
                  {SECTION_CONFIG.map(sec => {
                    const isTabActive = activeSection === sec.id;
                    const count = activePreparation.counts[sec.id] || 0;
                    return (
                      <button
                        key={sec.id}
                        onClick={() => handleSectionChange(sec.id)}
                        className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                          isTabActive
                            ? "bg-[#0B2545] text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span>{sec.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          isTabActive ? "bg-[#C4A45C] text-black" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-type filter & Search Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  {/* Sub-types pills (Standard / AI or Subjective / Objective) */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      onClick={() => setActiveSubType("all")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        activeSubType === "all"
                          ? "bg-white dark:bg-slate-700 text-[#0B2545] dark:text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                      }`}
                    >
                      All Types
                    </button>
                    {SECTION_CONFIG.find(s => s.id === activeSection)?.subTypes.map(st => (
                      <button
                        key={st.value}
                        onClick={() => setActiveSubType(st.value)}
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
                        placeholder="Search title, subject..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#0B2545]"
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="all" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">All Status</option>
                      <option value="published" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Published</option>
                      <option value="draft" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Draft</option>
                    </select>
                  </div>
                </div>

                {/* Materials List */}
                <div className="pt-2">
                  {loadingMaterials ? (
                    <div className="py-16 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      <p className="text-xs">Loading materials...</p>
                    </div>
                  ) : materials.length === 0 ? (
                    <div className="py-14 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                      <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No content in this section</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                        Upload official syllabus documents or notes specifically for {activePreparation.name}.
                      </p>
                      <Button
                        onClick={() => setShowUploadModal(true)}
                        size="sm"
                        className="bg-[#0B2545] hover:bg-[#163E6C] text-white"
                      >
                        <Plus className="w-4 h-4 mr-1.5" /> Upload Material
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {materials.map(mat => (
                        <div
                          key={mat.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Type Badge */}
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                                mat.noteType === "ai"
                                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              }`}>
                                {mat.noteType}
                              </span>

                              {/* Status Badge */}
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                mat.status === "published"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}>
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

                            {/* Breadcrumb metadata */}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 pt-1">
                              {mat.subjectName && (
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                  Subject: {mat.subjectName}
                                </span>
                              )}
                              {mat.chapterName && (
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                  Unit: {mat.chapterName}
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
                                onClick={() => setViewPdfMaterial(mat)}
                                className="text-xs h-8 px-2.5 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" /> View PDF
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowReplaceModal(mat)}
                              className="text-xs h-8 px-2.5 text-slate-600 dark:text-slate-300"
                            >
                              <UploadCloud className="w-3.5 h-3.5 mr-1" /> Replace PDF
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowEditModal(mat)}
                              className="text-xs h-8 px-2.5 text-slate-600 dark:text-slate-300"
                            >
                              <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleTogglePublish(mat)}
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
                              onClick={() => setDeleteConfirmMaterial(mat)}
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
            </>
          ) : (
            <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Please select a Preparation from the left panel.</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && activePreparation && (
        <UploadMaterialModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          activeCategory={activeCategory!}
          activeLevel={activeLevel!}
          activePreparation={activePreparation}
          activeSection={activeSection}
          activeSubType={activeSubType !== "all" ? (activeSubType as NoteType) : (SECTION_CONFIG.find(s => s.id === activeSection)?.subTypes[0]?.value || "standard")}
          academicTree={academicTree}
          onSuccess={() => {
            setShowUploadModal(false);
            loadMaterials();
            loadHierarchy(true);
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

      {/* Delete Confirmation Modal */}
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
                onClick={handleDelete}
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
                onKeyDown={(e) => { if (e.key === "Enter" && newLevelName.trim()) handleAddLevel(); }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowAddLevelModal(false); setNewLevelName(""); }}
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

      {/* Add Preparation/Service Modal */}
      {showAddPrepModal && activeLevel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-[#0B2545] dark:text-white">
              Add Preparation/Service to {activeLevel.name}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Creates a new preparation (e.g. "Civil", "Computer") under this level. You'll be able to upload syllabus and notes for it right away.
            </p>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Preparation Name
              </label>
              <Input
                autoFocus
                placeholder="e.g. Computer Engineering"
                value={newPrepName}
                onChange={(e) => setNewPrepName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newPrepName.trim()) handleAddPrep(); }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowAddPrepModal(false); setNewPrepName(""); }}
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
                : " This also deletes every syllabus/notes file uploaded for this preparation."
              } This action cannot be undone.
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

// ==========================================
// UPLOAD MATERIAL MODAL
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
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSubType, setSelectedSubType] = useState<NoteType>(activeSubType);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | "">("");
  const [selectedChapterId, setSelectedChapterId] = useState<number | "">("");
  const [selectedTopicId, setSelectedTopicId] = useState<number | "">("");
  const [accessType, setAccessType] = useState<"free" | "premium">("free");
  const [materialStatus, setMaterialStatus] = useState<"published" | "draft">("published");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Available chapters for selected subject
  const availableChapters = useMemo(() => {
    if (!selectedSubjectId) return [];
    const sub = academicTree.find(s => s.id === Number(selectedSubjectId));
    return sub ? sub.chapters : [];
  }, [academicTree, selectedSubjectId]);

  // Available topics for selected chapter
  const availableTopics = useMemo(() => {
    if (!selectedChapterId) return [];
    const chap = availableChapters.find(c => c.id === Number(selectedChapterId));
    return chap ? chap.topics : [];
  }, [availableChapters, selectedChapterId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!file && activeSection === "syllabus") {
      toast.error("Please attach a syllabus PDF file");
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
            Upload to {activePreparation.name}
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
              Section: <strong>{SECTION_CONFIG.find(s => s.id === activeSection)?.label}</strong>
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {/* SubType Selection if applicable */}
          {activeSection !== "syllabus" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Note Type
              </label>
              <div className="flex gap-2">
                {SECTION_CONFIG.find(s => s.id === activeSection)?.subTypes.map(st => (
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
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              required
              placeholder={activeSection === "syllabus" ? "e.g., Official Syllabus - Civil Engineering 5th Level" : "e.g., Complete Notes on Structural Analysis"}
              value={title}
              onChange={e => setTitle(e.target.value)}
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
              onChange={e => setDescription(e.target.value)}
              className="w-full text-sm p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0B2545]"
            />
          </div>

          {/* Dynamic Academic Placement Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Subject (Optional)
              </label>
              <select
                value={selectedSubjectId}
                onChange={e => {
                  setSelectedSubjectId(e.target.value ? Number(e.target.value) : "");
                  setSelectedChapterId("");
                  setSelectedTopicId("");
                }}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">-- Preparation Wide --</option>
                {academicTree.map(sub => (
                  <option key={sub.id} value={sub.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Chapter / Unit
              </label>
              <select
                disabled={!selectedSubjectId}
                value={selectedChapterId}
                onChange={e => {
                  setSelectedChapterId(e.target.value ? Number(e.target.value) : "");
                  setSelectedTopicId("");
                }}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none disabled:opacity-50"
              >
                <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">-- All Units --</option>
                {availableChapters.map(chap => (
                  <option key={chap.id} value={chap.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    {chap.title}
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
                onChange={e => setSelectedTopicId(e.target.value ? Number(e.target.value) : "")}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none disabled:opacity-50"
              >
                <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">-- All Topics --</option>
                {availableTopics.map(t => (
                  <option key={t.id} value={t.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
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
                onChange={e => {
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
                onChange={e => setAccessType(e.target.value as any)}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="free" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Free for authorized students</option>
                <option value="premium" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Premium (Subscription required)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Publication Status
              </label>
              <select
                value={materialStatus}
                onChange={e => setMaterialStatus(e.target.value as any)}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="published" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Publish Now (Immediate student access)</option>
                <option value="draft" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Save as Draft (Admin only)</option>
              </select>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={uploading} className="bg-[#0B2545] hover:bg-[#163E6C] text-white">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 mr-1.5" />
                  {materialStatus === "published" ? "Upload & Publish" : "Save as Draft"}
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
    const sub = academicTree.find(s => s.id === Number(subjectId));
    return sub ? sub.chapters : [];
  }, [academicTree, subjectId]);

  const availableTopics = useMemo(() => {
    if (!chapterId) return [];
    const chap = availableChapters.find(c => c.id === Number(chapterId));
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
              onChange={e => setTitle(e.target.value)}
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
              onChange={e => setDescription(e.target.value)}
              className="w-full text-sm p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Subject
              </label>
              <select
                value={subjectId}
                onChange={e => {
                  setSubjectId(e.target.value ? Number(e.target.value) : "");
                  setChapterId("");
                  setTopicId("");
                }}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">-- None --</option>
                {academicTree.map(s => (
                  <option key={s.id} value={s.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Chapter/Unit
              </label>
              <select
                disabled={!subjectId}
                value={chapterId}
                onChange={e => {
                  setChapterId(e.target.value ? Number(e.target.value) : "");
                  setTopicId("");
                }}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:opacity-50"
              >
                <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">-- None --</option>
                {availableChapters.map(c => (
                  <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{c.title}</option>
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
                onChange={e => setTopicId(e.target.value ? Number(e.target.value) : "")}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:opacity-50"
              >
                <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">-- None --</option>
                {availableTopics.map(t => (
                  <option key={t.id} value={t.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{t.name}</option>
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
                onChange={e => setAccessType(e.target.value as any)}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="free" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Free</option>
                <option value="premium" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Premium</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="published" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Published</option>
                <option value="draft" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Draft</option>
                <option value="archived" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Archived</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="bg-[#0B2545] hover:bg-[#163E6C] text-white">
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
              onChange={e => {
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
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={replacing}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={replacing || !file} className="bg-[#0B2545] hover:bg-[#163E6C] text-white">
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
              {material.examName} • {material.contentCategory} ({material.noteType})
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
              ✕
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
