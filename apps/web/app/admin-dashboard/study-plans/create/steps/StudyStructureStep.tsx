import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, BookOpen, ChevronRight, Wand2 } from "lucide-react";
import { mockSubjects } from "@/lib/mock/admin-academic";
import toast from "react-hot-toast";

export default function StudyStructureStep({ data, setData, onNext, onBack }: any) {
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  const handleAddSubject = () => {
    if (!selectedSubjectId) return;
    
    const subject = mockSubjects.find(s => s.id === selectedSubjectId);
    if (!subject) return;

    if (data.subjects.find((s: any) => s.id === subject.id)) {
      toast.error("Subject already added to the plan structure.");
      return;
    }

    setData({
      ...data,
      subjects: [...data.subjects, { id: subject.id, name: subject.name }]
    });
    setSelectedSubjectId("");
  };

  const handleRemoveSubject = (id: string) => {
    setData({
      ...data,
      subjects: data.subjects.filter((s: any) => s.id !== id)
    });
  };

  const handleAutoFill = () => {
    // Mock auto-fill from the target category/position
    if (data.categoryId) {
      const relatedSubjects = mockSubjects.slice(0, 3).map(s => ({ id: s.id, name: s.name }));
      setData({
        ...data,
        subjects: relatedSubjects
      });
      toast.success("Structure auto-filled based on target exam.");
    } else {
      toast.error("Please select a Target Exam in the previous step first.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-[#0B2545]">Study Structure</h3>
        <p className="text-sm text-slate-500">Select the subjects that this plan will cover.</p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-semibold text-blue-900">Auto-Generate Structure</h4>
          <p className="text-sm text-blue-700">We can automatically pull the required subjects based on the selected position syllabus.</p>
        </div>
        <Button 
          variant="outline" 
          className="bg-white text-blue-700 border-blue-200 hover:bg-blue-100 whitespace-nowrap"
          onClick={handleAutoFill}
        >
          <Wand2 className="w-4 h-4 mr-2" />
          Auto Fill
        </Button>
      </div>

      <div className="space-y-4">
        <Label>Add Subjects</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select a subject..." />
              </SelectTrigger>
              <SelectContent>
                {mockSubjects.map(sub => (
                  <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAddSubject} disabled={!selectedSubjectId} className="bg-slate-900 text-white">
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
        </div>
      </div>

      <div className="space-y-3 mt-6">
        <h4 className="text-sm font-semibold text-slate-700">Included Subjects</h4>
        
        {data.subjects.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No subjects added yet. Add subjects to define the curriculum.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {data.subjects.map((sub: any, index: number) => (
              <div key={sub.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                    {index + 1}
                  </div>
                  <span className="font-medium text-[#0B2545]">{sub.name}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                  onClick={() => handleRemoveSubject(sub.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-6 flex justify-between border-t border-slate-100">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button 
          className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white px-8" 
          onClick={onNext}
          disabled={data.subjects.length === 0}
        >
          Next Step
        </Button>
      </div>
    </div>
  );
}
