"use client";

import React, { useEffect, useState } from "react";
import { studyPlanApi, StudyPlan, StudyTask, StudyPlanProgress } from "@/lib/api/study-plan";
import { Button } from "@/components/ui/button";

import { Calendar, Target, CheckCircle2, Circle, Clock, Flame, Loader2, BookOpen, PenTool, LayoutTemplate, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";

export function Dashboard({ plan, onRegenerate }: { plan: StudyPlan, onRegenerate: () => void }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [upcoming, setUpcoming] = useState<StudyTask[]>([]);
  const [progress, setProgress] = useState<StudyPlanProgress | null>(null);
  const [loadingTasks, setLoadingTasks] = useState(true);
  
  const target = new Date(plan.target_date);
  const now = new Date();
  const daysRemaining = Math.ceil((target.getTime() - now.getTime()) / (1000 * 3600 * 24));

  const fetchDashboardData = async () => {
    try {
      const [todayTasks, upcomingTasks, prog] = await Promise.all([
        studyPlanApi.getTodayTasks(),
        studyPlanApi.getUpcomingTasks(),
        studyPlanApi.getProgress(plan.id)
      ]);
      setTasks(todayTasks);
      setUpcoming(upcomingTasks);
      setProgress(prog);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [plan.id]);

  const handleTaskAction = async (taskId: number, action: 'complete' | 'skip') => {
    try {
      if (action === 'complete') await studyPlanApi.completeTask(taskId);
      else await studyPlanApi.skipTask(taskId);
      
      // Refresh local tasks without full reload for snapiness
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: action === 'complete' ? 'COMPLETED' : 'SKIPPED' } : t));
      
      // Fetch progress again
      studyPlanApi.getProgress(plan.id).then(setProgress).catch(console.error);
    } catch (e) {
      alert(`Failed to ${action} task`);
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'STUDY_NOTE': return <BookOpen className="w-5 h-5 text-blue-500" />;
      case 'PRACTICE': return <Target className="w-5 h-5 text-green-500" />;
      case 'MODEL_EXAM': return <LayoutTemplate className="w-5 h-5 text-purple-500" />;
      case 'SUBJECTIVE_PRACTICE': return <PenTool className="w-5 h-5 text-orange-500" />;
      case 'REVIEW_MISTAKES': return <RotateCw className="w-5 h-5 text-red-500" />;
      default: return <BookOpen className="w-5 h-5 text-slate-500" />;
    }
  };

  const handleTaskNavigation = (task: StudyTask) => {
    if (task.task_type === 'STUDY_NOTE') router.push('/student/notes');
    else if (task.task_type === 'PRACTICE') router.push('/student/practice');
    else if (task.task_type === 'MODEL_EXAM') router.push('/student/exams');
    else if (task.task_type === 'SUBJECTIVE_PRACTICE') router.push('/student/practice');
  };

  const completedToday = tasks.filter(t => t.status === 'COMPLETED').length;
  const totalToday = tasks.length;

  return (
    <div className="space-y-6">
      
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Target Exam</p>
            <p className="text-lg font-bold text-[#0B2545]">{plan.exam_details?.title || 'Loksewa'}</p>
          </div>
          <Target className="w-8 h-8 text-slate-200" />
        </div>
        
        <div className="bg-white border rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Days Remaining</p>
            <p className="text-2xl font-bold text-[#D4A72C]">{Math.max(0, daysRemaining)} <span className="text-sm font-normal text-slate-500">days</span></p>
          </div>
          <Calendar className="w-8 h-8 text-slate-200" />
        </div>
        
        <div className="bg-white border rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Weekly Progress</p>
            <p className="text-2xl font-bold text-[#0B2545]">{progress?.weekly_completed || 0} / {progress?.weekly_tasks || 0}</p>
          </div>
          <Flame className="w-8 h-8 text-orange-200" />
        </div>
        
        <div className="bg-white border rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Today's Focus</p>
            <p className="text-lg font-bold text-[#0B2545]">{plan.daily_minutes} mins</p>
          </div>
          <Clock className="w-8 h-8 text-slate-200" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#0B2545]">Today's Plan</h2>
                <p className="text-sm text-slate-500">{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())} • {completedToday} of {totalToday} completed</p>
              </div>
              <div className="text-right">
                <Button variant="outline" size="sm" onClick={() => fetchDashboardData()}>Refresh</Button>
              </div>
            </div>
            
            {loadingTasks ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" /></div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-[#0B2545]">No tasks for today!</h3>
                <p className="text-slate-500 text-sm">Take a rest, or regenerate your plan if you want to study.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map(task => (
                  <div key={task.id} className={`border rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center transition-all ${task.status === 'COMPLETED' ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:border-[#0B2545]/30'}`}>
                    
                    <div className="flex-1 flex gap-4 w-full">
                      <div className="mt-1">{getTaskIcon(task.task_type)}</div>
                      <div>
                        <h4 className={`font-semibold ${task.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-[#0B2545]'}`}>
                          {task.title}
                        </h4>
                        <div className="flex gap-3 text-xs text-slate-500 mt-1 font-medium">
                          {task.subject_details && <span>{task.subject_details.name}</span>}
                          <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {task.duration_minutes} min</span>
                          {task.status === 'SKIPPED' && <span className="text-red-500">Skipped</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                      {task.status === 'PENDING' && (
                        <>
                          <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => handleTaskNavigation(task)}>Start</Button>
                          <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleTaskAction(task.id, 'skip')}>Skip</Button>
                          <Button size="sm" className="bg-[#0B2545]" onClick={() => handleTaskAction(task.id, 'complete')}>Done</Button>
                        </>
                      )}
                      {task.status === 'COMPLETED' && (
                        <div className="flex items-center text-green-600 font-medium text-sm px-3">
                          <CheckCircle2 className="w-5 h-5 mr-1" /> Completed
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#0B2545] mb-4">Upcoming Schedule</h2>
            
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No upcoming tasks scheduled.</p>
            ) : (
              <div className="space-y-4">
                {upcoming.slice(0, 5).map(task => (
                  <div key={task.id} className="flex gap-3 items-start border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                    <div className="bg-slate-100 rounded px-2 py-1 text-center min-w-[50px]">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">{new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(task.date))}</div>
                      <div className="text-lg font-bold text-[#0B2545] leading-none">{new Date(task.date).getDate()}</div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0B2545] line-clamp-1">{task.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{task.duration_minutes} min</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <Button variant="outline" className="w-full mt-6" onClick={() => router.push('/student/study-plan/calendar')}>
              View Full Calendar
            </Button>
          </div>
          
          {/* Plan Settings */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Plan Actions</h2>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start text-slate-600" onClick={onRegenerate}>
                <RotateCw className="w-4 h-4 mr-2" /> Regenerate Future Tasks
              </Button>
              <Button variant="outline" className="w-full justify-start text-slate-600" onClick={() => alert("Settings modal would open here")}>
                <Target className="w-4 h-4 mr-2" /> Edit Plan Settings
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
