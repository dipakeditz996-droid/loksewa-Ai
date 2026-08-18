"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ChevronRight, ArrowLeft, Search, Plus, MoreVertical, 
  ArrowUpDown, Layers, Edit2, Archive 
} from "lucide-react";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  mockExams, mockPapers, mockSubjects, mockChapters
} from "@/lib/mock/admin-academic";

export default function ManageSubjectsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const paper = mockPapers.find(p => p.id === id);
  const exam = mockExams.find(e => e.id === paper?.examId);
  const subjects = mockSubjects.filter(s => s.paperId === id).sort((a, b) => a.sortOrder - b.sortOrder);

  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!paper || !exam) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold text-slate-800">Paper Not Found</h2>
        <Button onClick={() => router.push('/admin-dashboard/academic')} className="mt-4">
          Back to Academic Content
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm font-[500] text-slate-500 gap-2 mb-2">
        <Link href="/admin-dashboard/academic" className="hover:text-slate-900 dark:hover:text-white transition-colors">Academic Content</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/admin-dashboard/academic/exams/${exam.id}`} className="hover:text-slate-900 dark:hover:text-white transition-colors">{exam.name}</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 dark:text-white font-[700]">{paper.paperNumber}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/admin-dashboard/academic/exams/${exam.id}`)} className="-ml-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-2xl font-[800] text-slate-900 dark:text-white">Manage Subjects</h2>
          </div>
          <p className="text-slate-500 text-sm mt-1 ml-11">Configure subjects for {paper.paperNumber}: {paper.name}</p>
        </div>
        <Button className="bg-[#163E6B] hover:bg-[#163E6B]/90 text-white font-[700] gap-2 dark:bg-white dark:text-[#0A1118] dark:hover:bg-slate-200">
          <Plus className="w-4 h-4"/> Add Subject
        </Button>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-[#0B1521] p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search subjects by name or code..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-50 dark:bg-[#0A1118] border-slate-200 dark:border-white/10"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="border-slate-200 dark:border-white/10 dark:bg-[#0B1521] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50 dark:bg-[#0A1118] uppercase border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="px-6 py-4 font-[700] w-10"></th>
                <th className="px-6 py-4 font-[700]">Subject Name</th>
                <th className="px-6 py-4 font-[700]">Code</th>
                <th className="px-6 py-4 font-[700] text-center">Chapters</th>
                <th className="px-6 py-4 font-[700]">Status</th>
                <th className="px-6 py-4 font-[700] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredSubjects.map((subject) => {
                const chapterCount = mockChapters.filter(c => c.subjectId === subject.id).length;
                return (
                  <tr key={subject.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <ArrowUpDown className="w-4 h-4 text-slate-300 cursor-grab hover:text-slate-500" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-[700] text-slate-900 dark:text-white text-base">{subject.name}</div>
                      <div className="text-slate-500 text-xs mt-1 truncate max-w-xs">{subject.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-[600] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-2.5 py-1 rounded-md text-xs">
                        {subject.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="outline" className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10">
                        {chapterCount} Chapters
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`${
                        subject.status === 'Published' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400' :
                        subject.status === 'Draft' ? 'bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-white/10 dark:text-slate-300' :
                        'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400'
                      } border-none font-[700]`}>
                        {subject.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin-dashboard/academic/subjects/${subject.id}`} className="cursor-pointer">
                              <Layers className="w-4 h-4 mr-2" /> Manage Chapters
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit2 className="w-4 h-4 mr-2" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={() => alert("This subject is currently used by 89 questions and 5 practice sets. Archiving it will hide it from new content creation but preserve existing references.")}>
                            <Archive className="w-4 h-4 mr-2" /> Archive Subject
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
              {filteredSubjects.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No subjects found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
