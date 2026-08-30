"use client";

import { useState, useEffect } from "react";
import { 
  BarChart, Activity, Target, Flame, CheckCircle, 
  BookOpen, BrainCircuit, Play, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  analyticsApi, OverviewMetrics, PerformanceTrend, 
  SubjectPerformance, TopicPerformance, AIInsight 
} from "@/lib/api/analytics";
import { cn } from "@/lib/utils";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Area, AreaChart 
} from 'recharts';
import Link from "next/link";

export default function AnalyticsDashboard() {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [trend, setTrend] = useState<PerformanceTrend[]>([]);
  const [subjects, setSubjects] = useState<SubjectPerformance[]>([]);
  const [topics, setTopics] = useState<TopicPerformance[]>([]);
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [o, tr, sub, top] = await Promise.all([
          analyticsApi.getOverview(),
          analyticsApi.getPerformanceTrend(14),
          analyticsApi.getSubjectPerformance(),
          analyticsApi.getTopicPerformance()
        ]);
        setOverview(o);
        setTrend(tr);
        setSubjects(sub);
        setTopics(top);
        
        // Fetch AI Insight
        setGeneratingAI(true);
        const ai = await analyticsApi.getAIInsight();
        setInsight(ai);
      } catch (e) {
        console.error("Failed to load analytics", e);
      } finally {
        setLoading(false);
        setGeneratingAI(false);
      }
    }
    loadData();
  }, []);

  if (loading || !overview) {
    return (
      <div className="flex-1 flex justify-center items-center h-full min-h-screen">
        <div className="w-10 h-10 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const weakTopics = topics.filter(t => t.status === 'Weak' || t.status === 'Needs Improvement').slice(0, 5);
  const strongTopics = topics.filter(t => t.status === 'Strong' || t.status === 'Good').slice(0, 5);

  return (
    <div className="flex-1 p-6 md:p-8 bg-[#f8fafc] overflow-y-auto">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-primary dark:text-foreground flex items-center gap-2">
          <BarChart className="w-8 h-8 text-[#D4A72C]" /> Your Analytics
        </h1>
        <p className="text-muted-foreground mt-2">Understand your preparation and focus on what matters most.</p>
      </div>

      {/* OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-center">
          <div className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <Target className="w-4 h-4" /> Overall Accuracy
          </div>
          <div className="text-[28px] font-bold text-primary dark:text-foreground">{overview.overall_accuracy}%</div>
        </div>
        
        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-center">
          <div className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> Questions Solved
          </div>
          <div className="text-[28px] font-bold text-primary dark:text-foreground">{overview.questions_solved}</div>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-center">
          <div className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <BookOpen className="w-4 h-4" /> Exams Taken
          </div>
          <div className="text-[28px] font-bold text-primary dark:text-foreground">{overview.model_exams_taken}</div>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="text-[12px] font-bold text-orange-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Flame className="w-4 h-4" /> Study Streak
          </div>
          <div className="text-[28px] font-bold text-orange-600">{overview.study_streak} Days</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* TREND CHART */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm p-6">
          <h2 className="text-[16px] font-bold text-primary dark:text-foreground mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5" /> Performance Trend
          </h2>
          {trend.length > 1 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4A72C" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#D4A72C" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0B2545', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="accuracy" stroke="#D4A72C" strokeWidth={3} fillOpacity={1} fill="url(#colorAccuracy)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground font-medium bg-muted rounded-lg">
              Complete more practice sessions to see your performance trend.
            </div>
          )}
        </div>

        {/* AI INSIGHT */}
        <div className="bg-primary text-primary-foreground rounded-xl shadow-lg p-6 text-white relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
          
          <h2 className="text-[16px] font-bold text-blue-300 mb-6 flex items-center gap-2 relative z-10">
            <BrainCircuit className="w-5 h-5" /> LoksewaAI Insight
          </h2>

          {generatingAI ? (
            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
              <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-blue-200 text-sm">Analyzing your performance...</p>
            </div>
          ) : insight ? (
            <div className="relative z-10 flex-1 flex flex-col">
              <p className="text-[15px] leading-relaxed mb-6 font-medium">
                "{insight.recommendation}"
              </p>
              
              <div className="bg-white/10 border border-white/10 rounded-lg p-4 mt-auto">
                <div className="text-[12px] font-bold text-blue-300 uppercase tracking-wider mb-3">Today's Recommended Plan</div>
                <ul className="space-y-3">
                  {insight.daily_plan.map((item, idx) => (
                    <li key={idx} className="flex gap-3 text-[14px]">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0 text-[11px] font-bold">{idx + 1}</span>
                      <span className="text-slate-200">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-blue-200 relative z-10 text-center">
              Insufficient data to generate AI insights. Complete more tests!
            </div>
          )}
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* PRIORITY AREAS (WEAK) */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Priority Areas
            </h2>
          </div>
          <div className="p-2">
            {weakTopics.length > 0 ? weakTopics.map((topic) => (
              <div key={topic.topic_id} className="flex items-center justify-between p-4 hover:bg-muted rounded-lg border-b border-border/50 last:border-0 transition-colors">
                <div>
                  <div className="text-[14px] font-bold text-primary dark:text-foreground">{topic.topic}</div>
                  <div className="text-[12px] text-muted-foreground">{topic.subject} • {topic.accuracy}% Accuracy</div>
                </div>
                <Link href={`/student/mcq-study?topic=${topic.topic_id}`}>
                  <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50 dark:bg-red-950/30 hover:text-red-700 dark:text-red-300">
                    Practice Now
                  </Button>
                </Link>
              </div>
            )) : (
              <div className="p-8 text-center text-muted-foreground">No priority areas identified yet.</div>
            )}
          </div>
        </div>

        {/* SUBJECT PERFORMANCE */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border">
            <h2 className="text-[16px] font-bold text-primary dark:text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5" /> Subject Performance
            </h2>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-6">
            {subjects.length > 0 ? subjects.map((sub, idx) => (
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
                      "h-full rounded-full",
                      sub.accuracy >= 80 ? "bg-green-500" :
                      sub.accuracy >= 60 ? "bg-blue-500" :
                      sub.accuracy >= 40 ? "bg-orange-400" : "bg-red-500"
                    )} 
                    style={{ width: `${Math.max(sub.accuracy, 5)}%` }}
                  ></div>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wider text-right">
                  {sub.status}
                </div>
              </div>
            )) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Not enough data across subjects.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
