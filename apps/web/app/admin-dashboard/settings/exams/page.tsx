"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockExamSettings } from "@/lib/mock/admin-settings";
import { UnsavedChangesBanner } from "../_components/UnsavedChangesBanner";

export default function ExamsSettingsPage() {
  const [settings, setSettings] = useState(mockExamSettings);
  const [initialSettings, setInitialSettings] = useState(mockExamSettings);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const handleChange = (key: keyof typeof mockExamSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setInitialSettings(settings);
      setIsSaving(false);
    }, 800);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#D4A72C]" />
            Exam Settings
          </h1>
          <p className="text-slate-500 text-sm mt-1">Configure global defaults for examinations and results.</p>
        </div>
        <Link href="/admin-dashboard/exams">
          <Button variant="outline" className="gap-2 bg-white text-[#0B2545]">
            <ExternalLink className="w-4 h-4" /> Exam Management
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Core Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2">Core Exam Behavior</h2>
          
          <div className="space-y-4">
            <label className="flex items-start justify-between cursor-pointer group">
              <div>
                <p className="text-sm font-semibold text-slate-700">Allow Exam Retakes</p>
                <p className="text-xs text-slate-500 mt-0.5">Students can attempt the same exam multiple times by default.</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.allowRetake ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={settings.allowRetake} onChange={(e) => handleChange("allowRetake", e.target.checked)} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.allowRetake ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>

            <label className="flex items-start justify-between cursor-pointer group pt-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-700">Auto-Submit on Timeout</p>
                <p className="text-xs text-slate-500 mt-0.5">Automatically submit the exam when the timer reaches zero.</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autoSubmitOnTimeout ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={settings.autoSubmitOnTimeout} onChange={(e) => handleChange("autoSubmitOnTimeout", e.target.checked)} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.autoSubmitOnTimeout ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>

            <div className="pt-3 border-t border-slate-100">
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Default Exam Duration (Minutes)</label>
              <Input 
                type="number"
                className="max-w-[200px]"
                value={settings.defaultDuration}
                onChange={(e) => handleChange("defaultDuration", parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        {/* Randomization */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2">Randomization</h2>
          
          <div className="space-y-4">
            <label className="flex items-start justify-between cursor-pointer group">
              <div>
                <p className="text-sm font-semibold text-slate-700">Randomize Questions</p>
                <p className="text-xs text-slate-500 mt-0.5">Shuffle the order of questions for each student attempt.</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.randomizeQuestions ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={settings.randomizeQuestions} onChange={(e) => handleChange("randomizeQuestions", e.target.checked)} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.randomizeQuestions ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>

            <label className="flex items-start justify-between cursor-pointer group pt-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-700">Randomize Options</p>
                <p className="text-xs text-slate-500 mt-0.5">Shuffle the order of MCQ options for each question.</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.randomizeOptions ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={settings.randomizeOptions} onChange={(e) => handleChange("randomizeOptions", e.target.checked)} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.randomizeOptions ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>
          </div>
        </div>
        
        {/* Results Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6 md:col-span-2">
          <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2">Result & Review Policies</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Result Visibility</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                  value={settings.resultVisibility}
                  onChange={(e) => handleChange("resultVisibility", e.target.value)}
                >
                  <option>Immediately</option>
                  <option>After Admin Approval</option>
                  <option>Scheduled Date</option>
                </select>
                <p className="text-xs text-amber-600 font-medium">Warning: Hiding results might increase support queries.</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <label className="flex items-start justify-between cursor-pointer group">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Allow Student Review</p>
                    <p className="text-xs text-slate-500 mt-0.5">Students can view their submitted answers after completion.</p>
                  </div>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.allowStudentReview ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <input type="checkbox" className="sr-only" checked={settings.allowStudentReview} onChange={(e) => handleChange("allowStudentReview", e.target.checked)} />
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.allowStudentReview ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>

                <label className="flex items-start justify-between cursor-pointer group">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Show Correct Answers</p>
                    <p className="text-xs text-slate-500 mt-0.5">Display the correct answer key in the review screen.</p>
                  </div>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.showCorrectAnswers ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <input type="checkbox" className="sr-only" checked={settings.showCorrectAnswers} onChange={(e) => handleChange("showCorrectAnswers", e.target.checked)} />
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showCorrectAnswers ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>

                <label className="flex items-start justify-between cursor-pointer group">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Show Explanations</p>
                    <p className="text-xs text-slate-500 mt-0.5">Display detailed explanations in the review screen.</p>
                  </div>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.showExplanations ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <input type="checkbox" className="sr-only" checked={settings.showExplanations} onChange={(e) => handleChange("showExplanations", e.target.checked)} />
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showExplanations ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-start justify-between cursor-pointer group">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Enable Negative Marking</p>
                  <p className="text-xs text-slate-500 mt-0.5">Deduct marks for incorrect MCQ answers.</p>
                </div>
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.enableNegativeMarking ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <input type="checkbox" className="sr-only" checked={settings.enableNegativeMarking} onChange={(e) => handleChange("enableNegativeMarking", e.target.checked)} />
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.enableNegativeMarking ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>

              {settings.enableNegativeMarking && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mt-4 animate-in fade-in">
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Default Negative Mark (Fraction)</label>
                  <Input 
                    type="number"
                    step="0.01"
                    className="max-w-[200px]"
                    value={settings.defaultNegativeMark}
                    onChange={(e) => handleChange("defaultNegativeMark", parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-slate-500 mt-2">Example: 0.2 means 20% of the question's total mark will be deducted.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <UnsavedChangesBanner 
        show={hasChanges} 
        onSave={handleSave} 
        onDiscard={() => setSettings(initialSettings)}
        isSaving={isSaving}
      />
    </div>
  );
}
