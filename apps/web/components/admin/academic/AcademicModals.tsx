"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Archive,
  Trash2,
  Loader2,
  BookOpen,
  FileText,
  Layers,
} from "lucide-react";
import {
  adminAcademicApi,
  NodeDependenciesResponse,
  ApiSubject,
  ApiChapter,
  ApiTopic,
} from "@/lib/api/admin-academic-api";
import { toast } from "sonner";

// =====================================================================
// 1. ADD / EDIT SUBJECT MODAL
// =====================================================================

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  preparationId: number;
  preparationName: string;
  initialData?: (Partial<ApiSubject> & { id?: number }) | null;
  onSuccess: () => void;
}

export function AddEditSubjectModal({
  isOpen,
  onClose,
  preparationId,
  preparationName,
  initialData,
  onSuccess,
}: SubjectModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setCode(initialData.code || "");
      setDescription(initialData.description || "");
      setOrder(initialData.order ?? 0);
      setIsActive(initialData.is_active ?? true);
    } else {
      setName("");
      setCode("");
      setDescription("");
      setOrder(0);
      setIsActive(true);
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Subject name is required");
      return;
    }

    setLoading(true);
    try {
      if (initialData?.id) {
        await adminAcademicApi.updateSubject(initialData.id, {
          name: name.trim(),
          code: code.trim(),
          description: description.trim(),
          order: Number(order),
          is_active: isActive,
        });
        toast.success(`Subject "${name}" updated successfully`);
      } else {
        await adminAcademicApi.createSubject({
          exam: preparationId,
          name: name.trim(),
          code: code.trim(),
          description: description.trim(),
          order: Number(order),
          is_active: isActive,
        });
        toast.success(`Subject "${name}" added to ${preparationName}`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.error || err.message || "Failed to save subject");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#C4A45C]">
            <Layers className="w-4 h-4" />
            {initialData ? "Edit Master Subject" : "Add Subject to Syllabus"}
          </div>
          <DialogTitle className="text-xl font-bold text-[#0B2545] dark:text-white">
            {initialData ? `Edit Subject: ${initialData.name}` : `New Subject for ${preparationName}`}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Subjects represent primary curriculum areas (e.g. Building Construction, Surveying).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Subject Name <span className="text-red-500">*</span>
            </Label>
            <Input
              required
              autoFocus
              placeholder="e.g. Building Construction & Technology"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Subject Code (Optional)
              </Label>
              <Input
                placeholder="e.g. BC-501"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Display Order
              </Label>
              <Input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Description (Optional)
            </Label>
            <Textarea
              rows={2}
              placeholder="Brief summary of what this academic subject covers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="sub-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300 text-[#0B2545] focus:ring-[#0B2545]"
            />
            <label htmlFor="sub-active" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              Active in Master Academic Tree (Visible to students)
            </label>
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !name.trim()}
              className="bg-[#0B2545] hover:bg-[#163E6C] text-white"
            >
              {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {initialData ? "Save Changes" : "Create Subject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================================
// 2. ADD / EDIT CHAPTER MODAL
// =====================================================================

interface ChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: number;
  subjectName: string;
  initialData?: (Partial<ApiChapter> & { id?: number }) | null;
  onSuccess: () => void;
}

export function AddEditChapterModal({
  isOpen,
  onClose,
  subjectId,
  subjectName,
  initialData,
  onSuccess,
}: ChapterModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || initialData.name || "");
      setDescription(initialData.description || "");
      setOrder(initialData.order ?? 0);
      setIsActive(initialData.is_active ?? true);
    } else {
      setTitle("");
      setDescription("");
      setOrder(0);
      setIsActive(true);
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Chapter title is required");
      return;
    }

    setLoading(true);
    try {
      if (initialData?.id) {
        await adminAcademicApi.updateChapter(initialData.id, {
          title: title.trim(),
          description: description.trim(),
          order: Number(order),
          is_active: isActive,
        });
        toast.success(`Chapter "${title}" updated successfully`);
      } else {
        await adminAcademicApi.createChapter({
          subject: subjectId,
          title: title.trim(),
          description: description.trim(),
          order: Number(order),
          is_active: isActive,
        });
        toast.success(`Chapter "${title}" added to ${subjectName}`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.error || err.message || "Failed to save chapter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#C4A45C]">
            <BookOpen className="w-4 h-4" />
            {initialData ? "Edit Master Chapter" : "Add Chapter to Subject"}
          </div>
          <DialogTitle className="text-xl font-bold text-[#0B2545] dark:text-white">
            {initialData ? `Edit Chapter: ${initialData.title || initialData.name}` : "New Chapter"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Parent Subject: <strong className="text-slate-800 dark:text-slate-200">{subjectName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Chapter Title <span className="text-red-500">*</span>
            </Label>
            <Input
              required
              autoFocus
              placeholder="e.g. Foundation & Masonry"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Display Order
            </Label>
            <Input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Description (Optional)
            </Label>
            <Textarea
              rows={2}
              placeholder="Brief summary of concepts in this chapter..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="chap-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300 text-[#0B2545] focus:ring-[#0B2545]"
            />
            <label htmlFor="chap-active" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              Active in Master Academic Tree (Visible to students)
            </label>
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !title.trim()}
              className="bg-[#0B2545] hover:bg-[#163E6C] text-white"
            >
              {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {initialData ? "Save Changes" : "Create Chapter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================================
// 3. ADD / EDIT TOPIC MODAL
// =====================================================================

interface TopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: number;
  chapterName: string;
  subjectName?: string;
  initialData?: (Partial<ApiTopic> & { id?: number }) | null;
  onSuccess: () => void;
}

export function AddEditTopicModal({
  isOpen,
  onClose,
  chapterId,
  chapterName,
  subjectName,
  initialData,
  onSuccess,
}: TopicModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setDescription(initialData.description || "");
      setOrder(initialData.order ?? 0);
      setIsActive(initialData.is_active ?? true);
    } else {
      setName("");
      setDescription("");
      setOrder(0);
      setIsActive(true);
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Topic name is required");
      return;
    }

    setLoading(true);
    try {
      if (initialData?.id) {
        await adminAcademicApi.updateTopic(initialData.id, {
          name: name.trim(),
          description: description.trim(),
          order: Number(order),
          is_active: isActive,
        });
        toast.success(`Topic "${name}" updated successfully`);
      } else {
        await adminAcademicApi.createTopic({
          chapter: chapterId,
          name: name.trim(),
          description: description.trim(),
          order: Number(order),
          is_active: isActive,
        });
        toast.success(`Topic "${name}" added to ${chapterName}`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.error || err.message || "Failed to save topic");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#C4A45C]">
            <FileText className="w-4 h-4" />
            {initialData ? "Edit Master Topic" : "Add Topic to Chapter"}
          </div>
          <DialogTitle className="text-xl font-bold text-[#0B2545] dark:text-white">
            {initialData ? `Edit Topic: ${initialData.name}` : "New Topic"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {subjectName && (
              <span>Subject: <strong className="text-slate-800 dark:text-slate-200">{subjectName}</strong> &bull; </span>
            )}
            Chapter: <strong className="text-slate-800 dark:text-slate-200">{chapterName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Topic Name <span className="text-red-500">*</span>
            </Label>
            <Input
              required
              autoFocus
              placeholder="e.g. Shallow Foundation & Deep Foundation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Display Order
            </Label>
            <Input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Description (Optional)
            </Label>
            <Textarea
              rows={2}
              placeholder="Key concepts or learning objectives for this topic..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="top-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300 text-[#0B2545] focus:ring-[#0B2545]"
            />
            <label htmlFor="top-active" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              Active in Master Academic Tree (Visible to students)
            </label>
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !name.trim()}
              className="bg-[#0B2545] hover:bg-[#163E6C] text-white"
            >
              {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {initialData ? "Save Changes" : "Create Topic"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================================
// 4. SAFE DELETE MODAL WITH ARCHIVE INSTEAD
// =====================================================================

export interface DeleteNodeTarget {
  modelType: "subjects" | "chapters" | "topics";
  id: number;
  name: string;
}

interface SafeDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: DeleteNodeTarget | null;
  onSuccess: () => void;
}

export function AcademicSafeDeleteModal({
  isOpen,
  onClose,
  target,
  onSuccess,
}: SafeDeleteModalProps) {
  const [checking, setChecking] = useState(true);
  const [dependencies, setDependencies] = useState<NodeDependenciesResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (isOpen && target) {
      setChecking(true);
      adminAcademicApi
        .getNodeDependencies(target.modelType, target.id)
        .then((res) => {
          setDependencies(res);
        })
        .catch(() => {
          setDependencies(null);
        })
        .finally(() => {
          setChecking(false);
        });
    }
  }, [isOpen, target]);

  if (!isOpen || !target) return null;

  const hasDeps = dependencies?.has_dependencies ?? false;

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await adminAcademicApi.archiveNode(target.modelType, target.id, false);
      toast.success(`"${target.name}" archived successfully.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.error || err.message || "Failed to archive node");
    } finally {
      setArchiving(false);
    }
  };

  const handleDelete = async (force: boolean = false) => {
    setDeleting(true);
    try {
      await adminAcademicApi.deleteNode(target.modelType, target.id, force);
      toast.success(`"${target.name}" deleted.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.status === 409 || err?.data?.error) {
        toast.error(err?.data?.message || err?.data?.error || "Cannot delete node with linked content.");
      } else {
        toast.error(err.message || "Failed to delete node");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600">
            <AlertTriangle className="w-4 h-4" /> Safe Delete Protection
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            Delete {target.modelType.slice(0, -1)}: "{target.name}"
          </DialogTitle>
        </DialogHeader>

        {checking ? (
          <div className="py-8 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#C4A45C]" />
            <p className="text-xs">Checking dependencies across Notes, Question Bank & Exams...</p>
          </div>
        ) : hasDeps ? (
          <div className="space-y-4 py-2">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                Node Has Linked Content
              </h4>
              <p className="text-xs text-amber-900 dark:text-amber-200">
                This {target.modelType.slice(0, -1)} is currently referenced by:
              </p>
              <ul className="text-xs text-amber-800 dark:text-amber-300 font-semibold list-disc list-inside space-y-1">
                {dependencies?.counts.notes ? <li>{dependencies.counts.notes} Notes</li> : null}
                {dependencies?.counts.questions ? <li>{dependencies.counts.questions} Questions</li> : null}
                {dependencies?.counts.exams ? <li>{dependencies.counts.exams} Exams</li> : null}
                {dependencies?.counts.children ? <li>{dependencies.counts.children} Child Items</li> : null}
              </ul>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 pt-1">
                Destructive deletion would orphan or delete these records. We recommend archiving this node instead.
              </p>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleArchive}
                disabled={archiving || deleting}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {archiving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                <Archive className="w-3.5 h-3.5 mr-1.5" />
                Archive / Deactivate Instead
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(true)}
                disabled={deleting || archiving}
                className="text-xs"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Force Delete
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white">"{target.name}"</strong>?
              This node has no linked notes, questions, or exams.
            </p>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(false)}
                disabled={deleting}
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Node
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
