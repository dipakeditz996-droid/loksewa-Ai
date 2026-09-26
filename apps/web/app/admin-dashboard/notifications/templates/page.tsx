"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  Plus,
  Copy,
  Check,
  Send,
  Edit,
  Trash2,
  Sparkles,
  Bell,
  Clock,
  Layers,
  Filter,
  Info,
  Calendar,
  BookOpen,
  GraduationCap,
  ShieldAlert,
  CreditCard,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";

export interface NotificationTemplate {
  id: string;
  name: string;
  category: "exam" | "academic" | "system" | "payment" | "general";
  type: "announcement" | "alert" | "system";
  targetRole: "students" | "teachers" | "admins" | "all" | "course";
  title: string;
  content: string;
  variables: string[];
  isPreset?: boolean;
}

const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    id: "tpl-exam-schedule",
    name: "Loksewa Exam Schedule Announcement",
    category: "exam",
    type: "alert",
    targetRole: "students",
    title: "Official Exam Schedule Published: {exam_name}",
    content: "The Public Service Commission has officially published the examination schedule for {exam_name}. The exam will be conducted on {exam_date} at designated centers. Please review the official syllabus and download your admit card.",
    variables: ["exam_name", "exam_date", "exam_center"],
    isPreset: true,
  },
  {
    id: "tpl-mock-exam",
    name: "New Mock Exam Ready for Practice",
    category: "exam",
    type: "announcement",
    targetRole: "students",
    title: "New Mock Exam Available: {exam_title}",
    content: "A new timed mock exam '{exam_title}' has been unlocked for your preparation package. Test your speed and knowledge under real Loksewa exam conditions with instant AI performance analysis.",
    variables: ["exam_title", "course_name", "duration_minutes"],
    isPreset: true,
  },
  {
    id: "tpl-study-notes",
    name: "New Study Materials & Notes Published",
    category: "academic",
    type: "announcement",
    targetRole: "students",
    title: "New Chapter Notes Added: {subject_name}",
    content: "Comprehensive study notes for '{chapter_name}' under {subject_name} are now available in your portal library. Review key formulas, historical precedents, and curriculum summaries today.",
    variables: ["subject_name", "chapter_name", "paper_name"],
    isPreset: true,
  },
  {
    id: "tpl-subjective-evaluation",
    name: "Subjective Answer Paper Evaluated",
    category: "academic",
    type: "announcement",
    targetRole: "students",
    title: "Your Subjective Paper '{paper_title}' Has Been Evaluated",
    content: "Your submitted subjective answer sheet for {paper_title} has been graded by our expert faculty. You scored {score} marks. Check your detailed feedback, examiner remarks, and model answer comparison.",
    variables: ["paper_title", "score", "evaluator_name"],
    isPreset: true,
  },
  {
    id: "tpl-payment-approval",
    name: "Subscription & Package Activation",
    category: "payment",
    type: "announcement",
    targetRole: "students",
    title: "Payment Approved: Welcome to {package_name}!",
    content: "Your payment verification has been successfully approved! Your {package_name} subscription is now active until {expiry_date}. You have full access to study materials, mock tests, and AI tutoring.",
    variables: ["package_name", "expiry_date", "student_name"],
    isPreset: true,
  },
  {
    id: "tpl-maintenance",
    name: "System Maintenance & Platform Update",
    category: "system",
    type: "system",
    targetRole: "all",
    title: "Scheduled System Maintenance Notice: {maintenance_date}",
    content: "LoksewaAI will undergo routine infrastructure maintenance on {maintenance_date} from {start_time} to {end_time}. Access to mock exams may be briefly disrupted during this window. We apologize for any inconvenience.",
    variables: ["maintenance_date", "start_time", "end_time"],
    isPreset: true,
  },
  {
    id: "tpl-streak-reminder",
    name: "Weekly Preparation Streak & Consistency Reminder",
    category: "general",
    type: "announcement",
    targetRole: "students",
    title: "Keep Up Your Loksewa Preparation Streak! 🎯",
    content: "Consistency is key to cracking the Public Service Commission exams! Complete at least 20 practice questions today to maintain your daily streak and earn bonus platform XP.",
    variables: ["student_name", "current_streak"],
    isPreset: true,
  },
  {
    id: "tpl-teacher-announcement",
    name: "Faculty & Evaluator Notice",
    category: "academic",
    type: "system",
    targetRole: "teachers",
    title: "Notice to Evaluators: Pending Subjective Submissions",
    content: "Dear Evaluator, there are {pending_count} pending subjective exam submissions awaiting review for {course_name}. Please complete evaluations within 48 hours to maintain student progress timelines.",
    variables: ["pending_count", "course_name"],
    isPreset: true,
  },
];

const CATEGORIES = [
  { id: "all", label: "All Templates" },
  { id: "exam", label: "Exams", icon: GraduationCap },
  { id: "academic", label: "Academic & Notes", icon: BookOpen },
  { id: "payment", label: "Payments & Plans", icon: CreditCard },
  { id: "system", label: "System & Alerts", icon: ShieldAlert },
  { id: "general", label: "General & Motivation", icon: Sparkles },
];

export default function NotificationTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<NotificationTemplate[]>(DEFAULT_TEMPLATES);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "exam" as NotificationTemplate["category"],
    type: "announcement" as NotificationTemplate["type"],
    targetRole: "students" as NotificationTemplate["targetRole"],
    title: "",
    content: "",
    variableInput: "",
  });

  // Load saved custom templates from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("loksewa_notification_templates");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge custom templates with default presets
          const custom = parsed.filter((t: NotificationTemplate) => !t.isPreset);
          setTemplates([...DEFAULT_TEMPLATES, ...custom]);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const saveToStorage = (updatedList: NotificationTemplate[]) => {
    try {
      localStorage.setItem("loksewa_notification_templates", JSON.stringify(updatedList));
    } catch {
      // Ignore storage errors
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesCategory = activeCategory === "all" || t.category === activeCategory;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [templates, activeCategory, search]);

  const handleCopyContent = (t: NotificationTemplate) => {
    const textToCopy = `Title: ${t.title}\n\n${t.content}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(t.id);
    toast.success("Template copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUseTemplate = (t: NotificationTemplate) => {
    const params = new URLSearchParams({
      create: "true",
      title: t.title,
      content: t.content,
      type: t.type,
      targetRole: t.targetRole,
    });
    router.push(`/admin-dashboard/notifications?${params.toString()}`);
  };

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setForm({
      name: "",
      category: "exam",
      type: "announcement",
      targetRole: "students",
      title: "",
      content: "",
      variableInput: "",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (t: NotificationTemplate) => {
    setEditingTemplate(t);
    setForm({
      name: t.name,
      category: t.category,
      type: t.type,
      targetRole: t.targetRole,
      title: t.title,
      content: t.content,
      variableInput: t.variables.join(", "),
    });
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    saveToStorage(updated);
    toast.success("Template removed.");
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.title.trim() || !form.content.trim()) {
      toast.error("Please fill in the template name, title, and content.");
      return;
    }

    const variables = form.variableInput
      .split(",")
      .map((v) => v.trim().replace(/^\{+|\}+$/g, ""))
      .filter(Boolean);

    if (editingTemplate) {
      const updated = templates.map((t) =>
        t.id === editingTemplate.id
          ? {
              ...t,
              name: form.name.trim(),
              category: form.category,
              type: form.type,
              targetRole: form.targetRole,
              title: form.title.trim(),
              content: form.content.trim(),
              variables,
            }
          : t
      );
      setTemplates(updated);
      saveToStorage(updated);
      toast.success("Template updated successfully!");
    } else {
      const newTpl: NotificationTemplate = {
        id: `custom-${Date.now()}`,
        name: form.name.trim(),
        category: form.category,
        type: form.type,
        targetRole: form.targetRole,
        title: form.title.trim(),
        content: form.content.trim(),
        variables,
        isPreset: false,
      };
      const updated = [newTpl, ...templates];
      setTemplates(updated);
      saveToStorage(updated);
      toast.success("New template created!");
    }

    setModalOpen(false);
  };

  const insertVariable = (varName: string) => {
    setForm((prev) => ({
      ...prev,
      content: prev.content ? `${prev.content} {${varName}}` : `{${varName}}`,
    }));
  };

  const getTypeBadge = (type: NotificationTemplate["type"]) => {
    switch (type) {
      case "alert":
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200">Alert</Badge>;
      case "system":
        return <Badge className="bg-purple-100 text-purple-700 border-purple-200">System</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Announcement</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#0B2545] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#D4A72C]" />
            Notification Templates
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Pre-configured message formats and reusable presets for swift broadcasting to students, teachers, and admins.
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            onClick={handleOpenCreate}
            className="w-full sm:w-auto bg-[#0B2545] hover:bg-[#163E6C] text-white font-semibold gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search templates by title, variable, or message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 focus:border-[#0B2545]"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{filteredTemplates.length}</span> of{" "}
            {templates.length} templates
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar border-t border-slate-100 pt-3">
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#0B2545] text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {cat.icon && <cat.icon className="w-3.5 h-3.5" />}
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No templates found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            No notification templates match your search query or filter. Try a different term or create a new template.
          </p>
          <Button
            onClick={() => {
              setSearch("");
              setActiveCategory("all");
            }}
            variant="outline"
            className="text-xs mt-2"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-[#0B2545]/40 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-base group-hover:text-[#0B2545] transition-colors">
                        {t.name}
                      </span>
                      {t.isPreset && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                          System Preset
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>Audience: <strong className="text-slate-700 capitalize">{t.targetRole}</strong></span>
                      <span>•</span>
                      <span>Category: <strong className="text-slate-700 capitalize">{t.category}</strong></span>
                    </div>
                  </div>
                  <div>{getTypeBadge(t.type)}</div>
                </div>

                {/* Subject / Title */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                    Subject Header
                  </div>
                  <p className="text-sm font-semibold text-slate-800 leading-snug">
                    {t.title}
                  </p>
                </div>

                {/* Body Content */}
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Message Body
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                    {t.content}
                  </p>
                </div>

                {/* Variables Pills */}
                {t.variables && t.variables.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Dynamic Placeholders
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {t.variables.map((v) => (
                        <span
                          key={v}
                          className="inline-flex items-center text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md"
                        >
                          {`{${v}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyContent(t)}
                    className="h-8 text-xs gap-1.5 bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  >
                    {copiedId === t.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        Copy
                      </>
                    )}
                  </Button>

                  {!t.isPreset && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(t)}
                        className="h-8 text-xs text-slate-600 hover:text-slate-900"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(t.id)}
                        className="h-8 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={() => handleUseTemplate(t)}
                  className="h-8 text-xs gap-1.5 bg-[#0B2545] hover:bg-[#163E6C] text-white font-semibold shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  Use in Broadcast
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Template Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="admin-light-scope sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white text-slate-900 border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0B2545]" />
              {editingTemplate ? "Edit Template" : "Create New Notification Template"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Configure reusable message presets for rapid platform communication.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveModal} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Template Name <span className="text-rose-500">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. PSC 5th Level Exam Date Alert"
                className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 focus:border-[#0B2545]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Category</label>
                <Select
                  value={form.category}
                  onValueChange={(val) =>
                    setForm({ ...form, category: val as NotificationTemplate["category"] })
                  }
                >
                  <SelectTrigger className="bg-white text-slate-900 border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200">
                    <SelectItem value="exam">Exams</SelectItem>
                    <SelectItem value="academic">Academic & Notes</SelectItem>
                    <SelectItem value="payment">Payments</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Type</label>
                <Select
                  value={form.type}
                  onValueChange={(val) =>
                    setForm({ ...form, type: val as NotificationTemplate["type"] })
                  }
                >
                  <SelectTrigger className="bg-white text-slate-900 border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200">
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="alert">Alert</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Target Audience</label>
                <Select
                  value={form.targetRole}
                  onValueChange={(val) =>
                    setForm({ ...form, targetRole: val as NotificationTemplate["targetRole"] })
                  }
                >
                  <SelectTrigger className="bg-white text-slate-900 border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200">
                    <SelectItem value="students">All Students</SelectItem>
                    <SelectItem value="teachers">All Teachers</SelectItem>
                    <SelectItem value="admins">Admins</SelectItem>
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="course">Course Enrollees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Subject / Title <span className="text-rose-500">*</span>
              </label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Important: Exam Schedule for {exam_name}"
                className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 focus:border-[#0B2545]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700">
                  Message Content <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">Click below to insert placeholder</span>
              </div>
              <Textarea
                rows={4}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Write your template body. You can use placeholders like {exam_name}, {date}, {student_name}..."
                className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 focus:border-[#0B2545]"
              />
              {/* Quick variable tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["exam_name", "exam_date", "course_name", "student_name", "score"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertVariable(tag)}
                    className="text-[10px] font-mono bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 px-2 py-0.5 rounded transition-colors"
                  >
                    +{`{${tag}}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Variables List (comma-separated)
              </label>
              <Input
                value={form.variableInput}
                onChange={(e) => setForm({ ...form, variableInput: e.target.value })}
                placeholder="exam_name, exam_date, exam_center"
                className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 focus:border-[#0B2545]"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="bg-white text-slate-700 border-slate-300"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-[#0B2545] hover:bg-[#163E6C] text-white">
                {editingTemplate ? "Save Changes" : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
