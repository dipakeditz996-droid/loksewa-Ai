"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getTeacherMaterials,
  deleteTeacherMaterial,
  submitTeacherMaterial,
  duplicateTeacherMaterial,
  StudyMaterial,
} from "@/lib/api/teacher-materials";
import { PageHeader, StatCard, StatusPill } from "@/components/teacher/portal";
import { MaterialCard } from "./components/MaterialCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Bookmark,
  Search,
  PlusCircle,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export default function TeacherStudyMaterialsPage() {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [previewMaterial, setPreviewMaterial] = useState<StudyMaterial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const data = await getTeacherMaterials({ search });
      // Depending on pagination, data could be an array or an object with results
      setMaterials(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error("Failed to load study materials:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMaterials();
  };

  const handleSubmit = async (id: number) => {
    try {
      await submitTeacherMaterial(id);
      toast.success("Material submitted for review.");
      fetchMaterials();
    } catch (error) {
      console.error("Failed to submit material:", error);
      toast.error("Failed to submit material for review.");
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await duplicateTeacherMaterial(id);
      toast.success("Material duplicated.");
      fetchMaterials();
    } catch (error) {
      console.error("Failed to duplicate material:", error);
      toast.error("Failed to duplicate material.");
    }
  };

  const handleDelete = async () => {
    if (deleteTarget == null) return;
    try {
      await deleteTeacherMaterial(deleteTarget);
      toast.success("Material deleted.");
      setDeleteTarget(null);
      fetchMaterials();
    } catch (error) {
      console.error("Failed to delete material:", error);
      toast.error("Failed to delete material.");
    }
  };

  const getKPIs = () => {
    return {
      total: materials.length,
      published: materials.filter((m) => m.status === "published").length,
      pending: materials.filter((m) => m.status === "pending_review").length,
      drafts: materials.filter((m) => m.status === "draft").length,
    };
  };
  const kpis = getKPIs();

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-12 md:p-8">
      <PageHeader
        title="Study Materials"
        description="View and manage the study materials you have authored."
        action={
          <Link href="/teacher/study-materials/create">
            <Button className="gap-2 rounded-[9px] bg-[#0B2545] shadow-sm hover:bg-[#163E6C]">
              <PlusCircle className="h-4 w-4" />
              Upload Material
            </Button>
          </Link>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={Bookmark} label="Total Materials" value={loading ? "-" : kpis.total} />
        <StatCard icon={CheckCircle2} label="Published" value={loading ? "-" : kpis.published} tone="success" />
        <StatCard icon={Clock} label="Pending Review" value={loading ? "-" : kpis.pending} tone="pending" />
        <StatCard icon={AlertCircle} label="Drafts" value={loading ? "-" : kpis.drafts} />
      </div>

      {/* Toolbar */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-col gap-4 border-b border-border bg-muted p-4 sm:flex-row">
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search materials by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border-border bg-card pl-9"
            />
          </form>
        </div>
      </div>

      {/* Material List */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading materials...</div>
      ) : materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <FileText className="h-10 w-10 text-primary" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-foreground">No study materials found.</h3>
          <p className="mx-auto mb-6 max-w-md text-[13px] text-muted-foreground">
            You have not uploaded any study materials yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {materials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              onPreview={setPreviewMaterial}
              onSubmit={handleSubmit}
              onDuplicate={handleDuplicate}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewMaterial} onOpenChange={(open) => !open && setPreviewMaterial(null)}>
        <DialogContent className="sm:max-w-lg">
          {previewMaterial && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <StatusPill status={previewMaterial.status} />
                </div>
                <DialogTitle>{previewMaterial.title}</DialogTitle>
                <DialogDescription>
                  {previewMaterial.exam_name} • {previewMaterial.subject_name}
                  {previewMaterial.topic_name ? ` • ${previewMaterial.topic_name}` : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm text-foreground">
                {previewMaterial.description && <p>{previewMaterial.description}</p>}
                {previewMaterial.content && (
                  <p className="whitespace-pre-wrap text-muted-foreground">{previewMaterial.content}</p>
                )}
                {previewMaterial.external_url && (
                  <a
                    href={previewMaterial.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-primary underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open external link
                  </a>
                )}
                {previewMaterial.file && (
                  <a
                    href={previewMaterial.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-primary underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open file
                  </a>
                )}
                {previewMaterial.status === "changes_requested" && previewMaterial.review_note && (
                  <div className="rounded-lg border border-[#F0DFAF] bg-[#946B00]/10 p-3">
                    <p className="mb-0.5 text-xs font-semibold text-[#5C4300] dark:text-[#F2C94C]">Admin Feedback:</p>
                    <p className="text-xs text-[#8A6E1F] dark:text-[#F2C94C]/80">{previewMaterial.review_note}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Link href={`/teacher/study-materials/${previewMaterial.id}/edit`}>
                  <Button variant="outline">Edit Metadata</Button>
                </Link>
                <Button onClick={() => setPreviewMaterial(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Study Material</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this material? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
