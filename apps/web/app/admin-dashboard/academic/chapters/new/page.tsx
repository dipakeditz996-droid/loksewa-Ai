"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";

export default function NewChapterPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    order: 0,
    is_active: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const data = await apiClient<any>("/admin/syllabus/subjects/?page_size=100");
      const subs = Array.isArray(data) ? data : (data.results || []);
      setSubjects(subs);
    } catch (err) {
      console.error("Failed to fetch subjects", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await apiClient("/admin/syllabus/chapters/", {
        method: "POST",
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          subject: parseInt(formData.subject),
          order: formData.order,
          is_active: formData.is_active,
        }),
      });

      router.push("/admin-dashboard/academic/chapters");
    } catch (err: any) {
      setError(err.message || "Failed to create chapter");
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href="/admin-dashboard/academic/chapters">
        <Button variant="ghost" className="gap-2 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Chapters
        </Button>
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2 mb-2">
          <BookOpen className="w-6 h-6 text-[#D4A72C]" />
          Create New Chapter
        </h1>
        <p className="text-slate-500">Add a new chapter to the syllabus</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Subject *
            </label>
            <select
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A72C] bg-white text-slate-900"
            >
              <option value="">-- Select a subject --</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Chapter Title *
            </label>
            <Input
              type="text"
              placeholder="Enter chapter title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              placeholder="Enter chapter description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A72C] bg-white text-slate-900 placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Order
            </label>
            <Input
              type="number"
              placeholder="0"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
              className="bg-white border-slate-200 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-slate-300"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
              Active
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#D4A72C] text-[#0B2545] hover:bg-[#C49B1F] gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Chapter"
              )}
            </Button>
            <Link href="/admin-dashboard/academic/chapters">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
