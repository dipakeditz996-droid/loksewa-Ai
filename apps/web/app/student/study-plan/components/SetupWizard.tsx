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
  const [isFetchingExams, setIsFetchingExams] = useState(true);

  useEffect(() => {
    syllabusApi.getExams()
      .then(setExams)
      .catch(console.error)
      .finally(() => setIsFetchingExams(false));
    
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
    <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl p-8 shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-primary dark:text-foreground">Create Your Study Plan</h2>
          <p className="text-muted-foreground">Step {step} of 4</p>
        </div>
        <div className="flex gap-2">
          {[1,2,3,4].map(i => (
            <div key={i} className={`h-2 w-12 rounded-full ${i <= step ? 'bg-[#D4A72C]' : 'bg-muted/80'}`} />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-6 animate-in slide-in-from-right-4">
          <div className="flex items-center gap-3 text-lg font-semibold text-primary dark:text-foreground">
            <Target className="w-5 h-5 text-[#D4A72C]" />
            What is your target examination?
          </div>
          <div className="grid gap-3">
            {isFetchingExams ? (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-[#D4A72C] mb-4" />
                <p className="text-sm">Loading available examinations...</p>
              </div>
            ) : (
              exams.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => setExamId(ex.id)}
                  className={`p-4 rounded-xl border text-left flex items-center justify-between transition-colors ${
                    examId === ex.id ? 'border-primary bg-primary text-primary-foreground shadow-md' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className={`font-medium ${examId === ex.id ? 'text-primary-foreground' : 'text-primary dark:text-foreground'}`}>{ex.title}</span>
                  {examId === ex.id && <CheckCircle2 className="w-5 h-5 text-primary-foreground" />}
                </button>
              ))
            )}
          </div>
          <Button onClick={handleNext} disabled={!examId || isFetchingExams} className="w-full bg-primary text-primary-foreground">Next Step</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-in slide-in-from-right-4">
          <div className="flex items-center gap-3 text-lg font-semibold text-primary dark:text-foreground">
            <Calendar className="w-5 h-5 text-[#D4A72C]" />
            When is your target examination date?
          </div>
          <Input 
            type="date" 
            value={targetDate} 
            onChange={e => setTargetDate(e.target.value)}
            className="h-14 text-lg px-4 border-border"
            min={new Date().toISOString().split('T')[0]}
          />
          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={handleBack} className="flex-1">Back</Button>
            <Button onClick={handleNext} disabled={!targetDate} className="flex-1 bg-primary text-primary-foreground">Next Step</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-8 animate-in slide-in-from-right-4">
          <div>
            <div className="flex items-center gap-3 text-lg font-semibold text-primary dark:text-foreground mb-4">
              <Clock className="w-5 h-5 text-[#D4A72C]" />
              Daily Study Time & Days
            </div>
            
            <p className="text-sm font-medium text-muted-foreground mb-2">How much time can you study per day?</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[30, 60, 120, 180, 240].map(mins => (
                <button
                  key={mins}
                  onClick={() => setDailyMinutes(mins)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    dailyMinutes === mins ? 'border-primary bg-primary text-primary-foreground shadow-md' : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {mins >= 60 ? `${mins/60} hr${mins>60?'s':''}` : `${mins} min`}
                </button>
              ))}
            </div>

            <p className="text-sm font-medium text-muted-foreground mb-2">Which days will you study?</p>
            <div className="flex flex-wrap gap-2">
              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                    studyDays.includes(day) ? 'border-primary bg-primary text-primary-foreground shadow-md' : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {day.slice(0,3)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={handleBack} className="flex-1">Back</Button>
            <Button onClick={handleNext} disabled={studyDays.length === 0} className="flex-1 bg-primary text-primary-foreground">Next Step</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-8 animate-in slide-in-from-right-4">
          <div>
            <div className="flex items-center gap-3 text-lg font-semibold text-primary dark:text-foreground mb-4">
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
                    level === lvl.val ? 'border-primary bg-primary text-primary-foreground shadow-md' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className={`font-medium ${level === lvl.val ? 'text-primary-foreground' : 'text-primary dark:text-foreground'}`}>{lvl.label}</div>
                  <div className={`text-sm mt-1 ${level === lvl.val ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{lvl.desc}</div>
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
