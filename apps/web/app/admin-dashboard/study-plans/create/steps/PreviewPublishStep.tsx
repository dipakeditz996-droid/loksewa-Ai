import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  CalendarDays, BookOpen, Clock, Target, 
  Settings2, CheckCircle2, LayoutList, Layers, Brain
} from "lucide-react";
import { mockExamCategories, mockPositions } from "@/lib/mock/admin-academic";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PreviewPublishStep({ data, onPublish, onBack, onSaveDraft }: any) {
  const [showPublishModal, setShowPublishModal] = useState(false);

  const category = mockExamCategories.find(c => c.id === data.categoryId);
  const position = mockPositions.find(p => p.id === data.positionId);
  const totalTasks = data.tasks.length;
  const totalMinutes = data.tasks.reduce((acc: number, t: any) => acc + (t.estimatedMinutes || 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-[#0B2545]">Preview & Publish</h3>
        <p className="text-sm text-slate-500">Review the study plan details before publishing to students.</p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Preview Header */}
        <div className="bg-[#0B2545] p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Target className="w-48 h-48" />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-blue-200">
              <span className="bg-white/20 px-2 py-1 rounded">{data.type}</span>
              {category && <span>• {category.shortName}</span>}
              {position && <span>• {position.name}</span>}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold">{data.name || "Untitled Plan"}</h2>
            <p className="text-blue-100 max-w-2xl">{data.description || "No description provided."}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-200 bg-white border-b border-slate-200">
          <div className="p-4 flex flex-col items-center justify-center text-center">
            <CalendarDays className="w-5 h-5 text-slate-400 mb-1" />
            <span className="text-lg font-bold text-[#0B2545]">{data.durationDays || 0}</span>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Days</span>
          </div>
          <div className="p-4 flex flex-col items-center justify-center text-center">
            <Clock className="w-5 h-5 text-slate-400 mb-1" />
            <span className="text-lg font-bold text-[#0B2545]">{data.dailyStudyHours || 0}</span>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Hours/Day</span>
          </div>
          <div className="p-4 flex flex-col items-center justify-center text-center">
            <LayoutList className="w-5 h-5 text-slate-400 mb-1" />
            <span className="text-lg font-bold text-[#0B2545]">{totalTasks}</span>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Total Tasks</span>
          </div>
          <div className="p-4 flex flex-col items-center justify-center text-center">
            <BookOpen className="w-5 h-5 text-slate-400 mb-1" />
            <span className="text-lg font-bold text-[#0B2545]">{data.subjects.length}</span>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Subjects</span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#D4A72C]" />
              Syllabus Coverage
            </h4>
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
              {data.subjects.length > 0 ? data.subjects.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  {s.name}
                </div>
              )) : (
                <p className="text-sm text-slate-500 italic">No subjects selected.</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-blue-500" />
              Plan Settings
            </h4>
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Flexible Task Order:</span>
                <span className={data.allowReorder ? "text-emerald-600 font-medium" : "text-slate-400"}>
                  {data.allowReorder ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Revision Cycle:</span>
                <span className={data.enableRevisionCycle ? "text-emerald-600 font-medium" : "text-slate-400"}>
                  {data.enableRevisionCycle ? data.revisionFrequency : "Disabled"}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">AI Recommendations:</span>
                <span className={data.enableAIRecommendations ? "text-emerald-600 font-medium flex items-center gap-1" : "text-slate-400"}>
                  {data.enableAIRecommendations && <Brain className="w-3 h-3" />}
                  {data.enableAIRecommendations ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 flex justify-between border-t border-slate-100">
        <Button variant="outline" onClick={onBack}>Back to Rules</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSaveDraft}>Save as Draft</Button>
          <Button 
            className="bg-[#D4A72C] hover:bg-[#b08b25] text-[#0B2545] font-bold px-8" 
            onClick={() => setShowPublishModal(true)}
          >
            Publish Plan
          </Button>
        </div>
      </div>

      <Dialog open={showPublishModal} onOpenChange={setShowPublishModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Study Plan?</DialogTitle>
            <DialogDescription>
              Publishing this study plan will make it available for students to enroll in. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowPublishModal(false)}>Cancel</Button>
            <Button onClick={onPublish} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Yes, Publish Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
