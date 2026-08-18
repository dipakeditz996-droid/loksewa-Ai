import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function BasicInfoStep({ data, setData, onNext }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-[#0B2545]">Basic Information</h3>
        <p className="text-sm text-slate-500">Provide the primary details for this study plan.</p>
      </div>

      <div className="grid gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Plan Name <span className="text-red-500">*</span></Label>
          <Input 
            id="name" 
            placeholder="e.g. 30-Day Section Officer Master Plan" 
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Short Description</Label>
          <Textarea 
            id="description" 
            placeholder="Describe the plan's purpose, target audience, and contents..." 
            rows={3}
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
          />
        </div>

        <div className="space-y-2 max-w-sm">
          <Label>Plan Type <span className="text-red-500">*</span></Label>
          <Select value={data.type} onValueChange={(v) => setData({ ...data, type: v })}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Exam Preparation">Exam Preparation</SelectItem>
              <SelectItem value="Revision">Revision</SelectItem>
              <SelectItem value="Subject Focus">Subject Focus</SelectItem>
              <SelectItem value="Crash Course">Crash Course</SelectItem>
              <SelectItem value="Custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4 flex justify-end border-t border-slate-100">
          <Button 
            className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white px-8" 
            onClick={onNext}
            disabled={!data.name || !data.type}
          >
            Next Step
          </Button>
        </div>
      </div>
    </div>
  );
}
