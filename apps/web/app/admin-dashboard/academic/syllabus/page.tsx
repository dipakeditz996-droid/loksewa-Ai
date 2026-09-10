"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronRight, ChevronDown, Folder, FileText, CheckSquare,
  BookOpen, Layers, Plus, Settings, Trash2, Loader2, X, UploadCloud,
  Eye, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { adminAcademicApi, ExamStatus } from "@/lib/api/admin-academic-api";
import { adminStudyMaterialApi, ContentCategory, StudyMaterialListItem } from "@/lib/api/admin-study-materials";
import { toast } from "sonner";

const CONTENT_CATEGORY_OPTIONS: { value: ContentCategory; label: string }[] = [
  { value: "syllabus", label: "Syllabus (Official PDF)" },
  { value: "subjective_topicwise", label: "Subjective Notes" },
  { value: "objective_topicwise", label: "Objective Notes" },
  { value: "revision_notes", label: "Revision Notes" },
];

const STATUS_OPTIONS: { value: ExamStatus; label: string; activeClass: string }[] = [
  { value: "active", label: "Active", activeClass: "bg-emerald-50 border-emerald-300 text-emerald-700" },
  { value: "coming_soon", label: "Coming Soon", activeClass: "bg-amber-50 border-amber-300 text-amber-700" },
  { value: "inactive", label: "Inactive", activeClass: "bg-slate-200 border-slate-300 text-slate-700" },
];

// ── Tree Item ─────────────────────────────────────────────────────────────────
const TreeItem = ({
  label, icon: Icon, children, isExpanded, onToggle, onClick, isSelected, level = 0
}: any) => (
  <div className="select-none">
    <div
      className={`flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer hover:bg-slate-100 ${
        isSelected ? "bg-slate-100 text-[#0B2545] font-medium" : "text-slate-600"
      }`}
      style={{ paddingLeft: `${level * 16 + 8}px` }}
      onClick={onClick}
    >
      <span
        className="w-4 h-4 flex items-center justify-center cursor-pointer hover:bg-slate-200 rounded"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
      >
        {children
          ? (isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)
          : <span className="w-3.5 h-3.5" />}
      </span>
      <Icon className={`w-4 h-4 ${isSelected ? "text-[#D4A72C]" : "text-slate-400"}`} />
      <span className="text-sm truncate">{label}</span>
    </div>
    {isExpanded && children && <div className="flex flex-col">{children}</div>}
  </div>
);

// ── Modal form types ──────────────────────────────────────────────────────────
type ModalState =
  | { mode: "add"; nodeType: "sub-exam"; parentId: number; parentName: string; categoryId: number }
  | { mode: "add"; nodeType: "exam"; parentId: number; parentName: string }
  | { mode: "add"; nodeType: "paper"; parentId: number; parentName: string }
  | { mode: "add"; nodeType: "subject"; parentId: number; parentName: string }
  | { mode: "add"; nodeType: "chapter"; parentId: number; parentName: string }
  | { mode: "add"; nodeType: "topic"; parentId: number; parentName: string }
  | { mode: "edit"; node: any }
  | { mode: "delete"; node: any }
  | null;

const NODE_TYPE_LABELS: Record<string, string> = {
  exam: "Exam / Position",
  "sub-exam": "Preparation / Service",
  position: "Level / Preparation",
  paper: "Paper",
  subject: "Subject",
  chapter: "Chapter",
  topic: "Topic",
  category: "Category",
};

// ── Exam node (recursive: a "Level" can nest "Service/Preparation" children,
// see exams.models.Exam) ────────────────────────────────────────────────────
function ExamTreeNode({
  node, level, isExpanded, toggleExpand, selectedNode, setSelectedNode, renderPapers,
}: {
  node: any; level: number;
  isExpanded: (key: string) => boolean;
  toggleExpand: (id: string) => void;
  selectedNode: any;
  setSelectedNode: (n: any) => void;
  renderPapers: (papers: any[], level: number) => React.ReactNode;
}) {
  const hasChildren = (node.children?.length > 0) || (node.papers?.length > 0);
  return (
    <TreeItem
      label={node.name}
      icon={FileText}
      level={level}
      isExpanded={isExpanded(`pos-${node.id}`)}
      isSelected={selectedNode?.type === "position" && selectedNode?.id === node.id}
      onToggle={() => toggleExpand(`pos-${node.id}`)}
      onClick={() => setSelectedNode({ ...node, type: "position" })}
    >
      {hasChildren && (
        <>
          {node.children?.map((child: any) => (
            <ExamTreeNode
              key={`pos-${child.id}`}
              node={child}
              level={level + 1}
              isExpanded={isExpanded}
              toggleExpand={toggleExpand}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
              renderPapers={renderPapers}
            />
          ))}
          {renderPapers(node.papers || [], level + 1)}
        </>
      )}
    </TreeItem>
  );
}

// ── Upload PDF modal — lets an admin attach the actual syllabus/notes PDF to
// a Level/Preparation node directly from the tree, instead of only being
// able to add empty structural "Paper" nodes here. Creates a real
// notes.StudyMaterial keyed to this Exam node (see notes/models.py) — the
// same content students see under Study Materials with view/download. ──────
function UploadPdfModal({
  examId, examName, onClose, onSuccess,
}: { examId: number; examName: string; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentCategory, setContentCategory] = useState<ContentCategory>("syllabus");
  const [accessType, setAccessType] = useState<"free" | "premium">("free");
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!file) { toast.error("Please attach a PDF file"); return; }

    setUploading(true);
    try {
      await adminStudyMaterialApi.create({
        title: title.trim(),
        description: description.trim(),
        exam: examId,
        content_category: contentCategory,
        access_type: accessType,
        status,
        file,
      });
      toast.success(
        status === "published"
          ? `"${title}" uploaded and published for ${examName}.`
          : `"${title}" saved as draft for ${examName}.`
      );
      onSuccess();
    } catch (err: any) {
      toast.error(err?.data?.error || err.message || "Failed to upload PDF");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Upload PDF</DialogTitle>
          <DialogDescription>
            Uploading to: <strong>{examName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>Title <span className="text-red-500 ml-1">*</span></Label>
            <Input
              placeholder="e.g. Official Syllabus 2081"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Content Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {CONTENT_CATEGORY_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setContentCategory(opt.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border text-left transition-colors ${
                    contentCategory === opt.value
                      ? "bg-[#0B2545] text-white border-[#0B2545]"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Optional description..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>PDF Document <span className="text-red-500 ml-1">*</span></Label>
            <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 rounded-xl py-6 cursor-pointer hover:border-slate-300 transition-colors">
              <UploadCloud className="w-6 h-6 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">
                {file ? file.name : "Click to choose PDF file"}
              </span>
              <span className="text-xs text-slate-400">PDF documents up to 20MB supported</span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Access Type</Label>
              <select
                value={accessType}
                onChange={(e) => setAccessType(e.target.value as "free" | "premium")}
                className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm"
              >
                <option value="free">Free for authorized students</option>
                <option value="premium">Premium only</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Publication Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "published" | "draft")}
                className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm"
              >
                <option value="published">Publish Now (Immediate access)</option>
                <option value="draft">Save as Draft</option>
              </select>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
          <Button
            className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white gap-2"
            onClick={handleSubmit}
            disabled={uploading}
          >
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><UploadCloud className="w-4 h-4" /> Upload & Publish</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Search filtering ─────────────────────────────────────────────────────────
// Keeps a node if its own name matches, or any descendant does (recursing
// through the full Category -> Level -> Preparation -> Paper -> Subject ->
// Chapter -> Topic chain). Once an ancestor itself matches, its whole
// subtree is kept as-is so browsing a matched Level/Preparation still shows
// everything under it, not just the literal text match.
const textMatches = (name: string, query: string) =>
  (name || "").toLowerCase().includes(query);

function filterTopic(topic: any, query: string): any | null {
  return textMatches(topic.name, query) ? topic : null;
}

function filterChapter(chapter: any, query: string): any | null {
  if (textMatches(chapter.name || chapter.title, query)) return chapter;
  const topics = (chapter.topics || []).map((t: any) => filterTopic(t, query)).filter(Boolean);
  return topics.length > 0 ? { ...chapter, topics } : null;
}

function filterSubject(subject: any, query: string): any | null {
  if (textMatches(subject.name, query)) return subject;
  const chapters = (subject.chapters || []).map((c: any) => filterChapter(c, query)).filter(Boolean);
  return chapters.length > 0 ? { ...subject, chapters } : null;
}

function filterPaper(paper: any, query: string): any | null {
  if (textMatches(paper.name, query)) return paper;
  const subjects = (paper.subjects || []).map((s: any) => filterSubject(s, query)).filter(Boolean);
  return subjects.length > 0 ? { ...paper, subjects } : null;
}

function filterExam(exam: any, query: string): any | null {
  if (textMatches(exam.name, query)) return exam;
  const children = (exam.children || []).map((c: any) => filterExam(c, query)).filter(Boolean);
  const papers = (exam.papers || []).map((p: any) => filterPaper(p, query)).filter(Boolean);
  return (children.length > 0 || papers.length > 0) ? { ...exam, children, papers } : null;
}

function filterCategory(category: any, query: string): any | null {
  if (textMatches(category.name, query)) return category;
  const positions = (category.positions || []).map((p: any) => filterExam(p, query)).filter(Boolean);
  return positions.length > 0 ? { ...category, positions } : null;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SyllabusBuilderPage() {
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [uploadTarget, setUploadTarget] = useState<{ id: number; name: string } | null>(null);

  // ── Search — filters the tree to matching Category/Level/Preparation/
  // Paper/Subject/Chapter/Topic names, and auto-expands every visible node
  // so results don't need manual clicking to reveal.
  const [searchQuery, setSearchQuery] = useState("");
  const isSearching = searchQuery.trim().length > 0;
  const displayedTree = useMemo(() => {
    if (!isSearching) return treeData;
    const q = searchQuery.trim().toLowerCase();
    return treeData.map(cat => filterCategory(cat, q)).filter(Boolean);
  }, [treeData, searchQuery, isSearching]);
  const isNodeExpanded = useCallback(
    (key: string) => (isSearching ? true : !!expanded[key]),
    [isSearching, expanded]
  );

  // Materials (PDFs/notes) already uploaded onto the currently selected
  // exam/position node - shown inline so an upload's result is visible right
  // where it was uploaded from, without navigating to Study Materials.
  const [nodeMaterials, setNodeMaterials] = useState<StudyMaterialListItem[]>([]);
  const [loadingNodeMaterials, setLoadingNodeMaterials] = useState(false);
  const [deletingMaterialId, setDeletingMaterialId] = useState<number | null>(null);

  // form state
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // ── Fetch tree ──────────────────────────────────────────────────────────────
  const fetchTree = useCallback(async () => {
    try {
      const data = await adminAcademicApi.getTree();
      setTreeData(data);
      const init: Record<string, boolean> = {};
      if (data.length > 0) {
        init[`cat-${data[0].id}`] = true;
        if (data[0].positions?.length > 0)
          init[`pos-${data[0].positions[0].id}`] = true;
      }
      setExpanded(prev => ({ ...init, ...prev }));
    } catch {
      toast.error("Failed to load syllabus tree");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  // ── Materials uploaded onto the selected exam/position node ────────────────
  const loadNodeMaterials = useCallback(async (examId: number) => {
    setLoadingNodeMaterials(true);
    try {
      const res = await adminStudyMaterialApi.list({ exam: examId, pageSize: 100 });
      setNodeMaterials(res.materials);
    } catch {
      setNodeMaterials([]);
    } finally {
      setLoadingNodeMaterials(false);
    }
  }, []);

  useEffect(() => {
    if (selectedNode && (selectedNode.type === "exam" || selectedNode.type === "position")) {
      loadNodeMaterials(selectedNode.id);
    } else {
      setNodeMaterials([]);
    }
  }, [selectedNode?.id, selectedNode?.type, loadNodeMaterials]);

  const handleDeleteMaterial = async (material: StudyMaterialListItem) => {
    setDeletingMaterialId(material.id);
    try {
      await adminStudyMaterialApi.remove(material.id);
      toast.success(`"${material.title}" deleted.`);
      setNodeMaterials(prev => prev.filter(m => m.id !== material.id));
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete file.");
    } finally {
      setDeletingMaterialId(null);
    }
  };

  const toggleExpand = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // Renders a Paper -> Subject -> Chapter -> Topic chain starting at `level`.
  // Extracted so it can attach under any Exam node, at whatever depth that
  // node ends up at (Level vs nested Service/Preparation).
  const renderPapers = (papers: any[], level: number): React.ReactNode =>
    papers?.map((paper: any) => (
      <TreeItem
        key={`paper-${paper.id}`}
        label={paper.name}
        icon={BookOpen}
        level={level}
        isExpanded={isNodeExpanded(`paper-${paper.id}`)}
        isSelected={selectedNode?.type === "paper" && selectedNode?.id === paper.id}
        onToggle={() => toggleExpand(`paper-${paper.id}`)}
        onClick={() => setSelectedNode({ ...paper, type: "paper" })}
      >
        {paper.subjects?.map((sub: any) => (
          <TreeItem
            key={`sub-${sub.id}`}
            label={sub.name}
            icon={Layers}
            level={level + 1}
            isExpanded={isNodeExpanded(`sub-${sub.id}`)}
            isSelected={selectedNode?.type === "subject" && selectedNode?.id === sub.id}
            onToggle={() => toggleExpand(`sub-${sub.id}`)}
            onClick={() => setSelectedNode({ ...sub, type: "subject" })}
          >
            {sub.chapters?.map((chap: any) => (
              <TreeItem
                key={`chap-${chap.id}`}
                label={chap.title}
                icon={Folder}
                level={level + 2}
                isExpanded={isNodeExpanded(`chap-${chap.id}`)}
                isSelected={selectedNode?.type === "chapter" && selectedNode?.id === chap.id}
                onToggle={() => toggleExpand(`chap-${chap.id}`)}
                onClick={() => setSelectedNode({ ...chap, type: "chapter" })}
              >
                {chap.topics?.map((topic: any) => (
                  <TreeItem
                    key={`topic-${topic.id}`}
                    label={topic.name}
                    icon={FileText}
                    level={level + 3}
                    isSelected={selectedNode?.type === "topic" && selectedNode?.id === topic.id}
                    onToggle={() => {}}
                    onClick={() => setSelectedNode({ ...topic, type: "topic" })}
                  />
                ))}
              </TreeItem>
            ))}
          </TreeItem>
        ))}
      </TreeItem>
    ));

  // ── Open modal helpers ──────────────────────────────────────────────────────
  const openAdd = (nodeType: string, parentId: number, parentName: string, categoryId?: number) => {
    setFormName(""); setFormCode(""); setFormDesc(""); setFormActive(true);
    setModal({ mode: "add", nodeType, parentId, parentName, categoryId } as any);
  };

  const openEdit = (node: any) => {
    setFormName(node.name || node.title || "");
    setFormCode(node.code || "");
    setFormDesc(node.description || "");
    setFormActive(node.is_active !== false);
    setModal({ mode: "edit", node });
  };

  const closeModal = () => setModal(null);

  // ── Save handler ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formName.trim()) { toast.error("Name is required"); return; }
    setIsSaving(true);
    try {
      if (modal?.mode === "add") {
        const { nodeType, parentId, categoryId } = modal as any;
        if (nodeType === "exam") {
          await adminAcademicApi.createExam({ category: parentId, parent: null, name: formName, description: formDesc, is_active: formActive });
        } else if (nodeType === "sub-exam") {
          await adminAcademicApi.createExam({ category: categoryId, parent: parentId, name: formName, description: formDesc, is_active: formActive });
        } else if (nodeType === "paper") {
          await adminAcademicApi.createPaper({ exam: parentId, name: formName, description: formDesc, is_active: formActive });
        } else if (nodeType === "subject") {
          await adminAcademicApi.createSubject({ paper: parentId, name: formName, code: formCode, description: formDesc, is_active: formActive });
        } else if (nodeType === "chapter") {
          await adminAcademicApi.createChapter({ subject: parentId, title: formName, description: formDesc, is_active: formActive });
        } else if (nodeType === "topic") {
          await adminAcademicApi.createTopic({ chapter: parentId, name: formName, description: formDesc, is_active: formActive });
        }
        toast.success(`${NODE_TYPE_LABELS[nodeType] || nodeType} created!`);
        // Expand the parent it was just added under so the new item is
        // immediately visible in the tree, instead of requiring a manual
        // click to prove it actually nested in the right place.
        const parentExpandKey: Record<string, string> = {
          exam: `cat-${parentId}`, "sub-exam": `pos-${parentId}`, paper: `pos-${parentId}`,
          subject: `paper-${parentId}`, chapter: `sub-${parentId}`, topic: `chap-${parentId}`,
        };
        const expandKey = parentExpandKey[nodeType];
        if (expandKey) {
          setExpanded(prev => ({ ...prev, [expandKey]: true }));
        }
      } else if (modal?.mode === "edit") {
        const { node } = modal;
        const payload: any = { description: formDesc, is_active: formActive };
        if (node.type === "chapter") {
          payload.title = formName;
          await adminAcademicApi.updateChapter(node.id, payload);
        } else if (node.type === "topic") {
          payload.name = formName;
          await adminAcademicApi.updateTopic(node.id, payload);
        } else if (node.type === "subject") {
          payload.name = formName;
          payload.code = formCode;
          await adminAcademicApi.updateSubject(node.id, payload);
        } else if (node.type === "paper") {
          payload.name = formName;
          await adminAcademicApi.updatePaper(node.id, payload);
        } else if (node.type === "exam" || node.type === "position") {
          payload.name = formName;
          await adminAcademicApi.updateExam(node.id, payload);
        }
        toast.success("Updated successfully!");
        // Update selected node name in state
        setSelectedNode((prev: any) => ({ ...prev, name: formName, title: formName, description: formDesc, is_active: formActive }));
      }
      closeModal();
      await fetchTree();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Status handler — Active / Coming Soon / Inactive for a Level or
  // Preparation/Service node. is_active stays derived server-side (see
  // Exam.save()), so every existing is_active-based query elsewhere in the
  // app (registration picker, study materials, public syllabus) reflects
  // this change automatically. ────────────────────────────────────────────
  const handleChangeStatus = async (node: any, newStatus: ExamStatus) => {
    if (node.status === newStatus) return;
    setIsChangingStatus(true);
    try {
      await adminAcademicApi.updateExam(node.id, { status: newStatus });
      toast.success(`"${node.name}" marked ${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}.`);
      setSelectedNode((prev: any) => (prev && prev.id === node.id ? { ...prev, status: newStatus, is_active: newStatus !== "inactive" } : prev));
      await fetchTree();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status.");
    } finally {
      setIsChangingStatus(false);
    }
  };

  // ── Delete handler ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!modal || modal.mode !== "delete") return;
    const { node } = modal;
    setIsSaving(true);
    try {
      if (node.type === "chapter") await adminAcademicApi.deleteChapter(node.id);
      else if (node.type === "topic") await adminAcademicApi.deleteTopic(node.id);
      else if (node.type === "subject") await adminAcademicApi.deleteSubject(node.id);
      else if (node.type === "paper") await adminAcademicApi.deletePaper(node.id);
      else if (node.type === "exam" || node.type === "position") await adminAcademicApi.deleteExam(node.id);
      toast.success("Deleted successfully!");
      setSelectedNode(null);
      closeModal();
      await fetchTree();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Derived: what can be added as a child of selectedNode. An exam/position
  // node can take BOTH a nested sub-exam (e.g. "5th Level" -> "Civil
  // Engineering") and papers directly, so it returns more than one action. ──
  const getAddActions = (node: any): { childType: string; label: string }[] => {
    if (!node) return [];
    switch (node.type) {
      case "category":  return [{ childType: "exam", label: "Add Exam (Position)" }];
      case "exam":
      case "position":  return [
        { childType: "sub-exam",   label: "Add Preparation / Service" },
        { childType: "upload-pdf", label: "Upload PDF" },
      ];
      case "paper":     return [{ childType: "subject", label: "Add Subject" }];
      case "subject":   return [{ childType: "chapter", label: "Add Chapter" }];
      case "chapter":   return [{ childType: "topic",   label: "Add Topic" }];
      default:          return [];
    }
  };

  const addActions = getAddActions(selectedNode);

  // ── Modal title ─────────────────────────────────────────────────────────────
  const modalTitle = modal
    ? modal.mode === "add"
      ? `Add ${NODE_TYPE_LABELS[(modal as any).nodeType] || (modal as any).nodeType}`
      : modal.mode === "edit"
      ? `Edit ${NODE_TYPE_LABELS[modal.node.type] || modal.node.type}`
      : `Delete ${NODE_TYPE_LABELS[modal.node.type] || modal.node.type}`
    : "";

  const isChapterType = modal?.mode === "add" && (modal as any).nodeType === "chapter";
  const isSubjectType =
    (modal?.mode === "add" && (modal as any).nodeType === "subject") ||
    (modal?.mode === "edit" && modal.node.type === "subject");

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-[#0B2545]">Syllabus Builder</h2>
          <p className="text-slate-500 text-sm mt-1">Visualize and arrange the complete academic hierarchy.</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Left pane: Tree */}
        <div className="w-full md:w-1/3 border-r border-slate-200 flex flex-col h-full bg-slate-50/30">
          <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <Folder className="w-4 h-4 text-slate-500" /> Structure
            </h3>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search syllabus (level, paper, subject, topic...)"
                className="w-full h-9 rounded-md border border-slate-200 bg-white pl-8 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-[#0B2545]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="p-4 text-sm text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            ) : treeData.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">No syllabus data available.</div>
            ) : isSearching && displayedTree.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">No matches for &ldquo;{searchQuery}&rdquo;.</div>
            ) : (
              displayedTree.map((cat: any) => (
                <TreeItem
                  key={`cat-${cat.id}`}
                  label={cat.name}
                  icon={CheckSquare}
                  level={0}
                  isExpanded={isNodeExpanded(`cat-${cat.id}`)}
                  isSelected={selectedNode?.type === "category" && selectedNode?.id === cat.id}
                  onToggle={() => toggleExpand(`cat-${cat.id}`)}
                  onClick={() => setSelectedNode({ ...cat, type: "category" })}
                >
                  {cat.positions?.map((pos: any) => (
                    <ExamTreeNode
                      key={`pos-${pos.id}`}
                      node={pos}
                      level={1}
                      isExpanded={isNodeExpanded}
                      toggleExpand={toggleExpand}
                      selectedNode={selectedNode}
                      setSelectedNode={setSelectedNode}
                      renderPapers={renderPapers}
                    />
                  ))}
                </TreeItem>
              ))
            )}
          </div>
        </div>

        {/* Right pane: Detail + Actions */}
        <div className="flex-1 bg-white p-6 overflow-y-auto">
          {!selectedNode ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Folder className="w-16 h-16 mb-4 text-slate-200" />
              <p>Select an item from the tree to view its details.</p>
            </div>
          ) : (
            <div className="max-w-2xl space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {NODE_TYPE_LABELS[selectedNode.type] || selectedNode.type}
                  </p>
                  <h3 className="text-2xl font-bold text-[#0B2545]">
                    {selectedNode.name || selectedNode.title}
                  </h3>
                </div>
                <div className="flex gap-2">
                  {selectedNode.type !== "category" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => openEdit(selectedNode)}
                      >
                        <Settings className="w-4 h-4" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setModal({ mode: "delete", node: selectedNode })}
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Info */}
              <div>
                <h4 className="text-sm font-medium text-slate-900 mb-2">Description</h4>
                <p className="text-slate-600 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
                  {selectedNode.description || "No description provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedNode.type === "subject" && (
                  <div className="p-4 border border-slate-100 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Subject Code</p>
                    <p className="font-medium text-slate-900">{selectedNode.code || "N/A"}</p>
                  </div>
                )}
                {(selectedNode.type === "exam" || selectedNode.type === "position") ? (
                  <div className="p-4 border border-slate-100 rounded-lg col-span-2">
                    <p className="text-xs text-slate-500 mb-2">Status</p>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map((opt) => {
                        const isSelected = (selectedNode.status || "active") === opt.value;
                        return (
                          <button
                            key={opt.value}
                            disabled={isChangingStatus}
                            onClick={() => handleChangeStatus(selectedNode, opt.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${
                              isSelected ? opt.activeClass : "border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : selectedNode.is_active !== undefined && (
                  <div className="p-4 border border-slate-100 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Status</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      selectedNode.is_active ? "text-emerald-700 bg-emerald-50" : "text-slate-600 bg-slate-100"
                    }`}>
                      {selectedNode.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              {addActions.length > 0 && (
                <div className="pt-6 border-t border-slate-100">
                  <h4 className="text-sm font-medium text-slate-900 mb-4">Quick Actions</h4>
                  <div className="flex flex-wrap gap-3">
                    {addActions.map((action) => (
                      <Button
                        key={action.childType}
                        className={`gap-2 text-sm text-white ${
                          action.childType === "upload-pdf"
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-[#0B2545] hover:bg-[#0B2545]/90"
                        }`}
                        onClick={() => {
                          if (action.childType === "upload-pdf") {
                            setUploadTarget({ id: selectedNode.id, name: selectedNode.name || selectedNode.title });
                          } else {
                            openAdd(
                              action.childType,
                              selectedNode.id,
                              selectedNode.name || selectedNode.title,
                              selectedNode.category_id
                            );
                          }
                        }}
                      >
                        {action.childType === "upload-pdf" ? <UploadCloud className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploaded Materials — every PDF/note attached directly to this
                  node, so an upload's result is visible right where it was
                  uploaded from instead of only in the separate Study
                  Materials admin page. */}
              {(selectedNode.type === "exam" || selectedNode.type === "position") && (
                <div className="pt-6 border-t border-slate-100">
                  <h4 className="text-sm font-medium text-slate-900 mb-4">
                    Uploaded Materials {nodeMaterials.length > 0 && `(${nodeMaterials.length})`}
                  </h4>
                  {loadingNodeMaterials ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                    </div>
                  ) : nodeMaterials.length === 0 ? (
                    <p className="text-sm text-slate-400">No PDFs or notes uploaded here yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {nodeMaterials.map((mat) => (
                        <div
                          key={mat.id}
                          className="flex items-center justify-between gap-3 p-3 border border-slate-100 rounded-lg bg-slate-50/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{mat.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-slate-400">
                                  {CONTENT_CATEGORY_OPTIONS.find(o => o.value === mat.contentCategory)?.label || mat.contentCategory}
                                </span>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  mat.status === "published" ? "text-emerald-700 bg-emerald-50" : "text-slate-600 bg-slate-100"
                                }`}>
                                  {mat.status}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {mat.fileUrl && (
                              <a
                                href={mat.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                                title="View file"
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              type="button"
                              disabled={deletingMaterialId === mat.id}
                              onClick={() => handleDeleteMaterial(mat)}
                              className="p-2 rounded-md text-red-500 hover:bg-red-50 disabled:opacity-50"
                              title="Delete"
                            >
                              {deletingMaterialId === mat.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={modal?.mode === "add" || modal?.mode === "edit"}
        onOpenChange={(open) => { if (!open) closeModal(); }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
            {modal?.mode === "add" && (
              <DialogDescription>
                Adding inside: <strong>{(modal as any).parentName}</strong>
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>
                {isChapterType ? "Chapter Title" : "Name"}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                placeholder={isChapterType ? "e.g. Introduction to Nepal" : "e.g. General Knowledge"}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>

            {isSubjectType && (
              <div className="space-y-2">
                <Label>Subject Code</Label>
                <Input
                  placeholder="e.g. GK-101"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional description..."
                rows={3}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="w-4 h-4 accent-[#0B2545]"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ─────────────────────────────────────────────────────── */}
      <Dialog
        open={modal?.mode === "delete"}
        onOpenChange={(open) => { if (!open) closeModal(); }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Delete {modal?.mode === "delete" ? NODE_TYPE_LABELS[modal.node.type] || modal.node.type : ""}
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <span className="block">
                Are you sure you want to permanently delete{" "}
                <strong className="text-slate-900">
                  &ldquo;{modal?.mode === "delete" ? (modal.node.name || modal.node.title) : ""}&rdquo;
                </strong>?
              </span>
              <span className="block text-amber-600 font-medium text-sm">
                ⚠️ All child items (papers, subjects, chapters, topics) inside will also be deleted.
              </span>
              <span className="block text-red-600 text-sm font-medium">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={isSaving}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
              disabled={isSaving}
            >
              {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</> : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Upload PDF Modal ──────────────────────────────────────────────────── */}
      {uploadTarget && (
        <UploadPdfModal
          examId={uploadTarget.id}
          examName={uploadTarget.name}
          onClose={() => setUploadTarget(null)}
          onSuccess={() => { setUploadTarget(null); fetchTree(); loadNodeMaterials(uploadTarget.id); }}
        />
      )}
    </div>
  );
}
