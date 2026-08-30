"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";

interface TeachingPreferences {
  preferred_difficulty: string;
  preferred_question_type: string;
}

export function TeacherTeachingPreferences() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TeachingPreferences>({
    preferred_difficulty: "medium",
    preferred_question_type: "mcq",
  });
  const [dirty, setDirty] = useState(false);

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["teacher-teaching-preferences"],
    queryFn: () => apiClient<TeachingPreferences>("/auth/teacher/preferences/"),
  });

  useEffect(() => {
    if (preferences) {
      setForm({
        preferred_difficulty: preferences.preferred_difficulty || "medium",
        preferred_question_type: preferences.preferred_question_type || "mcq",
      });
    }
  }, [preferences]);

  const mutation = useMutation({
    mutationFn: (data: TeachingPreferences) => 
      apiClient("/auth/teacher/preferences/", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("Preferences updated successfully!");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["teacher-teaching-preferences"] });
    },
    onError: () => toast.error("Failed to update preferences."),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg font-bold text-primary">Teaching Preferences</CardTitle>
          <CardDescription>Default settings for when you create questions and materials.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="max-w-md space-y-6">
            <div className="space-y-3">
              <Label className="text-[13px] font-semibold text-slate-700">Preferred Question Difficulty</Label>
              <Select 
                value={form.preferred_difficulty} 
                onValueChange={(val) => { setForm({ ...form, preferred_difficulty: val }); setDirty(true); }}
              >
                <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 focus:border-[#D4A72C] focus:ring-[#D4A72C]/20 rounded-xl h-11">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">Sets the default difficulty when adding new questions to the Question Bank.</p>
            </div>

            <div className="space-y-3">
              <Label className="text-[13px] font-semibold text-slate-700">Preferred Question Type</Label>
              <Select 
                value={form.preferred_question_type} 
                onValueChange={(val) => { setForm({ ...form, preferred_question_type: val }); setDirty(true); }}
              >
                <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 focus:border-[#D4A72C] focus:ring-[#D4A72C]/20 rounded-xl h-11">
                  <SelectValue placeholder="Select question type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                  <SelectItem value="mcq">Multiple Choice</SelectItem>
                  <SelectItem value="true_false">True / False</SelectItem>
                  <SelectItem value="short_answer">Short Answer</SelectItem>
                  <SelectItem value="subjective">Subjective</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">Sets the default type when adding new questions to the Question Bank.</p>
            </div>
            
            <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
              <Button 
                onClick={() => mutation.mutate(form)} 
                disabled={!dirty || mutation.isPending}
                className="bg-[#0B2545] hover:bg-[#163E6B] text-white px-6 shadow-sm"
              >
                {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Preferences
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
