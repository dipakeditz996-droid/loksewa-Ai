"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, CheckCircle2, Save, LayoutGrid, Target, Layers, ListTodo, Settings2, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BasicInfoStep from "./steps/BasicInfoStep";
import TargetDurationStep from "./steps/TargetDurationStep";
import StudyStructureStep from "./steps/StudyStructureStep";
import DailyTasksStep from "./steps/DailyTasksStep";
import RulesPreferencesStep from "./steps/RulesPreferencesStep";
import PreviewPublishStep from "./steps/PreviewPublishStep";
import toast from "react-hot-toast";

const steps = [
  { id: 1, name: "Basic Info", icon: LayoutGrid },
  { id: 2, name: "Target", icon: Target },
  { id: 3, name: "Structure", icon: Layers },
  { id: 4, name: "Daily Tasks", icon: ListTodo },
  { id: 5, name: "Rules", icon: Settings2 },
  { id: 6, name: "Preview", icon: Eye },
];

export default function CreateStudyPlanPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  // Unified State for the Study Plan Builder
  const [planData, setPlanData] = useState({
    name: "",
    description: "",
    type: "Exam Preparation",
    coverImage: null,
    
    // Target & Duration
    categoryId: "",
    positionId: "",
    startDate: "",
    endDate: "",
    durationDays: 30,
    dailyStudyHours: 4,
    
    // Structure & Tasks
    subjects: [] as { id: string; name: string }[],
    tasks: [] as any[], // Complex array of daily tasks
    
    // Rules
    allowReorder: true,
    allowSkip: false,
    allowReschedule: true,
    enableProgressTracking: true,
    enableReminders: true,
    enableAIRecommendations: true,
    
    // Revision
    enableRevisionCycle: true,
    revisionFrequency: "Weekly",
    enableSpacedRevision: true,
    enableWeakTopicRevision: true,
  });

  const handleNext = () => {
    if (currentStep < 6) setCurrentStep(s => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
  };

  const handleSaveDraft = () => {
    toast.success("Study plan draft saved successfully");
    router.push("/admin-dashboard/study-plans");
  };

  const handlePublish = () => {
    toast.success("Study Plan Published successfully!");
    router.push("/admin-dashboard/study-plans");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin-dashboard/study-plans">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 bg-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-xl font-bold text-[#0B2545]">Create Study Plan</h2>
            <p className="text-slate-500 text-sm">Design a personalized study journey for students.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-white" onClick={handleSaveDraft}>
            <Save className="w-4 h-4" /> Save Draft
          </Button>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-100 -z-10" />
          
          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            
            return (
              <div 
                key={step.id}
                className="flex flex-col items-center gap-2 bg-white px-2 cursor-pointer group"
                onClick={() => {
                  if (step.id < currentStep) setCurrentStep(step.id);
                }}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border-2 ${
                  isCompleted 
                    ? "bg-emerald-500 border-emerald-500 text-white" 
                    : isCurrent 
                      ? "bg-[#0B2545] border-[#0B2545] text-[#D4A72C]" 
                      : "bg-white border-slate-200 text-slate-400 group-hover:border-slate-300"
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-4 h-4" />
                  )}
                </div>
                <span className={`text-xs font-medium ${
                  isCompleted || isCurrent ? "text-[#0B2545]" : "text-slate-400"
                }`}>
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[500px]">
        {currentStep === 1 && <BasicInfoStep data={planData} setData={setPlanData} onNext={handleNext} />}
        {currentStep === 2 && <TargetDurationStep data={planData} setData={setPlanData} onNext={handleNext} onBack={handleBack} />}
        {currentStep === 3 && <StudyStructureStep data={planData} setData={setPlanData} onNext={handleNext} onBack={handleBack} />}
        {currentStep === 4 && <DailyTasksStep data={planData} setData={setPlanData} onNext={handleNext} onBack={handleBack} />}
        {currentStep === 5 && <RulesPreferencesStep data={planData} setData={setPlanData} onNext={handleNext} onBack={handleBack} />}
        {currentStep === 6 && <PreviewPublishStep data={planData} onPublish={handlePublish} onBack={handleBack} onSaveDraft={handleSaveDraft} />}
      </div>
    </div>
  );
}
