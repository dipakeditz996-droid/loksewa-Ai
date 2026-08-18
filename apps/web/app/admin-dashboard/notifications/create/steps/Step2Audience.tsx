import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Users, Loader2 } from "lucide-react";

export default function Step2Audience({ data, updateData, onNext, onBack }: any) {
  const [calculating, setCalculating] = useState(false);
  const [estimatedRecipients, setEstimatedRecipients] = useState(0);

  // Mock dependent dropdowns
  const categories = ["Loksewa", "Banking", "Teacher Service"];
  const loksewaPositions = ["Section Officer", "Nayab Subba", "Kharidar"];
  
  // Simulate audience calculation
  useEffect(() => {
    setCalculating(true);
    const timer = setTimeout(() => {
      let count = 0;
      if (data.audienceType === "All Students") count = 12500;
      else if (data.audienceType === "Active Plans") count = 4200;
      else if (data.audienceType === "Exam Category") count = 3500;
      else if (data.audienceType === "Pending Payments") count = 120;
      else count = Math.floor(Math.random() * 5000);
      
      setEstimatedRecipients(count);
      setCalculating(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [data.audienceType, data.examCategory, data.targetPosition]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
        <Users className="w-5 h-5 text-emerald-500" />
        <h3 className="text-lg font-bold text-[#0B2545]">Target Audience</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Audience Segment *</Label>
            <Select value={data.audienceType} onValueChange={(v) => updateData({ audienceType: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select segment..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Students">All Students</SelectItem>
                <SelectItem value="Exam Category">By Exam Category</SelectItem>
                <SelectItem value="Target Position">By Target Position</SelectItem>
                <SelectItem value="Active Plans">Students with Active Study Plans</SelectItem>
                <SelectItem value="Pending Payments">Students with Pending Payments</SelectItem>
                <SelectItem value="Unread Notifications">Students with Unread Notifications</SelectItem>
                <SelectItem value="Custom Segment">Custom Segment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dependent Filters */}
          {data.audienceType === "Exam Category" && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <Label>Select Category</Label>
              <Select value={data.examCategory} onValueChange={(v) => updateData({ examCategory: v })}>
                <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {data.audienceType === "Target Position" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label>Parent Category</Label>
                <Select value={data.examCategory} onValueChange={(v) => updateData({ examCategory: v, targetPosition: "" })}>
                  <SelectTrigger><SelectValue placeholder="Choose a category first" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Position</Label>
                <Select 
                  value={data.targetPosition} 
                  onValueChange={(v) => updateData({ targetPosition: v })}
                  disabled={!data.examCategory}
                >
                  <SelectTrigger><SelectValue placeholder="Choose a position" /></SelectTrigger>
                  <SelectContent>
                    {data.examCategory === "Loksewa" && loksewaPositions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    {data.examCategory !== "Loksewa" && <SelectItem value="generic">Generic Position</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Calculation Panel */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col justify-center items-center text-center">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Estimated Recipients</p>
          {calculating ? (
            <div className="flex flex-col items-center gap-2 text-blue-600">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Calculating audience...</p>
            </div>
          ) : (
            <div className="animate-in zoom-in-95">
              <p className="text-5xl font-bold text-[#0B2545]">{estimatedRecipients.toLocaleString()}</p>
              <p className="text-sm text-emerald-600 font-medium mt-2">Active Students matched</p>
            </div>
          )}
          
          <div className="mt-6 text-xs text-slate-400 max-w-xs leading-relaxed">
            Note: This is an estimate based on current database state. The exact number of delivered notifications may vary if student states change before the scheduled send time.
          </div>
        </div>
      </div>

      <div className="pt-6 flex justify-between border-t border-slate-100">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button 
          className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white px-8"
          onClick={onNext}
          disabled={calculating || estimatedRecipients === 0}
        >
          Continue to Delivery
        </Button>
      </div>
    </div>
  );
}
