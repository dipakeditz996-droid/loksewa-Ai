"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock, Loader2, Save, User, AlertCircle } from "lucide-react";
import { adminStudyPlanApi, AdminStudyPlanTemplate, StudyPlanLevel, StudyPlanTime } from "@/lib/api/admin-study-plan";
import { adminSyllabusApi } from "@/lib/api/admin-syllabus";
import { adminApi } from "@/lib/api/admin";
import toast from "react-hot-toast";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const LEVELS: { value: StudyPlanLevel; label: string; hint: string }[] = [
  { value: "BEGINNER", label: "Beginner", hint: "New to this exam" },
  { value: "INTERMEDIATE", label: "Intermediate", hint: "Has covered the basics" },
  { value: "ADVANCED", label: "Advanced", hint: "Revising and drilling" },
];

const TIMES: { value: StudyPlanTime; label: string }[] = [
  { value: "MORNING", label: "Morning" },
  { value: "AFTERNOON", label: "Afternoon" },
  { value: "EVENING", label: "Evening" },
  { value: "NIGHT", label: "Night" },
];

export default function CreateStudyPlanPage() {
  const router = useRouter();

  const [students, setStudents] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [templates, setTemplates] = useState<AdminStudyPlanTemplate[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  const [studentSearch, setStudentSearch] = useState("");
  const [examId, setExamId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(120);
  const [level, setLevel] = useState<StudyPlanLevel>("BEGINNER");
  const [preferredTime, setPreferredTime] = useState<StudyPlanTime | "">("");
  const [studyDays, setStudyDays] = useState<string[]>([
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
  ]);

  useEffect(() => {
    const load = async () => {
      try {
        const [studentRes, examRes, templateRes] = await Promise.all([
          adminApi.getUsers({ role: "student", pageSize: 200 }),
          adminSyllabusApi.getPositions(),
          adminStudyPlanApi.getTemplates(),
        ]);
        setStudents(studentRes?.users || []);
        setExams(Array.isArray(examRes) ? examRes : ((examRes as any)?.results || []));
        setTemplates(Array.isArray(templateRes) ? templateRes : ((templateRes as any)?.results || []));
      } catch (error) {
        console.error("Failed to load study plan options", error);
        toast.error("Could not load students and exams");
      } finally {
        setLoadingOptions(false);
      }
    };
    load();
  }, []);

  const toggleDay = (day: string) => {
    setStudyDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const visibleStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s: any) =>
      `${s.name || ""} ${s.username || ""} ${s.email || ""}`.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const toggleStudent = (id: number) => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected =
    visibleStudents.length > 0 && visibleStudents.every((s: any) => selectedStudents.has(s.id));

  const toggleAllVisible = () => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleStudents.forEach((s: any) => next.delete(s.id));
      else visibleStudents.forEach((s: any) => next.add(s.id));
      return next;
    });
  };

  // Tomorrow is the earliest the backend will accept.
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const problems: string[] = [];
  if (selectedStudents.size === 0) problems.push("Choose at least one student");
  if (!examId) problems.push("Choose an exam");
  if (!targetDate) problems.push("Set a target date");
  if (studyDays.length === 0) problems.push("Pick at least one study day");
  if (dailyMinutes < 1) problems.push("Daily minutes must be greater than 0");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (problems.length > 0) {
      toast.error(problems[0] || "Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const res = await adminStudyPlanApi.createPlan({
        students: Array.from(selectedStudents),
        exam: Number(examId),
        template: templateId ? Number(templateId) : null,
        target_date: targetDate,
        daily_minutes: dailyMinutes,
        study_days: studyDays,
        preferred_time: preferredTime || null,
        level,
      });

      toast.success(
        `${res.created_count} plan${res.created_count === 1 ? "" : "s"} created · ${res.task_count} tasks`
      );

      // Partial successes matter: say who was passed over and why.
      if (res.skipped_count > 0) {
        const names = res.skipped.map(s => `${s.student} (${s.reason})`).join(", ");
        toast(`Skipped ${res.skipped_count}: ${names}`, { icon: "⚠️", duration: 7000 });
      }
      if (res.warning) {
        toast(res.warning, { icon: "⚠️", duration: 7000 });
      }
      router.push("/admin-dashboard/study-plans");
    } catch (error: any) {
      toast.error(error?.data?.error || error.message || "Could not create the study plan");
    } finally {
      setSaving(false);
    }
  };

  if (loadingOptions) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#0B2545]" />
        <p className="text-slate-500 text-sm">Loading students and exams...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Link
          href="/admin-dashboard/study-plans"
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-[#0B2545]">Create Study Plan</h2>
          <p className="text-slate-500 text-sm">
            Assign a plan to a student. Tasks are generated automatically once it&rsquo;s saved.
          </p>
        </div>
      </div>

      {students.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <p className="text-sm text-amber-800">
            There are no students registered yet, so a plan can&rsquo;t be assigned.
          </p>
        </div>
      )}

      {/* Who and what */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <h3 className="font-semibold text-[#0B2545] flex items-center gap-2">
          <User className="w-4 h-4 text-[#D4A72C]" /> Student &amp; Exam
        </h3>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <label className="text-sm font-medium text-slate-700">
              Students * <span className="text-slate-400 font-normal">({selectedStudents.size} selected)</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleAllVisible}
                disabled={visibleStudents.length === 0}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-700"
              >
                {allVisibleSelected
                  ? "Clear all"
                  : studentSearch ? `Select these ${visibleStudents.length}` : "Select all students"}
              </button>
              {selectedStudents.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedStudents(new Set())}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full p-2.5 mb-2 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20"
          />

          <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-slate-100">
            {visibleStudents.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 text-center">No students match that search.</p>
            ) : (
              visibleStudents.map((s: any) => {
                const checked = selectedStudents.has(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                      checked ? "bg-[#0B2545]/5" : "hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStudent(s.id)}
                      className="w-4 h-4 rounded text-[#0B2545]"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900 truncate">
                        {s.name || s.username}
                      </span>
                      {s.email && <span className="block text-xs text-slate-500 truncate">{s.email}</span>}
                    </span>
                  </label>
                );
              })
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Each student gets their own plan. Anyone who already has one is skipped and reported back.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Exam / Position *</label>
            <select
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20"
            >
              <option value="">Select an exam</option>
              {exams.map((x: any) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Template</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20"
            >
              <option value="">No template — generate tasks from the syllabus</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.duration_days} days)
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {templates.length === 0
                ? "No templates exist yet, so tasks will be built from the exam's syllabus."
                : "With a template, its day-by-day tasks are laid onto the student's study days."}
            </p>
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <h3 className="font-semibold text-[#0B2545] flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[#D4A72C]" /> Schedule
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Target Date *</label>
            <input
              type="date"
              value={targetDate}
              min={minDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20"
            />
            <p className="text-xs text-slate-500 mt-1">The exam date the student is working towards.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Daily Study Minutes</label>
            <input
              type="number"
              min={15}
              step={15}
              value={dailyMinutes}
              onChange={(e) => setDailyMinutes(Number(e.target.value))}
              className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20"
            />
            <p className="text-xs text-slate-500 mt-1">
              Roughly {Math.max(1, Math.round(dailyMinutes / 30))} task{Math.round(dailyMinutes / 30) === 1 ? "" : "s"} per study day.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Study Days *</label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => {
              const active = studyDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    active
                      ? "bg-[#0B2545] text-white border-[#0B2545]"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {studyDays.length === 0
              ? "Pick at least one day."
              : `Tasks are scheduled on ${studyDays.length} day${studyDays.length === 1 ? "" : "s"} a week; the rest are left free.`}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" /> Preferred Time
          </label>
          <select
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value as StudyPlanTime | "")}
            className="w-full md:w-1/2 p-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20"
          >
            <option value="">No preference</option>
            {TIMES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Level */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-[#0B2545]">Starting Level</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLevel(l.value)}
              className={`text-left p-4 rounded-lg border transition-colors ${
                level === l.value
                  ? "border-[#0B2545] bg-[#0B2545]/5"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="block font-medium text-slate-900">{l.label}</span>
              <span className="block text-xs text-slate-500 mt-0.5">{l.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-end items-center gap-3">
        {problems.length > 0 && (
          <span className="text-sm text-slate-500 mr-auto">{problems[0]}</span>
        )}
        <Link
          href="/admin-dashboard/study-plans"
          className="px-6 py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving || problems.length > 0 || students.length === 0}
          className="px-6 py-2.5 bg-[#0B2545] hover:bg-[#163E6C] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Creating..." : "Create Study Plan"}
        </button>
      </div>
    </form>
  );
}
