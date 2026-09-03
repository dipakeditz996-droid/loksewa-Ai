"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { communityApi } from "@/lib/api/community";

function AskCommunityForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Prefilled from Practice/Mock Exam's "Ask Community" button - the real
  // question the student got stuck on, carried over as-is rather than
  // making them retype it. See student/practice/results and
  // student/exams/[id]/result for the linking side.
  const questionId = searchParams.get("question_id");
  const questionText = searchParams.get("question_text");
  const topicId = searchParams.get("topic_id");

  const [postType, setPostType] = useState<"question" | "discussion">("question");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (questionText) {
      setTitle(`Doubt: ${questionText.slice(0, 80)}${questionText.length > 80 ? "..." : ""}`);
      setBody(`I'm stuck on this question:\n\n"${questionText}"\n\nCan someone explain the correct approach?`);
    }
  }, [questionText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (title.trim().length < 5) {
      setError("Title must be at least 5 characters.");
      return;
    }
    if (body.trim().length < 10) {
      setError("Please add a bit more detail (10+ characters).");
      return;
    }
    setIsLoading(true);
    try {
      const post = await communityApi.createPost({
        title,
        body,
        post_type: postType,
        topic: topicId ? Number(topicId) : null,
        source_question: questionId ? Number(questionId) : null,
      });
      router.push(`/student/community/${post.id}`);
    } catch (err: any) {
      setError(err.message || err.detail || "Failed to post. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push("/student/community")}>
        <ArrowLeft className="w-4 h-4" /> Back to Community
      </Button>

      <div>
        <h1 className="text-[24px] font-bold text-primary dark:text-foreground tracking-tight flex items-center gap-2">
          <HelpCircle className="w-6 h-6" /> Ask the Community
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {questionId
            ? "We've prefilled your question from the exam. Feel free to edit before posting."
            : "Ask a question or start a discussion — teachers and fellow aspirants can help."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 space-y-5">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          {(["question", "discussion"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setPostType(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize border transition-colors ${
                postType === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. How do I approach percentage change questions?"
            className="bg-background"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Details</label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe your question or what you'd like to discuss..."
            className="min-h-[160px] bg-background"
            required
          />
        </div>

        <Button type="submit" disabled={isLoading} className="w-full h-11">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {isLoading ? "Posting..." : "Post to Community"}
        </Button>
      </form>
    </div>
  );
}

export default function AskCommunityPage() {
  return (
    <Suspense fallback={<div className="p-6 max-w-2xl mx-auto"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
      <AskCommunityForm />
    </Suspense>
  );
}
