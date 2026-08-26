"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { teacherMockExamsApi, MockExam } from "@/lib/api/teacher-mock-exams";
import { MockExamBuilder } from "@/components/teacher/mock-exams/MockExamBuilder";
import { Loader2 } from "lucide-react";

export default function EditMockExamPage() {
  const { id } = useParams();
  const [exam, setExam] = useState<MockExam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      teacherMockExamsApi.getById(Number(id))
        .then(data => {
          setExam(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex flex-col items-center text-[#667085]">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#0B2545]" />
          <p>Loading examination studio...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return <div className="p-8 text-center text-red-500">Failed to load exam.</div>;
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <MockExamBuilder mode="edit" initialData={exam} />
    </div>
  );
}
