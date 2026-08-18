"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  FileText, HelpCircle, Clock, Target, Calendar, BarChart3, Lock, Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { mockExams, ExamMetadata } from "@/lib/mock/admin-exams";

export default function ExamOverviewTab() {
  const params = useParams();
  const examId = params.id as string;
  const [exam, setExam] = useState<ExamMetadata | null>(null);

  useEffect(() => {
    const found = mockExams.find(e => e.id === examId);
    setExam(found || null);
  }, [examId]);

  if (!exam) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Configuration Summary Card */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h2 className="font-bold text-[#0B2545]">Exam Configuration Summary</h2>
          </div>
          
          <div className="p-6 grid grid-cols-2 gap-6">
            <div className="space-y-1 text-sm">
              <p className="text-slate-500 font-medium">Difficulty Level</p>
              <Badge variant="outline" className="bg-slate-50">{exam.difficulty}</Badge>
            </div>
            
            <div className="space-y-1 text-sm">
              <p className="text-slate-500 font-medium">Access Control</p>
              {exam.access === "Premium" ? (
                <div className="flex items-center gap-1 text-amber-700 font-medium"><Lock className="w-4 h-4" /> Premium Content</div>
              ) : (
                <div className="flex items-center gap-1 text-emerald-700 font-medium"><Lock className="w-4 h-4" /> Free Content</div>
              )}
            </div>

            <div className="space-y-1 text-sm">
              <p className="text-slate-500 font-medium">Exam Duration</p>
              <div className="flex items-center gap-1 font-medium text-slate-800">
                <Clock className="w-4 h-4 text-slate-400" /> {exam.durationMinutes ? `${exam.durationMinutes} Minutes` : "Unlimited"}
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <p className="text-slate-500 font-medium">Total Questions & Marks</p>
              <div className="flex items-center gap-1 font-medium text-slate-800">
                <HelpCircle className="w-4 h-4 text-slate-400" /> {exam.questionCount} Qs ({exam.totalMarks} Marks)
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <p className="text-slate-500 font-medium">Negative Marking</p>
              <div className="font-medium text-slate-800">
                {exam.negativeMarking > 0 ? `${exam.negativeMarking}% Deduction` : "None"}
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <p className="text-slate-500 font-medium">Maximum Attempts</p>
              <div className="flex items-center gap-1 font-medium text-slate-800">
                <Target className="w-4 h-4 text-slate-400" /> {exam.maxAttempts ? `${exam.maxAttempts} Attempts` : "Unlimited"}
              </div>
            </div>
          </div>

          <div className="p-6 pt-0">
            <p className="text-sm text-slate-500 font-medium mb-2">Description</p>
            <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-700 border border-slate-100">
              {exam.description || "No description provided."}
            </div>
          </div>
        </div>

        {/* Schedule Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-[#0B2545] flex items-center gap-2"><Calendar className="w-4 h-4" /> Schedule Window</h2>
          </div>
          <div className="p-6">
            {exam.scheduleStart ? (
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Opens</p>
                  <p className="font-medium text-[#0B2545]">{new Date(exam.scheduleStart).toLocaleString()}</p>
                </div>
                <div className="hidden md:block w-px h-8 bg-slate-200"></div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Closes</p>
                  <p className="font-medium text-[#0B2545]">{exam.scheduleEnd ? new Date(exam.scheduleEnd).toLocaleString() : "Never (Manual Close)"}</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm italic">This exam does not have a strict time window and is available indefinitely while published.</p>
            )}
          </div>
        </div>
      </div>

      {/* Right Column (Performance Snapshot) */}
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-[#0B2545] to-[#163E6C] rounded-xl shadow-sm p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><BarChart3 className="w-24 h-24" /></div>
          <h3 className="font-bold text-lg mb-6 relative z-10">Performance Snapshot</h3>
          
          <div className="space-y-6 relative z-10">
            <div>
              <p className="text-blue-200 text-xs uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Total Attempts</p>
              <p className="text-3xl font-bold">{exam.totalAttempts.toLocaleString()}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-blue-200 text-xs uppercase font-bold tracking-wider mb-1">Avg Score</p>
                <p className="text-xl font-bold">{exam.averageScore}%</p>
              </div>
              <div>
                <p className="text-blue-200 text-xs uppercase font-bold tracking-wider mb-1">Pass Rate</p>
                <p className="text-xl font-bold">{exam.passRate}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-[#0B2545] mb-4">Exam Tags</h3>
          <div className="flex flex-wrap gap-2">
            {exam.tags.length > 0 ? (
              exam.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="bg-slate-100 text-slate-700">#{tag}</Badge>
              ))
            ) : (
              <span className="text-sm text-slate-400 italic">No tags added.</span>
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
}
