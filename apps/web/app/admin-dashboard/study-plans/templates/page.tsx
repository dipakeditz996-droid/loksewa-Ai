"use client";

import React, { useState } from "react";
import { 
  LayoutTemplate, Search, Plus, Filter, MoreHorizontal,
  Edit, Copy, Eye, Archive, Trash2, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockStudyPlanTemplates } from "@/lib/mock/admin-study-plans";
import { mockExamCategories, mockPositions } from "@/lib/mock/admin-academic";

export default function StudyPlanTemplatesPage() {
  const [search, setSearch] = useState("");

  const filteredTemplates = mockStudyPlanTemplates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B2545]">Plan Templates</h2>
          <p className="text-sm text-slate-500">Reusable study plan structures.</p>
        </div>
        <Button className="w-full sm:w-auto bg-[#D4A72C] hover:bg-[#b08b25] text-[#0B2545] font-semibold gap-2">
          <Plus className="w-4 h-4" />
          Create Template
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <Button variant="outline" className="w-full sm:w-auto gap-2 bg-white">
            <Filter className="w-4 h-4" /> Filter
          </Button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50/30">
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <LayoutTemplate className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-700">No templates found</h3>
              <p className="text-slate-500 text-sm mt-1">Try a different search or create a new template.</p>
            </div>
          ) : (
            filteredTemplates.map(template => {
              const category = mockExamCategories.find(c => c.id === template.targetExam);
              const position = mockPositions.find(p => p.id === template.position);
              
              return (
                <div key={template.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-[#D4A72C]/50 hover:shadow-md transition-all group flex flex-col h-full">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <LayoutTemplate className="w-5 h-5" />
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      template.difficulty === 'Hard' ? 'bg-red-100 text-red-700' :
                      template.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {template.difficulty}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-[#0B2545] text-lg mb-1">{template.name}</h3>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">{template.description}</p>
                  
                  <div className="space-y-2 text-sm text-slate-600 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target:</span>
                      <span className="font-medium text-slate-700 truncate max-w-[150px]">{position?.name || "All"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Duration:</span>
                      <span className="font-medium text-slate-700 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {template.durationDays} Days
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Used:</span>
                      <span className="font-medium text-slate-700">{template.usageCount} times</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-auto">
                    <Button className="flex-1 bg-[#0B2545] hover:bg-[#0B2545]/90 text-white">Use Template</Button>
                    <Button variant="outline" size="icon" className="text-slate-500 hover:text-[#0B2545]">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="text-slate-500 hover:text-[#0B2545]">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
