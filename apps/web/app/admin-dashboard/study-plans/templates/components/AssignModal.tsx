"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { courseEnrollmentApi, PublicCourse } from "@/lib/api/enrollment";
import { adminStudyPlanApi, AdminStudyPlanTemplate } from "@/lib/api/admin-study-plan";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface AssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: AdminStudyPlanTemplate | null;
  onAssignSuccess: () => void;
}

export function AssignModal({ isOpen, onClose, template, onAssignSuccess }: AssignModalProps) {
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | "">("");
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCourses();
      // If template is already linked to a course, preselect it
      if (template?.course) {
        setSelectedCourseId(template.course);
      } else {
        setSelectedCourseId("");
      }
    }
  }, [isOpen, template]);

  async function loadCourses() {
    try {
      setIsLoadingCourses(true);
      const data = await courseEnrollmentApi.getPublicCourses();
      setCourses(data || []);
    } catch (error) {
      toast.error("Failed to load courses.");
    } finally {
      setIsLoadingCourses(false);
    }
  }

  const handleAssign = async () => {
    if (!template || !selectedCourseId) return;

    try {
      setIsAssigning(true);
      const res = await adminStudyPlanApi.assignTemplate(template.id, Number(selectedCourseId));
      toast.success(`Successfully assigned template to ${res.count} students.`);
      onAssignSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Could not assign template.");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Template</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-slate-500">
            Assign <strong>{template?.name}</strong> to all active students in a specific course.
          </p>
          <div className="space-y-2">
            <Label>Select Course</Label>
            <select
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : "")}
              disabled={isLoadingCourses || isAssigning || !!template?.course}
            >
              <option value="" disabled>Select a course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            {template?.course && (
              <p className="text-xs text-amber-600">This template is locked to a specific course.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAssigning}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!selectedCourseId || isAssigning} className="bg-[#0B2545] text-white">
            {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign to Students
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
