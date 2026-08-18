"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Users, Search, Filter, DownloadCloud, Eye, PenTool, CheckCircle2, 
  XCircle, Clock, AlertTriangle, ChevronRight, Calculator
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { mockStudentAttempts, mockExams, StudentAttempt, ExamMetadata } from "@/lib/mock/admin-exams";

export default function ExamResultsTab() {
  const params = useParams();
  const examId = params.id as string;
  
  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
  const [exam, setExam] = useState<ExamMetadata | null>(null);
  
  // Evaluation Modal mock state
  const [evaluatingAttempt, setEvaluatingAttempt] = useState<StudentAttempt | null>(null);

  useEffect(() => {
    const a = mockStudentAttempts.filter(att => att.examId === examId);
    setAttempts(a);
    const e = mockExams.find(e => e.id === examId);
    setExam(e || null);
  }, [examId]);

  if (!exam) return null;

  const requiresSubjectiveEvaluation = exam.type === "Model Set" || exam.tags.includes("subjective");

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 mb-1">Total Attempts</p>
          <h3 className="text-2xl font-bold text-[#0B2545]">{attempts.length}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 mb-1">Avg Score</p>
          <h3 className="text-2xl font-bold text-blue-600">{exam.averageScore}%</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 mb-1">Pass Rate</p>
          <h3 className="text-2xl font-bold text-emerald-600">{exam.passRate}%</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 mb-1">Pending Evaluation</p>
          <h3 className="text-2xl font-bold text-amber-600">
            {requiresSubjectiveEvaluation ? attempts.filter(a => a.score === 0).length : 0}
          </h3>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search students..." className="pl-9 h-10" />
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 text-slate-500"><Filter className="w-4 h-4" /></Button>
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <Button variant="outline" className="text-slate-600">
            <DownloadCloud className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button className="bg-[#0B2545] hover:bg-[#163E6C] text-white">
            Publish All Results
          </Button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Time Taken</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    No attempts recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                attempts.map((attempt) => (
                  <TableRow key={attempt.id} className="hover:bg-slate-50">
                    <TableCell className="align-top">
                      <div className="font-bold text-[#0B2545]">{attempt.studentName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Attempt {attempt.attemptNumber} • {new Date(attempt.submittedAt).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1">{attempt.studentId}</div>
                    </TableCell>
                    
                    <TableCell className="align-top">
                      {requiresSubjectiveEvaluation && attempt.score === 0 ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Needs Marking</Badge>
                      ) : (
                        <div>
                          <div className="font-bold text-lg text-[#0B2545]">{attempt.score} <span className="text-xs text-slate-500 font-normal">/ {exam.totalMarks}</span></div>
                          <div className="text-sm font-semibold text-blue-600">{attempt.percentage}%</div>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="align-top">
                      <div className="flex gap-3 text-xs">
                        <div className="flex flex-col items-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mb-1" />
                          <span className="font-semibold">{attempt.correct}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <XCircle className="w-4 h-4 text-red-500 mb-1" />
                          <span className="font-semibold">{attempt.incorrect}</span>
                        </div>
                        <div className="flex flex-col items-center opacity-50">
                          <div className="w-4 h-4 rounded-full border-2 border-slate-400 mb-1"></div>
                          <span className="font-semibold">{attempt.unattempted}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="align-top">
                      <div className="flex items-center gap-1 text-sm text-slate-700">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {Math.floor(attempt.timeTakenSeconds / 60)}m {attempt.timeTakenSeconds % 60}s
                      </div>
                      {exam.durationMinutes && (
                        <div className="text-xs text-slate-500 mt-1">of {exam.durationMinutes}m</div>
                      )}
                    </TableCell>

                    <TableCell className="align-top">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{attempt.status}</Badge>
                      {attempt.timeTakenSeconds < (exam.durationMinutes ? exam.durationMinutes * 60 * 0.2 : 0) && (
                        <div className="text-[10px] text-amber-600 mt-1 flex items-center gap-1" title="Completed unusually fast">
                          <AlertTriangle className="w-3 h-3" /> Anomaly
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="align-top text-right">
                      {requiresSubjectiveEvaluation && attempt.score === 0 ? (
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setEvaluatingAttempt(attempt)}>
                          <PenTool className="w-4 h-4 mr-2" /> Evaluate
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 h-8">
                          View Answers <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mock Subjective Evaluation Panel (conditionally rendered for demo) */}
      {evaluatingAttempt && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-[#0B2545] flex items-center gap-2"><PenTool className="w-5 h-5 text-blue-600" /> Subjective Evaluation</h3>
                <p className="text-xs text-slate-500 mt-1">Evaluating {evaluatingAttempt.studentName} • {exam.title}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEvaluatingAttempt(null)}>
                <XCircle className="w-5 h-5 text-slate-400 hover:text-red-500" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-800">Q1. Critically analyze the role of public management in developing countries.</h4>
                  <Badge className="bg-blue-100 text-blue-800">Max Marks: 10</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-500">Student Answer</p>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 min-h-[200px] whitespace-pre-wrap">
                      Public management plays a crucial role in developing countries by ensuring that limited resources are utilized efficiently. It involves the implementation of government policies and the delivery of public services... [Mock Student Text]
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-500">Reference / Model Answer</p>
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 min-h-[200px] whitespace-pre-wrap">
                      Key points to look for:
                      1. Resource optimization in resource-scarce environments.
                      2. Capacity building and institutional strengthening.
                      3. Transparency and reduction of corruption.
                      4. Service delivery improvements.
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between mt-4">
                  <div className="flex items-center gap-4">
                    <Label className="font-bold text-blue-900 text-base">Marks Awarded:</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" max="10" min="0" defaultValue="7.5" className="w-24 text-lg font-bold text-center" />
                      <span className="text-slate-500">/ 10</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-blue-600 bg-white">
                    <Calculator className="w-4 h-4 mr-2" /> Auto-grade with AI
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Evaluator Note / Feedback (Visible to student)</Label>
                  <textarea className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Provide constructive feedback..." defaultValue="Good understanding of the core concepts, but missed the point on transparency."></textarea>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
              <p className="text-sm text-slate-500 font-medium">Question 1 of 1</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEvaluatingAttempt(null)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setEvaluatingAttempt(null)}>
                  Save & Complete Evaluation
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
