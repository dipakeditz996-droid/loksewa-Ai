"use client";

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockAIConfiguration } from "@/lib/mock/admin-ai-tutor";
import { Save, Server, Sparkles, BrainCircuit, Shield } from "lucide-react";
import toast from "react-hot-toast";

export default function AITutorConfigurationPage() {
  const [config, setConfig] = useState(mockAIConfiguration);

  const handleSave = () => {
    toast.success("AI Configuration saved securely.");
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B2545]">AI Configuration</h2>
          <p className="text-sm text-slate-500">Manage AI behavior, limits, and core settings.</p>
        </div>
        <Button className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white gap-2 w-full sm:w-auto" onClick={handleSave}>
          <Save className="w-4 h-4" /> Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* General & Model Settings */}
        <div className="space-y-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Sparkles className="w-5 h-5 text-[#D4A72C]" />
              <h3 className="font-semibold text-slate-800">General Identity</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tutor Name</Label>
                <Input 
                  value={config.tutorName} 
                  onChange={(e) => setConfig({...config, tutorName: e.target.value})} 
                />
              </div>
              
              <div className="space-y-2">
                <Label>Short Description</Label>
                <Input 
                  value={config.shortDescription} 
                  onChange={(e) => setConfig({...config, shortDescription: e.target.value})} 
                />
              </div>
              
              <div className="space-y-2">
                <Label>Welcome Message</Label>
                <Textarea 
                  value={config.welcomeMessage} 
                  onChange={(e) => setConfig({...config, welcomeMessage: e.target.value})}
                  rows={2}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Server className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-800">Provider & Model</h3>
            </div>
            
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-start gap-2 text-sm text-emerald-800 mb-4">
              <Shield className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
              <p>API keys are configured securely on the server and are not exposed in the frontend.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>AI Provider</Label>
                <Select value={config.aiProvider} onValueChange={(v: any) => setConfig({...config, aiProvider: v})}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OpenAI">OpenAI</SelectItem>
                    <SelectItem value="Anthropic">Anthropic</SelectItem>
                    <SelectItem value="Google">Google (Gemini)</SelectItem>
                    <SelectItem value="Custom">Custom Backend</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Model Name</Label>
                <Select value={config.modelName} onValueChange={(v) => setConfig({...config, modelName: v})}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Temperature: {config.temperature}</Label>
                  <span className="text-xs text-slate-400">Creative vs Precise</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="2" step="0.1" 
                  value={config.temperature}
                  onChange={(e) => setConfig({...config, temperature: parseFloat(e.target.value)})}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Behavior & Limits */}
        <div className="space-y-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <BrainCircuit className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-slate-800">Response Behavior</h3>
            </div>
            
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teaching Style</Label>
                  <Select value={config.teachingStyle} onValueChange={(v: any) => setConfig({...config, teachingStyle: v})}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Simple">Simple</SelectItem>
                      <SelectItem value="Detailed">Detailed</SelectItem>
                      <SelectItem value="Exam-Oriented">Exam-Oriented</SelectItem>
                      <SelectItem value="Step-by-Step">Step-by-Step</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={config.language} onValueChange={(v: any) => setConfig({...config, language: v})}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Nepali">Nepali</SelectItem>
                      <SelectItem value="Mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Label className="text-slate-500">Behavior Toggles</Label>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Explain Difficult Concepts</span>
                  <Switch checked={config.explainDifficultConcepts} onCheckedChange={(c) => setConfig({...config, explainDifficultConcepts: c})} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Provide Real-world Examples</span>
                  <Switch checked={config.giveExamples} onCheckedChange={(c) => setConfig({...config, giveExamples: c})} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Give Hints Instead of Direct Answers</span>
                  <Switch checked={config.giveHints} onCheckedChange={(c) => setConfig({...config, giveHints: c})} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Encourage Students (Empathy)</span>
                  <Switch checked={config.encourageStudents} onCheckedChange={(c) => setConfig({...config, encourageStudents: c})} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Shield className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-slate-800">Student Limits</h3>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Daily Questions Limit</Label>
                  <Input 
                    type="number" 
                    value={config.dailyQuestionsLimit} 
                    onChange={(e) => setConfig({...config, dailyQuestionsLimit: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Daily Conversations</Label>
                  <Input 
                    type="number" 
                    value={config.dailyConversationsLimit} 
                    onChange={(e) => setConfig({...config, dailyConversationsLimit: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label className="text-sm font-medium text-slate-700">Unlimited for Premium</Label>
                  <p className="text-xs text-slate-500">Premium students bypass daily usage limits.</p>
                </div>
                <Switch 
                  checked={config.unlimitedAccessForPremium} 
                  onCheckedChange={(c) => setConfig({...config, unlimitedAccessForPremium: c})} 
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Features Toggle - Full Width */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Sparkles className="w-5 h-5 text-[#D4A72C]" />
            <h3 className="font-semibold text-slate-800">AI Features Enablement</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
              <div>
                <Label className="text-sm font-semibold text-slate-800">General Chat</Label>
                <p className="text-xs text-slate-500">Allow freeform chat tutoring.</p>
              </div>
              <Switch checked={config.enableChat} onCheckedChange={(c) => setConfig({...config, enableChat: c})} />
            </div>
            <div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
              <div>
                <Label className="text-sm font-semibold text-slate-800">Question Generation</Label>
                <p className="text-xs text-slate-500">AI generates dynamic practice MCQs.</p>
              </div>
              <Switch checked={config.enableQuestionGeneration} onCheckedChange={(c) => setConfig({...config, enableQuestionGeneration: c})} />
            </div>
            <div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
              <div>
                <Label className="text-sm font-semibold text-slate-800">Exam Analysis</Label>
                <p className="text-xs text-slate-500">AI provides post-exam performance reviews.</p>
              </div>
              <Switch checked={config.enableExamAnalysis} onCheckedChange={(c) => setConfig({...config, enableExamAnalysis: c})} />
            </div>
            <div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
              <div>
                <Label className="text-sm font-semibold text-slate-800">Study Plan Suggestions</Label>
                <p className="text-xs text-slate-500">AI dynamically modifies student schedules.</p>
              </div>
              <Switch checked={config.enableStudyPlanSuggestions} onCheckedChange={(c) => setConfig({...config, enableStudyPlanSuggestions: c})} />
            </div>
            <div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
              <div>
                <Label className="text-sm font-semibold text-slate-800">Answer Explanations</Label>
                <p className="text-xs text-slate-500">AI explains why answers are correct/incorrect.</p>
              </div>
              <Switch checked={config.enableAnswerExplanation} onCheckedChange={(c) => setConfig({...config, enableAnswerExplanation: c})} />
            </div>
            <div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
              <div>
                <Label className="text-sm font-semibold text-slate-800">Weak Topic Detection</Label>
                <p className="text-xs text-slate-500">Proactively identify student weaknesses.</p>
              </div>
              <Switch checked={config.enableWeakTopicDetection} onCheckedChange={(c) => setConfig({...config, enableWeakTopicDetection: c})} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
