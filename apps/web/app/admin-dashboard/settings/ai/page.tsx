"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Brain, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockAISettings } from "@/lib/mock/admin-settings";
import { UnsavedChangesBanner } from "../_components/UnsavedChangesBanner";

export default function AISettingsPage() {
  const [settings, setSettings] = useState(mockAISettings);
  const [initialSettings, setInitialSettings] = useState(mockAISettings);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const handleChange = (key: keyof typeof mockAISettings, value: any) => {
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
            <Brain className="w-6 h-6 text-[#D4A72C]" />
            AI Settings
          </h1>
          <p className="text-slate-500 text-sm mt-1">Configure artificial intelligence limits and global access policies.</p>
        </div>
        <Link href="/admin-dashboard/ai-tutor">
          <Button variant="outline" className="gap-2 bg-white text-[#0B2545]">
            <ExternalLink className="w-4 h-4" /> AI Tutor Management
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Core Settings Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2">Global Feature Access</h2>
            
            <div className="space-y-4">
              <label className="flex items-start justify-between cursor-pointer group">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Enable AI Tutor (Global)</p>
                  <p className="text-xs text-slate-500 mt-0.5">Master switch to turn off the AI Tutor feature for all students.</p>
                </div>
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.tutorEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <input type="checkbox" className="sr-only" checked={settings.tutorEnabled} onChange={(e) => handleChange("tutorEnabled", e.target.checked)} />
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.tutorEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>

              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <label className="flex items-start justify-between cursor-pointer group">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">AI Question Generation</p>
                  </div>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.aiQuestionGeneration ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <input type="checkbox" className="sr-only" checked={settings.aiQuestionGeneration} onChange={(e) => handleChange("aiQuestionGeneration", e.target.checked)} />
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.aiQuestionGeneration ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>

                <label className="flex items-start justify-between cursor-pointer group">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">AI Option Generation</p>
                  </div>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.aiOptionGeneration ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <input type="checkbox" className="sr-only" checked={settings.aiOptionGeneration} onChange={(e) => handleChange("aiOptionGeneration", e.target.checked)} />
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.aiOptionGeneration ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>

                <label className="flex items-start justify-between cursor-pointer group">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Question Explanations</p>
                  </div>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.questionExplanation ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <input type="checkbox" className="sr-only" checked={settings.questionExplanation} onChange={(e) => handleChange("questionExplanation", e.target.checked)} />
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.questionExplanation ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>

                <label className="flex items-start justify-between cursor-pointer group">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Study Recommendations</p>
                  </div>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.studyRecommendations ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <input type="checkbox" className="sr-only" checked={settings.studyRecommendations} onChange={(e) => handleChange("studyRecommendations", e.target.checked)} />
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.studyRecommendations ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>
                
                <label className="flex items-start justify-between cursor-pointer group">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Weak Topic Detection</p>
                  </div>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.weakTopicDetection ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <input type="checkbox" className="sr-only" checked={settings.weakTopicDetection} onChange={(e) => handleChange("weakTopicDetection", e.target.checked)} />
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.weakTopicDetection ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>
                
                <label className="flex items-start justify-between cursor-pointer group">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">AI Exam Analysis</p>
                  </div>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.examAnalysis ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <input type="checkbox" className="sr-only" checked={settings.examAnalysis} onChange={(e) => handleChange("examAnalysis", e.target.checked)} />
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.examAnalysis ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* AI Limits */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" /> API Safety Limits
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Daily AI Questions per Student</label>
                <Input 
                  type="number"
                  value={settings.dailyQuestionsLimit}
                  onChange={(e) => handleChange("dailyQuestionsLimit", parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Daily AI Conversations per Student</label>
                <Input 
                  type="number"
                  value={settings.dailyConversationsLimit}
                  onChange={(e) => handleChange("dailyConversationsLimit", parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Max Message Length (Characters)</label>
                <Input 
                  type="number"
                  value={settings.maxMessageLength}
                  onChange={(e) => handleChange("maxMessageLength", parseInt(e.target.value) || 0)}
                />
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-100">
                  <span className="font-bold text-[#0B2545] block mb-1">Provider Credentials</span>
                  Provider API credentials (e.g., OpenAI Key) are configured securely in the backend environment variables and cannot be viewed here.
                </p>
              </div>
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
