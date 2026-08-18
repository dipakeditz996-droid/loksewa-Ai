"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Plus, Search, ChevronRight, Edit, Trash2, ArrowUp, ArrowDown, BookOpen, CheckCircle2, XCircle, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { adminSyllabusApi, AdminChapter, AdminSubject } from "@/lib/api/admin-syllabus";

export default function ChaptersPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const subjectId = parseInt(resolvedParams.id);
  
  const [chapters, setChapters] = useState<AdminChapter[]>([]);
  const [subject, setSubject] = useState<AdminSubject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<AdminChapter | null>(null);
  
  const [formData, setFormData] = useState({ title: "", description: "", is_active: true });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [subjectId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [subData, chapData] = await Promise.all([
        adminSyllabusApi.getSubject(subjectId),
        adminSyllabusApi.getChapters(subjectId)
      ]);
      setSubject(subData);
      setChapters(chapData);
    } catch (error) {
      console.error("Failed to load chapters", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredChapters = chapters.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenModal = (chapter?: AdminChapter) => {
    if (chapter) {
      setEditingChapter(chapter);
      setFormData({ title: chapter.title, description: chapter.description, is_active: chapter.is_active });
    } else {
      setEditingChapter(null);
      setFormData({ title: "", description: "", is_active: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      setIsSubmitting(true);
      if (editingChapter) {
        await adminSyllabusApi.updateChapter(editingChapter.id, formData);
      } else {
        await adminSyllabusApi.createChapter({ ...formData, subject: subjectId, order: chapters.length });
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error("Failed to save chapter", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, topicCount: number) => {
    if (topicCount > 0) {
      alert("Cannot delete a chapter that contains topics. Please delete or move the topics first.");
      return;
    }
    if (confirm("Are you sure you want to delete this chapter?")) {
      try {
        await adminSyllabusApi.deleteChapter(id);
        loadData();
      } catch (error) {
        console.error("Failed to delete", error);
      }
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === chapters.length - 1) return;

    const newChapters = [...chapters];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    const current = newChapters[index];
    const target = newChapters[targetIndex];
    if (!current || !target) return;

    const tempOrder = current.order;
    current.order = target.order;
    target.order = tempOrder;

    newChapters[index] = target;
    newChapters[targetIndex] = current;

    setChapters(newChapters);

    try {
      await adminSyllabusApi.reorderChapters([
        { id: target.id, order: target.order },
        { id: current.id, order: current.order }
      ]);
    } catch (error) {
      console.error("Reorder failed", error);
      loadData();
    }
  };

  if (isLoading && !subject) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-500 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <p>Subject not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/admin-dashboard/academic/syllabus" className="hover:text-[#0B2545] transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/admin-dashboard/academic/syllabus/categories/${subject.exam}`} className="hover:text-[#0B2545] transition-colors">
              {subject.position_name || "Position"}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/admin-dashboard/academic/syllabus/positions/${subject.exam}`} className="hover:text-[#0B2545] transition-colors">
              Subjects
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-orange-500" />
            Chapters for <span className="text-[#D4A72C]">{subject.name}</span>
          </h1>
          <p className="text-slate-500 mt-1">Manage chapters/units for this subject.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#0B2545] hover:bg-[#163E6C] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Chapter
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search chapters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]/30 transition"
          />
        </div>
        <div className="text-sm text-slate-500">
          Showing <span className="font-medium text-[#0B2545]">{filteredChapters.length}</span> chapters
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3 w-16">Order</th>
                <th className="px-6 py-3">Chapter Title</th>
                <th className="px-6 py-3">Topics</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Loading chapters...
                  </td>
                </tr>
              ) : filteredChapters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No chapters found for this subject.
                  </td>
                </tr>
              ) : (
                filteredChapters.map((chapter, index) => (
                  <tr key={chapter.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <button 
                          disabled={index === 0 || search !== ""}
                          onClick={() => handleMove(index, 'up')}
                          className="text-slate-400 hover:text-[#0B2545] disabled:opacity-30 transition-colors"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button 
                          disabled={index === chapters.length - 1 || search !== ""}
                          onClick={() => handleMove(index, 'down')}
                          className="text-slate-400 hover:text-[#0B2545] disabled:opacity-30 transition-colors"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[#0B2545] text-base">{chapter.title}</div>
                      {chapter.description && (
                        <div className="text-slate-500 mt-1 line-clamp-1">{chapter.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-xs">
                        {chapter.topic_count} topics
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {chapter.is_active ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded-md text-xs font-medium">
                          <XCircle className="h-3.5 w-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(chapter)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(chapter.id, chapter.topic_count)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <Link
                          href={`/admin-dashboard/academic/syllabus/chapters/${chapter.id}`}
                          className="p-2 text-[#0B2545] hover:bg-[#0B2545]/5 rounded-lg transition-colors ml-2 border border-slate-200 hover:border-[#0B2545]/30 flex items-center gap-1 font-medium text-xs"
                        >
                          Topics <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-[#0B2545]">
                {editingChapter ? "Edit Chapter" : "Add Chapter"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Chapter Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Geography of Nepal, Chapter 1"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]/30"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Optional description"
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]/30 resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="h-4 w-4 rounded border-slate-300 text-[#0B2545] focus:ring-[#0B2545]"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                    Active (Visible to users)
                  </label>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.title.trim()}
                  className="px-4 py-2 text-sm font-medium bg-[#0B2545] text-white hover:bg-[#163E6C] rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Chapter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
