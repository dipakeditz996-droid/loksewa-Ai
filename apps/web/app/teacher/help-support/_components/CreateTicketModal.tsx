"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { teacherSupportApi } from "@/lib/api/teacher-support";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultCategory?: string;
}

export function CreateTicketModal({
  open,
  onOpenChange,
  onSuccess,
  defaultCategory = "other",
}: CreateTicketModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    category: defaultCategory,
    priority: "normal",
    description: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.description) {
      toast.error("Subject and description are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      await teacherSupportApi.createTicket(formData);
      toast.success("Support request submitted successfully.");
      setFormData({ subject: "", category: "other", priority: "normal", description: "" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectClass = "flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-border bg-card sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-xl text-foreground">Contact Support</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Submit a support request to the LoksewaAI admin team. We typically respond within 24 hours.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="account">Account & Settings</option>
                <option value="exam_problem">Mock Exams</option>
                <option value="wrong_question">Question Bank (Wrong Question/Answer)</option>
                <option value="payment">Study Materials / Payments</option>
                <option value="technical">Technical Issue</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Priority</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="low">Low - Minor issue or question</option>
                <option value="normal">Normal - Standard support</option>
                <option value="high">High - Blocking my work</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Subject</label>
            <Input
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Brief summary of your issue"
              className="rounded-lg border-border"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Description</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Please describe your issue in detail..."
              rows={5}
              className="resize-none rounded-lg border-border"
              required
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" className="rounded-[9px] border-border" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-[9px] bg-[#0B2545] hover:bg-[#163E6C] text-white">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
