import QuestionStudio from "../../components/QuestionStudio";

export default function EditQuestionPage({ params }: { params: { id: string } }) {
  return <QuestionStudio questionId={params.id} />;
}
