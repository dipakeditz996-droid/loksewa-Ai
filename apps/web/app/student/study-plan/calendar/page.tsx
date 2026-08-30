"use client";

import React, { useEffect, useState } from "react";
import { studyPlanApi, StudyTask } from "@/lib/api/study-plan";
import { Button } from "@/components/ui/button";

import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, CheckCircle2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CalendarPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    // In a real app, we'd fetch tasks just for this month
    // For now we just fetch all tasks since the generated plan is only 14 days
    studyPlanApi.getTasks().then(setTasks).finally(() => setLoading(false));
  }, []);

  const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
  const daysInMonth = [];
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    daysInMonth.push(new Date(d));
  }
  
  // Pad the beginning of the month with empty cells
  const startingDayIndex = monthStart.getDay(); // 0 is Sunday
  const paddingDays = Array.from({ length: startingDayIndex }).map((_, i) => i);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary dark:text-foreground" /></div>;
  }

  const prevMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonth(d);
  };

  const nextMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + 1);
    setCurrentMonth(d);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 min-h-[calc(100vh-72px)] bg-muted/50">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-foreground">Study Calendar</h1>
          <p className="text-muted-foreground mt-1 font-medium">View your scheduled tasks and track completion history.</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/student/study-plan")}>
          Back to Dashboard
        </Button>
      </div>
      
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="w-5 h-5" /></Button>
          <h2 className="text-lg font-bold text-primary dark:text-foreground">{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentMonth)}</h2>
          <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="w-5 h-5" /></Button>
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 border-b border-border bg-muted">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="p-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider border-r last:border-0 border-border">
              {d}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 auto-rows-[120px]">
          {paddingDays.map(i => (
            <div key={`pad-${i}`} className="border-r border-b border-border/50 bg-muted/50" />
          ))}
          
          {daysInMonth.map((day, idx) => {
            const dayTasks = tasks.filter(t => isSameDay(new Date(t.date), day));
            const isToday = isSameDay(day, new Date());
            
            return (
              <div key={day.toISOString()} className={`border-r border-b border-border/50 p-2 overflow-hidden hover:bg-muted transition-colors ${isToday ? 'bg-blue-50 dark:bg-blue-950/30/50' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground text-white' : 'text-foreground'}`}>
                    {day.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded">
                      {dayTasks.length} tasks
                    </span>
                  )}
                </div>
                
                <div className="space-y-1 overflow-y-auto max-h-[70px] scrollbar-hide">
                  {dayTasks.map(t => (
                    <div key={t.id} className={`text-[10px] truncate px-1.5 py-1 rounded font-medium flex items-center gap-1 ${
                      t.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:text-green-300' :
                      t.status === 'SKIPPED' ? 'bg-red-100 text-red-700 dark:text-red-300' :
                      'bg-muted/80 text-foreground'
                    }`}>
                      {t.status === 'COMPLETED' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {t.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}
