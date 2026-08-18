import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, RefreshCw, LayoutList, BellRing, BrainCircuit } from "lucide-react";

export default function RulesPreferencesStep({ data, setData, onNext, onBack }: any) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-[#0B2545]">Rules & Preferences</h3>
        <p className="text-sm text-slate-500">Configure how students interact with this study plan.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <LayoutList className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-slate-800">Student Permissions</h4>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-slate-700">Allow Task Reordering</Label>
                <p className="text-xs text-slate-500">Students can change the order of tasks within a day.</p>
              </div>
              <Switch 
                checked={data.allowReorder} 
                onCheckedChange={(c: boolean) => setData({ ...data, allowReorder: c })} 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-slate-700">Allow Skipping Tasks</Label>
                <p className="text-xs text-slate-500">Students can mark tasks as skipped.</p>
              </div>
              <Switch 
                checked={data.allowSkip} 
                onCheckedChange={(c: boolean) => setData({ ...data, allowSkip: c })} 
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-slate-700">Allow Rescheduling</Label>
                <p className="text-xs text-slate-500">Students can move tasks to another day.</p>
              </div>
              <Switch 
                checked={data.allowReschedule} 
                onCheckedChange={(c: boolean) => setData({ ...data, allowReschedule: c })} 
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <RefreshCw className="w-5 h-5 text-emerald-600" />
            <h4 className="font-semibold text-slate-800">Revision & System</h4>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-slate-700">Enable Revision Cycle</Label>
                <p className="text-xs text-slate-500">Automatically integrate revision tasks.</p>
              </div>
              <Switch 
                checked={data.enableRevisionCycle} 
                onCheckedChange={(c: boolean) => setData({ ...data, enableRevisionCycle: c })} 
              />
            </div>

            {data.enableRevisionCycle && (
              <div className="pl-4 border-l-2 border-emerald-100 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Revision Frequency</Label>
                  <Select 
                    value={data.revisionFrequency} 
                    onValueChange={(v) => setData({ ...data, revisionFrequency: v })}
                  >
                    <SelectTrigger className="bg-white h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Daily">Daily</SelectItem>
                      <SelectItem value="Every 3 days">Every 3 Days</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-slate-700">Spaced Repetition</Label>
                  <Switch 
                    checked={data.enableSpacedRevision} 
                    onCheckedChange={(c: boolean) => setData({ ...data, enableSpacedRevision: c })} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-slate-700">Weak Topic Focus</Label>
                  <Switch 
                    checked={data.enableWeakTopicRevision} 
                    onCheckedChange={(c: boolean) => setData({ ...data, enableWeakTopicRevision: c })} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <BrainCircuit className="w-5 h-5 text-purple-600" />
            <h4 className="font-semibold text-slate-800">Tracking & AI</h4>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-slate-700">Enable Progress Tracking</Label>
              </div>
              <Switch 
                checked={data.enableProgressTracking} 
                onCheckedChange={(c: boolean) => setData({ ...data, enableProgressTracking: c })} 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-slate-400" />
                <Label className="text-sm font-medium text-slate-700">Push Reminders</Label>
              </div>
              <Switch 
                checked={data.enableReminders} 
                onCheckedChange={(c: boolean) => setData({ ...data, enableReminders: c })} 
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-slate-700">AI Recommendations</Label>
                <p className="text-xs text-slate-500">Allow AI Tutor to suggest task changes.</p>
              </div>
              <Switch 
                checked={data.enableAIRecommendations} 
                onCheckedChange={(c: boolean) => setData({ ...data, enableAIRecommendations: c })} 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 flex justify-between border-t border-slate-100">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button 
          className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white px-8" 
          onClick={onNext}
        >
          Next Step
        </Button>
      </div>
    </div>
  );
}
