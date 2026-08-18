"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Calendar, Clock, Map, Zap, CheckCircle2, Loader2 } from "lucide-react";
import { studyPlanApi } from "@/lib/api/study-plan";
import { syllabusApi, Exam } from "@/lib/api/syllabus";

interface SetupWizardProps {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  
  // Form State
  const [examId, setExamId] = useState<number | null>(null);
  const [targetDate, setTargetDate] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(120);
  const [studyDays, setStudyDays] = useState<string[]>(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
  const [level, setLevel] = useState("BEGINNER");
  const [preferredTime, setPreferredTime] = useState("MORNING");

  useEffect(() => {
    syllabusApi.getExams().then(setExams).catch(console.error);
    
    // Set default target date to 3 months from now
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    setTargetDate(d.toISOString().split('T')[0] || "");
  }, []);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!examId || !targetDate) return;
    setLoading(true);
    try {
      await studyPlanApi.createPlan({
        exam: examId,
        target_date: targetDate,
        daily_minutes: dailyMinutes,
        study_days: studyDays,
        level,
        preferred_time: preferredTime
      });
      onComplete();
    } catch (e) {
      alert("Failed to create study plan");
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    if (studyDays.includes(day)) {
      setStudyDays(studyDays.filter(d => d !== day));
    } else {
      setStudyDays([...studyDays, day]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[#0B2545]">Create Your Study Plan</h2>
          <p className="text-slate-500">Step {step} of 4</p>
        </div>
        <div className="flex gap-2">
          {[1,2,3,4].map(i => (
            <div key={i} className={`h-2 w-12 rounded-full ${i <= step ? 'bg-[#D4A72C]' : 'bg-slate-100'}`} />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-6 animate-in slide-in-from-right-4">
          <div className="flex items-center gap-3 text-lg font-semibold text-[#0B2545]">
            <Target className="w-5 h-5 text-[#D4A72C]" />
            What is your target examination?
          </div>
          <div className="grid gap-3">
            {exams.map(ex => (
              <button
                key={ex.id}
                onClick={() => setExamId(ex.id)}
                className={`p-4 rounded-xl border text-left flex items-center justify-between transition-colors ${
                  examId === ex.id ? 'border-[#0B2545] bg-[#0B2545]/5' : 'border-slate-200 hover:border-[#D4A72C]'
                }`}
              >
                <span className="font-medium text-[#0B2545]">{ex.title}</span>
                {examId === ex.id && <CheckCircle2 className="w-5 h-5 text-[#0B2545]" />}
              </button>
            ))}
          </div>
          <Button onClick={handleNext} disabled={!examId} className="w-full bg-[#0B2545]">Next Step</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-in slide-in-from-right-4">
          <div className="flex items-center gap-3 text-lg font-semibold text-[#0B2545]">
            <Calendar className="w-5 h-5 text-[#D4A72C]" />
            When is your target examination date?
          </div>
          <Input 
            type="date" 
            value={targetDate} 
            onChange={e => setTargetDate(e.target.value)}
            className="h-14 text-lg px-4 border-slate-200"
            min={new Date().toISOString().split('T')[0]}
          />
          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={handleBack} className="flex-1">Back</Button>
            <Button onClick={handleNext} disabled={!targetDate} className="flex-1 bg-[#0B2545]">Next Step</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-8 animate-in slide-in-from-right-4">
          <div>
            <div className="flex items-center gap-3 text-lg font-semibold text-[#0B2545] mb-4">
              <Clock className="w-5 h-5 text-[#D4A72C]" />
              Daily Study Time & Days
            </div>
            
            <p className="text-sm font-medium text-slate-500 mb-2">How much time can you study per day?</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[30, 60, 120, 180, 240].map(mins => (
                <button
                  key={mins}
                  onClick={() => setDailyMinutes(mins)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    dailyMinutes === mins ? 'border-[#0B2545] bg-[#0B2545] text-white' : 'border-slate-200 text-slate-600 hover:border-[#D4A72C]'
                  }`}
                >
                  {mins >= 60 ? `${mins/60} hr${mins>60?'s':''}` : `${mins} min`}
                </button>
              ))}
            </div>

            <p className="text-sm font-medium text-slate-500 mb-2">Which days will you study?</p>
            <div className="flex flex-wrap gap-2">
              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                    studyDays.includes(day) ? 'border-[#0B2545] bg-[#0B2545]/10 text-[#0B2545]' : 'border-slate-200 text-slate-500 hover:border-[#D4A72C]'
                  }`}
                >
                  {day.slice(0,3)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={handleBack} className="flex-1">Back</Button>
            <Button onClick={handleNext} disabled={studyDays.length === 0} className="flex-1 bg-[#0B2545]">Next Step</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-8 animate-in slide-in-from-right-4">
          <div>
            <div className="flex items-center gap-3 text-lg font-semibold text-[#0B2545] mb-4">
              <Zap className="w-5 h-5 text-[#D4A72C]" />
              Current Preparation Level
            </div>
            
            <div className="grid gap-3">
              {[
                { val: 'BEGINNER', label: 'Beginner', desc: 'Starting from scratch' },
                { val: 'INTERMEDIATE', label: 'Intermediate', desc: 'Familiar with some topics' },
                { val: 'ADVANCED', label: 'Advanced', desc: 'Mostly revising and practicing' }
              ].map(lvl => (
                <button
                  key={lvl.val}
                  onClick={() => setLevel(lvl.val)}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    level === lvl.val ? 'border-[#0B2545] bg-[#0B2545]/5' : 'border-slate-200 hover:border-[#D4A72C]'
                  }`}
                >
                  <div className="font-medium text-[#0B2545]">{lvl.label}</div>
                  <div className="text-sm text-slate-500 mt-1">{lvl.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={handleBack} disabled={loading} className="flex-1">Back</Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-white">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Plan...</> : "Generate My Plan"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
