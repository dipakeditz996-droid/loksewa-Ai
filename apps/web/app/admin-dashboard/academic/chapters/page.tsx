"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen, Search, Plus, MoreVertical, Edit, Trash2, Eye,
  Loader2, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { adminApi, AdminChapter, AdminSubject } from "@/lib/api/admin";

export default function AcademicChaptersPage() {
  const [chapters, setChapters] = useState<AdminChapter[]>([]);
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [totalChapters, setTotalChapters] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSubjects = async () => {
    try {
      const data = await adminApi.getSubjects({ pageSize: 100 });
      setSubjects(data.results || []);
      if (data.results && data.results.length > 0) {
        setSelectedSubject(data.results[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch subjects", error);
    }
  };

  const fetchChapters = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getChapters({
        subject: selectedSubject || undefined,
        page: currentPage,
        pageSize: 20,
      });
      setChapters(data.results || []);
      setTotalChapters(data.count || 0);
    } catch (error) {
      console.error("Failed to fetch chapters", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      setCurrentPage(1);
      fetchChapters();
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedSubject) {
      fetchChapters();
    }
  }, [currentPage]);

  const activeChapters = chapters.filter(c => c.is_active).length;

  const filteredChapters = searchTerm
    ? chapters.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()))
    : chapters;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#D4A72C]" />
            Chapters
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage chapters across subjects and papers.</p>
        </div>
        <Link href="/admin-dashboard/academic/chapters/new">
          <Button className="gap-2 bg-[#D4A72C] text-[#0B2545] hover:bg-[#C49B1F]">
            <Plus className="w-4 h-4" />
            New Chapter
          </Button>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 shadow-sm">
          <p className="text-slate-400 text-sm font-medium mb-1">Total Chapters</p>
          <p className="text-2xl font-bold text-white">{totalChapters.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-slate-400 text-sm font-medium mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-400">{activeChapters}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 shadow-sm border-l-4 border-l-slate-600">
          <p className="text-slate-400 text-sm font-medium mb-1">Selected Subject</p>
          <p className="text-lg font-bold text-slate-300">
            {subjects.find(s => s.id === selectedSubject)?.name || 'Select a subject'}
          </p>
        </div>
      </div>

      {/* Subject Selector and Search */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Select Subject</label>
            <select
              value={selectedSubject || ''}
              onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A72C]"
            >
              <option value="">-- Choose a subject --</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} {subject.code ? `(${subject.code})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="relative w-full">
            <label className="block text-sm font-medium text-slate-300 mb-2">Search</label>
            <Search className="absolute left-3 bottom-2 h-4 w-4 text-slate-600" />
            <Input
              placeholder="Search chapters..."
              className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Chapters Table */}
      <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-800 hover:bg-slate-800">
                <TableHead className="text-white">Title</TableHead>
                <TableHead className="text-white">Description</TableHead>
                <TableHead className="text-white">Order</TableHead>
                <TableHead className="text-white">Status</TableHead>
                <TableHead className="text-white">Created</TableHead>
                <TableHead className="text-right text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center bg-slate-900">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-600" />
                  </TableCell>
                </TableRow>
              ) : !selectedSubject ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500 bg-slate-900">
                    Please select a subject to view chapters.
                  </TableCell>
                </TableRow>
              ) : filteredChapters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500 bg-slate-900">
                    No chapters found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredChapters.map((chapter) => (
                  <TableRow key={chapter.id} className="hover:bg-slate-800/50 border-b border-slate-700">
                    <TableCell>
                      <p className="font-semibold text-white">{chapter.title}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-400 max-w-xs truncate">
                        {chapter.description || 'No description'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-400">#{chapter.order}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        chapter.is_active
                          ? 'bg-emerald-900 text-emerald-300'
                          : 'bg-slate-700 text-slate-300'
                      }`}>
                        {chapter.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">
                      {new Date(chapter.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-700">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                          <DropdownMenuLabel className="text-slate-300">Actions</DropdownMenuLabel>
                          <DropdownMenuItem className="cursor-pointer text-slate-300 hover:bg-slate-700">
                            <Eye className="w-4 h-4 mr-2" /> View Topics
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-slate-300 hover:bg-slate-700">
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-red-400 hover:bg-slate-700">
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

      {/* Pagination */}
      {!isLoading && totalChapters > 0 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
          >
            Previous
          </Button>
          <span className="text-sm text-slate-400">
            Page {currentPage} of {Math.ceil(totalChapters / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= Math.ceil(totalChapters / 20)}
            onClick={() => setCurrentPage(p => p + 1)}
            className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
          >
            Next
          </Button>
        </div>
      )}

    </div>
  );
}
