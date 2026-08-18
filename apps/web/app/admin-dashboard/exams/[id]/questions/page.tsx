"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  HelpCircle, MoreHorizontal, PlusCircle, Trash2, GripVertical, Search, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockExamQuestions, mockExams, ExamQuestionRef, ExamMetadata } from "@/lib/mock/admin-exams";

export default function ExamQuestionsTab() {
  const params = useParams();
  const examId = params.id as string;
  const [questions, setQuestions] = useState<ExamQuestionRef[]>([]);
  const [exam, setExam] = useState<ExamMetadata | null>(null);

  useEffect(() => {
    const q = mockExamQuestions.filter(q => q.examId === examId).sort((a, b) => a.order - b.order);
    setQuestions(q);
    const e = mockExams.find(e => e.id === examId);
    setExam(e || null);
  }, [examId]);

  if (!exam) return null;

  return (
    <div className="space-y-6">
      
      {/* Top Actions & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex gap-6">
          <div>
            <p className="text-sm font-semibold text-slate-500">Total Questions</p>
            <p className="text-xl font-bold text-[#0B2545]">{questions.length}</p>
          </div>
          <div className="w-px h-10 bg-slate-200"></div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Total Marks</p>
            <p className="text-xl font-bold text-[#0B2545]">{questions.reduce((sum, q) => sum + q.marks, 0)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search questions..." className="pl-9 h-10" />
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 text-slate-500"><Filter className="w-4 h-4" /></Button>
          <Button className="bg-[#0B2545] hover:bg-[#163E6C] text-white whitespace-nowrap">
            <PlusCircle className="w-4 h-4 mr-2" /> Add Questions
          </Button>
        </div>
      </div>

      {/* Difficulty Distribution */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-[#0B2545] mb-3 text-sm">Difficulty Distribution</h3>
        <div className="w-full h-3 flex rounded-full overflow-hidden">
          <div className="bg-emerald-400 h-full w-1/3" title="Easy (33%)"></div>
          <div className="bg-amber-400 h-full w-1/2" title="Medium (50%)"></div>
          <div className="bg-red-400 h-full flex-1" title="Hard (17%)"></div>
        </div>
        <div className="flex gap-4 mt-2 text-xs text-slate-500">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> Easy</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"></div> Medium</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div> Hard</div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {questions.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm">
            <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-bold text-lg text-slate-700">No Questions Added</h3>
            <p className="text-slate-500 mt-2">Click "Add Questions" to pull questions from the Master Question Bank.</p>
          </div>
        ) : (
          questions.map((q, index) => (
            <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4 group hover:shadow-sm transition-all hover:border-blue-300">
              <div className="cursor-grab mt-2 text-slate-300 group-hover:text-slate-500">
                <GripVertical className="w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mr-2">Q{index + 1}</span>
                    <span className="text-sm font-semibold text-slate-800">{q.questionText}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <Input type="number" defaultValue={q.marks} className="w-16 h-8 text-sm text-center px-1" />
                      <span className="text-xs text-slate-500">Marks</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-normal">{q.type}</Badge>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500">{q.subject}</span>
                  {q.topic && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-500">{q.topic}</span>
                    </>
                  )}
                  <span className="text-slate-300">•</span>
                  {q.difficulty === "Easy" && <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">Easy</Badge>}
                  {q.difficulty === "Medium" && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200">Medium</Badge>}
                  {q.difficulty === "Hard" && <Badge variant="outline" className="text-[10px] text-red-600 border-red-200">Hard</Badge>}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 shrink-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View in Question Bank</DropdownMenuItem>
                  <DropdownMenuItem>Replace Question</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600"><Trash2 className="w-4 h-4 mr-2"/> Remove from Exam</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
