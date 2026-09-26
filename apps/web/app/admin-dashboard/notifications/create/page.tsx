"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Send,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
  Info,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi, NotificationAudience } from "@/lib/api/admin";
import toast from "react-hot-toast";

export default function CreateNotificationPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    content: "",
    type: "announcement" as "alert" | "announcement" | "system",
    targetRole: "students" as NotificationAudience,
    delivery: "now" as "now" | "schedule" | "draft",
    scheduledFor: "",
    courseId: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!form.content.trim()) {
      setFormError("Content is required.");
      return;
    }
    if (form.targetRole === "course" && !form.courseId) {
      setFormError("Course ID is required when targeting students in a specific course.");
      return;
    }
    if (form.delivery === "schedule" && !form.scheduledFor) {
      setFormError("Please select a date and time for the scheduled delivery.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        content: form.content.trim(),
        type: form.type,
        targetRole: form.targetRole,
        delivery: form.delivery,
      };

      if (form.targetRole === "course" && form.courseId) {
        payload.courseId = parseInt(form.courseId);
      }
      if (form.delivery === "schedule" && form.scheduledFor) {
        payload.scheduledFor = new Date(form.scheduledFor).toISOString();
      }

      const res = await adminApi.createNotification(payload);
      toast.success(
        form.delivery === "now"
          ? `Notification dispatched to ${res.delivered} recipient(s)!`
          : form.delivery === "schedule"
          ? "Notification scheduled successfully!"
          : "Notification draft saved!"
      );
      router.push("/admin-dashboard/notifications");
    } catch (err: any) {
      const msg = err?.message || "Failed to create notification.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin-dashboard/notifications"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Broadcasts
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/60">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#0B2545]" />
            Compose New Notification
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch announcements, urgent exam alerts, or system maintenance notices to targeted user groups.
          </p>
        </div>

        {/* Card Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{formError}</span>
            </div>
          )}

          {/* Subject Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Notification Subject / Title <span className="text-rose-500">*</span>
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. PSC 5th Level Examination Schedule Announcement"
              className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 focus:border-[#0B2545]"
            />
          </div>

          {/* Type & Audience Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Message Category / Type <span className="text-rose-500">*</span>
              </label>
              <Select
                value={form.type}
                onValueChange={(val) =>
                  setForm({ ...form, type: val as "alert" | "announcement" | "system" })
                }
              >
                <SelectTrigger className="bg-white text-slate-900 border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900 border-slate-200">
                  <SelectItem value="announcement">Announcement (General Update)</SelectItem>
                  <SelectItem value="alert">Alert (Urgent Exam / Deadline)</SelectItem>
                  <SelectItem value="system">System (Platform / Maintenance)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Target Audience <span className="text-rose-500">*</span>
              </label>
              <Select
                value={form.targetRole}
                onValueChange={(val) =>
                  setForm({ ...form, targetRole: val as NotificationAudience })
                }
              >
                <SelectTrigger className="bg-white text-slate-900 border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900 border-slate-200">
                  <SelectItem value="students">All Enrolled Students</SelectItem>
                  <SelectItem value="teachers">All Teachers & Evaluators</SelectItem>
                  <SelectItem value="admins">Platform Administrators</SelectItem>
                  <SelectItem value="all">Everyone (All Active Accounts)</SelectItem>
                  <SelectItem value="course">Students in a Specific Course</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Course ID (conditional) */}
          {form.targetRole === "course" && (
            <div className="space-y-1.5 bg-blue-50/50 p-3.5 rounded-xl border border-blue-200/80">
              <label className="text-xs font-semibold text-blue-900">
                Specific Course ID <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                value={form.courseId}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                placeholder="Enter numeric course ID (e.g. 1)"
                className="bg-white text-slate-900 border-slate-300"
              />
              <p className="text-[11px] text-blue-600 mt-1">
                Only students with an active subscription or enrollment in this course will receive the notification.
              </p>
            </div>
          )}

          {/* Message Content */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700">
                Message Body Content <span className="text-rose-500">*</span>
              </label>
              <Link
                href="/admin-dashboard/notifications/templates"
                className="text-[11px] text-[#0B2545] font-semibold hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-[#D4A72C]" /> Pick from templates
              </Link>
            </div>
            <Textarea
              rows={5}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Enter the full message text to be delivered to user inboxes..."
              className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 focus:border-[#0B2545]"
            />
          </div>

          {/* Delivery Options */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-700">
              Delivery Timing & Schedule
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { value: "now", label: "Send Immediately", desc: "Dispatched right away" },
                { value: "schedule", label: "Schedule Date", desc: "Queue for later release" },
                { value: "draft", label: "Save as Draft", desc: "Saved only, not sent" },
              ].map((opt) => {
                const isSelected = form.delivery === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => setForm({ ...form, delivery: opt.value as any })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#0B2545]/5 border-[#0B2545] text-[#0B2545]"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="font-semibold text-xs">{opt.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {form.delivery === "schedule" && (
            <div className="space-y-1.5 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/80">
              <label className="text-xs font-semibold text-amber-900">
                Scheduled Release Timestamp <span className="text-rose-500">*</span>
              </label>
              <Input
                type="datetime-local"
                value={form.scheduledFor}
                onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })}
                className="bg-white text-slate-900 border-slate-300"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin-dashboard/notifications")}
              className="bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#0B2545] hover:bg-[#163E6C] text-white font-semibold gap-1.5 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Dispatching...
                </>
              ) : form.delivery === "now" ? (
                <>
                  <Send className="w-4 h-4" /> Send Notification Now
                </>
              ) : form.delivery === "schedule" ? (
                <>
                  <Clock className="w-4 h-4" /> Schedule Notification
                </>
              ) : (
                "Save as Draft"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
