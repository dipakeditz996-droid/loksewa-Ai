"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, CheckCircle2, ChevronRight, Save, PlayCircle, Settings, FileText, 
  Target, LayoutList, GripVertical, Shuffle, PlusCircle, Filter, HelpCircle, Eye, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const STEPS = [
  { id: 1, title: "Basic Information", icon: FileText },
  { id: 2, title: "Academic Targeting", icon: Target },
  { id: 3, title: "Question Selection", icon: LayoutList },
  { id: 4, title: "Configuration", icon: Settings },
];

export default function CreateExamPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Mock Form States
  const [access, setAccess] = useState("Free");
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [durationLimited, setDurationLimited] = useState(true);

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const simulateAutoSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin-dashboard/exams">
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-[#0B2545] hover:bg-slate-200">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#0B2545]">Create New Exam</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="bg-slate-100 text-slate-700">Draft</Badge>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                {isSaving ? (
                  <span className="animate-pulse">Saving...</span>
                ) : (
                  <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Saved</>
                )}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">
            <PlayCircle className="w-4 h-4 mr-2" /> Preview
          </Button>
          <Button className="bg-[#0B2545] hover:bg-[#163E6C] text-white">
            <Save className="w-4 h-4 mr-2" /> Publish Exam
          </Button>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative">
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -z-10 -translate-y-1/2"></div>
          
          {STEPS.map((step, idx) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center gap-3 bg-white pr-4 z-10" onClick={() => { setCurrentStep(step.id); simulateAutoSave(); }}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors cursor-pointer
                  ${isActive ? 'border-blue-600 bg-blue-50 text-blue-600' : 
                    isCompleted ? 'border-emerald-500 bg-emerald-50 text-emerald-500' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <step.icon className="w-4 h-4" />}
                </div>
                <div className="cursor-pointer">
                  <p className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-blue-600' : isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>Step {step.id}</p>
                  <p className={`font-semibold ${isActive || isCompleted ? 'text-[#0B2545]' : 'text-slate-500'}`}>{step.title}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Builder Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* STEP 1: Basic Information */}
        {currentStep === 1 && (
          <div className="animate-in fade-in">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-[#0B2545]">Basic Information</h2>
              <p className="text-xs text-slate-500">Define the core identity of this exam.</p>
            </div>
            <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
              <div className="space-y-2">
                <Label>Exam Name <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Loksewa Section Officer - Full Mock Test 1" onChange={simulateAutoSave} />
              </div>
              
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Brief instructions or summary about what this exam covers..." className="h-24" onChange={simulateAutoSave} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Exam Category <span className="text-red-500">*</span></Label>
                  <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" onChange={simulateAutoSave}>
                    <option>Select Category...</option>
                    <option>Section Officer Prep</option>
                    <option>Nayab Subba Tests</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label>Target Position <span className="text-red-500">*</span></Label>
                  <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" onChange={simulateAutoSave}>
                    <option>Select Target...</option>
                    <option>Section Officer</option>
                    <option>Nayab Subba</option>
                    <option>Kharidar</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Exam Type <span className="text-red-500">*</span></Label>
                  <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" onChange={simulateAutoSave}>
                    <option>Mock Test</option>
                    <option>Full-Length Test</option>
                    <option>Chapter Test</option>
                    <option>Previous Year Test</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Difficulty Level</Label>
                  <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" onChange={simulateAutoSave}>
                    <option>Mixed (Standard)</option>
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <Label>Tags (Optional)</Label>
                <Input placeholder="e.g. gk, constitution, 2080" onChange={simulateAutoSave} />
                <p className="text-xs text-slate-400">Comma separated.</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Academic Targeting */}
        {currentStep === 2 && (
          <div className="animate-in fade-in">
             <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-[#0B2545]">Academic Targeting</h2>
              <p className="text-xs text-slate-500">Map this exam to the syllabus structure to enable deep analytics.</p>
            </div>
            <div className="p-6 lg:p-8 space-y-8 max-w-4xl">
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <Target className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 text-sm">Why target academics?</h4>
                  <p className="text-xs text-blue-800 mt-1">Linking an exam to specific Subjects and Chapters helps generate accurate "Topic Weakness" analytics for students after they finish the test.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-base font-bold text-[#0B2545]">Target Subjects</Label>
                    <span className="text-xs text-blue-600 cursor-pointer hover:underline">Select All</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 p-3 border border-blue-500 bg-blue-50 rounded-lg cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded text-blue-600" defaultChecked />
                      <span className="text-sm font-medium text-blue-900">General Knowledge</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" className="w-4 h-4 rounded" />
                      <span className="text-sm font-medium text-slate-700">IQ & Reasoning</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 border border-blue-500 bg-blue-50 rounded-lg cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded text-blue-600" defaultChecked />
                      <span className="text-sm font-medium text-blue-900">Constitution</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-base font-bold text-[#0B2545]">Target Chapters (Filtered by selected subjects)</Label>
                    <span className="text-xs text-blue-600 cursor-pointer hover:underline">Select All</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                    <label className="flex items-start gap-2 p-3 border border-blue-500 bg-blue-50 rounded-lg cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded text-blue-600 mt-0.5" defaultChecked />
                      <div>
                        <span className="text-sm font-medium text-blue-900 block">Geography of Nepal</span>
                        <span className="text-xs text-blue-700">General Knowledge</span>
                      </div>
                    </label>
                    <label className="flex items-start gap-2 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" className="w-4 h-4 rounded mt-0.5" />
                      <div>
                        <span className="text-sm font-medium text-slate-700 block">History of Nepal</span>
                        <span className="text-xs text-slate-500">General Knowledge</span>
                      </div>
                    </label>
                    <label className="flex items-start gap-2 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" className="w-4 h-4 rounded mt-0.5" />
                      <div>
                        <span className="text-sm font-medium text-slate-700 block">Fundamental Rights</span>
                        <span className="text-xs text-slate-500">Constitution</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Question Selection */}
        {currentStep === 3 && (
          <div className="animate-in fade-in flex flex-col lg:flex-row h-full min-h-[600px]">
             
            {/* Left Column: Bank Selection */}
            <div className="w-full lg:w-1/2 border-r border-slate-200 flex flex-col bg-slate-50">
              <div className="p-4 border-b border-slate-200 bg-white">
                <h2 className="font-bold text-[#0B2545]">Master Question Bank</h2>
                <div className="flex items-center gap-2 mt-3">
                  <Input placeholder="Search questions..." className="h-8" />
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0"><Filter className="w-4 h-4" /></Button>
                </div>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-blue-400 cursor-pointer transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="text-[10px]">MCQ</Badge>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50">Easy</Badge>
                  </div>
                  <p className="text-sm font-medium text-slate-800 line-clamp-2">When was the current Constitution of Nepal promulgated?</p>
                  <p className="text-xs text-slate-500 mt-2">Constitution • History</p>
                  <Button size="sm" variant="outline" className="w-full mt-3 h-7 text-xs text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100">
                    <PlusCircle className="w-3 h-3 mr-1" /> Add to Exam
                  </Button>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-blue-400 cursor-pointer transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="text-[10px]">MCQ</Badge>
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50">Medium</Badge>
                  </div>
                  <p className="text-sm font-medium text-slate-800 line-clamp-2">Which part of the constitution contains Fundamental Rights?</p>
                  <p className="text-xs text-slate-500 mt-2">Constitution • Fundamental Rights</p>
                  <Button size="sm" variant="outline" className="w-full mt-3 h-7 text-xs text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100">
                    <PlusCircle className="w-3 h-3 mr-1" /> Add to Exam
                  </Button>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-white">
                <Button variant="outline" className="w-full text-slate-600">
                  <Shuffle className="w-4 h-4 mr-2" /> Generate Random Set
                </Button>
              </div>
            </div>

            {/* Right Column: Exam Builder */}
            <div className="w-full lg:w-1/2 flex flex-col bg-white">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-[#0B2545]">Exam Questions</h2>
                  <p className="text-xs text-slate-500 mt-0.5">2 Selected • Total 2 Marks</p>
                </div>
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-600">Clear All</Button>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto space-y-2">
                
                {/* Selected Question Row 1 */}
                <div className="border border-slate-200 rounded-md p-3 flex items-start gap-3 bg-white group hover:shadow-sm transition-all">
                  <div className="cursor-grab mt-1 opacity-40 group-hover:opacity-100">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Q1</span>
                      <div className="flex items-center gap-2">
                        <Input type="number" defaultValue="1" className="w-14 h-6 text-xs text-center px-1" />
                        <span className="text-xs text-slate-500">Marks</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-800 mt-1 line-clamp-2">What is the height of Mt. Everest?</p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Geography</span>
                      <span className="text-[10px] text-red-500 cursor-pointer hover:underline">Remove</span>
                    </div>
                  </div>
                </div>

                {/* Selected Question Row 2 */}
                <div className="border border-slate-200 rounded-md p-3 flex items-start gap-3 bg-white group hover:shadow-sm transition-all">
                  <div className="cursor-grab mt-1 opacity-40 group-hover:opacity-100">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Q2</span>
                      <div className="flex items-center gap-2">
                        <Input type="number" defaultValue="1" className="w-14 h-6 text-xs text-center px-1" />
                        <span className="text-xs text-slate-500">Marks</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-800 mt-1 line-clamp-2">Who was the first elected Prime Minister of Nepal?</p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">History</span>
                      <span className="text-[10px] text-red-500 cursor-pointer hover:underline">Remove</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* STEP 4: Configuration */}
        {currentStep === 4 && (
          <div className="animate-in fade-in">
             <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-[#0B2545]">Exam Configuration</h2>
              <p className="text-xs text-slate-500">Set rules for duration, scoring, behavior, and access.</p>
            </div>
            
            <div className="p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl">
              
              {/* Settings Column 1 */}
              <div className="space-y-8">
                
                {/* Scoring & Duration */}
                <div className="space-y-4">
                  <h3 className="font-bold border-b pb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-slate-400" /> Scoring & Duration</h3>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                    <div>
                      <p className="font-medium text-sm">Time Limit</p>
                      <p className="text-xs text-slate-500">Should this exam have a countdown timer?</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={durationLimited} onChange={(e) => setDurationLimited(e.target.checked)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {durationLimited && (
                    <div className="pl-4 border-l-2 border-blue-200 space-y-2">
                      <Label>Duration (Minutes)</Label>
                      <Input type="number" defaultValue="60" className="w-32" />
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                    <div>
                      <p className="font-medium text-sm">Negative Marking</p>
                      <p className="text-xs text-slate-500">Deduct marks for incorrect answers.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={negativeMarking} onChange={(e) => setNegativeMarking(e.target.checked)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {negativeMarking && (
                    <div className="pl-4 border-l-2 border-blue-200 space-y-2">
                      <Label>Deduction per incorrect answer (e.g. 0.25)</Label>
                      <Input type="number" step="0.1" defaultValue="0.25" className="w-32" />
                      <p className="text-xs text-slate-500 flex items-center gap-1"><HelpCircle className="w-3 h-3" /> Correct: +1, Incorrect: -0.25</p>
                    </div>
                  )}
                </div>

                {/* Attempt Settings */}
                <div className="space-y-4">
                  <h3 className="font-bold border-b pb-2 flex items-center gap-2"><Target className="w-4 h-4 text-slate-400" /> Attempt Settings</h3>
                  
                  <div className="space-y-2">
                    <Label>Maximum Attempts per Student</Label>
                    <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                      <option>1 (Strict Test)</option>
                      <option>2</option>
                      <option>3</option>
                      <option>Unlimited (Practice Mode)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Retake Delay</Label>
                    <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                      <option>No Delay</option>
                      <option>24 Hours</option>
                      <option>1 Week</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Settings Column 2 */}
              <div className="space-y-8">
                
                {/* Result & Behavior Settings */}
                <div className="space-y-4">
                  <h3 className="font-bold border-b pb-2 flex items-center gap-2"><Eye className="w-4 h-4 text-slate-400" /> Behavior & Results</h3>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded" defaultChecked />
                      <div>
                        <span className="text-sm font-medium text-slate-800 block">Randomize Question Order</span>
                        <span className="text-xs text-slate-500">Each student gets a different sequence.</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded" defaultChecked />
                      <div>
                        <span className="text-sm font-medium text-slate-800 block">Show Result Immediately</span>
                        <span className="text-xs text-slate-500">Uncheck to withhold results until manually published.</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded" defaultChecked />
                      <div>
                        <span className="text-sm font-medium text-slate-800 block">Show Correct Answers & Explanations</span>
                        <span className="text-xs text-slate-500">Students can review their mistakes after submission.</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded" defaultChecked />
                      <div>
                        <span className="text-sm font-medium text-slate-800 block">Calculate Rank & Percentile</span>
                        <span className="text-xs text-slate-500">Enables leaderboard features.</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Access & Scheduling */}
                <div className="space-y-4">
                  <h3 className="font-bold border-b pb-2 flex items-center gap-2"><Lock className="w-4 h-4 text-slate-400" /> Access & Schedule</h3>
                  
                  <div className="space-y-2">
                    <Label>Access Type</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div 
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${access === 'Free' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                        onClick={() => setAccess("Free")}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-[#0B2545]">Free</span>
                          {access === 'Free' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        </div>
                      </div>
                      <div 
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${access === 'Premium' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-slate-300'}`}
                        onClick={() => setAccess("Premium")}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-[#0B2545]">Premium</span>
                          {access === 'Premium' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {access === "Premium" && (
                    <div className="space-y-2 pt-2">
                      <Label>Linked Marketplace Product</Label>
                      <select className="flex h-10 w-full rounded-md border border-slate-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 border-amber-200">
                        <option>Select Product...</option>
                        <option>Section Officer Mega Test Series</option>
                      </select>
                      <p className="text-xs text-amber-700">Students must purchase this product to access the exam.</p>
                    </div>
                  )}

                  <div className="space-y-2 pt-4">
                    <Label>Schedule (Optional)</Label>
                    <div className="flex gap-2">
                      <Input type="datetime-local" className="text-sm" />
                      <span className="py-2 text-slate-400">to</span>
                      <Input type="datetime-local" className="text-sm" />
                    </div>
                    <p className="text-xs text-slate-500">Leave blank to make available immediately upon publishing.</p>
                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
        <Button variant="outline" onClick={handlePrev} disabled={currentStep === 1} className="w-24">
          Back
        </Button>
        <div className="flex gap-3">
          <Button variant="ghost" className="text-slate-500" onClick={simulateAutoSave}>Save Draft</Button>
          {currentStep < 4 ? (
            <Button onClick={handleNext} className="w-32 bg-[#0B2545] hover:bg-[#163E6C] text-white">
              Next Step <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button className="w-32 bg-emerald-600 hover:bg-emerald-700 text-white">
              Publish Exam
            </Button>
          )}
        </div>
      </div>

    </div>
  );
}
