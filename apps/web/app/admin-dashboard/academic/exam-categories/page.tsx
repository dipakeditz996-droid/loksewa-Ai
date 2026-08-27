"use client";
import React, { useState, useEffect } from "react";
import { Bookmark, Search, Loader2, MoreVertical, Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { apiClient } from "@/lib/api/client";

export default function ExamCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCategories, setTotalCategories] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({ name: "", description: "", order: 0 });

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const data = await apiClient<any>("/admin/syllabus/categories/?page_size=50");
        const cats = Array.isArray(data) ? data : (data.results || []);
        setCategories(cats);
        setTotalCategories(data.count || cats.length || 0);
      } catch (error) {
        console.error("Failed to fetch categories", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const activeCategories = categories.filter(c => c.is_active).length;
  const filteredCategories = searchTerm ? categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())) : categories;

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient("/admin/syllabus/categories/", {
        method: "POST",
        body: JSON.stringify({
          name: createFormData.name,
          description: createFormData.description,
          order: createFormData.order,
          is_active: true,
        }),
      });
      setShowCreateModal(false);
      setCreateFormData({ name: "", description: "", order: 0 });
      const data = await apiClient<any>("/admin/syllabus/categories/?page_size=50");
      const cats = Array.isArray(data) ? data : (data.results || []);
      setCategories(cats);
      setTotalCategories(data.count || cats.length || 0);
    } catch (error) {
      console.error("Failed to create category", error);
      alert("Failed to create category");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-[#D4A72C]" />
            Exam Categories
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage examination categories.</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="gap-2 bg-[#D4A72C] text-[#0B2545] hover:bg-[#C49B1F]"
        >
          <Plus className="w-4 h-4" />
          New Category
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-600 text-sm font-medium mb-1">Total Categories</p>
          <p className="text-2xl font-bold text-[#0B2545]">{totalCategories}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-slate-600 text-sm font-medium mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{activeCategories}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-slate-600 text-sm font-medium mb-1">Inactive</p>
          <p className="text-2xl font-bold text-blue-600">{totalCategories - activeCategories}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input placeholder="Search categories..." className="pl-9 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-600" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-slate-700">Name</TableHead>
                <TableHead className="text-slate-700">Description</TableHead>
                <TableHead className="text-slate-700">Order</TableHead>
                <TableHead className="text-slate-700">Status</TableHead>
                <TableHead className="text-right text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center bg-white">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500 bg-white">
                    No categories found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category) => (
                  <TableRow key={category.id} className="hover:bg-slate-50/50 border-b border-slate-200">
                    <TableCell>
                      <p className="font-semibold text-[#0B2545]">{category.name}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-600 max-w-xs truncate">
                        {category.description || 'No description'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">#{category.order}</span>
                    </TableCell>
                    <TableCell>
                      <span className={category.is_active ? 'bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-1 rounded' : 'bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-1 rounded'}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4 text-slate-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-[#0B2545] mb-4">Create New Category</h2>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category Name *</label>
                <Input
                  type="text"
                  placeholder="Enter category name"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  required
                  className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  placeholder="Enter category description (optional)"
                  value={createFormData.description}
                  onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A72C] bg-slate-50 text-slate-900 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Order</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={createFormData.order}
                  onChange={(e) => setCreateFormData({ ...createFormData, order: parseInt(e.target.value) })}
                  className="bg-slate-50 border-slate-200 text-slate-900"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-[#D4A72C] text-[#0B2545] hover:bg-[#C49B1F]"
                >
                  Create Category
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
