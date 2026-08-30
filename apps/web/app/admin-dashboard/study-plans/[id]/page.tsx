"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, Loader2, AlertCircle, Trash2, Pause, Play,
  Mail, Target, Clock, CheckCircle2, Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminStudyPlanApi, AdminStudyPlanDetail } from "@/lib/api/admin-study-plan";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const levelColors: Record<string, string> = {
  BEGINNER: "bg-green-100 text-green-700",
  INTERMEDIATE: "bg-yellow-100 text-yellow-700",
  ADVANCED: "bg-red-100 text-red-700",
};

export default function StudyPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const planId = resolvedParams.id;
  const router = useRouter();

  const [plan, setPlan] = useState<AdminStudyPlanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await adminStudyPlanApi.getPlan(planId);
      setPlan(data);
    } catch (error) {
      console.error("Failed to load study plan", error);
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePause = async () => {
    if (!plan) return;
    setIsActing(true);
    try {
      await adminStudyPlanApi.updatePlan(planId, { is_paused: !plan.isPaused });
      loadData();
    } catch (error) {
      console.error("Failed to update study plan", error);
    } finally {
      setIsActing(false);
    }
  };

  const handleDelete = async () => {
    try {
      await adminStudyPlanApi.deletePlan(planId);
      router.push("/admin-dashboard/study-plans");
    } catch (error) {
      console.error("Failed to delete study plan", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-500 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <p>Study plan not found.</p>
        </div>
        <Link href="/admin-dashboard/study-plans" className="text-sm text-[#0B2545] underline mt-4 inline-block">
          Back to Study Plans
        </Link>
      </div>
    );
  }

  const progressPct = plan.taskCount > 0 ? Math.round((plan.completedTasks / plan.taskCount) * 100) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-2" onClick={() => router.push("/admin-dashboard/study-plans")}>
          <ArrowLeft className="w-4 h-4" /> Back to Study Plans
        </Button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${levelColors[plan.level] || "bg-slate-100 text-slate-600"}`}>
                {plan.level}
              </span>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${plan.isPaused ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"}`}>
                {plan.isPaused ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {plan.isPaused ? "Paused" : "Active"}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-[#D4A72C]" />
              {plan.student}'s Study Plan
            </h1>
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> {plan.email}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleTogglePause} disabled={isActing} className="gap-2">
              {plan.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {plan.isPaused ? "Resume Plan" : "Pause Plan"}
            </Button>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(true)} className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-500 text-xs font-medium">Exam</p>
          <p className="text-lg font-bold text-slate-900 truncate">{plan.exam || "-"}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-500 text-xs font-medium flex items-center gap-1"><Target className="w-3.5 h-3.5" /> Target Date</p>
          <p className="text-lg font-bold text-slate-900">{new Date(plan.targetDate).toLocaleDateString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-500 text-xs font-medium flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Daily Minutes</p>
          <p className="text-lg font-bold text-slate-900">{plan.dailyMinutes}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-500 text-xs font-medium">Progress</p>
          <p className="text-lg font-bold text-blue-600">{plan.completedTasks}/{plan.taskCount} ({progressPct}%)</p>
        </div>
      </div>

      {/* Meta */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500">Template</p>
          <p className="text-sm font-medium text-slate-800">{plan.template || "None (custom plan)"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Preferred Time</p>
          <p className="text-sm font-medium text-slate-800">{plan.preferredTime || "N/A"}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs text-slate-500">Study Days</p>
          <p className="text-sm font-medium text-slate-800">{plan.studyDays?.length ? plan.studyDays.join(", ") : "-"}</p>
        </div>
      </div>

      {/* Tasks */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-[#0B2545]">Tasks</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Task</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Duration</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plan.tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No tasks scheduled for this plan.
                  </td>
                </tr>
              ) : (
                plan.tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-slate-600">{new Date(task.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{task.title}</td>
                    <td className="px-6 py-4 text-slate-600">{task.taskType}</td>
                    <td className="px-6 py-4 text-slate-600">{task.durationMinutes} min</td>
                    <td className="px-6 py-4">
                      {task.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded-md text-xs font-medium">
                          <Circle className="h-3.5 w-3.5" /> {task.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Study Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {plan.student}'s study plan? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
