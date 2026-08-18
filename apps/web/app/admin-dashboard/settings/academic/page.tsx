"use client";

import React, { useState } from "react";
import Link from "next/link";
import { GraduationCap, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockAcademicSettings } from "@/lib/mock/admin-settings";
import { UnsavedChangesBanner } from "../_components/UnsavedChangesBanner";

export default function AcademicSettingsPage() {
  const [settings, setSettings] = useState(mockAcademicSettings);
  const [initialSettings, setInitialSettings] = useState(mockAcademicSettings);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const handleChange = (key: keyof typeof mockAcademicSettings, value: any) => {
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
            <GraduationCap className="w-6 h-6 text-[#D4A72C]" />
            Academic Settings
          </h1>
          <p className="text-slate-500 text-sm mt-1">Configure global defaults for subjects, chapters, and topics.</p>
        </div>
        <Link href="/admin-dashboard/academic">
          <Button variant="outline" className="gap-2 bg-white text-[#0B2545]">
            <ExternalLink className="w-4 h-4" /> Manage Academic Structure
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Defaults */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2">Default Selections</h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Default Academic Year</label>
              <select 
                className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                value={settings.defaultAcademicYear}
                onChange={(e) => handleChange("defaultAcademicYear", e.target.value)}
              >
                <option>2080/2081</option>
                <option>2081/2082</option>
                <option>2082/2083</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Default Exam Category</label>
              <select 
                className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                value={settings.defaultExamCategory}
                onChange={(e) => handleChange("defaultExamCategory", e.target.value)}
              >
                <option>Section Officer</option>
                <option>Nayab Subba</option>
                <option>Kharidar</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Default Question Difficulty</label>
              <select 
                className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                value={settings.defaultDifficulty}
                onChange={(e) => handleChange("defaultDifficulty", e.target.value)}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2">Academic Features</h2>
          
          <div className="space-y-4">
            <label className="flex items-start justify-between cursor-pointer group">
              <div>
                <p className="text-sm font-semibold text-slate-700">Question Explanations</p>
                <p className="text-xs text-slate-500 mt-0.5">Allow teachers to add explanations to objective questions.</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.explanationEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={settings.explanationEnabled} onChange={(e) => handleChange("explanationEnabled", e.target.checked)} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.explanationEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>

            <label className="flex items-start justify-between cursor-pointer group pt-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-700">Subjective Questions</p>
                <p className="text-xs text-slate-500 mt-0.5">Enable subjective/long-answer questions across the platform.</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.subjectiveEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={settings.subjectiveEnabled} onChange={(e) => handleChange("subjectiveEnabled", e.target.checked)} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.subjectiveEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>

            <label className="flex items-start justify-between cursor-pointer group pt-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-700">Bulk Import System</p>
                <p className="text-xs text-slate-500 mt-0.5">Allow admins to import questions via Excel/CSV.</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.importEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={settings.importEnabled} onChange={(e) => handleChange("importEnabled", e.target.checked)} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.importEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>
            
            <label className="flex items-start justify-between cursor-pointer group pt-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-700">Bulk Export System</p>
                <p className="text-xs text-slate-500 mt-0.5">Allow admins to export question banks to Excel/CSV.</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.exportEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={settings.exportEnabled} onChange={(e) => handleChange("exportEnabled", e.target.checked)} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.exportEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>
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
