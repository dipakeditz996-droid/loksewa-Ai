"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronRight, Edit, Trash2, ArrowUp, ArrowDown, Database, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { adminSyllabusApi, AdminExamCategory } from "@/lib/api/admin-syllabus";

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<AdminExamCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminExamCategory | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({ name: "", description: "", is_active: true });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await adminSyllabusApi.getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenModal = (category?: AdminExamCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, description: category.description, is_active: category.is_active });
    } else {
      setEditingCategory(null);
      setFormData({ name: "", description: "", is_active: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsSubmitting(true);
      if (editingCategory) {
        await adminSyllabusApi.updateCategory(editingCategory.id, formData);
      } else {
        await adminSyllabusApi.createCategory({ ...formData, order: categories.length });
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error("Failed to save category", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, positionCount: number) => {
    if (positionCount > 0) {
      alert("Cannot delete a category that contains positions. Please delete or move the positions first.");
      return;
    }
    if (confirm("Are you sure you want to delete this category?")) {
      try {
        await adminSyllabusApi.deleteCategory(id);
        loadData();
      } catch (error) {
        console.error("Failed to delete", error);
      }
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categories.length - 1) return;

    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    const current = newCategories[index];
    const target = newCategories[targetIndex];
    if (!current || !target) return;

    // Swap order values
    const tempOrder = current.order;
    current.order = target.order;
    target.order = tempOrder;

    // Swap elements in array for optimistic UI
    newCategories[index] = target;
    newCategories[targetIndex] = current;

    setCategories(newCategories);

    try {
      await adminSyllabusApi.reorderCategories([
        { id: target.id, order: target.order },
        { id: current.id, order: current.order }
      ]);
    } catch (error) {
      console.error("Reorder failed", error);
      loadData(); // Revert on failure
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/admin-dashboard/academic/syllabus" className="hover:text-[#0B2545] transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
            <Database className="h-6 w-6 text-[#D4A72C]" />
            Exam Categories
          </h1>
          <p className="text-slate-500 mt-1">Manage top-level exam categories.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#0B2545] hover:bg-[#163E6C] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]/30 transition"
          />
        </div>
        <div className="text-sm text-slate-500">
          Showing <span className="font-medium text-[#0B2545]">{filteredCategories.length}</span> categories
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3 w-16">Order</th>
                <th className="px-6 py-3">Category Name</th>
                <th className="px-6 py-3">Positions</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Loading categories...
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No categories found.
                  </td>
                </tr>
              ) : (
                filteredCategories.map((category, index) => (
                  <tr key={category.id} className="hover:bg-slate-50/50 transition-colors">
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
                          disabled={index === categories.length - 1 || search !== ""}
                          onClick={() => handleMove(index, 'down')}
                          className="text-slate-400 hover:text-[#0B2545] disabled:opacity-30 transition-colors"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[#0B2545] text-base">{category.name}</div>
                      {category.description && (
                        <div className="text-slate-500 mt-1 line-clamp-1">{category.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-xs">
                        {category.position_count} positions
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {category.is_active ? (
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
                          onClick={() => handleOpenModal(category)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id, category.position_count)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <Link
                          href={`/admin-dashboard/academic/syllabus/categories/${category.id}`}
                          className="p-2 text-[#0B2545] hover:bg-[#0B2545]/5 rounded-lg transition-colors ml-2 border border-slate-200 hover:border-[#0B2545]/30 flex items-center gap-1 font-medium text-xs"
                        >
                          Positions <ChevronRight className="h-3.5 w-3.5" />
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
                {editingCategory ? "Edit Category" : "Add Category"}
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
                  <label className="text-sm font-semibold text-slate-700">Category Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Loksewa, Banking, Security"
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
                  disabled={isSubmitting || !formData.name.trim()}
                  className="px-4 py-2 text-sm font-medium bg-[#0B2545] text-white hover:bg-[#163E6C] rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
