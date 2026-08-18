import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { mockExamCategories, mockPositions } from "@/lib/mock/admin-academic";
import { Calculator } from "lucide-react";

export default function TargetDurationStep({ data, setData, onNext, onBack }: any) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-[#0B2545]">Target & Duration</h3>
        <p className="text-sm text-slate-500">Define the goal and timeline for this study plan.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">Target Exam</h4>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Exam Category <span className="text-red-500">*</span></Label>
              <Select value={data.categoryId} onValueChange={(v) => setData({ ...data, categoryId: v })}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {mockExamCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Position <span className="text-red-500">*</span></Label>
              <Select 
                value={data.positionId} 
                onValueChange={(v) => setData({ ...data, positionId: v })}
                disabled={!data.categoryId}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select Position" />
                </SelectTrigger>
                <SelectContent>
                  {mockPositions
                    .filter(p => !data.categoryId || p.categoryId === data.categoryId)
                    .map(pos => (
                    <SelectItem key={pos.id} value={pos.id}>{pos.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">Duration</h4>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Total Duration (Days) <span className="text-red-500">*</span></Label>
              <Input 
                type="number"
                min="1"
                placeholder="e.g. 30"
                value={data.durationDays || ""}
                onChange={(e) => setData({ ...data, durationDays: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-slate-500">How many days long is this plan?</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date (Optional)</Label>
                <Input 
                  type="date"
                  value={data.startDate || ""}
                  onChange={(e) => setData({ ...data, startDate: e.target.value })}
                />
                <p className="text-xs text-slate-500">Leave blank for flexible start</p>
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input 
                  type="date"
                  value={data.endDate || ""}
                  onChange={(e) => setData({ ...data, endDate: e.target.value })}
                  disabled={!data.startDate}
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3 text-slate-700">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                  <Calculator className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Daily Study Target</span>
              </div>
              <Select 
                value={data.dailyStudyHours.toString()} 
                onValueChange={(v) => setData({ ...data, dailyStudyHours: parseInt(v) })}
              >
                <SelectTrigger className="w-[120px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Hour</SelectItem>
                  <SelectItem value="2">2 Hours</SelectItem>
                  <SelectItem value="3">3 Hours</SelectItem>
                  <SelectItem value="4">4 Hours</SelectItem>
                  <SelectItem value="5">5+ Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 flex justify-between border-t border-slate-100">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button 
          className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white px-8" 
          onClick={onNext}
          disabled={!data.categoryId || !data.positionId || !data.durationDays || data.durationDays < 1}
        >
          Next Step
        </Button>
      </div>
    </div>
  );
}
