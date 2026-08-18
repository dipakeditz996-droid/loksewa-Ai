"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { supportApi } from "@/lib/api/support";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const CATEGORIES = [
  { key: "exam_problem", label: "Exam Problem" },
  { key: "wrong_question", label: "Wrong Question/Answer" },
  { key: "technical", label: "Technical Issue" },
  { key: "ai_tutor", label: "AI Tutor Problem" },
  { key: "account", label: "Account Problem" },
  { key: "payment", label: "Payment/Marketplace" },
  { key: "other", label: "Other" },
];

export default function CreateTicketPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    subject: "",
    category: "other",
    priority: "normal",
    description: "",
    related_exam: "",
    related_question: "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => supportApi.createTicket(data),
    onSuccess: (data) => {
      toast.success("Ticket created successfully!");
      router.push(`/student/help-support/tickets/${data.id}`);
    },
    onError: () => toast.error("Failed to create ticket. Please try again."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error("Subject and description are required.");
      return;
    }
    mutation.mutate({
      ...form,
      related_page: window.location.href, // Can be useful context
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/student/help-support/tickets" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-[#0B2545] transition-colors mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Tickets
        </Link>
        <h1 className="text-2xl font-bold text-[#0B2545]">Report a Problem</h1>
        <p className="text-sm text-slate-500 mt-1">Provide details about your issue so we can help you quickly.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[13px] font-semibold text-slate-700">Subject <span className="text-red-500">*</span></Label>
            <Input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Brief summary of the issue..."
              className="bg-slate-50 border-slate-200 focus:border-[#D4A72C] focus:ring-[#D4A72C]/20"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-slate-700">Category <span className="text-red-500">*</span></Label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/20 focus:border-[#D4A72C]"
              >
                {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-slate-700">Priority <span className="text-red-500">*</span></Label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/20 focus:border-[#D4A72C]"
              >
                <option value="low">Low - General inquiry</option>
                <option value="normal">Normal - Standard issue</option>
                <option value="high">High - Blocking my progress</option>
                <option value="urgent">Urgent - System down/critical</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[13px] font-semibold text-slate-700">Description <span className="text-red-500">*</span></Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Please describe your issue in detail. If reporting a wrong question, include the question text or number."
              className="min-h-[150px] bg-slate-50 border-slate-200 focus:border-[#D4A72C] focus:ring-[#D4A72C]/20 resize-y"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-slate-700">Related Exam (Optional)</Label>
              <Input
                value={form.related_exam}
                onChange={(e) => setForm({ ...form, related_exam: e.target.value })}
                placeholder="e.g. Section Officer Mock Test 1"
                className="bg-slate-50 border-slate-200 focus:border-[#D4A72C] focus:ring-[#D4A72C]/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-slate-700">Question Number (Optional)</Label>
              <Input
                value={form.related_question}
                onChange={(e) => setForm({ ...form, related_question: e.target.value })}
                placeholder="e.g. Q. 45"
                className="bg-slate-50 border-slate-200 focus:border-[#D4A72C] focus:ring-[#D4A72C]/20"
              />
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <Button
              type="submit"
              disabled={mutation.isPending || !form.subject.trim() || !form.description.trim()}
              className="bg-[#0B2545] hover:bg-[#163E6B] text-white px-8"
            >
              {mutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Submit Ticket</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
