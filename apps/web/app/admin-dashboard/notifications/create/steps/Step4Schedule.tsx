import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarClock, Zap, Clock } from "lucide-react";

export default function Step4Schedule({ data, updateData, onNext, onBack }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
        <CalendarClock className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-bold text-[#0B2545]">Schedule & Recurrence</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div 
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${
            data.scheduleType === "Immediate" 
              ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
              : "border-slate-200 hover:border-emerald-300 text-slate-500"
          }`}
          onClick={() => updateData({ scheduleType: "Immediate" })}
        >
          <Zap className="w-8 h-8" />
          <h4 className="font-bold">Send Immediately</h4>
          <p className="text-xs px-4">Notification will be queued for delivery as soon as you confirm.</p>
        </div>

        <div 
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${
            data.scheduleType === "Scheduled" 
              ? "border-blue-500 bg-blue-50 text-blue-700" 
              : "border-slate-200 hover:border-blue-300 text-slate-500"
          }`}
          onClick={() => updateData({ scheduleType: "Scheduled" })}
        >
          <Clock className="w-8 h-8" />
          <h4 className="font-bold">Schedule for Later</h4>
          <p className="text-xs px-4">Set a specific date and time for delivery.</p>
        </div>
      </div>

      {data.scheduleType === "Scheduled" && (
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input 
                type="date" 
                value={data.scheduledDate} 
                onChange={(e) => updateData({ scheduledDate: e.target.value })} 
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label>Time (Asia/Kathmandu)</Label>
              <Input 
                type="time" 
                value={data.scheduledTime} 
                onChange={(e) => updateData({ scheduledTime: e.target.value })} 
              />
            </div>
          </div>
          
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <Label>Recurrence (Optional)</Label>
            <Select value={data.recurrence} onValueChange={(v) => updateData({ recurrence: v })}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None (One-time)</SelectItem>
                <SelectItem value="Daily">Daily</SelectItem>
                <SelectItem value="Weekly">Weekly</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {data.scheduleType === "Immediate" && (
        <div className="bg-emerald-50 p-4 rounded border border-emerald-100 text-sm text-emerald-800">
          <strong>Note:</strong> Immediate notifications may still take a few minutes to process completely depending on the audience size.
        </div>
      )}

      <div className="pt-6 flex justify-between border-t border-slate-100">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button 
          className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white px-8"
          onClick={onNext}
          disabled={data.scheduleType === "Scheduled" && (!data.scheduledDate || !data.scheduledTime)}
        >
          Review & Confirm
        </Button>
      </div>
    </div>
  );
}
