"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Clock, CheckCircle2, ChevronRight, FileText } from "lucide-react";
import { teacherEvaluationService, SubjectiveAnswerList } from "@/lib/api/teacher-evaluations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PremiumIcon } from "@/components/ui/premium-icon";
import { formatDistanceToNow } from "date-fns";

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
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-[calc(100vh-4rem)] flex flex-col animate-in fade-in-50 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Evaluations</h1>
          <p className="text-muted-foreground mt-1">Review and grade student submissions.</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
        <div className="flex bg-muted/30 p-1 rounded-lg border border-border/50">
          <button
            onClick={() => setActiveTab("submitted")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === "submitted"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab("evaluated")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === "evaluated"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            Evaluated
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search student or topic..."
            className="pl-9 bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground mt-4 font-medium">Loading evaluations...</p>
        </div>
      ) : filteredEvaluations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border border-border/50 rounded-xl bg-card/50">
          <div className="mb-6">
            <PremiumIcon icon={CheckCircle2} color="emerald" size="xl" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            {activeTab === "submitted" ? "You're all caught up!" : "No evaluations found."}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {activeTab === "submitted"
              ? "There are no pending evaluations assigned to you at the moment."
              : "You haven't evaluated any submissions yet."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredEvaluations.map((evaluation) => (
            <Link key={evaluation.id} href={`/teacher/evaluations/${evaluation.id}`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/5 transition-colors group shadow-sm">
                <div className="flex items-center gap-4 mb-4 md:mb-0">
                  <div className="hidden md:flex">
                    <PremiumIcon 
                      icon={FileText} 
                      color={activeTab === "submitted" ? "amber" : "emerald"} 
                      size="md" 
                      glow={false}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{evaluation.student_name}</h3>
                      {activeTab === "submitted" ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] px-1.5 py-0">
                          Pending
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] px-1.5 py-0">
                          Evaluated
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {evaluation.question?.topic_name ? `${evaluation.question.topic_name} - ` : ""}
                      {evaluation.question?.text || "Subjective Question"}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {evaluation.submitted_at ? formatDistanceToNow(new Date(evaluation.submitted_at), { addSuffix: true }) : "Unknown time"}
                      </span>
                      <span>•</span>
                      <span>{evaluation.word_count || 0} words</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                  <Button variant="ghost" className="group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {activeTab === "submitted" ? "Evaluate Now" : "View Result"}
                    <ChevronRight className="w-4 h-4 ml-1" />
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
