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
  ArrowUpDown, Edit2, Archive, Hash 
} from "lucide-react";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  mockExams, mockPapers, mockSubjects, mockChapters, mockTopics
} from "@/lib/mock/admin-academic";

export default function ManageTopicsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const chapter = mockChapters.find(c => c.id === id);
  const subject = mockSubjects.find(s => s.id === chapter?.subjectId);
  const paper = mockPapers.find(p => p.id === subject?.paperId);
  const exam = mockExams.find(e => e.id === paper?.examId);
  
  const topics = mockTopics.filter(t => t.chapterId === id).sort((a, b) => a.sortOrder - b.sortOrder);

  const filteredTopics = topics.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.topicCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!chapter || !subject || !paper || !exam) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold text-slate-800">Chapter Not Found</h2>
        <Button onClick={() => router.push('/admin-dashboard/academic')} className="mt-4">
          Back to Academic Content
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm font-[500] text-slate-500 gap-2 mb-2 flex-wrap">
        <Link href="/admin-dashboard/academic" className="hover:text-slate-900 dark:hover:text-white transition-colors">Academic Content</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/admin-dashboard/academic/exams/${exam.id}`} className="hover:text-slate-900 dark:hover:text-white transition-colors">{exam.name}</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/admin-dashboard/academic/papers/${paper.id}`} className="hover:text-slate-900 dark:hover:text-white transition-colors">{paper.paperNumber}</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/admin-dashboard/academic/subjects/${subject.id}`} className="hover:text-slate-900 dark:hover:text-white transition-colors">{subject.name}</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 dark:text-white font-[700]">Chapter {chapter.chapterNumber}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/admin-dashboard/academic/subjects/${subject.id}`)} className="-ml-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-2xl font-[800] text-slate-900 dark:text-white">Manage Topics</h2>
          </div>
          <p className="text-slate-500 text-sm mt-1 ml-11">Configure topics for Chapter {chapter.chapterNumber}: {chapter.name}</p>
        </div>
        <Button className="bg-[#163E6B] hover:bg-[#163E6B]/90 text-white font-[700] gap-2 dark:bg-white dark:text-[#0A1118] dark:hover:bg-slate-200">
          <Plus className="w-4 h-4"/> Add Topic
        </Button>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-[#0B1521] p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search topics by name or code..." 
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
                <th className="px-6 py-4 font-[700]">Topic Name</th>
                <th className="px-6 py-4 font-[700]">Code</th>
                <th className="px-6 py-4 font-[700]">Difficulty</th>
                <th className="px-6 py-4 font-[700]">Status</th>
                <th className="px-6 py-4 font-[700] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredTopics.map((topic) => (
                <tr key={topic.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <ArrowUpDown className="w-4 h-4 text-slate-300 cursor-grab hover:text-slate-500" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-[700] text-slate-900 dark:text-white text-base">{topic.name}</div>
                    <div className="text-slate-500 text-xs mt-1 truncate max-w-sm">{topic.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 font-[600] text-slate-600 dark:text-slate-300">
                      <Hash className="w-3 h-3 text-slate-400" /> {topic.topicCode}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={`${
                      topic.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' :
                      topic.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400' :
                      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400'
                    }`}>
                      {topic.difficulty}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={`${
                      topic.status === 'Published' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400' :
                      topic.status === 'Draft' ? 'bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-white/10 dark:text-slate-300' :
                      'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400'
                    } border-none font-[700]`}>
                      {topic.status}
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
                        <DropdownMenuItem>
                          <Edit2 className="w-4 h-4 mr-2" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={() => alert("This topic is currently used by 12 questions. Archiving it will hide it from new content creation but preserve existing references.")}>
                          <Archive className="w-4 h-4 mr-2" /> Archive Topic
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filteredTopics.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No topics found matching your search.
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
