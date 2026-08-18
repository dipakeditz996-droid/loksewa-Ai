"use client";

import React from "react";
import { Bot, MessageSquare, Clock, Users, Flame, Star } from "lucide-react";
import { 
  mockAITutorMetrics, 
  mockPopularAITopics,
  mockPlatformActivityChart
} from "@/lib/mock/admin-analytics";
import { TrendCard, AreaChart, BarChart } from "@/components/analytics/ChartComponents";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function AITutorAnalyticsPage() {
  return (
    <div className="space-y-6">
      
      {/* AI Tutor Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TrendCard 
          title="Total Conversations" 
          value={mockAITutorMetrics.totalConversations.toLocaleString()} 
          trend={35} 
          icon={<MessageSquare className="w-5 h-5 text-blue-500" />} 
        />
        <TrendCard 
          title="Active Users" 
          value={mockAITutorMetrics.activeStudents.toLocaleString()} 
          trend={22} 
          icon={<Users className="w-5 h-5 text-emerald-500" />} 
        />
        <TrendCard 
          title="Questions Asked" 
          value={mockAITutorMetrics.questionsAsked.toLocaleString()} 
          trend={45} 
          icon={<Bot className="w-5 h-5 text-indigo-500" />} 
        />
        <TrendCard 
          title="Avg Response Time" 
          value={mockAITutorMetrics.avgResponseTime} 
          trend={-5} 
          icon={<Clock className="w-5 h-5 text-amber-500" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Usage Over Time */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[350px]">
          <h3 className="font-bold text-[#0B2545] mb-6 flex items-center gap-2">
            <Bot className="w-5 h-5 text-slate-400" />
            AI Tutor Usage (Last 7 Days)
          </h3>
          <div className="flex-1">
            <AreaChart 
              data={mockPlatformActivityChart} 
              dataKeys={["ai"]} 
              colors={["#8b5cf6"]}
            />
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[350px]">
          <h3 className="font-bold text-[#0B2545] mb-6 flex items-center gap-2">
            <Star className="w-5 h-5 text-slate-400" />
            AI Response Quality (Feedback)
          </h3>
          <div className="flex-1">
            <BarChart 
              data={[
                { name: "Mon", Helpful: 450, NotHelpful: 12 },
                { name: "Tue", Helpful: 520, NotHelpful: 18 },
                { name: "Wed", Helpful: 480, NotHelpful: 9 },
                { name: "Thu", Helpful: 610, NotHelpful: 25 },
                { name: "Fri", Helpful: 720, NotHelpful: 15 },
              ]} 
              dataKeys={["Helpful", "NotHelpful"]} 
              colors={["#10b981", "#ef4444"]}
              stacked={true}
            />
          </div>
        </div>
      </div>

      {/* Popular AI Topics Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-[#0B2545]">Most Queried Topics</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-white hover:bg-white">
                <TableHead>Topic</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="text-center">Questions Asked</TableHead>
                <TableHead className="text-center">Unique Students</TableHead>
                <TableHead className="text-center">Trend</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockPopularAITopics.map((topic, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-semibold text-[#0B2545] flex items-center gap-2">
                    {idx < 2 && <Flame className="w-4 h-4 text-orange-500" />}
                    {topic.topic}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">{topic.subject}</span>
                  </TableCell>
                  <TableCell className="text-center font-medium text-slate-700">{topic.questions.toLocaleString()}</TableCell>
                  <TableCell className="text-center font-medium text-slate-700">{topic.students.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                      {topic.trend}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-[#0B2545] hover:bg-slate-100">
                      View Logs
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
