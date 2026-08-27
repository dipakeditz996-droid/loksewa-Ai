"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, UploadCloud, Settings, X, Save, Send, Loader2, ShieldCheck, FileText,
} from "lucide-react";
import { AcademicDependentSelect } from "@/components/admin/syllabus/AcademicDependentSelect";
import {
  adminStudyMaterialApi, MaterialAccess, MaterialDifficulty, MaterialType,
} from "@/lib/api/admin-study-materials";
import toast from "react-hot-toast";

const MATERIAL_TYPES: { value: MaterialType; label: string }[] = [
  { value: "notes", label: "Notes / Article" },
  { value: "pdf", label: "PDF" },
  { value: "video", label: "Video" },
  { value: "document", label: "Document" },
  { value: "presentation", label: "Presentation" },
  { value: "external_link", label: "External Link" },
  { value: "study_guide", label: "Study Guide" },
  { value: "reference", label: "Reference Material" },
];

const DIFFICULTIES: { value: MaterialDifficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export default function AddMaterialPage() {
  const router = useRouter();

  const [saving, setSaving] = useState<null | "draft" | "published">(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [materialType, setMaterialType] = useState<MaterialType>("notes");
  const [difficulty, setDifficulty] = useState<MaterialDifficulty>("beginner");
  const [access, setAccess] = useState<MaterialAccess>("free");
  const [readingTime, setReadingTime] = useState(10);

  // Syllabus placement. The model needs an exam and a subject; topic is optional.
  const [category, setCategory] = useState<number | undefined>();
  const [exam, setExam] = useState<number | undefined>();
  const [subject, setSubject] = useState<number | undefined>();
  const [chapter, setChapter] = useState<number | undefined>();
  const [topic, setTopic] = useState<number | undefined>();

  const handleAcademicChange = (field: string, value: any) => {
    if (field === "category") {
      setCategory(value); setExam(undefined); setSubject(undefined); setChapter(undefined); setTopic(undefined);
    } else if (field === "position" || field === "exam") {
      setExam(value); setSubject(undefined); setChapter(undefined); setTopic(undefined);
    } else if (field === "subject") {
      setSubject(value); setChapter(undefined); setTopic(undefined);
    } else if (field === "chapter" || field === "unit") {
      setChapter(value); setTopic(undefined);
    } else if (field === "topic") {
      setTopic(value);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  const problems: string[] = [];
  if (!title.trim()) problems.push("Give the material a title");
  if (!exam) problems.push("Choose an exam / position");
  if (!subject) problems.push("Choose a subject");
  if (!file && !externalUrl.trim() && !content.trim()) {
    problems.push("Attach a file, add a link, or write some content");
  }

  const save = async (status: "draft" | "published") => {
    if (problems.length > 0) {
      toast.error(problems[0]);
      return;
    }
    setSaving(status);
    try {
      const res = await adminStudyMaterialApi.create({
        title: title.trim(),
        exam: exam!,
        subject: subject!,
        topic: topic ?? null,
        description: description.trim(),
        content,
        material_type: materialType,
        difficulty,
        access_type: access,
        status,
        external_url: externalUrl.trim(),
        estimated_reading_time: readingTime,
        file,
      });
      toast.success(
        status === "published" ? `"${res.title}" published` : `"${res.title}" saved as draft`
      );
      router.push("/admin-dashboard/study-materials");
    } catch (error: any) {
      toast.error(error?.data?.error || error.message || "Could not save the material");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin-dashboard/study-materials"
            className="p-2 rounded-full text-slate-500 hover:text-[#0B2545] hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#0B2545]">Add New Material</h1>
            <p className="text-slate-500 text-sm mt-1">Upload files and create study resources.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => save("draft")}
            disabled={saving !== null}
            className="px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
          >
            {saving === "draft" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => save("published")}
            disabled={saving !== null}
            className="px-4 py-2 bg-[#0B2545] hover:bg-[#163E6C] text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {saving === "published" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publish Now
          </button>
        </div>
      </div>

      {problems.length > 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          {problems[0]}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* File */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-slate-500" />
              <h2 className="font-bold text-[#0B2545]">Material File</h2>
              <span className="text-xs text-slate-500 ml-auto">Optional if you add a link or content</span>
            </div>
            <div className="p-4">
              {!file ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("material-file")?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragging ? "border-[#0B2545] bg-slate-50" : "border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <input
                    id="material-file"
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                  />
                  <p className="font-medium text-slate-700">Click to browse or drag and drop</p>
                  <p className="text-sm text-slate-500 mt-1">PDF, document, presentation or video</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 border border-slate-200 rounded-lg p-3">
                  <FileText className="w-5 h-5 text-slate-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">External Link</label>
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://... (for a video or an outside resource)"
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20"
                />
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" />
              <h2 className="font-bold text-[#0B2545]">Details</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Rivers of Nepal — Quick Notes"
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Short Description</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A one or two sentence summary shown in lists"
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write the material here. Plain text or HTML."
                  className="w-full min-h-[200px] p-3 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 resize-y"
                />
              </div>
            </div>
          </div>

          {/* Syllabus */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-[#0B2545]">Syllabus Placement</h2>
              <p className="text-xs text-slate-500 mt-0.5">Exam and subject are required; topic is optional.</p>
            </div>
            <div className="p-4">
              <AcademicDependentSelect
                category={category}
                position={exam}
                subject={subject}
                chapter={chapter}
                topic={topic}
                onChange={handleAcademicChange}
                maxLevel="topic"
                layout="grid"
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-500" />
              <h2 className="font-bold text-[#0B2545]">Classification</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Material Type</label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value as MaterialType)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20"
                >
                  {MATERIAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as MaterialDifficulty)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20"
                >
                  {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Reading Time (minutes)</label>
                <input
                  type="number"
                  min={1}
                  value={readingTime}
                  onChange={(e) => setReadingTime(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-slate-500" />
              <h2 className="font-bold text-[#0B2545]">Access</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccess("free")}
                className={`border rounded-lg p-3 text-left transition-colors ${
                  access === "free" ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="block font-bold text-[#0B2545]">Free</span>
                <span className="block text-xs text-slate-500 mt-0.5">Open to everyone</span>
              </button>
              <button
                type="button"
                onClick={() => setAccess("premium")}
                className={`border rounded-lg p-3 text-left transition-colors ${
                  access === "premium" ? "border-[#D4A72C] bg-amber-50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="block font-bold text-[#0B2545]">Premium</span>
                <span className="block text-xs text-slate-500 mt-0.5">Subscribers only</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
