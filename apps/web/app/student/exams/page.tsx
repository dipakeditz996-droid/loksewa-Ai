"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText, Clock, Target, Play, CheckCircle, RefreshCw,
  BookOpenCheck, Radio, FlaskConical, Layers, History, PenTool,
  ChevronRight, Calendar, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { studentExamsApi, StudentExam } from "@/lib/api/student-exams";
import { LoksewaExamCountdown } from "@/components/student/countdown/LoksewaExamCountdown";
import { MockExamCountdown } from "@/components/student/countdown/MockExamCountdown";
import { useOptionalStudentContext } from "@/contexts/StudentContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type MainCategory = "objective" | "subjective";
type ObjectiveSubcat = "old-paper" | "model" | "live" | "create-own";
type SubjectiveSubcat = "old-paper" | "model" | "live" | "topic-wise";
type SubCategory = ObjectiveSubcat | SubjectiveSubcat;

// ---------------------------------------------------------------------------
// Helpers — filtering by UI category → backend field values
// ---------------------------------------------------------------------------
function isObjective(e: StudentExam) {
  return e.exam_type !== "subjective";
}
function isSubjective(e: StudentExam) {
  return e.exam_type === "subjective";
}
function matchSubcat(e: StudentExam, main: MainCategory, sub: SubCategory): boolean {
  if (main === "objective") {
    if (sub === "old-paper") return isObjective(e) && e.effective_category === "past_year";
    if (sub === "model")     return isObjective(e) && e.effective_category === "model";
    if (sub === "live")      return isObjective(e) && e.effective_category === "live";
    return false;
  }
  // subjective
  if (sub === "old-paper")  return isSubjective(e) && e.effective_category === "past_year";
  if (sub === "model")      return isSubjective(e) && e.effective_category === "model";
  if (sub === "live")       return isSubjective(e) && e.effective_category === "live";
  if (sub === "topic-wise") return isSubjective(e) && (e.objective_category === "topicwise" || Boolean(e.topic_id));
  return false;
}

// ---------------------------------------------------------------------------
// Live exam computed status (server time is authoritative — this is display only)
// ---------------------------------------------------------------------------
function getLiveStatus(exam: StudentExam): "upcoming" | "live" | "ended" {
  if (!exam.start_time || !exam.end_time) return "upcoming";
  const now = Date.now();
  if (exam.start_time && now < new Date(exam.start_time).getTime()) return "upcoming";
  if (exam.end_time && now > new Date(exam.end_time).getTime()) return "ended";
  return "live";
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-NP", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function ExamSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="border-border/60 flex flex-col animate-pulse">
          <CardHeader className="space-y-3">
            <div className="flex justify-between items-start">
              <div className="h-5 w-16 bg-muted/60 rounded" />
              <div className="h-5 w-20 bg-muted/40 rounded" />
            </div>
            <div className="h-6 w-3/4 bg-muted/70 rounded" />
            <div className="h-4 w-1/2 bg-muted/50 rounded" />
          </CardHeader>
          <CardContent className="flex-1">
            <div className="h-11 bg-muted/40 rounded-lg" />
          </CardContent>
          <CardFooter className="pt-4 border-t border-border/50">
            <div className="h-10 w-full bg-muted/60 rounded" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="border-border/60 border-dashed flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
      <FileText className="h-10 w-10 mb-4 opacity-40" />
      <h3 className="font-medium text-lg mb-1 text-foreground">{title}</h3>
      <p className="text-sm">{body}</p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center p-12 text-center">
      <AlertCircle className="h-10 w-10 mb-4 text-destructive opacity-70" />
      <h3 className="font-semibold text-lg mb-1">Unable to load exams.</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Check your connection and try again.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" /> Retry
      </Button>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Live-exam badge / status pill
// ---------------------------------------------------------------------------
function LiveStatusBadge({ exam }: { exam: StudentExam }) {
  const s = getLiveStatus(exam);
  if (s === "upcoming") {
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-950/30 gap-1">
        <Calendar className="h-3 w-3" /> Upcoming
      </Badge>
    );
  }
  if (s === "live") {
    return (
      <Badge className="bg-emerald-600 text-white gap-1 animate-pulse">
        <Radio className="h-3 w-3" /> Live Now
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground border-border gap-1">
      Ended
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Exam Card
// ---------------------------------------------------------------------------
function ExamCard({ exam, isLive }: { exam: StudentExam; isLive?: boolean }) {
  const approvalRequired = exam.exam_type !== "subjective" && exam.requires_admin_request && !exam.can_start && !exam.active_attempt_id;

  return (
    <Card className="border-border/60 flex flex-col hover:border-primary/30 transition-colors group">
      <CardHeader>
        <div className="flex justify-between items-start mb-2 gap-2">
          {isLive ? (
            <LiveStatusBadge exam={exam} />
          ) : (
            <Badge
              variant={exam.exam_type === "subjective" ? "default" : "secondary"}
              className="text-xs"
            >
              {exam.exam_type === "subjective" ? "SUBJECTIVE" : "OBJECTIVE"}
            </Badge>
          )}

          {exam.active_attempt_id ? (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-xs">
              In Progress
            </Badge>
          ) : exam.has_attempted ? (
            <Badge variant="outline" className="text-primary border-primary/30 text-xs">
              Attempted
            </Badge>
          ) : approvalRequired ? (
            <Badge variant="outline" className="text-muted-foreground border-dashed text-xs">
              Approval Required
            </Badge>
          ) : null}
        </div>

        <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
          {exam.title}
        </CardTitle>
        <CardDescription className="text-primary/80 font-medium mt-0.5 text-xs">
          {exam.category_name} · {exam.exam_name}
          {exam.subject_name ? ` · ${exam.subject_name}` : ""}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        {/* Live schedule info */}
        {isLive && (exam.start_time || exam.end_time) && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 mb-3 flex flex-col gap-1">
            {exam.start_time && (
              <span>Start: <strong>{formatDateTime(exam.start_time)}</strong></span>
            )}
            {exam.end_time && (
              <span>End: <strong>{formatDateTime(exam.end_time)}</strong></span>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{exam.time_limit} min</span>
          </div>
          <div className="flex items-center gap-1.5">
            {exam.exam_type === "subjective" ? (
              <>
                <FileText className="h-4 w-4 text-primary" />
                <span>
                  {exam.question_paper_page_count
                    ? `${exam.question_paper_page_count} pg PDF`
                    : "PDF Paper"}
                </span>
              </>
            ) : (
              <>
                <Target className="h-4 w-4" />
                <span>{exam.total_questions} Qs</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <span>{exam.total_marks} Marks</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-4 border-t border-border/50 flex flex-col gap-2">
        <Link href={`/student/exams/${exam.id}`} className="w-full">
          <Button
            className="w-full gap-2"
            variant={
              exam.active_attempt_id
                ? "default"
                : exam.has_attempted && exam.is_result_published
                ? "secondary"
                : "default"
            }
          >
            {exam.active_attempt_id ? (
              <>
                <Play className="h-4 w-4 fill-current text-amber-400" />
                Resume Exam
              </>
            ) : exam.has_attempted && exam.is_result_published ? (
              <>
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                View Result
              </>
            ) : exam.has_attempted ? (
              <>
                <FileText className="h-4 w-4" />
                View Submission
              </>
            ) : approvalRequired ? (
              <>
                <FileText className="h-4 w-4" />
                Request Admin for Exam
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Exam
              </>
            )}
          </Button>
        </Link>
        {exam.exam_type === "subjective" && (
          <Link href={`/student/exams/${exam.id}?view=solution`} className="w-full">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-primary border-primary/25 hover:bg-primary/5 hover:text-primary"
            >
              <BookOpenCheck className="h-4 w-4" />
              {exam.is_expert_solution_published ? "View Expert Solution PDF" : "Expert Solution"}
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Subcategory metadata
// ---------------------------------------------------------------------------
const SUBCATS = {
  objective: [
    { id: "old-paper" as ObjectiveSubcat, label: "Old Paper Exams", icon: BookOpenCheck,
      empty: { body: "Original past papers will appear here when published." } },
    { id: "model" as ObjectiveSubcat, label: "Model Exams", icon: FlaskConical,
      empty: { body: "Objective model exams will appear here when published." } },
    { id: "live" as ObjectiveSubcat, label: "Live Exams", icon: Radio,
      empty: { body: "Live exams run in a shared window. Check back soon." } },
    { id: "create-own" as ObjectiveSubcat, label: "Create Your Own Exam", icon: PenTool },
  ],
  subjective: [
    { id: "old-paper" as SubjectiveSubcat, label: "Old Paper Exams", icon: BookOpenCheck,
      empty: { body: "Subjective past papers will appear here when published." } },
    { id: "model" as SubjectiveSubcat, label: "Model Exams", icon: FlaskConical,
      empty: { body: "Subjective model exams will appear here when published." } },
    { id: "live" as SubjectiveSubcat, label: "Live Exams", icon: Radio,
      empty: { body: "Live subjective exams run in a shared window." } },
    { id: "topic-wise" as SubjectiveSubcat, label: "Topic Wise Exams", icon: Layers,
      empty: { body: "Subjective topic-wise exams will appear here when published." } },
  ],
} as const;

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function ExamsListingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawType = searchParams.get("type");
  const rawCat  = searchParams.get("category");

  const mainCategory: MainCategory =
    rawType === "subjective" ? "subjective" : "objective";

  const selectedCategories = SUBCATS[mainCategory];
  const subCategory: SubCategory = selectedCategories.some((item) => item.id === rawCat)
    ? rawCat as SubCategory
    : "old-paper";

  const studentCtx = useOptionalStudentContext();
  const effectiveCourseId = studentCtx?.activeCourse?.id;

  const {
    data: exams,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["student-exams", effectiveCourseId ?? null],
    queryFn: () => studentExamsApi.getExams(effectiveCourseId),
    staleTime: 60 * 1000,
    retry: 2,
  });

  const allExams: StudentExam[] = exams || [];

  // Navigate while preserving other params
  const navigate = useCallback(
    (type: MainCategory, category: SubCategory) => {
      if (category === "create-own") {
        router.push("/student/exams/custom-builder");
        return;
      }
      router.push(`/student/exams?type=${type}&category=${category}`, { scroll: false });
    },
    [router]
  );

  const filteredExams = allExams.filter((e) =>
    matchSubcat(e, mainCategory, subCategory)
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in-50 duration-500">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mock Exams</h1>
          <p className="text-muted-foreground mt-1">
            Simulate the real examination environment.
          </p>
        </div>

        {/* Secondary action */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push("/student/results")}
          >
            <History className="h-4 w-4" />
            View Past Results
          </Button>
        </div>
      </div>

      {/* ── Countdowns ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <LoksewaExamCountdown />
        <MockExamCountdown />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(["objective", "subjective"] as const).map((sectionType) => {
          const sectionIsSelected = sectionType === mainCategory;
          const sectionSubcategories = SUBCATS[sectionType];
          const activeSubcategory = sectionIsSelected
            ? sectionSubcategories.find((item) => item.id === subCategory)
            : undefined;

          return (
            <section
              key={sectionType}
              className="min-w-0 rounded-xl border border-border/70 bg-card p-4 md:p-6 space-y-5"
              aria-labelledby={`${sectionType}-exams-heading`}
            >
              <header className="space-y-1">
                <h2 id={`${sectionType}-exams-heading`} className="text-xl font-bold tracking-tight">
                  {sectionType === "objective" ? "Objective Exams" : "Subjective Exams"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {sectionType === "objective"
                    ? "Multiple-choice examination"
                    : "Descriptive / written examination"}
                </p>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sectionSubcategories.map(({ id, label, icon: Icon }) => {
                  const active = sectionIsSelected && id === subCategory;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => navigate(sectionType, id)}
                      className={[
                        "min-w-0 flex items-center gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        active
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border/60 bg-background text-foreground hover:border-primary/40 hover:bg-muted/40",
                      ].join(" ")}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="font-medium">{label}</span>
                      {active && <ChevronRight className="ml-auto h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {sectionIsSelected && activeSubcategory && activeSubcategory.id !== "create-own" && (
                <div className="space-y-4 border-t border-border/50 pt-5" aria-live="polite">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-semibold">{activeSubcategory.label}</h3>
                      {subCategory === "live" ? (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Radio className="h-4 w-4 shrink-0 text-emerald-500" />
                          Live Exams are available only during their scheduled window.
                        </p>
                      ) : subCategory === "topic-wise" || subCategory === "old-paper" || subCategory === "model" ? (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 shrink-0 text-primary/70" />
                          {mainCategory === "subjective" && subCategory === "topic-wise"
                            ? "Request an exam from admin. Once approved, you can start and view expert solutions."
                            : "Direct access available; start whenever you are ready."}
                        </p>
                      ) : null}
                    </div>
                    {mainCategory === "subjective" && subCategory === "topic-wise" && (
                      <Link href="/student/exams/request-subjective">
                        <Button size="sm" variant="outline" className="gap-2 shrink-0 border-primary/30 text-primary hover:bg-primary/5">
                          <FileText className="h-4 w-4" />
                          Request Exam
                        </Button>
                      </Link>
                    )}
                  </div>

                  {isLoading ? (
                    <ExamSkeletonGrid />
                  ) : isError ? (
                    <ErrorState onRetry={() => void refetch()} />
                  ) : filteredExams.length === 0 ? (
                    <div className="space-y-4">
                      <EmptyState
                        title="No exams available for your course yet."
                        body={"empty" in activeSubcategory
                          ? activeSubcategory.empty.body
                          : "Published exams will appear here when available."}
                      />
                      {mainCategory === "subjective" && subCategory === "topic-wise" && (
                        <div className="flex justify-center">
                          <Link href="/student/exams/request-subjective">
                            <Button className="gap-2">
                              <FileText className="h-4 w-4" />
                              Request Topic-wise Subjective Exam
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredExams.map((exam) => (
                        <ExamCard key={exam.id} exam={exam} isLive={subCategory === "live"} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
