"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  BarChart, Activity, Target, Flame, CheckCircle, 
  BookOpen, BrainCircuit, AlertCircle, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  analyticsApi, OverviewMetrics, PerformanceTrend, 
  SubjectPerformance, TopicPerformance, AIInsight 
} from "@/lib/api/analytics";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import Link from "next/link";

const PerformanceTrendChart = dynamic(
  () => import("./PerformanceTrendChart"),
  {
    ssr: false,
    loading: () => <TrendSkeleton />,
  }
);

// ─── Skeletons ───────────────────────────────────────────────────────────────

function SkeletonCard({ className }: { className?: string }) {
  return <div className={cn("bg-muted/60 animate-pulse rounded-xl", className)} />;
}

function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-center space-y-3">
          <SkeletonCard className="h-4 w-28" />
          <SkeletonCard className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

function TrendSkeleton() {
  return (
    <div className="h-[300px] w-full flex flex-col justify-between p-4 bg-muted/20 rounded-lg animate-pulse">
      <div className="h-4 w-40 bg-muted/60 rounded" />
      <div className="flex-1 flex items-end gap-3 pt-6 pb-2">
        {[40, 65, 55, 80, 60, 90, 75, 85].map((h, i) => (
          <div key={i} className="flex-1 bg-muted/40 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="flex justify-between">
            <SkeletonCard className="h-4 w-32" />
            <SkeletonCard className="h-4 w-12" />
          </div>
          <SkeletonCard className="h-2 w-full" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Analytics Component ────────────────────────────────────────────────

export function StudentAnalyticsContent() {
  // Independent section states
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState(false);

  const [trend, setTrend] = useState<PerformanceTrend[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);

  const [subjects, setSubjects] = useState<SubjectPerformance[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  const [topics, setTopics] = useState<TopicPerformance[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);

  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);

  // Progressive section-by-section loaders
  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(false);
    try {
      const data = await analyticsApi.getOverview();
      setOverview(data);
    } catch (e) {
      console.error("[Analytics] Overview error:", e);
      setOverviewError(true);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadTrend = useCallback(async () => {
    setTrendLoading(true);
    try {
      const tr = await analyticsApi.getPerformanceTrend(14);
      setTrend(tr || []);
    } catch (e) {
      console.error("[Analytics] Trend error:", e);
      setTrend([]);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  const loadSubjects = useCallback(async () => {
    setSubjectsLoading(true);
    try {
      const sub = await analyticsApi.getSubjectPerformance();
      setSubjects(sub || []);
    } catch (e) {
      console.error("[Analytics] Subject performance error:", e);
      setSubjects([]);
    } finally {
      setSubjectsLoading(false);
    }
  }, []);

  const loadTopics = useCallback(async () => {
    setTopicsLoading(true);
    try {
      const top = await analyticsApi.getTopicPerformance();
      setTopics(top || []);
    } catch (e) {
      console.error("[Analytics] Topic analysis error:", e);
      setTopics([]);
    } finally {
      setTopicsLoading(false);
    }
  }, []);

  const loadAIInsight = useCallback(async (force = false) => {
    setGeneratingAI(true);
    try {
      const ai = await analyticsApi.getAIInsight(force);
      setInsight(ai);
    } catch (e) {
      console.error("[Analytics] AI insight error:", e);
    } finally {
      setGeneratingAI(false);
    }
  }, []);

  // Concurrent non-blocking initial load
  useEffect(() => {
    loadOverview();
    loadTrend();
    loadSubjects();
    loadTopics();
    loadAIInsight();
  }, [loadOverview, loadTrend, loadSubjects, loadTopics, loadAIInsight]);

  const weakTopics = topics.filter(t => t.status === 'Weak' || t.status === 'Needs Improvement').slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-primary dark:text-foreground flex items-center gap-2">
            <BarChart className="w-6 h-6 text-[#D4A72C]" /> Preparation Analytics
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Deep-dive into your accuracy, question completion metrics, study streak, and subject-wise mastery.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            loadOverview();
            loadTrend();
            loadSubjects();
            loadTopics();
            loadAIInsight(true);
          }}
          className="self-start sm:self-center gap-1.5 text-xs border-border"
          id="analytics-refresh-btn"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", (overviewLoading || trendLoading) && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* OVERVIEW CARDS */}
      {overviewLoading ? (
        <OverviewSkeleton />
      ) : overviewError || !overview ? (
        <div className="p-6 rounded-xl border border-destructive/20 bg-destructive/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">Unable to load overview metrics.</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadOverview} className="text-xs">
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-center">
            <div className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <Target className="w-4 h-4" /> Overall Accuracy
            </div>
            <div className="text-[28px] font-bold text-primary dark:text-foreground">
              {overview.questions_solved > 0 ? `${overview.overall_accuracy}%` : "—"}
            </div>
          </div>
          
          <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-center">
            <div className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Questions Solved
            </div>
            <div className="text-[28px] font-bold text-primary dark:text-foreground">
              {overview.questions_solved.toLocaleString()}
            </div>
          </div>

          <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-center">
            <div className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <BookOpen className="w-4 h-4" /> Exams Taken
            </div>
            <div className="text-[28px] font-bold text-primary dark:text-foreground">
              {overview.model_exams_taken.toLocaleString()}
            </div>
          </div>

          <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="text-[12px] font-bold text-orange-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Flame className="w-4 h-4" /> Study Streak
            </div>
            <div className="text-[28px] font-bold text-orange-600">{overview.study_streak} Days</div>
          </div>
        </div>
      )}

      {/* TREND CHART & AI INSIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* TREND CHART */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-[16px] font-bold text-primary dark:text-foreground mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5" /> Performance Trend (Last 14 Days)
          </h3>
          {trendLoading ? (
            <TrendSkeleton />
          ) : trend.length > 1 ? (
            <PerformanceTrendChart trend={trend} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground font-medium bg-muted/40 rounded-lg text-sm px-6 text-center">
              Complete more practice sessions or mock exams to visualize your 14-day performance trend.
            </div>
          )}
        </div>

        {/* AI INSIGHT */}
        <div className="bg-primary text-primary-foreground rounded-xl shadow-lg p-6 relative overflow-hidden flex flex-col min-h-[380px]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-black/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
          
          <h3 className="text-[16px] font-bold text-primary-foreground/80 mb-6 flex items-center gap-2 relative z-10">
            <BrainCircuit className="w-5 h-5" /> LoksewaAI Insight
          </h3>

          {generatingAI ? (
            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
              <div className="w-8 h-8 border-4 border-primary-foreground/40 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-primary-foreground/70 text-sm">Analyzing your performance...</p>
            </div>
          ) : insight ? (
            <div className="relative z-10 flex-1 flex flex-col">
              <p className="text-[15px] leading-relaxed mb-6 font-medium text-primary-foreground">
                &quot;{insight.recommendation}&quot;
              </p>
              
              <div className="bg-black/10 border border-black/10 rounded-lg p-4 mt-auto">
                <div className="text-[12px] font-bold text-primary-foreground/70 uppercase tracking-wider mb-3">Today&apos;s Recommended Plan</div>
                <ul className="space-y-3">
                  {(insight.daily_plan || []).map((item, idx) => (
                    <li key={idx} className="flex gap-3 text-[14px]">
                      <span className="w-5 h-5 rounded-full bg-black/15 text-primary-foreground flex items-center justify-center shrink-0 text-[11px] font-bold">{idx + 1}</span>
                      <span className="text-primary-foreground/90">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-primary-foreground/70 relative z-10 text-center text-sm px-4">
              Insufficient practice data to generate personalized AI insights. Complete more tests!
            </div>
          )}
        </div>

      </div>

      {/* WEAK TOPICS & SUBJECT PERFORMANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PRIORITY AREAS (WEAK) */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Priority Improvement Areas
            </h3>
          </div>
          <div className="p-2">
            {topicsLoading ? (
              <ListSkeleton rows={4} />
            ) : weakTopics.length > 0 ? (
              weakTopics.map((topic) => (
                <div key={topic.topic_id} className="flex items-center justify-between p-4 hover:bg-muted rounded-lg border-b border-border/50 last:border-0 transition-colors">
                  <div>
                    <div className="text-[14px] font-bold text-primary dark:text-foreground">{topic.topic}</div>
                    <div className="text-[12px] text-muted-foreground">{topic.subject} • {topic.accuracy}% Accuracy</div>
                  </div>
                  <Link href="/student/practice">
                    <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50 dark:bg-red-950/30 hover:text-red-700 dark:text-red-300">
                      Practice Now
                    </Button>
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No weak priority areas identified. Keep practicing to maintain high mastery!
              </div>
            )}
          </div>
        </div>

        {/* SUBJECT PERFORMANCE */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border">
            <h3 className="text-[16px] font-bold text-primary dark:text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5" /> Subject Performance
            </h3>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-6">
            {subjectsLoading ? (
              <ListSkeleton rows={4} />
            ) : subjects.length > 0 ? (
              subjects.map((sub, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-[14px] font-bold mb-2">
                    <span className="text-primary dark:text-foreground">{sub.subject}</span>
                    <span className={cn(
                      sub.accuracy >= 80 ? "text-green-600" :
                      sub.accuracy >= 60 ? "text-blue-600" :
                      sub.accuracy >= 40 ? "text-orange-500" : "text-red-500"
                    )}>{sub.accuracy}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        sub.accuracy >= 80 ? "bg-green-500" :
                        sub.accuracy >= 60 ? "bg-blue-500" :
                        sub.accuracy >= 40 ? "bg-orange-400" : "bg-red-500"
                      )} 
                      style={{ width: `${Math.max(sub.accuracy, 5)}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wider text-right">
                    {sub.status}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-12">
                Not enough data across subjects yet. Take exams to build your subject profile.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
