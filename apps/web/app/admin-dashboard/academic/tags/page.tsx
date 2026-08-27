"use client";

import React, { useState, useEffect } from "react";
import { Tag, Search, Loader2, MoreVertical, Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { adminApi } from "@/lib/api/admin";

export default function AcademicTagsPage() {
  const [tags, setTags] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalTags, setTotalTags] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({ name: "", color: "#6366f1" });

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const data = await adminApi.getTags({
          search: searchTerm,
          page: currentPage,
          pageSize: 20
        });
        const tagsList = Array.isArray(data) ? data : (data.results || []);
        setTags(tagsList);
        setTotalTags(data.count || tagsList.length || 0);
      } catch (error) {
        console.error("Failed to fetch tags", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTags();
  }, [searchTerm, currentPage]);

  const activeTags = tags.filter(t => t.is_active).length;

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createTag({
        name: createFormData.name,
        color: createFormData.color,
      });
      setShowCreateModal(false);
      setCreateFormData({ name: "", color: "#6366f1" });
      const data = await adminApi.getTags({ page: 1, pageSize: 20 });
      const tagsList = Array.isArray(data) ? data : (data.results || []);
      setTags(tagsList);
      setTotalTags(data.count || tagsList.length || 0);
      setCurrentPage(1);
    } catch (error) {
      console.error("Failed to create tag", error);
      alert("Failed to create tag");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
            <Tag className="w-6 h-6 text-[#D4A72C]" />
            Tags
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage content tags and categories.</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="gap-2 bg-[#D4A72C] text-[#0B2545] hover:bg-[#C49B1F]"
        >
          <Plus className="w-4 h-4" />
          New Tag
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-600 text-sm font-medium mb-1">Total Tags</p>
          <p className="text-2xl font-bold text-[#0B2545]">{totalTags}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-slate-600 text-sm font-medium mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{activeTags}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-slate-400">
          <p className="text-slate-600 text-sm font-medium mb-1">Inactive</p>
          <p className="text-2xl font-bold text-slate-600">{totalTags - activeTags}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative w-full">
          <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
          <Search className="absolute left-3 bottom-2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search tags..."
            className="pl-9 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-600"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-slate-700">Name</TableHead>
                <TableHead className="text-slate-700">Slug</TableHead>
                <TableHead className="text-slate-700">Color</TableHead>
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
              ) : tags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500 bg-white">
                    No tags found.
                  </TableCell>
                </TableRow>
              ) : (
                tags.map((tag) => (
                  <TableRow key={tag.id} className="hover:bg-slate-50/50 border-b border-slate-200">
                    <TableCell>
                      <p className="font-semibold text-[#0B2545]">{tag.name}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-600">{tag.slug}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: tag.color }}
                        />
                        <p className="text-sm text-slate-600">{tag.color}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={tag.is_active ? 'bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-1 rounded' : 'bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-1 rounded'}>
                        {tag.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-100">
                            <MoreVertical className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem className="cursor-pointer">
                            <Eye className="w-4 h-4 mr-2" /> View
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {!isLoading && totalTags > 0 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {currentPage} of {Math.ceil(totalTags / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= Math.ceil(totalTags / 20)}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-[#0B2545] mb-4">Create New Tag</h2>
            <form onSubmit={handleCreateTag} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tag Name *</label>
                <Input
                  type="text"
                  placeholder="Enter tag name"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  required
                  className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={createFormData.color}
                    onChange={(e) => setCreateFormData({ ...createFormData, color: e.target.value })}
                    className="h-10 w-16 rounded border border-slate-200 cursor-pointer"
                  />
                  <Input
                    type="text"
                    placeholder="#6366f1"
                    value={createFormData.color}
                    onChange={(e) => setCreateFormData({ ...createFormData, color: e.target.value })}
                    className="flex-1 bg-slate-50 border-slate-200 text-slate-900 font-mono text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-[#D4A72C] text-[#0B2545] hover:bg-[#C49B1F]"
                >
                  Create Tag
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
