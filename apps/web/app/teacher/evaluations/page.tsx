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
        <div className="flex rounded-lg border border-[#E7EBF3] bg-[#F7F9FC] p-1">
          <button
            onClick={() => setActiveTab("submitted")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-all",
              activeTab === "submitted"
                ? "bg-white text-[#0B2545] shadow-sm"
                : "text-[#667085] hover:text-[#344054]"
            )}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab("evaluated")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-all",
              activeTab === "evaluated"
                ? "bg-white text-[#0B2545] shadow-sm"
                : "text-[#667085] hover:text-[#344054]"
            )}
          >
            Evaluated
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A98AE]" />
          <Input
            type="search"
            placeholder="Search student or topic..."
            className="rounded-lg border-[#D9E1EA] bg-white pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-1 flex-col items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0B2545] border-t-transparent"></div>
          <p className="mt-4 font-medium text-[#667085]">Loading evaluations...</p>
        </div>
      ) : filteredEvaluations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-[#E7EBF3] bg-white p-12 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#E9F6F2]">
            <CheckCircle2 className="h-8 w-8 text-[#0F7A69]" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-[#101828]">
            {activeTab === "submitted" ? "You're all caught up!" : "No evaluations found."}
          </h3>
          <p className="mx-auto max-w-md text-[13px] text-[#667085]">
            {activeTab === "submitted"
              ? "There are no pending evaluations assigned to you at the moment."
              : "You haven't evaluated any submissions yet."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredEvaluations.map((evaluation) => (
            <Link key={evaluation.id} href={`/teacher/evaluations/${evaluation.id}`}>
              <div className="group flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#E7EBF3] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-md md:flex-row md:items-center">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "hidden h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] md:flex",
                    activeTab === "submitted" ? "bg-[#FBF2DC] text-[#946B00]" : "bg-[#E9F6F2] text-[#0F7A69]"
                  )}>
                    <FileText className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-semibold text-[#101828]">{evaluation.student_name}</h3>
                      <StatusPill status={activeTab === "submitted" ? "pending" : "evaluated"} tone={activeTab === "submitted" ? "pending" : "success"} />
                    </div>
                    <p className="line-clamp-1 text-sm text-[#667085]">
                      {evaluation.question?.topic_name ? `${evaluation.question.topic_name} - ` : ""}
                      {evaluation.question?.text || "Subjective Question"}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-[#8A98AE]">
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
                  <Button variant="ghost" className="text-[#0B2545] transition-colors group-hover:bg-[#EEF2F8]">
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
