import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, Trash2, Calendar, Clock, BookOpen, 
  Settings, ChevronDown, ChevronUp, Wand2, FileText, PlaySquare, ListTodo
} from "lucide-react";
import toast from "react-hot-toast";

export default function DailyTasksStep({ data, setData, onNext, onBack }: any) {
  const [expandedDay, setExpandedDay] = useState<number | null>(1);

  // Initialize tasks if empty
  useEffect(() => {
    if (data.tasks.length === 0 && data.durationDays > 0) {
      // We don't auto-generate all tasks immediately, just wait for user to add or auto-generate
    }
  }, [data.durationDays, data.tasks.length]);

  const handleAutoGenerate = () => {
    if (data.subjects.length === 0) {
      toast.error("Please add subjects in the previous step first.");
      return;
    }

    const generatedTasks: any[] = [];
    let taskId = 1;

    for (let day = 1; day <= data.durationDays; day++) {
      const subject = data.subjects[(day - 1) % data.subjects.length];
      
      generatedTasks.push({
        id: `t-${taskId++}`,
        day,
        title: `Read ${subject.name} - Chapter ${Math.ceil(day / 2)}`,
        subjectId: subject.id,
        type: "Read",
        estimatedMinutes: 60,
        difficulty: "Medium",
        priority: "High",
        order: 0,
      });

      if (day % 3 === 0) {
        generatedTasks.push({
          id: `t-${taskId++}`,
          day,
          title: `Practice ${subject.name}`,
          subjectId: subject.id,
          type: "Practice",
          estimatedMinutes: 45,
          questionCount: 30,
          difficulty: "Medium",
          priority: "Medium",
          order: 1,
        });
      }
    }

    setData({ ...data, tasks: generatedTasks });
    toast.success(`Generated ${generatedTasks.length} tasks across ${data.durationDays} days.`);
  };

  const handleAddTask = (day: number) => {
    const newTask = {
      id: `t-${Date.now()}`,
      day,
      title: "New Task",
      subjectId: data.subjects[0]?.id || "",
      type: "Read",
      estimatedMinutes: 30,
      difficulty: "Medium",
      priority: "Medium",
      order: data.tasks.filter((t: any) => t.day === day).length,
    };
    setData({ ...data, tasks: [...data.tasks, newTask] });
  };

  const handleUpdateTask = (taskId: string, field: string, value: any) => {
    setData({
      ...data,
      tasks: data.tasks.map((t: any) => t.id === taskId ? { ...t, [field]: value } : t)
    });
  };

  const handleRemoveTask = (taskId: string) => {
    setData({
      ...data,
      tasks: data.tasks.filter((t: any) => t.id !== taskId)
    });
  };

  const handleMoveTask = (taskId: string, direction: 'up' | 'down') => {
    const taskIndex = data.tasks.findIndex((t: any) => t.id === taskId);
    if (taskIndex === -1) return;
    
    const task = data.tasks[taskIndex];
    const dayTasks = data.tasks.filter((t: any) => t.day === task.day).sort((a: any, b: any) => a.order - b.order);
    const dayIndex = dayTasks.findIndex((t: any) => t.id === taskId);
    
    if (direction === 'up' && dayIndex > 0) {
      const prevTask = dayTasks[dayIndex - 1];
      const newTasks = data.tasks.map((t: any) => {
        if (t.id === task.id) return { ...t, order: prevTask.order };
        if (t.id === prevTask.id) return { ...t, order: task.order };
        return t;
      });
      setData({ ...data, tasks: newTasks });
    } else if (direction === 'down' && dayIndex < dayTasks.length - 1) {
      const nextTask = dayTasks[dayIndex + 1];
      const newTasks = data.tasks.map((t: any) => {
        if (t.id === task.id) return { ...t, order: nextTask.order };
        if (t.id === nextTask.id) return { ...t, order: task.order };
        return t;
      });
      setData({ ...data, tasks: newTasks });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Read': return <BookOpen className="w-3.5 h-3.5" />;
      case 'Practice': return <FileText className="w-3.5 h-3.5" />;
      case 'Video': return <PlaySquare className="w-3.5 h-3.5" />;
      default: return <Settings className="w-3.5 h-3.5" />;
    }
  };

  // Group tasks by day
  const days = Array.from({ length: data.durationDays }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-[#0B2545]">Daily Tasks Schedule</h3>
          <p className="text-sm text-slate-500">Plan out the daily activities for the students.</p>
        </div>
        <Button 
          variant="outline" 
          className="bg-[#D4A72C] text-[#0B2545] border-none hover:bg-[#b08b25]"
          onClick={handleAutoGenerate}
        >
          <Wand2 className="w-4 h-4 mr-2" />
          Auto-Generate Schedule
        </Button>
      </div>

      <div className="space-y-3">
        {days.map(day => {
          const dayTasks = data.tasks.filter((t: any) => t.day === day).sort((a: any, b: any) => a.order - b.order);
          const totalMinutes = dayTasks.reduce((acc: number, t: any) => acc + (t.estimatedMinutes || 0), 0);
          const isExpanded = expandedDay === day;

          return (
            <div key={day} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div 
                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50 border-b border-slate-200' : ''}`}
                onClick={() => setExpandedDay(isExpanded ? null : day)}
              >
                <div className="flex items-center gap-4">
                  <div className="bg-[#0B2545] text-white text-xs font-bold px-2 py-1 rounded">
                    DAY {day.toString().padStart(2, '0')}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><ListTodo className="w-4 h-4" /> {dayTasks.length} Tasks</span>
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</span>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </div>

              {isExpanded && (
                <div className="p-4 bg-slate-50/50 space-y-3">
                  {dayTasks.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-sm">
                      No tasks scheduled for this day.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dayTasks.map((task: any, index: number) => (
                        <div key={task.id} className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col md:flex-row gap-4 items-start md:items-center">
                          <div className="flex-1 space-y-3 w-full">
                            <div className="flex gap-2 w-full">
                              <Input 
                                value={task.title}
                                onChange={(e) => handleUpdateTask(task.id, 'title', e.target.value)}
                                className="font-medium bg-slate-50"
                                placeholder="Task Title"
                              />
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              <Select value={task.type} onValueChange={(v) => handleUpdateTask(task.id, 'type', v)}>
                                <SelectTrigger className="w-[130px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Read">Read</SelectItem>
                                  <SelectItem value="Practice">Practice</SelectItem>
                                  <SelectItem value="Video">Video</SelectItem>
                                  <SelectItem value="Revision">Revision</SelectItem>
                                  <SelectItem value="Mock Exam">Mock Exam</SelectItem>
                                </SelectContent>
                              </Select>

                              <div className="flex items-center gap-1 bg-slate-100 rounded-md px-2 h-8 border border-slate-200">
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                <Input 
                                  type="number"
                                  className="w-16 h-6 p-1 text-xs border-none bg-transparent focus-visible:ring-0 shadow-none text-right"
                                  value={task.estimatedMinutes}
                                  onChange={(e) => handleUpdateTask(task.id, 'estimatedMinutes', parseInt(e.target.value) || 0)}
                                />
                                <span className="text-xs text-slate-500 pr-1">min</span>
                              </div>
                              
                              <Select value={task.subjectId} onValueChange={(v) => handleUpdateTask(task.id, 'subjectId', v)}>
                                <SelectTrigger className="w-[150px] h-8 text-xs">
                                  <SelectValue placeholder="Subject" />
                                </SelectTrigger>
                                <SelectContent>
                                  {data.subjects.map((sub: any) => (
                                    <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 md:ml-auto w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0">
                            <Button 
                              variant="ghost" size="icon" className="h-8 w-8 text-slate-400"
                              onClick={() => handleMoveTask(task.id, 'up')}
                              disabled={index === 0}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" size="icon" className="h-8 w-8 text-slate-400"
                              onClick={() => handleMoveTask(task.id, 'down')}
                              disabled={index === dayTasks.length - 1}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                            <div className="w-px h-6 bg-slate-200 mx-1" />
                            <Button 
                              variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                              onClick={() => handleRemoveTask(task.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="w-full mt-2 border-dashed border-slate-300 text-slate-500 hover:text-[#0B2545] bg-transparent"
                    onClick={() => handleAddTask(day)}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Task to Day {day}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-6 flex justify-between border-t border-slate-100">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button 
          className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white px-8" 
          onClick={onNext}
        >
          Next Step
        </Button>
      </div>
    </div>
  );
}
