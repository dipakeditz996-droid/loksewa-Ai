"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Edit3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SingleQuestionForm } from "@/components/admin/questions/SingleQuestionForm";
import { adminQuestionApi, AdminQuestion } from "@/lib/api/admin-questions";
import { useRouter } from "next/navigation";

export default function EditQuestionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [question, setQuestion] = useState<AdminQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        const data = await adminQuestionApi.getQuestion(Number(params.id));
        setQuestion(data);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load question details.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuestion();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#0B2545] animate-spin mb-4" />
        <p className="text-slate-500">Loading question details...</p>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <Edit3 className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Error</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-8">{error}</p>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin-dashboard/academic/questions" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Question</h1>
          <p className="text-gray-500 mt-1">Update question details and syllabus mapping.</p>
        </div>
      </div>

      <div className="max-w-4xl mt-6">
        <SingleQuestionForm initialData={question} onSaveSuccess={() => router.push('/admin-dashboard/academic/questions')} />
      </div>
    </div>
  );
}
