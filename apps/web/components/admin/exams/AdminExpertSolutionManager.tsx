"use client";

import React, { useState, useRef } from "react";
import {
  FileText, UploadCloud, CheckCircle2, AlertCircle, Eye, Download,
  Trash2, RefreshCw, Loader2, Sparkles, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Examination, adminExamApi } from "@/lib/api/admin-exams";
import toast from "react-hot-toast";

interface AdminExpertSolutionManagerProps {
  exam: Examination;
  onUpdated?: () => void;
}

export function AdminExpertSolutionManager({ exam, onUpdated }: AdminExpertSolutionManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasPdf = Boolean(exam.expert_solution_pdf);
  const isPublished = Boolean(exam.is_expert_solution_published);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      toast.error("Please upload a valid PDF document.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File size exceeds 25MB limit.");
      return;
    }

    setIsUploading(true);
    try {
      await adminExamApi.uploadExpertSolutionPdf(exam.id, file);
      toast.success("Expert Solution PDF uploaded successfully!");
      if (onUpdated) onUpdated();
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to upload Expert Solution PDF.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await adminExamApi.publishExpertSolution(exam.id);
      toast.success("Expert Solution published! Authorized students can now access it.");
      if (onUpdated) onUpdated();
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to publish Expert Solution.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setIsUnpublishing(true);
    try {
      await adminExamApi.unpublishExpertSolution(exam.id);
      toast.success("Expert Solution unpublished.");
      if (onUpdated) onUpdated();
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to unpublish Expert Solution.");
    } finally {
      setIsUnpublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove the Expert Solution PDF for this exam?")) return;
    setIsDeleting(true);
    try {
      await adminExamApi.deleteExpertSolution(exam.id);
      toast.success("Expert Solution removed successfully.");
      if (onUpdated) onUpdated();
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to delete Expert Solution.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePreviewDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await adminExamApi.getExpertSolutionBlob(exam.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err: any) {
      toast.error("Could not load expert solution PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold text-[#0B2545]">Expert Solution PDF</CardTitle>
            {hasPdf ? (
              isPublished ? (
                <Badge className="bg-emerald-600 text-white text-xs">Published</Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">Draft (Unpublished)</Badge>
              )
            ) : (
              <Badge variant="secondary" className="text-slate-500 text-xs">Not Uploaded</Badge>
            )}
          </div>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Admin model solution document published independently for this Subjective Exam.
          </CardDescription>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileUpload}
        />
      </CardHeader>

      <CardContent className="p-5">
        {hasPdf ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {exam.expert_solution_pdf ? exam.expert_solution_pdf.split("/").pop() : "expert_solution.pdf"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {exam.expert_solution_page_count ? `${exam.expert_solution_page_count} pages • ` : ""}
                    {formatBytes(exam.expert_solution_file_size)}
                    {exam.expert_solution_published_at ? ` • Published on ${new Date(exam.expert_solution_published_at).toLocaleDateString()}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviewDownload}
                  disabled={isDownloading}
                  className="gap-1.5 text-xs text-slate-700"
                >
                  {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5 text-indigo-600" />}
                  Preview / Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-1.5 text-xs text-slate-700"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Replace PDF
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-2"
                  title="Remove Expert Solution"
                >
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p className="text-xs text-slate-500">
                {isPublished
                  ? "Students authorized for this course can view and download this solution PDF."
                  : "Draft solution is hidden from students until you click Publish."}
              </p>
              {isPublished ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnpublish}
                  disabled={isUnpublishing}
                  className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  {isUnpublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Unpublish Solution
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
                >
                  {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Publish Expert Solution
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-300 transition-colors bg-slate-50/50">
            <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">No Expert Solution Uploaded</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Upload an official model answer or explanation PDF for this subjective exam. Max 25MB.
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white text-xs font-semibold gap-2 shadow-sm"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              {isUploading ? "Uploading PDF..." : "Upload Expert Solution PDF"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
