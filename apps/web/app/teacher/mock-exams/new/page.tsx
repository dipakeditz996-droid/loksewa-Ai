import { MockExamBuilder } from "@/components/teacher/mock-exams/MockExamBuilder";

export default function NewMockExamPage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <MockExamBuilder mode="create" />
    </div>
  );
}
