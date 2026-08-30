"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Clock, CheckCircle2, ChevronRight, FileText } from "lucide-react";
import { teacherEvaluationService, SubjectiveAnswerList } from "@/lib/api/teacher-evaluations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { PageHeader, StatusPill } from "@/components/teacher/portal";

export default function EvaluationsListPage() {
  const [evaluations, setEvaluations] = useState<SubjectiveAnswerList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"submitted" | "evaluated">("submitted");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchEvaluations(activeTab);
  }, [activeTab]);

  const fetchEvaluations = async (status: "submitted" | "evaluated") => {
    setIsLoading(true);
    try {
      const data = await teacherEvaluationService.getEvaluations(status);
      setEvaluations(data);
    } catch (error) {
      console.error("Error fetching evaluations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvaluations = evaluations.filter((ev) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ev.student_name?.toLowerCase().includes(query) ||
      ev.question?.topic_name?.toLowerCase().includes(query) ||
      ev.question?.text?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col p-4 pb-12 md:p-8">
      <div className="mb-8">
        <PageHeader title="Evaluations" description="Review and grade student submissions." />
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex rounded-lg border border-border bg-muted p-1">
          <button
            onClick={() => setActiveTab("submitted")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-all",
              activeTab === "submitted"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab("evaluated")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-all",
              activeTab === "evaluated"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Evaluated
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search student or topic..."
            className="rounded-lg border-border bg-card pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-1 flex-col items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 font-medium text-muted-foreground">Loading evaluations...</p>
        </div>
      ) : filteredEvaluations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#0F7A69]/10">
            <CheckCircle2 className="h-8 w-8 text-[#0F7A69] dark:text-[#4ADE9C]" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-foreground">
            {activeTab === "submitted" ? "You're all caught up!" : "No evaluations found."}
          </h3>
          <p className="mx-auto max-w-md text-[13px] text-muted-foreground">
            {activeTab === "submitted"
              ? "There are no pending evaluations assigned to you at the moment."
              : "You haven't evaluated any submissions yet."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredEvaluations.map((evaluation) => (
            <Link key={evaluation.id} href={`/teacher/evaluations/${evaluation.id}`}>
              <div className="group flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-none transition-shadow hover:shadow-md md:flex-row md:items-center">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "hidden h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] md:flex",
                    activeTab === "submitted" ? "bg-[#946B00]/10 text-[#946B00] dark:text-[#F2C94C]" : "bg-[#0F7A69]/10 text-[#0F7A69] dark:text-[#4ADE9C]"
                  )}>
                    <FileText className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{evaluation.student_name}</h3>
                      <StatusPill status={activeTab === "submitted" ? "pending" : "evaluated"} tone={activeTab === "submitted" ? "pending" : "success"} />
                    </div>
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                      {evaluation.question?.topic_name ? `${evaluation.question.topic_name} - ` : ""}
                      {evaluation.question?.text || "Subjective Question"}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {evaluation.submitted_at ? formatDistanceToNow(new Date(evaluation.submitted_at), { addSuffix: true }) : "Unknown time"}
                      </span>
                      <span>•</span>
                      <span>{evaluation.word_count || 0} words</span>
                    </div>
                  </div>
                </div>

                <div className="flex w-full items-center justify-end gap-4 md:w-auto">
                  <Button variant="ghost" className="text-primary transition-colors group-hover:bg-primary/10">
                    {activeTab === "submitted" ? "Evaluate Now" : "View Result"}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
