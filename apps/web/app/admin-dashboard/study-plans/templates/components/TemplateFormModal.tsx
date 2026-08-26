"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminStudyPlanApi, AdminStudyPlanTemplate, AdminStudyPlanTemplateTask } from "@/lib/api/admin-study-plan";
import { courseEnrollmentApi, PublicCourse } from "@/lib/api/enrollment";
import { adminAcademicApi, ApiExam, ApiSubject, ApiTopic } from "@/lib/api/admin-academic-api";
import { Loader2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface TemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: AdminStudyPlanTemplate | null;
  onSaveSuccess: () => void;
}

export function TemplateFormModal({ isOpen, onClose, template, onSaveSuccess }: TemplateFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationDays, setDurationDays] = useState(30);
  const [courseId, setCourseId] = useState<number | "">("");
  const [examId, setExamId] = useState<number | "">("");
  const [tasks, setTasks] = useState<Partial<AdminStudyPlanTemplateTask>[]>([]);

  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [exams, setExams] = useState<ApiExam[]>([]);
  const [subjects, setSubjects] = useState<ApiSubject[]>([]);
  const [topicsMap, setTopicsMap] = useState<Record<number, ApiTopic[]>>({});

  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const TASK_TYPES = [
    { value: 'STUDY_NOTE', label: 'Study Note' },
    { value: 'PRACTICE', label: 'Practice' },
    { value: 'MODEL_EXAM', label: 'Model Exam' },
    { value: 'SUBJECTIVE_PRACTICE', label: 'Subjective Practice' },
    { value: 'REVIEW_MISTAKES', label: 'Review Mistakes' },
    { value: 'REVISION', label: 'Revision' }
  ];

  useEffect(() => {
    if (isOpen) {
      loadMetadata();
      if (template) {
        setName(template.name);
        setDescription(template.description);
        setDurationDays(template.duration_days);
        setCourseId(template.course || "");
        setExamId(template.exam || "");
        setTasks(template.tasks || []);
      } else {
        setName("");
        setDescription("");
        setDurationDays(30);
        setCourseId("");
        setExamId("");
        setTasks([]);
      }
    }
  }, [isOpen, template]);

  useEffect(() => {
    // When tasks change, if there are new subjects, we should load their topics
    tasks.forEach(task => {
      if (task.subject && !topicsMap[task.subject]) {
        loadTopics(task.subject);
      }
    });
  }, [tasks]);

  async function loadMetadata() {
    try {
      setIsLoadingMetadata(true);
      const [coursesData, examsData] = await Promise.all([
        courseEnrollmentApi.getPublicCourses(),
        adminAcademicApi.getExams()
      ]);
      setCourses(coursesData || []);
      setExams(examsData || []);

      // We should ideally load subjects based on exam, but our API is paper-based. 
      // For simplicity in this demo form, we might just load all subjects or rely on cascading.
      // If `adminAcademicApi.getSubjects()` without paperId works, use it.
      const subjectsData = await adminAcademicApi.getSubjects();
      setSubjects(subjectsData || []);
    } catch (err) {
      console.error("Failed to load metadata", err);
    } finally {
      setIsLoadingMetadata(false);
    }
  }

  async function loadTopics(subjectId: number) {
    try {
      // Get chapters for the subject, then get topics? 
      // adminAcademicApi expects chapterId for getTopics.
      // For the sake of this UI which simplifies subject->topic, we might just fetch all chapters and topics if possible, or leave topic blank if difficult.
      // Let's assume we can fetch chapters, then topics.
      const chapters = await adminAcademicApi.getChapters(subjectId);
      let allTopics: ApiTopic[] = [];
      for (const chapter of chapters) {
        const t = await adminAcademicApi.getTopics(chapter.id);
        allTopics = [...allTopics, ...t];
      }
      setTopicsMap(prev => ({ ...prev, [subjectId]: allTopics }));
    } catch (err) {
      console.error("Failed to load topics", err);
    }
  }

  const handleAddTask = () => {
    setTasks([...tasks, {
      day_number: tasks.length > 0 ? Math.max(...tasks.map(t => t.day_number || 0)) + 1 : 1,
      title: "",
      task_type: "STUDY_NOTE",
      duration_minutes: 30,
      subject: null,
      topic: null
    }]);
  };

  const handleUpdateTask = (index: number, field: keyof AdminStudyPlanTemplateTask, value: any) => {
    const updated = [...tasks];
    updated[index] = { ...updated[index], [field]: value };
    // Reset topic if subject changes
    if (field === 'subject') {
      updated[index].topic = null;
    }
    setTasks(updated);
  };

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name || durationDays < 1) {
      toast.error("Name and duration are required.");
      return;
    }
    
    // Validate tasks
    for (let i = 0; i < tasks.length; i++) {
      if (!tasks[i]?.title || !tasks[i]?.day_number) {
        toast.error(`Task ${i+1} requires a title and day number.`);
        return;
      }
    }

    try {
      setIsSaving(true);
      const payload: Partial<AdminStudyPlanTemplate> = {
        name,
        description,
        duration_days: durationDays,
        course: courseId ? Number(courseId) : null,
        exam: examId ? Number(examId) : null,
        tasks: tasks as AdminStudyPlanTemplateTask[]
      };

      if (template?.id) {
        await adminStudyPlanApi.updateTemplate(template.id, payload);
        toast.success("Template updated successfully.");
      } else {
        await adminStudyPlanApi.createTemplate(payload);
        toast.success("Template created successfully.");
      }
      onSaveSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save template.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "Create Template"}</DialogTitle>
          <DialogDescription>
            Configure the template structure and its tasks.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 30 Day Crash Course" />
            </div>
            <div className="space-y-2">
              <Label>Duration (Days) *</Label>
              <Input type="number" min={1} value={durationDays} onChange={e => setDurationDays(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Linked Course (Optional)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={courseId}
                onChange={e => setCourseId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">-- None --</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Linked Exam (Optional)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={examId}
                onChange={e => setExamId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">-- None --</option>
                {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-slate-700">Tasks</h4>
              <Button size="sm" variant="outline" onClick={handleAddTask}>
                <Plus className="w-4 h-4 mr-2" /> Add Task
              </Button>
            </div>
            
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <p className="text-sm text-slate-500 italic text-center py-4 bg-slate-50 rounded-lg border border-dashed">No tasks added yet.</p>
              ) : (
                tasks.map((task, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 relative group">
                    <div className="col-span-1">
                      <Label className="text-[10px]">Day</Label>
                      <Input type="number" min={1} value={task.day_number || ''} onChange={e => handleUpdateTask(index, 'day_number', Number(e.target.value))} className="h-8 text-sm px-2" />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-[10px]">Title</Label>
                      <Input value={task.title || ''} onChange={e => handleUpdateTask(index, 'title', e.target.value)} className="h-8 text-sm px-2" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[10px]">Type</Label>
                      <select className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs" value={task.task_type} onChange={e => handleUpdateTask(index, 'task_type', e.target.value)}>
                        {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[10px]">Subject</Label>
                      <select className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs" value={task.subject || ''} onChange={e => handleUpdateTask(index, 'subject', e.target.value ? Number(e.target.value) : null)}>
                        <option value="">-</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[10px]">Topic</Label>
                      <select className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs" value={task.topic || ''} onChange={e => handleUpdateTask(index, 'topic', e.target.value ? Number(e.target.value) : null)}>
                        <option value="">-</option>
                        {(task.subject && topicsMap[task.subject]) ? topicsMap[task.subject]?.map(t => <option key={t.id} value={t.id}>{t.name}</option>) : null}
                      </select>
                    </div>
                    <div className="col-span-1">
                      <Label className="text-[10px]">Mins</Label>
                      <Input type="number" min={1} value={task.duration_minutes || ''} onChange={e => handleUpdateTask(index, 'duration_minutes', Number(e.target.value))} className="h-8 text-sm px-2" />
                    </div>
                    <div className="col-span-1 flex items-end justify-center pb-0.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => handleRemoveTask(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-[#0B2545] text-white">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
