"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Filter, Download, Upload, MoreHorizontal, 
  Eye, Edit, Trash2, Copy, Power, BookOpen, ArrowUp, ArrowDown, Unlink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { adminAcademicApi, ApiSubject, ApiExamCategory, ApiExam, ApiPaper } from "@/lib/api/admin-academic-api";
import { toast } from "sonner";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function SubjectsPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [subjects, setSubjects] = useState<ApiSubject[]>([]);
  const [categories, setCategories] = useState<ApiExamCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingSubject, setDeletingSubject] = useState<ApiSubject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Add Subject form — a Subject's real parent is a Paper (not a Category
  // directly), reached via Category -> Level/Position -> Paper. All three
  // are required for a Paper to exist to attach the new Subject to.
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formExamId, setFormExamId] = useState<string>("");
  const [formPaperId, setFormPaperId] = useState<string>("");
  const [exams, setExams] = useState<ApiExam[]>([]);
  const [papers, setPapers] = useState<ApiPaper[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [isSavingSubject, setIsSavingSubject] = useState(false);
  const [addSubjectError, setAddSubjectError] = useState<string | null>(null);

  const resetAddSubjectForm = () => {
    setFormName(""); setFormCode(""); setFormDescription(""); setFormStatus("active");
    setFormCategoryId(""); setFormExamId(""); setFormPaperId("");
    setExams([]); setPapers([]); setAddSubjectError(null);
  };

  useEffect(() => {
    if (!formCategoryId) { setExams([]); setFormExamId(""); return; }
    setLoadingExams(true);
    setFormExamId(""); setFormPaperId(""); setPapers([]);
    adminAcademicApi.getExams(Number(formCategoryId))
      .then(setExams)
      .catch(() => setExams([]))
      .finally(() => setLoadingExams(false));
  }, [formCategoryId]);

  useEffect(() => {
    if (!formExamId) { setPapers([]); setFormPaperId(""); return; }
    setLoadingPapers(true);
    setFormPaperId("");
    adminAcademicApi.getPapers(Number(formExamId))
      .then(setPapers)
      .catch(() => setPapers([]))
      .finally(() => setLoadingPapers(false));
  }, [formExamId]);

  const handleCreateSubject = async () => {
    if (!formName.trim()) { setAddSubjectError("Subject name is required."); return; }
    if (!formPaperId) { setAddSubjectError("Select a Category, Level, and Paper for this subject."); return; }
    setIsSavingSubject(true);
    setAddSubjectError(null);
    try {
      const created = await adminAcademicApi.createSubject({
        paper: Number(formPaperId),
        name: formName.trim(),
        code: formCode.trim(),
        description: formDescription.trim(),
        is_active: formStatus === "active",
      });
      setSubjects(prev => [created, ...prev]);
      toast.success(`"${created.name}" created.`);
      setIsAddModalOpen(false);
      resetAddSubjectForm();
    } catch (err: any) {
      setAddSubjectError(err?.message || "Failed to create subject.");
    } finally {
      setIsSavingSubject(false);
    }
  };

  const fetchData = async () => {
    try {
      const [subRes, catRes] = await Promise.all([
        adminAcademicApi.getSubjects(),
        adminAcademicApi.getCategories()
      ]);
      setSubjects(subRes);
      setCategories(catRes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selected.length === filteredSubjects.length) {
      setSelected([]);
    } else {
      setSelected(filteredSubjects.map((s) => s.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDeleteConfirmed = async () => {
    if (!deletingSubject) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await adminAcademicApi.deleteSubject(deletingSubject.id);
      setSubjects(prev => prev.filter(s => s.id !== deletingSubject.id));
      setSelected(prev => prev.filter(id => id !== deletingSubject.id));
      setDeletingSubject(null);
    } catch (err: any) {
      setActionError(err?.message || "Failed to delete subject. It may have linked chapters or questions.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (subject: ApiSubject) => {
    try {
      await adminAcademicApi.updateSubject(subject.id, { is_active: !subject.is_active });
      setSubjects(prev => prev.map(s => s.id === subject.id ? { ...s, is_active: !s.is_active } : s));
    } catch (err: any) {
      alert(err?.message || "Failed to update subject status.");
    }
  };

  const moveSubject = async (index: number, direction: "up" | "down") => {
    const newList = [...subjects];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newList.length) return;
    [newList[index], newList[swapIdx]] = [newList[swapIdx]!, newList[index]!];
    setSubjects(newList);
    try {
      await adminAcademicApi.reorderSubjects(
        newList.map((s, i) => ({ id: s.id, order: i + 1 }))
      );
    } catch {
      toast.error("Failed to save order.");
      setSubjects(subjects); // revert
    }
  };

  const handleDisconnect = async (subject: ApiSubject) => {
    if (!confirm(`Disconnect "${subject.name}" from its syllabus paper? It will become a standalone subject.`)) return;
    try {
      await adminAcademicApi.updateSubject(subject.id, { paper: null as any });
      setSubjects(prev => prev.map(s => s.id === subject.id ? { ...s, paper_name: 'Standalone' } : s));
      toast.success(`"${subject.name}" disconnected from syllabus.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to disconnect subject.");
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading subjects...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B2545]">Subjects</h2>
          <p className="text-slate-500 text-sm mt-1">Manage core curriculum subjects and their configurations.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button 
            className="bg-[#D4A72C] hover:bg-[#b08b25] text-[#0B2545] font-semibold gap-2"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add Subject
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search subjects by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" className="gap-2 w-full sm:w-auto bg-white">
              <Filter className="w-4 h-4" />
              Filter by Category
            </Button>
            <Button variant="outline" className="gap-2 w-full sm:w-auto bg-white">
              <Filter className="w-4 h-4" />
              Filter by Status
            </Button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selected.length > 0 && (
          <div className="bg-blue-50 border-b border-blue-100 p-3 px-4 flex justify-between items-center">
            <span className="text-sm font-medium text-blue-800">
              {selected.length} subject{selected.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50">Activate</Button>
              <Button size="sm" variant="outline" className="bg-white text-amber-600 border-amber-200 hover:bg-amber-50">Deactivate</Button>
              <Button size="sm" variant="outline" className="bg-white text-red-600 border-red-200 hover:bg-red-50">Delete</Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-12 text-center">Order</TableHead>
                <TableHead className="w-12 text-center">
                  <Checkbox 
                    checked={selected.length === filteredSubjects.length && filteredSubjects.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead className="text-center">Chapters</TableHead>
                <TableHead className="text-center">Questions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <BookOpen className="w-8 h-8 text-slate-300 mb-2" />
                      <p>No subjects found.</p>
                      {search && <p className="text-xs mt-1">Try adjusting your search criteria.</p>}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubjects.map((subject, index) => (
                  <TableRow key={subject.id} className="group">
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          disabled={index === 0}
                          onClick={() => moveSubject(index, "up")}
                          className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-25 disabled:cursor-not-allowed text-slate-400 hover:text-slate-700"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={index === filteredSubjects.length - 1}
                          onClick={() => moveSubject(index, "down")}
                          className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-25 disabled:cursor-not-allowed text-slate-400 hover:text-slate-700"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox 
                        checked={selected.includes(subject.id)}
                        onCheckedChange={() => toggleSelect(subject.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600`}>
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-slate-900">{subject.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono font-medium">
                        {subject.code}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100">
                          {subject.paper_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium text-slate-600">
                      {subject.chapter_count || 0}
                    </TableCell>
                    <TableCell className="text-center font-medium text-slate-600">
                      0
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        subject.is_active 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {subject.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      -
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin-dashboard/academic/subjects/${subject.id}`} className="cursor-pointer">
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" /> Edit Subject
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin-dashboard/academic/chapters?subject=${subject.id}`} className="cursor-pointer">
                              <BookOpen className="mr-2 h-4 w-4" /> Manage Chapters
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-amber-600 focus:text-amber-600 focus:bg-amber-50"
                            onClick={() => handleDisconnect(subject)}
                          >
                            <Unlink className="mr-2 h-4 w-4" /> Disconnect from Syllabus
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleActive(subject)}>
                             <Power className="mr-2 h-4 w-4" /> 
                             {subject.is_active ? 'Deactivate' : 'Activate'}
                           </DropdownMenuItem>
                           <DropdownMenuItem 
                             className="text-red-600 focus:text-red-600 focus:bg-red-50"
                             onClick={() => { setDeletingSubject(subject); setActionError(null); }}
                           >
                             <Trash2 className="mr-2 h-4 w-4" /> Delete
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
        
        {/* Pagination placeholder */}
        {filteredSubjects.length > 0 && (
          <div className="p-4 border-t border-slate-200 flex justify-between items-center text-sm text-slate-500 bg-slate-50">
            <div>Showing 1 to {filteredSubjects.length} of {filteredSubjects.length} subjects</div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm" disabled>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Subject Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={(open) => { setIsAddModalOpen(open); if (!open) resetAddSubjectForm(); }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Subject</DialogTitle>
            <DialogDescription>
              Create a new subject to hold chapters, topics, and questions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Subject Name <span className="text-red-500">*</span></Label>
                <Input id="name" placeholder="e.g. General Knowledge" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Subject Code</Label>
                <Input id="code" placeholder="e.g. GK-101" value={formCode} onChange={(e) => setFormCode(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Brief overview of the subject..." rows={3} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            </div>

            {/* A Subject attaches to a Paper, which belongs to a Level/Position
                under a Category - all three must be picked to know which
                Paper the new Subject goes under. */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Exam Category <span className="text-red-500">*</span></Label>
                <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Level / Position <span className="text-red-500">*</span></Label>
                <Select value={formExamId} onValueChange={setFormExamId} disabled={!formCategoryId || loadingExams}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingExams ? "Loading..." : "Select level"} />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map(exam => (
                      <SelectItem key={exam.id} value={exam.id.toString()}>
                        {exam.parent ? `↳ ${exam.name}` : exam.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formCategoryId && !loadingExams && exams.length === 0 && (
                  <p className="text-xs text-amber-600">No levels under this category yet.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="paper">Paper <span className="text-red-500">*</span></Label>
                <Select value={formPaperId} onValueChange={setFormPaperId} disabled={!formExamId || loadingPapers}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingPapers ? "Loading..." : "Select paper"} />
                  </SelectTrigger>
                  <SelectContent>
                    {papers.map(paper => (
                      <SelectItem key={paper.id} value={paper.id.toString()}>{paper.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formExamId && !loadingPapers && papers.length === 0 && (
                  <p className="text-xs text-amber-600">
                    No papers under this level yet — add one first in Syllabus Builder.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 max-w-[200px]">
              <Label htmlFor="status">Status</Label>
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v as "active" | "inactive")}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {addSubjectError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {addSubjectError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSavingSubject}>Cancel</Button>
            <Button
              className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white"
              onClick={handleCreateSubject}
              disabled={isSavingSubject}
            >
              {isSavingSubject ? "Creating..." : "Create Subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingSubject} onOpenChange={(open) => { if (!open) { setDeletingSubject(null); setActionError(null); } }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Delete Subject
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-900">&ldquo;{deletingSubject?.name}&rdquo;</strong>?
              {(deletingSubject?.chapter_count ?? 0) > 0 && (
                <span className="block mt-2 text-amber-600 font-medium text-sm">
                  ⚠️ This subject has {deletingSubject?.chapter_count} chapter{(deletingSubject?.chapter_count ?? 0) > 1 ? 's' : ''}.
                  All chapters and topics inside will also be deleted.
                </span>
              )}
              <span className="block mt-2 text-red-600 text-sm font-medium">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          {actionError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {actionError}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => { setDeletingSubject(null); setActionError(null); }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteConfirmed}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
