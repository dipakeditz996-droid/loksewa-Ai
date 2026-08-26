"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { 
  BookOpen, Target, Clock, Calendar, CheckCircle2, Circle, 
  ChevronRight, Sparkles, MessageSquare, FileText, ArrowRight, TrendingUp,
  ShoppingBag, HelpCircle, Flame, Activity, Gift, Copy, Share2, Users, Coins,
  GraduationCap, AlertCircle, GripVertical
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { dashboardApi, DashboardData, AnalyticsOverview, DailyMotivation, QUICK_ACTIONS } from "@/lib/api/dashboard";
import { gamificationService, ReferralProfile, ReferralStats, ReferralSettings } from "@/lib/api/gamification";
import { courseEnrollmentApi, EnrollmentStatus } from "@/lib/api/enrollment";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Widget IDs ────────────────────────────────────────────────────────────────
const FULL_WIDTH_WIDGETS = [
  "motivation",
  "quick-actions",
  "continue-study",
  "referral-card",
] as const;

const GRID_WIDGETS = [
  "referrals-list",
  "your-progress",
  "upcoming-exams",
] as const;

type FullWidthId = (typeof FULL_WIDTH_WIDGETS)[number];
type GridId = (typeof GRID_WIDGETS)[number];

const STORAGE_KEY_FULL = "dashboard-full-widget-order";
const STORAGE_KEY_GRID = "dashboard-grid-widget-order";

function loadOrder<T extends string>(key: string, defaults: readonly T[]): T[] {
  if (typeof window === "undefined") return [...defaults];
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null");
    if (Array.isArray(saved) && saved.every((id) => (defaults as readonly string[]).includes(id))) {
      return saved as T[];
    }
  } catch {}
  return [...defaults];
}

// ─── Sortable Widget Wrapper ───────────────────────────────────────────────────
interface SortableWidgetProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

function SortableWidget({ id, children, className }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("relative group/dnd", className)}>
      {/* Floating drag handle — only visible on hover */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 z-30 p-1.5 rounded-md bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-white hover:border-slate-300 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all opacity-0 group-hover/dnd:opacity-100 touch-none"
        title="Drag to reorder"
        tabIndex={-1}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      {children}
    </div>
  );
}


// Drag overlay ghost card
function WidgetDragGhost({ label }: { label: string }) {
  return (
    <div className="bg-white border-2 border-blue-400 border-dashed rounded-[16px] p-6 shadow-2xl opacity-90 flex items-center gap-3">
      <GripVertical className="w-5 h-5 text-blue-400" />
      <span className="text-sm font-semibold text-slate-600">{label}</span>
    </div>
  );
}

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [motivation, setMotivation] = useState<DailyMotivation | null>(null);
  const [referralData, setReferralData] = useState<{ profile: ReferralProfile, stats: ReferralStats, settings?: ReferralSettings } | null>(null);
  const [referralHistory, setReferralHistory] = useState<any[]>([]);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // ── DnD state ──────────────────────────────────────────────────────────────
  const [fullOrder, setFullOrder] = useState<FullWidthId[]>(() =>
    loadOrder(STORAGE_KEY_FULL, FULL_WIDTH_WIDGETS)
  );
  const [gridOrder, setGridOrder] = useState<GridId[]>(() =>
    loadOrder(STORAGE_KEY_GRID, GRID_WIDGETS)
  );
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleFullDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setFullOrder((prev) => {
      const oldIdx = prev.indexOf(active.id as FullWidthId);
      const newIdx = prev.indexOf(over.id as FullWidthId);
      const next = arrayMove(prev, oldIdx, newIdx);
      localStorage.setItem(STORAGE_KEY_FULL, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleGridDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setGridOrder((prev) => {
      const oldIdx = prev.indexOf(active.id as GridId);
      const newIdx = prev.indexOf(over.id as GridId);
      const next = arrayMove(prev, oldIdx, newIdx);
      localStorage.setItem(STORAGE_KEY_GRID, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(false);
      const [res, refRes, historyRes, enrollmentRes, analyticsRes, motivationRes] = await Promise.all([
        dashboardApi.getStudentDashboard(),
        gamificationService.getStudentReferralDashboard().catch(() => null),
        gamificationService.getStudentReferralHistory().catch(() => []),
        courseEnrollmentApi.getMyEnrollment().catch(() => null),
        dashboardApi.getAnalyticsOverview().catch(() => null),
        dashboardApi.getDailyMotivation().catch(() => null)
      ]);
      setData(res);
      if (analyticsRes) setAnalytics(analyticsRes);
      if (motivationRes) setMotivation(motivationRes);
      if (refRes) setReferralData(refRes);
      if (historyRes) setReferralHistory(historyRes);
      if (enrollmentRes) setEnrollmentStatus(enrollmentRes);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
        <div className="h-32 bg-slate-200 rounded-2xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl"></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 h-96 bg-slate-200 rounded-2xl"></div>
          <div className="h-96 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto">
        <h2 className="text-2xl font-bold mb-2">Dashboard Unavailable</h2>
        <p className="text-muted-foreground mb-6">We couldn't load your dashboard data at this moment.</p>
        <Button onClick={loadDashboard}>Retry</Button>
      </div>
    );
  }

  // Recharts data
  const chartData = [...data.recentExams].reverse().map((exam, i) => ({
    name: `Ex ${i+1}`,
    score: exam.percentage,
    fullTitle: exam.title
  }));

  const WIDGET_LABELS: Record<string, string> = {
    motivation: "Quote of the Day",
    "quick-actions": "Quick Actions",
    "continue-study": "Continue Studying",
    "referral-card": "Invite & Earn",
    "referrals-list": "Recent Referrals",
    "your-progress": "Your Progress",
    "upcoming-exams": "Upcoming Exams",
  };

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-8 bg-slate-50/50 min-h-[calc(100vh-72px)]">
      
      {/* 1. HEADER (not draggable — always pinned at top) */}
      <section className="bg-white p-6 md:p-8 rounded-[16px] border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between gap-8">
        
        {/* Left Side: Avatar & Gamification */}
        <div className="flex-1 flex flex-col justify-between gap-6">
          <div className="flex gap-4 items-center">
            {data.profile.avatar ? (
              <img src={data.profile.avatar} alt="Avatar" className="w-14 h-14 rounded-full object-cover border-2 border-slate-100 shadow-sm" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold shrink-0 border-2 border-slate-100 shadow-sm">
                {data.profile.name.charAt(0)}
              </div>
            )}
              <div className="flex flex-col justify-center">
              <h1 className="text-lg font-bold text-[#0B2545] tracking-tight leading-tight">
                {data.profile.name}
              </h1>
              <p className="text-[12px] font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded flex items-center gap-1"><GraduationCap className="w-3 h-3"/> Student</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>Applied for: <span className="font-semibold text-[#0B2545]">{data.profile.targetPosition && data.profile.targetPosition !== "Student" ? data.profile.targetPosition : "Section Officer"}</span></span>
              </p>
              {referralData && (
                <div className="mt-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 inline-flex px-2 py-0.5 rounded-md border border-blue-100 self-start">
                  Level {referralData.profile.level}
                </div>
              )}
            </div>
          </div>

          {/* Gamification Stats */}
          {referralData ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-2">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 md:p-4 flex flex-col">
                 <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                   <Sparkles className="w-3.5 h-3.5 text-[#D4A72C] fill-[#D4A72C]" /> Total XP
                 </div>
                 <div className="text-xl md:text-2xl font-bold text-[#0B2545] mt-auto">
                   {referralData.profile.xp.toLocaleString()} XP
                 </div>
                 <div className="text-[10px] text-slate-400 font-medium">All time</div>
              </div>
              
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 md:p-4 flex flex-col relative overflow-hidden">
                 <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                   <Target className="w-3.5 h-3.5 text-blue-500" /> Current Level
                 </div>
                 <div className="text-xl md:text-2xl font-bold text-[#0B2545] mt-auto">
                   Level {referralData.profile.level}
                 </div>
                 <div className="text-[10px] text-slate-400 font-medium z-10">
                   {referralData.profile.xp.toLocaleString()} / {referralData.settings?.xp_per_level ? (referralData.profile.level * referralData.settings.xp_per_level).toLocaleString() : '---'} XP
                 </div>
                 {referralData.settings?.xp_per_level && (
                   <div 
                     className="absolute bottom-0 left-0 h-1 bg-blue-500/20" 
                     style={{ width: `${Math.min((referralData.profile.xp / (referralData.profile.level * referralData.settings.xp_per_level)) * 100, 100)}%` }}
                   />
                 )}
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 md:p-4 flex flex-col">
                 <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                   <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" /> Day Streak
                 </div>
                 <div className="text-xl md:text-2xl font-bold text-[#0B2545] mt-auto">
                   {data.stats.studyStreak} Days
                 </div>
                 <div className="text-[10px] text-slate-400 font-medium">Active streak</div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 md:p-4 flex flex-col">
                 <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                   <Coins className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" /> Coins
                 </div>
                 <div className="text-xl md:text-2xl font-bold text-[#0B2545] mt-auto">
                   {referralData.profile.coins.toLocaleString()}
                 </div>
                 <div className="text-[10px] text-slate-400 font-medium">Available balance</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-2">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 md:p-4 flex flex-col">
                 <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1"><Sparkles className="w-3.5 h-3.5 text-[#D4A72C] fill-[#D4A72C]" /> Total XP</div>
                 <div className="text-xl md:text-2xl font-bold text-slate-300 mt-auto">—</div>
                 <div className="text-[10px] text-slate-400 font-medium">Unable to load</div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 md:p-4 flex flex-col">
                 <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1"><Target className="w-3.5 h-3.5 text-blue-500" /> Current Level</div>
                 <div className="text-xl md:text-2xl font-bold text-slate-300 mt-auto">—</div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 md:p-4 flex flex-col">
                 <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1"><Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" /> Day Streak</div>
                 <div className="text-xl md:text-2xl font-bold text-[#0B2545] mt-auto">{data.stats.studyStreak} Days</div>
                 <div className="text-[10px] text-slate-400 font-medium">Active streak</div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 md:p-4 flex flex-col">
                 <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1"><Coins className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" /> Coins</div>
                 <div className="text-xl md:text-2xl font-bold text-slate-300 mt-auto">—</div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Profile Completion and Subscription */}
        <div className="xl:w-[280px] shrink-0 self-start w-full flex flex-col gap-4">
          {data.profile.completionPercentage < 100 && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-yellow-800">Profile Completion</span>
                <span className="text-sm font-bold text-yellow-800">{data.profile.completionPercentage}%</span>
              </div>
              <Progress value={data.profile.completionPercentage} className="h-1.5 bg-yellow-200" indicatorClassName="bg-yellow-500" />
              <p className="text-xs text-yellow-700 mt-2">Complete your profile to get better recommendations.</p>
              <Link href="/student/settings" className="text-xs font-bold text-yellow-800 hover:underline mt-1 inline-block">Complete Profile &rarr;</Link>
            </div>
          )}

          <div className="bg-[#0B2545] text-white p-4 rounded-xl border border-[#163E6B] shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

            {enrollmentStatus?.has_active_enrollment && enrollmentStatus.enrollment ? (
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#D4A72C] rounded-lg"><GraduationCap className="w-4 h-4 text-[#0A1118]" /></div>
                  <span className="font-bold text-lg tracking-tight">Active Course</span>
                </div>
                <div className="font-semibold text-white text-sm leading-snug">{enrollmentStatus.enrollment.course.title}</div>
                {enrollmentStatus.enrollment.course.exam && (
                  <div className="text-[11px] text-slate-400 font-medium">{enrollmentStatus.enrollment.course.exam.title}</div>
                )}
                {analytics && (
                  <div className="pt-2 border-t border-white/10">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-300 font-medium">Journey Progress</span>
                      <span className="text-xs font-bold text-[#D4A72C]">{analytics.journey_progress}%</span>
                    </div>
                    <Progress value={analytics.journey_progress} className="h-1.5 bg-white/20" indicatorClassName="bg-[#D4A72C]" />
                  </div>
                )}
                <Button asChild variant="outline" className="w-full mt-2 border-white/20 hover:bg-white/10 hover:text-white bg-transparent h-8 text-xs font-bold">
                  <Link href="/student/study-plan">Resume Journey</Link>
                </Button>
              </div>
            ) : enrollmentStatus?.application?.status === 'pending' ? (
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-yellow-400/20 rounded-lg"><Clock className="w-4 h-4 text-yellow-300" /></div>
                  <span className="font-bold text-lg tracking-tight">Application Pending</span>
                </div>
                <div className="font-semibold text-yellow-200 text-sm leading-snug">{enrollmentStatus.application.course.title}</div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your application is under review. You'll be notified once it's approved.
                  {enrollmentStatus.payment?.status === 'PENDING' && (
                    <span className="block mt-1 text-yellow-300 font-medium">Payment verification in progress.</span>
                  )}
                </p>
                <Button asChild variant="outline" className="w-full mt-2 border-white/20 hover:bg-white/10 hover:text-white bg-transparent h-8 text-xs font-bold">
                  <Link href="/student/purchases">View Payment Status</Link>
                </Button>
              </div>
            ) : enrollmentStatus?.application?.status === 'rejected' ? (
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-red-500/20 rounded-lg"><AlertCircle className="w-4 h-4 text-red-300" /></div>
                  <span className="font-bold text-lg tracking-tight">Application Rejected</span>
                </div>
                {enrollmentStatus.application.note && (
                  <p className="text-xs text-red-200 leading-relaxed">{enrollmentStatus.application.note}</p>
                )}
                <p className="text-xs text-slate-300 leading-relaxed">Please contact support or apply again.</p>
                <Button asChild className="w-full mt-2 bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] h-9 text-xs font-bold">
                  <Link href="/student/plans">Apply Again</Link>
                </Button>
              </div>
            ) : analytics?.active_course ? (
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#D4A72C] rounded-lg"><Sparkles className="w-4 h-4 text-[#0A1118]" /></div>
                  <span className="font-bold text-lg tracking-tight">Active Plan</span>
                </div>
                <div className="font-semibold text-white text-sm">{analytics.active_course.name}</div>
                <div className="pt-2 border-t border-white/10">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-300 font-medium">Journey Progress</span>
                    <span className="text-xs font-bold text-[#D4A72C]">{analytics.journey_progress}%</span>
                  </div>
                  <Progress value={analytics.journey_progress} className="h-1.5 bg-white/20" indicatorClassName="bg-[#D4A72C]" />
                </div>
                <Button asChild variant="outline" className="w-full mt-2 border-white/20 hover:bg-white/10 hover:text-white bg-transparent h-8 text-xs font-bold">
                  <Link href="/student/study-plan">Resume Journey</Link>
                </Button>
              </div>
            ) : (
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/10 rounded-lg"><Sparkles className="w-4 h-4 text-slate-300" /></div>
                  <span className="font-bold text-lg tracking-tight">Unlock Full Access</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Get access to premium preparation tools, AI tutoring, and advanced mock exams.
                </p>
                <Button asChild className="w-full mt-2 bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] h-9 text-xs font-bold">
                  <Link href="/student/plans">View Plans</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── DRAGGABLE FULL-WIDTH SECTIONS ─────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveId(e.active.id)}
        onDragEnd={handleFullDragEnd}
      >
        <SortableContext items={fullOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-8">
            {fullOrder.map((widgetId) => {
              if (widgetId === "motivation" && motivation) {
                return (
                  <SortableWidget key={widgetId} id={widgetId}>
                    <section className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-[16px] p-6 shadow-sm relative overflow-hidden group/widget">
                      <div data-focus-hide className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <Sparkles className="w-24 h-24 text-blue-600" />
                      </div>
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="p-3 bg-white rounded-full shadow-sm">
                          <Flame className="w-6 h-6 text-orange-500 fill-orange-500" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-1">Quote of the Day</h3>
                          <p className="text-lg md:text-xl font-medium text-slate-800 italic">"{motivation.message}"</p>
                        </div>
                      </div>
                    </section>
                  </SortableWidget>

                );
              }

              if (widgetId === "quick-actions") {
                return (
                  <SortableWidget key={widgetId} id={widgetId}>
                    <div className="relative group/widget">
                      <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        {QUICK_ACTIONS.map((action, i) => (
                          <Link key={i} href={action.href} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border hover:border-[#D4A72C] hover:shadow-md transition-all group text-center gap-2">
                            <div className="p-3 rounded-full bg-slate-50 group-hover:bg-[#D4A72C]/10 transition-colors">
                              {action.icon === 'target' && <Target className="w-5 h-5 text-blue-600 group-hover:text-[#D4A72C]" />}
                              {action.icon === 'file-text' && <FileText className="w-5 h-5 text-blue-600 group-hover:text-[#D4A72C]" />}
                              {action.icon === 'book-open' && <BookOpen className="w-5 h-5 text-blue-600 group-hover:text-[#D4A72C]" />}
                              {action.icon === 'message-square' && <MessageSquare className="w-5 h-5 text-blue-600 group-hover:text-[#D4A72C]" />}
                              {action.icon === 'calendar' && <Calendar className="w-5 h-5 text-blue-600 group-hover:text-[#D4A72C]" />}
                              {action.icon === 'shopping-bag' && <ShoppingBag className="w-5 h-5 text-blue-600 group-hover:text-[#D4A72C]" />}
                              {action.icon === 'check-circle' && <CheckCircle2 className="w-5 h-5 text-blue-600 group-hover:text-[#D4A72C]" />}
                              {action.icon === 'gift' && <Gift className="w-5 h-5 text-blue-600 group-hover:text-[#D4A72C]" />}
                            </div>
                            <span className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
                              {action.label}
                              {action.label === 'Invite Friends' && (
                                <span data-focus-hide className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">New</span>
                              )}
                            </span>
                          </Link>
                        ))}
                      </section>
                    </div>
                  </SortableWidget>
                );
              }

              if (widgetId === "continue-study" && data.continueLearning) {
                return (
                  <SortableWidget key={widgetId} id={widgetId}>
                    <section className="relative overflow-hidden bg-[#0B2545] rounded-[16px] shadow-lg border border-[#163E6B] group/widget">
                      <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-[#163E6B]/50 to-transparent pointer-events-none"></div>
                      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[#D4A72C] opacity-5 blur-[60px] pointer-events-none"></div>
                      <div className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
                        <div className="flex items-start gap-5">
                          <div className="bg-[#163E6B] p-3.5 rounded-[12px] hidden sm:flex shrink-0">
                            <BookOpen className="h-7 w-7 text-[#D4A72C]" strokeWidth={1.5} />
                          </div>
                          <div>
                            <div className="text-[12px] font-bold text-[#D4A72C] uppercase tracking-widest mb-1">
                              Unfinished {data.continueLearning.type === 'practice' ? 'Practice' : 'Exam'}
                            </div>
                            <h3 className="font-bold text-[20px] text-white tracking-tight">{data.continueLearning.title}</h3>
                            <div className="flex items-center gap-4 mt-5">
                              <Progress value={data.continueLearning.progress} className="w-48 h-1.5 bg-white/10" indicatorClassName="bg-[#D4A72C]" />
                              <span className="text-[13px] font-bold text-white">{data.continueLearning.progress}%</span>
                            </div>
                          </div>
                        </div>
                        <Button className="bg-[#D4A72C] hover:bg-[#b08b25] text-[#0B2545] font-bold px-8 h-12 rounded-xl shrink-0" asChild>
                          <Link href={data.continueLearning.url}>
                            Resume <ArrowRight className="ml-2 h-5 w-5" />
                          </Link>
                        </Button>
                      </div>
                    </section>
                  </SortableWidget>
                );
              }

              if (widgetId === "referral-card" && referralData && referralData.settings?.is_enabled) {
                return (
                  <SortableWidget key={widgetId} id={widgetId}>
                    <section data-focus-hide className="bg-gradient-to-r from-[#0B2545] to-[#163E6B] rounded-[16px] shadow-lg border border-[#163E6B] overflow-hidden text-white group/widget">
                      <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <Gift className="w-6 h-6 text-[#D4A72C]" />
                            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Invite Friends & Earn</h2>
                          </div>
                          <p className="text-slate-300 text-sm">
                            Earn <span className="font-bold text-[#D4A72C]">{referralData.settings.referrer_xp_reward} XP</span> for every friend who joins LoksewaAI and completes registration. 
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-white/10">
                            <div>
                              <div className="text-slate-400 text-xs font-medium uppercase mb-1">Referrals</div>
                              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" /><span className="font-bold">{referralData.stats.successful_referrals}</span></div>
                            </div>
                            <div>
                              <div className="text-slate-400 text-xs font-medium uppercase mb-1">Pending</div>
                              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-orange-400" /><span className="font-bold">{referralData.stats.pending_referrals}</span></div>
                            </div>
                            <div>
                              <div className="text-slate-400 text-xs font-medium uppercase mb-1">XP Earned</div>
                              <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-400" /><span className="font-bold">{referralData.stats.total_xp_earned}</span></div>
                            </div>
                            <div>
                              <div className="text-slate-400 text-xs font-medium uppercase mb-1">Coins</div>
                              <div className="flex items-center gap-2"><Coins className="w-4 h-4 text-yellow-400" /><span className="font-bold">{referralData.stats.total_coins_earned}</span></div>
                            </div>
                          </div>
                          <div className="mt-6 pt-4 border-t border-white/10 hidden md:block">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs text-slate-300">Next Reward: <strong className="text-white">10 Referrals</strong></span>
                              <span className="text-xs text-slate-300 font-bold">{referralData.stats.successful_referrals} / 10</span>
                            </div>
                            <Progress value={Math.min((referralData.stats.successful_referrals / 10) * 100, 100)} className="h-2 bg-white/10" indicatorClassName="bg-[#4ade80]" />
                            <p className="text-[10px] text-slate-400 mt-2">
                              {Math.max(10 - referralData.stats.successful_referrals, 0)} more referrals to unlock: <strong className="text-[#D4A72C]">Referral Champion (+500 XP)</strong>
                            </p>
                          </div>
                        </div>
                        <div className="w-full md:w-auto shrink-0 flex flex-col gap-4">
                          <div className="bg-black/20 p-5 rounded-xl border border-white/10">
                            <div className="text-xs text-slate-300 font-medium uppercase tracking-wider mb-2 text-center">Your Referral Code</div>
                            <div className="font-mono text-xl font-bold tracking-widest text-[#4ade80] text-center mb-4">
                              {referralData.profile.referral_code}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0 flex-1 h-9 px-2"
                                onClick={() => {
                                  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${referralData.profile.referral_code}`;
                                  navigator.clipboard.writeText(link);
                                  alert("Referral link copied!");
                                }} title="Copy Link">
                                <Copy className="w-4 h-4 mr-1" /> Copy
                              </Button>
                              <Button variant="secondary" className="bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/40 text-[#1DA1F2] border-0 h-9 px-3"
                                onClick={() => {
                                  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${referralData.profile.referral_code}`;
                                  if (navigator.share) {
                                    navigator.share({ title: 'Join me on LoksewaAI', text: 'Join me on LoksewaAI and start your Loksewa preparation. Use my referral link to get started!', url: link }).catch(console.error);
                                  } else {
                                    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}&text=Join me on LoksewaAI!`);
                                  }
                                }} title="Share">
                                <Share2 className="w-4 h-4" />
                              </Button>
                              <Button className="bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-white flex-1 h-9 px-2" asChild>
                                <Link href="/student/referrals">Details <ArrowRight className="w-4 h-4 ml-1" /></Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  </SortableWidget>
                );
              }

              return null;
            })}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId && FULL_WIDTH_WIDGETS.includes(activeId as FullWidthId) ? (
            <WidgetDragGhost label={WIDGET_LABELS[activeId as string] ?? String(activeId)} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ─── DRAGGABLE GRID SECTIONS ────────────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveId(e.active.id)}
        onDragEnd={handleGridDragEnd}
      >
        <SortableContext items={gridOrder} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {gridOrder.map((widgetId) => {
              if (widgetId === "referrals-list") {
                return (
                  <SortableWidget key={widgetId} id={widgetId}>
                    <div className="bg-white border border-slate-200 shadow-sm rounded-[16px] flex flex-col overflow-hidden group/widget">
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="text-base font-bold text-[#0B2545] flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-500" /> Recent Referrals
                        </h3>
                        <div className="flex items-center gap-1">
                          <div className="opacity-0 group-hover/widget:opacity-100 transition-opacity" title="Drag to reorder">
                            <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                          </div>
                          <Button variant="ghost" size="sm" className="text-xs text-blue-600 h-8 font-semibold" asChild>
                            <Link href="/student/referrals">View all</Link>
                          </Button>
                        </div>
                      </div>
                      <div className="p-0 flex-1 flex flex-col">
                        {referralHistory.length > 0 ? (
                          <div className="divide-y divide-slate-100">
                            {referralHistory.slice(0, 4).map((item, i) => (
                              <div key={i} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
                                <span className="text-sm font-semibold text-[#0B2545]">{item.referred_username}</span>
                                <div className="flex items-center gap-3">
                                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider", 
                                    item.status === 'rewarded' ? 'bg-green-100 text-green-700' : 
                                    item.status === 'qualified' ? 'bg-blue-100 text-blue-700' : 
                                    'bg-orange-100 text-orange-700')}>
                                    {item.status}
                                  </span>
                                  <span className="text-xs font-bold text-[#D4A72C] w-14 text-right">
                                    {item.reward_amount > 0 ? `+${item.reward_amount} XP` : '—'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center flex flex-col items-center justify-center h-full text-slate-500">
                            <Users className="w-10 h-10 text-slate-200 mb-3" />
                            <p className="text-sm font-medium text-[#0B2545]">No referrals yet</p>
                            <p className="text-xs mt-1">Share your code to start earning!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </SortableWidget>
                );
              }

              if (widgetId === "your-progress") {
                return (
                  <SortableWidget key={widgetId} id={widgetId}>
                    <div className="bg-white border border-slate-200 shadow-sm rounded-[16px] flex flex-col overflow-hidden group/widget">
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="text-base font-bold text-[#0B2545] flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-purple-500" /> Your Progress
                        </h3>
                        <div className="flex items-center gap-2">
                          <div className="opacity-0 group-hover/widget:opacity-100 transition-opacity" title="Drag to reorder">
                            <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                          </div>
                          <div className="text-[11px] font-bold text-slate-500 flex items-center cursor-pointer hover:text-[#0B2545] uppercase tracking-wider">
                            This Week <ChevronRight className="w-3 h-3 ml-0.5 rotate-90" />
                          </div>
                        </div>
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-center gap-6">
                        <div>
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-semibold text-slate-600">Practice Score</span>
                            <span className="text-sm font-bold text-[#0B2545]">{data.stats.averageScore}%</span>
                          </div>
                          <Progress value={data.stats.averageScore} className="h-2 bg-slate-100" indicatorClassName="bg-blue-500" />
                        </div>
                        <div>
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-semibold text-slate-600">Mock Exams</span>
                            <span className="text-sm font-bold text-[#0B2545]">{data.stats.completedExams} / {Math.max(data.stats.completedExams, data.stats.totalExams)}</span>
                          </div>
                          <Progress value={data.stats.totalExams > 0 ? Math.min((data.stats.completedExams / data.stats.totalExams) * 100, 100) : 0} className="h-2 bg-slate-100" indicatorClassName="bg-purple-500" />
                        </div>
                        <div>
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-semibold text-slate-600">Questions Solved</span>
                            <span className="text-sm font-bold text-[#0B2545]">{data.stats.questionsAttempted}</span>
                          </div>
                          <Progress value={Math.min((data.stats.questionsAttempted / Math.max(data.stats.questionsAttempted + 50, 100)) * 100, 100)} className="h-2 bg-slate-100" indicatorClassName="bg-[#D4A72C]" />
                        </div>
                        <div>
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-semibold text-slate-600">Accuracy</span>
                            <span className="text-sm font-bold text-[#0B2545]">{data.stats.accuracy}%</span>
                          </div>
                          <Progress value={data.stats.accuracy} className="h-2 bg-slate-100" indicatorClassName="bg-green-500" />
                        </div>
                      </div>
                    </div>
                  </SortableWidget>
                );
              }

              if (widgetId === "upcoming-exams") {
                return (
                  <SortableWidget key={widgetId} id={widgetId}>
                    <div className="bg-white border border-slate-200 shadow-sm rounded-[16px] flex flex-col overflow-hidden group/widget">
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="text-base font-bold text-[#0B2545] flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-orange-500" /> Upcoming
                        </h3>
                        <div className="flex items-center gap-1">
                          <div className="opacity-0 group-hover/widget:opacity-100 transition-opacity" title="Drag to reorder">
                            <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                          </div>
                          <Button variant="ghost" size="sm" className="text-xs text-blue-600 h-8 font-semibold" asChild>
                            <Link href="/student/exams">View all</Link>
                          </Button>
                        </div>
                      </div>
                      <div className="p-0 flex-1 flex flex-col">
                        {data.todaysPlan.filter(p => p.type === 'exam').length > 0 ? (
                          <div className="divide-y divide-slate-100">
                            {data.todaysPlan.filter(p => p.type === 'exam').map(exam => (
                              <div key={exam.id} className="p-5 hover:bg-slate-50 transition-colors">
                                <div className="flex gap-4">
                                  <div className="mt-1"><Calendar className="w-5 h-5 text-blue-500" /></div>
                                  <div className="flex-1">
                                    <h4 className="text-sm font-bold text-[#0B2545] leading-tight mb-1">{exam.title}</h4>
                                    <p className="text-xs text-slate-500 font-medium">Today • {exam.duration} mins</p>
                                    <Button size="sm" variant="outline" className="w-full mt-4 text-xs font-bold border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800">
                                      Start Now
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center flex flex-col items-center justify-center h-full text-slate-500">
                            <Calendar className="w-10 h-10 text-slate-200 mb-3" />
                            <p className="text-sm font-medium text-[#0B2545]">No upcoming exams</p>
                            <p className="text-xs mt-1">Check back later or view past results.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </SortableWidget>
                );
              }

              return null;
            })}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId && GRID_WIDGETS.includes(activeId as GridId) ? (
            <WidgetDragGhost label={WIDGET_LABELS[activeId as string] ?? String(activeId)} />
          ) : null}
        </DragOverlay>
      </DndContext>

    </div>
  );
}
