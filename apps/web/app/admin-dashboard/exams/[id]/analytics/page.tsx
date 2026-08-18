"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  BarChart3, TrendingUp, AlertTriangle, Users, Clock, Target, ArrowUpRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockStudentAttempts, mockExams, mockExamQuestions, ExamMetadata, StudentAttempt } from "@/lib/mock/admin-exams";

export default function ExamAnalyticsTab() {
  const params = useParams();
  const examId = params.id as string;
  
  const [exam, setExam] = useState<ExamMetadata | null>(null);
  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);

  useEffect(() => {
    setExam(mockExams.find(e => e.id === examId) || null);
    setAttempts(mockStudentAttempts.filter(a => a.examId === examId));
  }, [examId]);

  if (!exam) return null;

  return (
    <div className="space-y-6">
      
      {/* High Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1">Average Score</p>
            <div className="flex items-end gap-2">
              <h3 className="text-3xl font-bold text-[#0B2545]">{exam.averageScore}%</h3>
              <span className="text-xs font-medium text-emerald-500 mb-1 flex items-center"><ArrowUpRight className="w-3 h-3" /> +2.4%</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <Target className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1">Completion Rate</p>
            <div className="flex items-end gap-2">
              <h3 className="text-3xl font-bold text-[#0B2545]">92%</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">Started vs Submitted</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1">Avg Time Taken</p>
            <div className="flex items-end gap-2">
              <h3 className="text-3xl font-bold text-[#0B2545]">42m 15s</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">Out of {exam.durationMinutes}m allotted</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Mock Chart Area */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <h3 className="font-bold text-[#0B2545] mb-6 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-500" /> Score Distribution</h3>
          <div className="flex-1 flex items-end justify-between gap-2 h-48 border-b border-slate-100 pb-2">
            {[10, 25, 45, 80, 120, 150, 90, 40, 15, 5].map((h, i) => (
              <div key={i} className="w-full bg-blue-100 hover:bg-blue-300 rounded-t-md transition-colors relative group" style={{ height: `${(h/150)*100}%` }}>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {h}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>0-10%</span>
            <span>50%</span>
            <span>90-100%</span>
          </div>
        </div>

        {/* Anomaly Detection UI */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-[#0B2545] flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> Anomaly Indicators</h3>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">2 Reviews Suggested</Badge>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-slate-500">The system flags unusual attempt patterns. Review these manually before publishing results.</p>
            
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 flex justify-between items-start">
              <div>
                <p className="font-bold text-amber-900 text-sm">Unusually Fast Completion</p>
                <p className="text-xs text-amber-700 mt-1">Student <b>STU-089</b> completed the 60m exam in 4m 12s with a score of 98%.</p>
              </div>
              <Button size="sm" variant="outline" className="text-amber-800 border-amber-300 bg-white">Review Attempt</Button>
            </div>

            <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 flex justify-between items-start">
              <div>
                <p className="font-bold text-amber-900 text-sm">Multiple Concurrent Sessions</p>
                <p className="text-xs text-amber-700 mt-1">Student <b>STU-142</b> had active sessions from 3 different IPs during the exam window.</p>
              </div>
              <Button size="sm" variant="outline" className="text-amber-800 border-amber-300 bg-white">Review Logs</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Question Performance */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-[#0B2545]">Question Performance</h3>
          <p className="text-xs text-slate-500 mt-0.5">Identify the most difficult and most successful questions.</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div>
            <h4 className="font-bold text-red-600 mb-4 text-sm uppercase tracking-wider">Most Difficult Questions</h4>
            <div className="space-y-4">
              <div className="border border-slate-200 p-3 rounded-lg flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-xs font-bold text-slate-400 mb-1">Q23 • Geography</p>
                  <p className="text-sm font-medium text-slate-800 line-clamp-1">What is the exact height of Mt. Machhapuchhre?</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-500">12%</p>
                  <p className="text-[10px] text-slate-500 uppercase">Correct</p>
                </div>
              </div>
              <div className="border border-slate-200 p-3 rounded-lg flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-xs font-bold text-slate-400 mb-1">Q45 • Constitution</p>
                  <p className="text-sm font-medium text-slate-800 line-clamp-1">Which article deals with the right to food?</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-500">18%</p>
                  <p className="text-[10px] text-slate-500 uppercase">Correct</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-emerald-600 mb-4 text-sm uppercase tracking-wider">Most Successful Questions</h4>
            <div className="space-y-4">
              <div className="border border-slate-200 p-3 rounded-lg flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-xs font-bold text-slate-400 mb-1">Q1 • General Knowledge</p>
                  <p className="text-sm font-medium text-slate-800 line-clamp-1">What is the capital of Nepal?</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-500">98%</p>
                  <p className="text-[10px] text-slate-500 uppercase">Correct</p>
                </div>
              </div>
              <div className="border border-slate-200 p-3 rounded-lg flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-xs font-bold text-slate-400 mb-1">Q12 • Geography</p>
                  <p className="text-sm font-medium text-slate-800 line-clamp-1">Which is the deepest lake in Nepal?</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-500">85%</p>
                  <p className="text-[10px] text-slate-500 uppercase">Correct</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
