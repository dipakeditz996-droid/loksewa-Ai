import os
import re

empty_state = '''"use client";

import React from "react";
import { AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PendingIntegrationPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
        <Clock className="w-8 h-8 text-slate-400" />
      </div>
      
      <h2 className="text-2xl font-bold text-[#0B2545] mb-2">API Integration Pending</h2>
      <p className="text-slate-500 max-w-md mx-auto mb-8">
        This module is currently being integrated with the live Django API. The previous mock data implementation has been removed.
      </p>
      
      <div className="flex gap-4">
        <Link href="/admin-dashboard">
          <Button variant="outline" className="gap-2">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
'''

with open("apps/web/app/admin-dashboard/academic/exams/[id]/page.tsx", "w", encoding='utf-8') as f: f.write(empty_state)
with open("apps/web/app/admin-dashboard/academic/papers/[id]/page.tsx", "w", encoding='utf-8') as f: f.write(empty_state)
with open("apps/web/app/admin-dashboard/academic/subjects/[id]/page.tsx", "w", encoding='utf-8') as f: f.write(empty_state)
with open("apps/web/app/admin-dashboard/academic/chapters/[id]/page.tsx", "w", encoding='utf-8') as f: f.write(empty_state)
with open("apps/web/app/admin-dashboard/academic/questions/[id]/edit/page.tsx", "w", encoding='utf-8') as f: f.write(empty_state)

def fix_file(filepath, replacements):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        for old, new in replacements:
            content = content.replace(old, new)
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")
    except Exception as e:
        print(f"Failed to fix {filepath}: {e}")

fix_file('apps/web/app/home/StudyPlanSection.tsx', [
    ('s.', '(s || TYPE_STYLES.practice).'),
    ('s}', '(s || TYPE_STYLES.practice)}'),
])

fix_file('apps/web/app/home/SyllabusSection.tsx', [
    ('(subject, si)', '(subject: any, si: number)'),
    ('(ch, ci)', '(ch: any, ci: number)'),
])

fix_file('apps/web/app/register/page.tsx', [
    ('plan_id: selectedPlanId ? String(selectedPlanId) : undefined', 'plan_id: selectedPlanId ? String(selectedPlanId) : ""'),
])

fix_file('apps/web/app/student/games/page.tsx', [
    ('mode.icon', '(mode as any).icon'),
    ('mode.difficulty', '(mode as any).difficulty'),
    ('mode.questionsCount', '(mode as any).questionsCount'),
    ('mode.timeLimitMins', '(mode as any).timeLimitMins'),
    ('mode.route', '(mode as any).route'),
    ('mode.buttonText', '(mode as any).buttonText'),
    ('mode.xpReward', '(mode as any).xpReward'),
    ('mode.coinReward', '(mode as any).coinReward'),
    ('game.buttonText', '(game as any).buttonText'),
    ('game.route', '(game as any).route'),
])

fix_file('apps/web/app/syllabus/page.tsx', [
    ('selectedExam.papers', 'selectedExam?.papers'),
    ('selectedExam.title', 'selectedExam?.title'),
    ('selectedPaper.name', 'selectedPaper?.name'),
    ('selectedPaper.subjects', 'selectedPaper?.subjects'),
    ('newExam.papers', 'newExam?.papers'),
])

fix_file('apps/web/app/teacher/practice-sets/[id]/edit/page.tsx', [
    ('selectedSubject.name', 'selectedSubject?.name'),
])

fix_file('apps/web/app/teacher/practice-sets/new/page.tsx', [
    ('selectedSubject.name', 'selectedSubject?.name'),
])

fix_file('apps/web/app/teacher/settings/page.tsx', [
    ('onClick={(e) => handleSave(item.redirectTo)}', 'onClick={(e: any) => handleSave(item.redirectTo)}'),
    ('onClick={(e) => handleSave()}', 'onClick={(e: any) => handleSave()}'),
])

fix_file('apps/web/components/teacher/mock-exams/MockExamBuilder.tsx', [
    ('selectedSubject.id', 'selectedSubject?.id'),
    ('selectedSubject.name', 'selectedSubject?.name'),
])
