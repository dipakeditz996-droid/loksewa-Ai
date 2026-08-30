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
      const subjects = Array.isArray(data) ? data : (data.results || []);
      setSubjects(subjects);
      if (subjects && subjects.length > 0) {
        setSelectedSubject(subjects[0].id);
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
      const chapters = Array.isArray(data) ? data : (data.results || []);
      setChapters(chapters);
      setTotalChapters(data.count || chapters.length || 0);
    } catch (error) {
      console.error("Failed to fetch chapters", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await adminApi.getSubjects({ pageSize: 100 });
        const subs = Array.isArray(data) ? data : (data.results || []);
        setSubjects(subs);
        if (subs.length > 0) {
          setSelectedSubject(subs[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch subjects", error);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      setCurrentPage(1);
      (async () => {
        try {
          const data = await adminApi.getChapters({
            subject: selectedSubject,
            page: 1,
            pageSize: 20,
          });
          const chaps = Array.isArray(data) ? data : (data.results || []);
          setChapters(chaps);
          setTotalChapters(data.count || chaps.length || 0);
        } catch (error) {
          console.error("Failed to fetch chapters", error);
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [selectedSubject]);

  const activeChapters = chapters.filter(c => c.is_active).length;

  const filteredChapters = searchTerm
    ? chapters.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()))
    : chapters;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#D4A72C]" />
            Chapters
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage chapters across subjects and papers.</p>
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
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-600 text-sm font-medium mb-1">Total Chapters</p>
          <p className="text-2xl font-bold text-[#0B2545]">{totalChapters.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-slate-600 text-sm font-medium mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{activeChapters}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-slate-400">
          <p className="text-slate-600 text-sm font-medium mb-1">Selected Subject</p>
          <p className="text-lg font-bold text-slate-700">
            {subjects.find(s => s.id === selectedSubject)?.name || 'Select a subject'}
          </p>
        </div>
      </div>

      {/* Subject Selector and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Subject</label>
            <select
              value={selectedSubject || ''}
              onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 bg-white border border-slate-200 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A72C]"
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
            <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
            <Search className="absolute left-3 bottom-2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search chapters..."
              className="pl-9 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Chapters Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-slate-700">Title</TableHead>
                <TableHead className="text-slate-700">Description</TableHead>
                <TableHead className="text-slate-700">Order</TableHead>
                <TableHead className="text-slate-700">Status</TableHead>
                <TableHead className="text-slate-700">Created</TableHead>
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
              ) : !selectedSubject ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500 bg-white">
                    Please select a subject to view chapters.
                  </TableCell>
                </TableRow>
              ) : filteredChapters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500 bg-white">
                    No chapters found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredChapters.map((chapter) => (
                  <TableRow key={chapter.id} className="hover:bg-slate-50/50 border-b border-slate-200">
                    <TableCell>
                      <p className="font-semibold text-[#0B2545]">{chapter.title}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-600 max-w-xs truncate">
                        {chapter.description || 'No description'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">#{chapter.order}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        chapter.is_active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {chapter.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {new Date(chapter.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-100">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin-dashboard/academic/chapters/${chapter.id}`} className="cursor-pointer flex items-center">
                              <Eye className="w-4 h-4 mr-2" /> View Topics
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer">
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-red-600">
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
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {currentPage} of {Math.ceil(totalChapters / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= Math.ceil(totalChapters / 20)}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

    </div>
  );
}
