"use client";

import React, { useState, useEffect } from "react";
import { Tag, Search, Loader2, MoreVertical, Pencil, Trash2, Power, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { adminApi, AdminTag } from "@/lib/api/admin";
import { toast } from "react-hot-toast";

export default function AcademicTagsPage() {
  const [tags, setTags] = useState<AdminTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalTags, setTotalTags] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({ name: "", color: "#6366f1" });
  const [editingTag, setEditingTag] = useState<AdminTag | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", color: "#6366f1" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingTag, setDeletingTag] = useState<AdminTag | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getTags({
        search: searchTerm,
        page: currentPage,
        pageSize: 20
      });
      const tagsList = Array.isArray(data) ? data : (data.results || []);
      setTags(tagsList);
      setTotalTags((data as any).count || tagsList.length || 0);
    } catch (error) {
      console.error("Failed to fetch tags", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, currentPage]);

  const activeTags = tags.filter(t => t.is_active).length;

  const openEdit = (tag: AdminTag) => {
    setEditingTag(tag);
    setEditFormData({ name: tag.name, color: tag.color });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag) return;
    setSavingEdit(true);
    try {
      await adminApi.updateTag(editingTag.id, editFormData);
      toast.success("Tag updated.");
      setEditingTag(null);
      await fetchTags();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update tag");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleActive = async (tag: AdminTag) => {
    try {
      await adminApi.updateTag(tag.id, { is_active: !tag.is_active });
      toast.success(tag.is_active ? `"${tag.name}" deactivated.` : `"${tag.name}" activated.`);
      await fetchTags();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update tag");
    }
  };

  const handleDelete = async () => {
    if (!deletingTag) return;
    setDeleting(true);
    try {
      await adminApi.deleteTag(deletingTag.id);
      toast.success(`"${deletingTag.name}" deleted. Questions are unaffected.`);
      setDeletingTag(null);
      await fetchTags();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete tag");
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createTag({
        name: createFormData.name,
        color: createFormData.color,
      });
      toast.success("Tag created.");
      setShowCreateModal(false);
      setCreateFormData({ name: "", color: "#6366f1" });
      setCurrentPage(1);
      await fetchTags();
    } catch (error: any) {
      console.error("Failed to create tag", error);
      toast.error(error?.message || "Failed to create tag");
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
                <TableHead className="text-slate-700">Usage</TableHead>
                <TableHead className="text-right text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center bg-white">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : tags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500 bg-white">
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
                    <TableCell>
                      <p className="text-sm text-slate-600">{tag.question_count ?? 0} question{tag.question_count === 1 ? '' : 's'}</p>
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
                          <DropdownMenuItem className="cursor-pointer" onClick={() => openEdit(tag)}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => handleToggleActive(tag)}>
                            <Power className="w-4 h-4 mr-2" /> {tag.is_active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-red-600 focus:text-red-600"
                            onClick={() => setDeletingTag(tag)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
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

      {editingTag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-[#0B2545] mb-4">Edit Tag</h2>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tag Name *</label>
                <Input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                  className="bg-slate-50 border-slate-200 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={editFormData.color}
                    onChange={(e) => setEditFormData({ ...editFormData, color: e.target.value })}
                    className="h-10 w-16 rounded border border-slate-200 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={editFormData.color}
                    onChange={(e) => setEditFormData({ ...editFormData, color: e.target.value })}
                    className="flex-1 bg-slate-50 border-slate-200 text-slate-900 font-mono text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={savingEdit} className="flex-1 bg-[#D4A72C] text-[#0B2545] hover:bg-[#C49B1F]">
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingTag(null)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingTag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-red-600 mb-2">Delete Tag</h2>
            <p className="text-sm text-slate-600 mb-1">
              Delete <strong>&ldquo;{deletingTag.name}&rdquo;</strong>?
            </p>
            <p className="text-sm text-slate-500 mb-4">
              This only removes the tag itself. Questions, Collections, and exam history are not affected.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Delete"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDeletingTag(null)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
