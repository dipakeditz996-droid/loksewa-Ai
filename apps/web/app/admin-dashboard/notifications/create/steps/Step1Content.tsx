import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileEdit } from "lucide-react";

export default function Step1Content({ data, updateData, onNext }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
        <FileEdit className="w-5 h-5 text-[#D4A72C]" />
        <h3 className="text-lg font-bold text-[#0B2545]">Notification Content</h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Notification Type *</Label>
          <Select value={data.type} onValueChange={(v) => updateData({ type: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Announcement">Announcement</SelectItem>
              <SelectItem value="Exam Reminder">Exam Reminder</SelectItem>
              <SelectItem value="Study Reminder">Study Reminder</SelectItem>
              <SelectItem value="Payment">Payment</SelectItem>
              <SelectItem value="Marketplace">Marketplace</SelectItem>
              <SelectItem value="AI Tutor">AI Tutor</SelectItem>
              <SelectItem value="Support">Support</SelectItem>
              <SelectItem value="System">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Notification Title *</Label>
          <Input 
            placeholder="e.g. Upcoming Mock Test..." 
            value={data.title}
            onChange={(e) => updateData({ title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Short Message * <span className="text-xs text-slate-400 font-normal">(Used for Push & SMS)</span></Label>
          <Textarea 
            placeholder="A brief 1-2 sentence summary..." 
            rows={2}
            value={data.shortMessage}
            onChange={(e) => updateData({ shortMessage: e.target.value })}
          />
          <p className="text-xs text-slate-500 text-right">{data.shortMessage.length} characters</p>
        </div>

        <div className="space-y-2">
          <Label>Full Message <span className="text-xs text-slate-400 font-normal">(Optional, used for In-App and Email)</span></Label>
          {/* Using a standard textarea for mock Rich Text Editor */}
          <Textarea 
            placeholder="Detailed message content with basic formatting..." 
            rows={5}
            className="font-mono text-sm"
            value={data.fullMessage}
            onChange={(e) => updateData({ fullMessage: e.target.value })}
          />
          <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
            Rich text rendering is supported for In-App and Email channels. Safe HTML will be sanitized.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div className="space-y-2">
            <Label>Action Button Text <span className="text-xs text-slate-400 font-normal">(Optional)</span></Label>
            <Input 
              placeholder="e.g. View Result"
              value={data.buttonText}
              onChange={(e) => updateData({ buttonText: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Destination URL/Route</Label>
            <Input 
              placeholder="e.g. /student/exams/123"
              value={data.buttonDestination}
              onChange={(e) => updateData({ buttonDestination: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="pt-6 flex justify-end">
        <Button 
          className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white px-8"
          onClick={onNext}
          disabled={!data.title || !data.shortMessage}
        >
          Continue to Audience
        </Button>
      </div>
    </div>
  );
}
