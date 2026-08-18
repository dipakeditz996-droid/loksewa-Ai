"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  ArrowLeft, FileText, LayoutList, Users, BarChart3, Settings,
  Eye, Edit2, Archive, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockExams, ExamMetadata } from "@/lib/mock/admin-exams";

export default function ExamDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const examId = params.id as string;
  
  const [exam, setExam] = useState<ExamMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      const found = mockExams.find(e => e.id === examId);
      setExam(found || null);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [examId]);

  const TABS = [
    { name: "Overview", href: `/admin-dashboard/exams/${examId}`, icon: FileText, exact: true },
    { name: "Questions", href: `/admin-dashboard/exams/${examId}/questions`, icon: LayoutList },
    { name: "Results", href: `/admin-dashboard/exams/${examId}/results`, icon: Users },
    { name: "Analytics", href: `/admin-dashboard/exams/${examId}/analytics`, icon: BarChart3 },
    { name: "Settings", href: `/admin-dashboard/exams/${examId}/settings`, icon: Settings },
  ];

  if (loading) {
    return <div className="p-8 h-48 bg-slate-100 rounded-xl animate-pulse mx-8 mt-6"></div>;
  }

  if (!exam) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <FileText className="w-12 h-12 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-700">Exam Not Found</h2>
        <Link href="/admin-dashboard/exams">
          <Button variant="outline">Return to Exams</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      
      {/* Detail Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/admin-dashboard/exams" className="mt-1">
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-[#0B2545] hover:bg-slate-200">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#0B2545]">{exam.title}</h1>
              {exam.status === "Published" && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">Published</Badge>}
              {exam.status === "Draft" && <Badge className="bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100">Draft</Badge>}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500">
              <span className="flex items-center gap-1"><Target className="w-4 h-4" /> {exam.category}</span>
              <span>•</span>
              <span>{exam.type}</span>
              <span>•</span>
              <span className="font-mono text-xs text-slate-400">{exam.id}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">
            <Eye className="w-4 h-4 mr-2" /> Preview
          </Button>
          <Button variant="outline" className="text-slate-600 bg-white">
            <Edit2 className="w-4 h-4 mr-2" /> Edit Details
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex overflow-x-auto">
          {TABS.map(tab => {
            const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-colors whitespace-nowrap border-b-2",
                  isActive 
                    ? "border-blue-600 text-blue-600 bg-blue-50/50" 
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                )}
              >
                <tab.icon className={cn("w-4 h-4", isActive ? "text-blue-600" : "text-slate-400")} />
                {tab.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {children}
      </div>

    </div>
  );
}
