"use client";

import React, { useEffect, useState } from "react";
import { studyPlanApi, StudyPlan } from "@/lib/api/study-plan";
import { SetupWizard } from "./components/SetupWizard";
import { Dashboard } from "./components/Dashboard";
import { Loader2 } from "lucide-react";

export default function StudyPlanPage() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPlan = async () => {
    setLoading(true);
    try {
      const p = await studyPlanApi.getPlan();
      setPlan(p || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, []);

  const handleRegenerate = async () => {
    if (!plan) return;
    if (confirm("Your future pending tasks will be recalculated based on your latest performance and target date. Completed tasks will remain unchanged. Are you sure?")) {
      try {
        await studyPlanApi.generateTasks(plan.id);
        alert("Success: Your future tasks have been regenerated.");
        loadPlan();
      } catch (e) {
        alert("Failed to regenerate plan.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 min-h-[calc(100vh-72px)] bg-muted/50">
      
      {/* Page Header */}
      <div className="pb-6 border-b border-border">
        <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-foreground">My Study Plan</h1>
        <p className="text-muted-foreground mt-1 font-medium">Plan your preparation, stay consistent, and track your progress.</p>
      </div>

      {plan ? (
        <Dashboard plan={plan} onRegenerate={handleRegenerate} />
      ) : (
        <SetupWizard onComplete={loadPlan} />
      )}
      
    </div>
  );
}
