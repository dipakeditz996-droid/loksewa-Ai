"use client";

import React from "react";
import { HelpCircle, Check, X, Target, BookOpen } from "lucide-react";
import { 
  mockQuestionMetrics, 
  mockDifficultyAccuracy,
  mockDifficultQuestions,
  mockPlatformActivityChart
} from "@/lib/mock/admin-analytics";
import { TrendCard, ProgressChart, AreaChart } from "@/components/analytics/ChartComponents";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function QuestionAnalyticsPage() {
  return (
    <div className="space-y-6">
      
      {/* Question Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <TrendCard 
          title="Total Questions" 
          value={mockQuestionMetrics.totalQuestions.toLocaleString()} 
          icon={<HelpCircle className="w-5 h-5 text-blue-500" />} 
        />
        <TrendCard 
          title="Questions Attempted" 
          value={mockQuestionMetrics.questionsAttempted.toLocaleString()} 
          trend={18} 
          icon={<BookOpen className="w-5 h-5 text-indigo-500" />} 
        />
        <TrendCard 
          title="Correct Answers" 
          value={mockQuestionMetrics.correctAnswers.toLocaleString()} 
          trend={8} 
          icon={<Check className="w-5 h-5 text-emerald-500" />} 
        />
        <TrendCard 
          title="Incorrect Answers" 
          value={mockQuestionMetrics.incorrectAnswers.toLocaleString()} 
          trend={-5} 
          icon={<X className="w-5 h-5 text-red-500" />} 
        />
        <TrendCard 
          title="Average Accuracy" 
          value={mockQuestionMetrics.averageAccuracy} 
          trend={2} 
          icon={<Target className="w-5 h-5 text-amber-500" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Questions Solved Over Time */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[350px] lg:col-span-2">
          <h3 className="font-bold text-[#0B2545] mb-6 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-slate-400" />
            Questions Solved Over Time
          </h3>
          <div className="flex-1">
            <AreaChart 
              data={mockPlatformActivityChart} 
              dataKeys={["questions"]} 
              colors={["#D4A72C"]}
            />
          </div>
        </div>

        {/* Difficulty Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[350px]">
          <h3 className="font-bold text-[#0B2545] mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-slate-400" />
            Difficulty Accuracy
          </h3>
          <div className="flex-1 flex flex-col justify-center">
            <ProgressChart 
              data={[
                { name: "Easy", value: mockDifficultyAccuracy[0]!.accuracy, color: "#10b981" },
                { name: "Medium", value: mockDifficultyAccuracy[1]!.accuracy, color: "#f59e0b" },
                { name: "Hard", value: mockDifficultyAccuracy[2]!.accuracy, color: "#ef4444" },
              ]}
            />
            <div className="mt-8 p-4 bg-slate-50 border border-slate-100 rounded-lg">
              <p className="text-sm text-slate-600 leading-relaxed">
                Students are performing well on <strong>Easy</strong> questions but struggle significantly with <strong>Hard</strong> questions. Consider recommending more targeted practice for difficult topics.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Most Difficult Questions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-[#0B2545]">Most Difficult Questions</h3>
            <p className="text-xs text-slate-500 mt-0.5">Questions with the lowest accuracy rates across all attempts.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-white hover:bg-white">
                <TableHead className="w-24">ID</TableHead>
                <TableHead>Question Preview</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="text-center">Total Attempts</TableHead>
                <TableHead className="text-center">Accuracy</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockDifficultQuestions.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-mono text-xs font-semibold text-slate-500">{q.id}</TableCell>
                  <TableCell>
                    <span className="font-medium text-[#0B2545] line-clamp-1">{q.text}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">{q.subject}</span>
                  </TableCell>
                  <TableCell className="text-center font-medium text-slate-700">{q.attempts.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">
                      {q.accuracy}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="bg-white text-slate-600">
                      Review Content
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
