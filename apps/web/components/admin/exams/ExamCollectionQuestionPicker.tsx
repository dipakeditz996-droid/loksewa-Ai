"use client";

import React, { useState, useEffect } from "react";
import {
  FolderOpen,
  Search,
  Eye,
  CheckCircle,
  AlertTriangle,
  Loader2,
  BookOpen,
  Layers,
  ArrowRight,
  HelpCircle,
  X,
  FileCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  adminCollectionsApi,
  QuestionCollection,
} from "@/lib/api/admin-collections";
import { adminExamApi, ExaminationType } from "@/lib/api/admin-exams";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  examinationId: number;
  examTitle: string;
  examType: ExaminationType;
  categoryId?: number;
  positionId?: number;
  subjectId?: number;
  chapterId?: number;
  topicId?: number;
  categoryName?: string;
  positionName?: string;
  subjectName?: string;
  chapterName?: string;
  topicName?: string;
  onQuestionsAttached?: (count: number) => void;
  onSwitchToBank?: () => void;
}

export function ExamCollectionQuestionPicker({
  examinationId,
  examTitle,
  examType,
  categoryId,
  positionId,
  subjectId,
  chapterId,
  topicId,
  categoryName,
  positionName,
  subjectName,
  chapterName,
  topicName,
  onQuestionsAttached,
  onSwitchToBank,
}: Props) {
  const [collections, setCollections] = useState<QuestionCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedColId, setSelectedColId] = useState<number | null>(null);
  const [previewCol, setPreviewCol] = useState<QuestionCollection | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [attaching, setAttaching] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const data = await adminCollectionsApi.getCollections();
      setCollections(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load question collections.");
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPreview = async (col: QuestionCollection) => {
    setPreviewCol(col);
    setPreviewLoading(true);
    try {
      const qs = await adminCollectionsApi.getCollectionQuestions(col.id);
      setPreviewQuestions(Array.isArray(qs) ? qs : []);
    } catch {
      toast.error("Failed to load collection questions for preview.");
      setPreviewQuestions([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleAttachCollection = async (col: QuestionCollection) => {
    if (attaching) return;
    setAttaching(true);
    try {
      // 1. Fetch questions inside this collection
      const qs = await adminCollectionsApi.getCollectionQuestions(col.id);
      if (!qs || qs.length === 0) {
        toast.error("This collection has no questions to attach.");
        setAttaching(false);
        return;
      }

      const qIds = qs.map((q: any) => q.id || q.question_id).filter(Boolean);
      if (qIds.length === 0) {
        toast.error("No valid question IDs found in this collection.");
        setAttaching(false);
        return;
      }

      // 2. Validate academic scope if topicwise test
      const mismatched: string[] = [];
      if (subjectId && col.subject && col.subject !== subjectId) {
        mismatched.push(`Subject (${col.subject_name || "collection subject"} vs exam subject)`);
      }
      if (chapterId && col.chapter && col.chapter !== chapterId) {
        mismatched.push(`Chapter (${col.chapter_name || "collection chapter"} vs exam chapter)`);
      }

      if (mismatched.length > 0) {
        const proceed = confirm(
          `Warning: Academic scope mismatch detected:\n${mismatched.join("\n")}\n\n` +
          `Are you sure you want to attach these ${qIds.length} question(s) to this exam?`
        );
        if (!proceed) {
          setAttaching(false);
          return;
        }
      }

      // 3. Attach questions to the canonical Examination
      const res = await adminExamApi.addQuestions(examinationId, qIds);
      if (res.added_count > 0) {
        toast.success(
          `Successfully attached ${res.added_count} question(s) from collection "${col.name}" to this exam!`
        );
        if (res.skipped_duplicates && res.skipped_duplicates > 0) {
          toast(`${res.skipped_duplicates} question(s) were already on this exam.`);
        }
        onQuestionsAttached?.(res.added_count);
      } else if (res.skipped_duplicates && res.skipped_duplicates > 0) {
        toast("All questions in this collection are already assigned to this exam.");
      } else if (res.not_approved_or_missing && res.not_approved_or_missing.length > 0) {
        toast.error("Some questions could not be added because they are unapproved or missing.");
      } else {
        toast.error("No questions were added.");
      }
    } catch (error: any) {
      toast.error(error?.data?.error || "Failed to attach collection questions to exam.");
    } finally {
      setAttaching(false);
    }
  };

  // Filter collections by search query
  const filteredCollections = collections.filter((col) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      col.name.toLowerCase().includes(q) ||
      (col.description && col.description.toLowerCase().includes(q)) ||
      (col.subject_name && col.subject_name.toLowerCase().includes(q)) ||
      (col.chapter_name && col.chapter_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Banner / Academic Context */}
      <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/40 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0B2545]">
              Select from Saved Question Collections
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Choose a reusable question set. Questions will be snapshot into this exam as canonical ExaminationQuestions.
            </p>
            {(subjectName || chapterName) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] font-medium text-slate-500">Exam Scope:</span>
                {subjectName && (
                  <span className="px-2 py-0.5 rounded bg-blue-100/70 text-blue-800 text-[11px] font-semibold">
                    {subjectName}
                  </span>
                )}
                {chapterName && (
                  <span className="px-2 py-0.5 rounded bg-purple-100/70 text-purple-800 text-[11px] font-semibold">
                    {chapterName}
                  </span>
                )}
                {topicName && (
                  <span className="px-2 py-0.5 rounded bg-emerald-100/70 text-emerald-800 text-[11px] font-semibold">
                    {topicName}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {onSwitchToBank && (
          <button
            type="button"
            onClick={onSwitchToBank}
            className="text-xs text-blue-700 hover:text-blue-900 font-semibold px-3 py-1.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-50/50 transition-colors self-start sm:self-auto shrink-0"
          >
            Or pick individually from Bank &rarr;
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search collections by title, description, subject, or chapter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Collection Grid / List */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Loading collections...</p>
        </div>
      ) : filteredCollections.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-700">No collections found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search
              ? "No collections match your search filter."
              : "No question collections have been created yet. You can create collections in Academic Management → Question Bank → Collections."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCollections.map((col) => {
            const count = col.question_count ?? 0;
            const isMatchSubject = !subjectId || !col.subject || col.subject === subjectId;
            const isMatchChapter = !chapterId || !col.chapter || col.chapter === chapterId;
            const isCompatible = isMatchSubject && isMatchChapter;

            return (
              <div
                key={col.id}
                className={`bg-white border rounded-xl p-4 transition-all flex flex-col justify-between ${
                  selectedColId === col.id
                    ? "border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-[#0B2545] line-clamp-1">{col.name}</h4>
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {count} {count === 1 ? "question" : "questions"}
                    </span>
                  </div>

                  {col.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{col.description}</p>
                  )}

                  {/* Academic Scope Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {col.course_title && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        Course: {col.course_title}
                      </span>
                    )}
                    {col.position_name && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-200">
                        Pos: {col.position_name}
                      </span>
                    )}
                    {col.subject_name && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Sub: {col.subject_name}
                      </span>
                    )}
                    {col.chapter_name && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                        Chap: {col.chapter_name}
                      </span>
                    )}
                    {col.topic_name && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Topic: {col.topic_name}
                      </span>
                    )}
                  </div>

                  {/* Academic compatibility status */}
                  {(subjectId || chapterId) && (
                    <div className="mt-3">
                      {isCompatible ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <CheckCircle className="w-3 h-3" /> Compatible with Exam Scope
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" /> Scope Mismatch (Diff Subject/Chapter)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenPreview(col)}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </button>

                  <button
                    type="button"
                    disabled={attaching || count === 0}
                    onClick={() => handleAttachCollection(col)}
                    className="text-xs text-white bg-[#0B2545] hover:bg-slate-800 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {attaching && selectedColId === col.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Attaching...
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-3.5 h-3.5" />
                        Use Collection ({count})
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewCol} onOpenChange={(open) => !open && setPreviewCol(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-bold text-[#0B2545] flex items-center justify-between">
              <span>Preview Collection: {previewCol?.name}</span>
              <span className="text-xs font-normal text-slate-500">
                {previewQuestions.length} Questions
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {previewLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading questions...</p>
              </div>
            ) : previewQuestions.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                This collection does not contain any questions.
              </p>
            ) : (
              previewQuestions.map((q, idx) => {
                const text = q.text || q.question_text || "Untitled Question";
                const qType = q.question_type || "mcq";
                const marks = q.marks ?? 1;

                return (
                  <div
                    key={q.id || idx}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold text-slate-800">
                        <span className="text-blue-600 font-bold mr-1.5">{idx + 1}.</span>
                        {text}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-600 uppercase text-[10px]">
                          {qType}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 font-semibold text-blue-700 text-[10px]">
                          {marks}m
                        </span>
                      </div>
                    </div>

                    {/* Options if MCQ */}
                    {Array.isArray(q.options) && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-4 pt-1">
                        {q.options.map((opt: any, oIdx: number) => {
                          const isCorrect = opt.is_correct || opt.isCorrect;
                          return (
                            <div
                              key={opt.id || oIdx}
                              className={`p-1.5 rounded border text-[11px] ${
                                isCorrect
                                  ? "bg-emerald-50 border-emerald-300 font-semibold text-emerald-800"
                                  : "bg-white border-slate-200 text-slate-600"
                              }`}
                            >
                              <span className="font-bold mr-1">
                                {String.fromCharCode(65 + oIdx)}.
                              </span>
                              {opt.text || opt.option_text}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Model Answer if Subjective */}
                    {q.model_answer && (
                      <div className="mt-1 p-2 bg-amber-50/60 border border-amber-200 rounded text-[11px] text-amber-900">
                        <span className="font-semibold block">Model Answer / Evaluation Criteria:</span>
                        <p className="line-clamp-3 mt-0.5">{q.model_answer}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPreviewCol(null)}
              className="text-xs px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Close
            </button>
            {previewCol && (
              <button
                type="button"
                disabled={attaching || previewQuestions.length === 0}
                onClick={() => {
                  const targetCol = previewCol;
                  setPreviewCol(null);
                  handleAttachCollection(targetCol);
                }}
                className="text-xs px-4 py-2 rounded-lg bg-[#0B2545] text-white hover:bg-slate-800 font-semibold disabled:opacity-50"
              >
                Use this Collection ({previewQuestions.length})
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
