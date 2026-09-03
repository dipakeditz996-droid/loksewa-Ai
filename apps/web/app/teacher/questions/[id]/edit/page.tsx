"use client";

import { use } from "react";
import QuestionStudio from "../../components/QuestionStudio";

export default function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <QuestionStudio questionId={id} />;
}
