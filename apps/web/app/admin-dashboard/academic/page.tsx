"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BookOpen, Layers, LibraryBig, CheckSquare, FileText, Plus,
  MoreVertical, Edit2, Copy, Archive, Search, ChevronRight, ChevronDown,
  ArrowUpDown, ListTree, Table2, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { adminAcademicApi, ApiExam, ApiPaper, ApiSubject, ApiChapter, ApiTopic } from "@/lib/api/admin-academic-api";

export default function AcademicOverviewPage() {
  const [viewMode, setViewMode] = useState<"table" | "tree">("table");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Real data state
  const [exams, setExams] = useState<ApiExam[]>([]);
  const [papers, setPapers] = useState<ApiPaper[]>([]);
  const [subjects, setSubjects] = useState<ApiSubject[]>([]);
  const [statsData, setStatsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, examsRes, papersRes, subjectsRes] = await Promise.all([
          adminAcademicApi.getStats(),
          adminAcademicApi.getExams(),
          adminAcademicApi.getPapers(),
          adminAcademicApi.getSubjects()
        ]);
        setStatsData(statsRes);
        setExams(examsRes);
        setPapers(papersRes);
        setSubjects(subjectsRes);
      } catch (error) {
        console.error("Failed to fetch academic data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = [
    {
      title: "Total Exams",
      value: statsData?.exams || 0,
      icon: CheckSquare,
      color: "text-blue-700",
      bg: "bg-blue-100",
    },
    {
      title: "Total Papers",
      value: statsData?.papers || 0,
      icon: FileText,
      color: "text-indigo-700",
      bg: "bg-indigo-100",
    },
    {
      title: "Total Subjects",
      value: statsData?.subjects || 0,
      icon: BookOpen,
      color: "text-purple-700",
      bg: "bg-purple-100",
    },
    {
      title: "Total Chapters",
      value: statsData?.chapters || 0,
      icon: LibraryBig,
      color: "text-amber-700",
      bg: "bg-amber-100",
    },
    {
      title: "Total Topics",
      value: statsData?.topics || 0,
      icon: Layers,
      color: "text-emerald-700",
      bg: "bg-emerald-100",
    }
  ];

  const filteredExams = exams.filter(exam => 
    exam.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => a.order - b.order);

  // Simple Tree Node Component
  const TreeNode = ({ exam }: { exam: ApiExam }) => {
    const [isOpen, setIsOpen] = useState(false);
    const examPapers = papers.filter(p => p.exam === exam.id);

    return (
      <div className="border border-slate-200  rounded-lg mb-2 overflow-hidden bg-white ">
        <div 
          className="flex items-center p-3 cursor-pointer hover:bg-slate-50 :bg-white/5 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <ChevronDown className="w-5 h-5 text-slate-500 mr-2 shrink-0" /> : <ChevronRight className="w-5 h-5 text-slate-500 mr-2 shrink-0" />}
          <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center mr-3 text-white font-bold text-xs bg-blue-600`}>
            {exam.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h4 className="font-[700] text-slate-900 ">{exam.name}</h4>
            <p className="text-xs text-slate-500">{exam.category_name}</p>
          </div>
          <Badge className="bg-[#163E6B] text-white hover:bg-[#163E6B]">Exam</Badge>
        </div>
        
        {isOpen && (
          <div className="pl-14 pr-4 pb-4 space-y-2 border-t border-slate-100  pt-3">
            {examPapers.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No papers added yet.</p>
            ) : (
              examPapers.map(paper => (
                <div key={paper.id} className="border border-slate-100  rounded p-3 bg-slate-50 ">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-[600] text-sm text-slate-900 ">{paper.paper_number}: {paper.name}</p>
                      <p className="text-xs text-slate-500">{subjects.filter(s => s.paper === paper.id).length} Subjects</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin-dashboard/academic/papers/${paper.id}`}>Manage</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
            <Button variant="outline" size="sm" className="w-full mt-2 border-dashed" asChild>
              <Link href={`/admin-dashboard/academic/exams/${exam.id}`}>
                <Plus className="w-4 h-4 mr-2" /> Add Paper
              </Link>
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading academic structure...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-[800] text-slate-900 ">Academic Content</h2>
          <p className="text-slate-500 text-sm mt-1">Centralized management for exams, papers, subjects, and topics.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="gap-2 border-slate-200  ">
            <Upload className="w-4 h-4"/> Import Syllabus
          </Button>
          <Button className="bg-[#D4A72C] hover:bg-[#b08b25] text-[#0A1118] font-[700] gap-2">
            <Plus className="w-4 h-4"/> Add Exam
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="border-slate-200   shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.bg} ${stat.color} shrink-0`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-2xl font-[800] text-slate-900  leading-none mb-1">{stat.value}</h3>
                <p className="text-xs font-[600] text-slate-500 uppercase tracking-wider">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white  p-4 rounded-xl border border-slate-200  shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search exams, subjects, topics..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-50  border-slate-200 "
          />
        </div>
        <div className="flex items-center gap-2 bg-slate-100  p-1 rounded-lg border border-slate-200 ">
          <Button 
            variant={viewMode === "table" ? "default" : "ghost"} 
            size="sm"
            onClick={() => setViewMode("table")}
            className={viewMode === "table" ? "bg-white text-slate-900   shadow-sm" : "text-slate-500"}
          >
            <Table2 className="w-4 h-4 mr-2" /> Table View
          </Button>
          <Button 
            variant={viewMode === "tree" ? "default" : "ghost"} 
            size="sm"
            onClick={() => setViewMode("tree")}
            className={viewMode === "tree" ? "bg-white text-slate-900   shadow-sm" : "text-slate-500"}
          >
            <ListTree className="w-4 h-4 mr-2" /> Tree View
          </Button>
        </div>
      </div>

      {/* Content Area */}
      {viewMode === "table" ? (
        <Card className="border-slate-200   shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50  uppercase border-b border-slate-200 ">
                <tr>
                  <th className="px-6 py-4 font-[700] w-10"></th>
                  <th className="px-6 py-4 font-[700]">Exam Name</th>
                  <th className="px-6 py-4 font-[700]">Level</th>
                  <th className="px-6 py-4 font-[700] text-center">Structure</th>
                  <th className="px-6 py-4 font-[700]">Visibility</th>
                  <th className="px-6 py-4 font-[700]">Status</th>
                  <th className="px-6 py-4 font-[700] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 ">
                {filteredExams.map((exam) => {
                  const paperCount = papers.filter(p => p.exam === exam.id).length;
                  return (
                    <tr key={exam.id} className="hover:bg-slate-50 :bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <ArrowUpDown className="w-4 h-4 text-slate-300 cursor-grab hover:text-slate-500" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-[800] text-xs bg-blue-600`}>
                            {exam.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-[700] text-slate-900  text-base">{exam.name}</div>
                            <div className="text-slate-500 text-xs">{exam.category_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600  font-[500]">
                        {exam.category_name}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Badge variant="outline" className="bg-slate-50  border-slate-200 ">
                            {paperCount} Papers
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-blue-600  font-[600]">Visible</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={`${
                          exam.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100  ' :
                          'bg-red-100 text-red-700 hover:bg-red-100  '
                        } border-none font-[700]`}>
                          {exam.is_active ? 'Active' : 'Inactive'}
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
                              <Link href={`/admin-dashboard/academic/exams/${exam.id}`} className="cursor-pointer">
                                <Layers className="w-4 h-4 mr-2" /> Manage Papers
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit2 className="w-4 h-4 mr-2" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="w-4 h-4 mr-2" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 ">
                              <Archive className="w-4 h-4 mr-2" /> Archive Exam
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
                {filteredExams.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      No exams found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="bg-transparent">
          <div className="max-w-4xl">
            {filteredExams.map(exam => (
              <TreeNode key={exam.id} exam={exam} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

