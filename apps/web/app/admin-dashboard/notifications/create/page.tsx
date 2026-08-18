"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, FileEdit, Users, Send, CalendarClock, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Import Steps (we'll create these next)
import Step1Content from "./steps/Step1Content";
import Step2Audience from "./steps/Step2Audience";
import Step3Delivery from "./steps/Step3Delivery";
import Step4Schedule from "./steps/Step4Schedule";
import Step5Preview from "./steps/Step5Preview";

const STEPS = [
  { id: 1, title: "Content", icon: FileEdit },
  { id: 2, title: "Audience", icon: Users },
  { id: 3, title: "Delivery", icon: Send },
  { id: 4, title: "Schedule", icon: CalendarClock },
  { id: 5, title: "Preview", icon: Eye },
];

export default function CreateNotificationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Master state for the notification being built
  const [notificationData, setNotificationData] = useState({
    // Step 1: Content
    title: "",
    shortMessage: "",
    fullMessage: "",
    type: "Announcement",
    buttonText: "",
    buttonDestination: "",
    
    // Step 2: Audience
    audienceType: "All Students",
    examCategory: "",
    targetPosition: "",
    
    // Step 3: Delivery
    channels: ["In-App"],
    
    // Step 4: Schedule
    scheduleType: "Immediate",
    scheduledDate: "",
    scheduledTime: "",
    recurrence: "None"
  });

  const updateData = (updates: any) => {
    setNotificationData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    } else {
      router.push("/admin-dashboard/notifications");
    }
  };

  const handleFinish = () => {
    // In real app, submit data to backend here
    router.push("/admin-dashboard/notifications");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-8 w-8 bg-white" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 text-slate-500" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-[#0B2545]">Create Notification</h2>
          <p className="text-sm text-slate-500">Configure and send a new platform announcement.</p>
        </div>
      </div>

      {/* Progress Wizard */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 overflow-hidden">
        <div className="flex justify-between items-center relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10 rounded-full" />
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#D4A72C] -z-10 rounded-full transition-all duration-300" 
            style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
          />
          
          {STEPS.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const Icon = step.icon;
            
            return (
              <div key={step.id} className="flex flex-col items-center gap-2 bg-white px-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isActive ? "border-[#D4A72C] bg-[#D4A72C] text-[#0B2545]" : 
                  isCompleted ? "border-[#D4A72C] bg-white text-[#D4A72C]" : 
                  "border-slate-200 bg-white text-slate-400"
                }`}>
                  <Icon className="w-4 h-4 font-bold" />
                </div>
                <span className={`text-xs font-semibold hidden sm:block ${
                  isActive ? "text-[#0B2545]" : 
                  isCompleted ? "text-slate-700" : 
                  "text-slate-400"
                }`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <Step1Content data={notificationData} updateData={updateData} onNext={handleNext} />
        )}
        {currentStep === 2 && (
          <Step2Audience data={notificationData} updateData={updateData} onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 3 && (
          <Step3Delivery data={notificationData} updateData={updateData} onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 4 && (
          <Step4Schedule data={notificationData} updateData={updateData} onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 5 && (
          <Step5Preview data={notificationData} onFinish={handleFinish} onBack={handleBack} />
        )}
      </div>
    </div>
  );
}
