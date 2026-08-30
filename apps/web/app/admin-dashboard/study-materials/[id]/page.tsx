"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, HardDrive, Loader2, AlertCircle, Trash2, ExternalLink,
  Download, User, BookOpen, Clock, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminStudyMaterialApi, StudyMaterialDetail } from "@/lib/api/admin-study-materials";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  pending_review: "bg-yellow-100 text-yellow-700",
  changes_requested: "bg-orange-100 text-orange-700",
  published: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-slate-100 text-slate-500",
};

const difficultyColors: Record<string, string> = {
  beginner: "text-green-600",
  intermediate: "text-amber-600",
  advanced: "text-red-600",
};

export default function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const materialId = resolvedParams.id;
  const router = useRouter();

  const [material, setMaterial] = useState<StudyMaterialDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await adminStudyMaterialApi.get(materialId);
      setMaterial(data);
    } catch (error) {
      console.error("Failed to load study material", error);
      setMaterial(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await adminStudyMaterialApi.remove(materialId);
      router.push("/admin-dashboard/study-materials");
    } catch (error) {
      console.error("Failed to delete study material", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!material) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-500 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <p>Study material not found.</p>
        </div>
        <Link href="/admin-dashboard/study-materials" className="text-sm text-[#0B2545] underline mt-4 inline-block">
          Back to Materials
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-2" onClick={() => router.push("/admin-dashboard/study-materials")}>
          <ArrowLeft className="w-4 h-4" /> Back to Materials
        </Button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[material.status] || "bg-slate-100 text-slate-600"}`}>
                {material.status.replace("_", " ")}
              </span>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                {material.materialType.replace("_", " ")}
              </span>
              <span className={`text-xs font-medium ${difficultyColors[material.difficulty] || "text-slate-600"}`}>
                {material.difficulty}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <HardDrive className="w-6 h-6 text-blue-500" />
              {material.title}
            </h1>
          </div>
          <div className="flex gap-2">
            {material.externalUrl && (
              <Button variant="outline" asChild className="gap-2">
                <a href={material.externalUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" /> Open Link
                </a>
              </Button>
            )}
            {material.fileUrl && (
              <Button variant="outline" asChild className="gap-2">
                <a href={material.fileUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4" /> Download File
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={() => setDeleteDialogOpen(true)} className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Description */}
      {material.description && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Description</h3>
          <p className="text-slate-800 whitespace-pre-wrap">{material.description}</p>
        </div>
      )}

      {/* Content */}
      {material.content && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Content</h3>
          <p className="text-slate-800 whitespace-pre-wrap">{material.content}</p>
        </div>
      )}

      {/* Review note, if the material was sent back for changes */}
      {material.reviewNote && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-orange-700 uppercase tracking-wide mb-2">Reviewer Note</h3>
          <p className="text-orange-900 whitespace-pre-wrap">{material.reviewNote}</p>
        </div>
      )}

      {/* Meta */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <User className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Teacher</p>
            <p className="text-sm font-medium text-slate-800">{material.teacher}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Subject</p>
            <p className="text-sm font-medium text-slate-800">{material.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Tag className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Exam</p>
            <p className="text-sm font-medium text-slate-800">{material.exam}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Tag className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Topic</p>
            <p className="text-sm font-medium text-slate-800">{material.topic || "-"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Estimated Reading Time</p>
            <p className="text-sm font-medium text-slate-800">{material.estimatedReadingTime} min</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Tag className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Access</p>
            <p className="text-sm font-medium text-slate-800 capitalize">{material.accessType}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Created</p>
            <p className="text-sm font-medium text-slate-800">{new Date(material.createdAt).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Updated</p>
            <p className="text-sm font-medium text-slate-800">{new Date(material.updatedAt).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Study Material</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{material.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
