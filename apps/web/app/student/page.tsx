"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dashboardApi } from "@/lib/api/dashboard";
import { gamificationService } from "@/lib/api/gamification";
import { notesApi } from "@/lib/api/notes";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthToken } from "@/lib/api/client";
import { useOptionalStudentContext } from "@/contexts/StudentContext";
import { LoksewaExamCountdown } from "@/components/student/countdown/LoksewaExamCountdown";
import { MockExamCountdown } from "@/components/student/countdown/MockExamCountdown";
import { StudentEntitlementsUsageWidget } from "@/components/student/dashboard/StudentEntitlementsUsageWidget";
import {
  FULL_WIDTH_WIDGETS,
  GRID_WIDGETS,
  FullWidthId,
  GridId,
  STORAGE_KEY_FULL,
  STORAGE_KEY_GRID,
  loadOrder,
} from "@/components/student/dashboard/dashboard-types";
import { DashboardHeaderSection } from "@/components/student/dashboard/DashboardHeaderSection";
import { StaticDashboardLayout } from "@/components/student/dashboard/StaticDashboardLayout";

// Defer the heavy @dnd-kit drag-and-drop bundle so it does not block initial
// page rendering or inflate the critical route chunk.
const DraggableDashboardLayout = dynamic(
  () => import("@/components/student/dashboard/DraggableDashboardLayout"),
  {
    ssr: false,
    loading: () => null,
  }
);

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const studentCtx = useOptionalStudentContext();
  const effectiveCourseId = studentCtx?.activeCourse?.id;
  const isCtxLoading = studentCtx?.isLoading ?? false;

  const hasToken = typeof window !== "undefined" ? !!getAuthToken() : false;

  // 1. Primary Dashboard Query
  // Preserved fix: gated by !isCtxLoading so no unscoped request fires before context resolution.
  const {
    data,
    isFetching: dashboardFetching,
    isError,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ["student-dashboard", effectiveCourseId ?? null],
    queryFn: () => dashboardApi.getStudentDashboard(effectiveCourseId),
    enabled: (hasToken || !!user) && !isCtxLoading,
    staleTime: 45 * 1000,
  });
  const loading = !data;
  const error = isError && !data;

  // 2. Background/Secondary Queries - cached independently with proper auth gating
  const { data: motivation } = useQuery({
    queryKey: ["daily-motivation"],
    queryFn: () => dashboardApi.getDailyMotivation().catch(() => null),
    staleTime: 10 * 60 * 1000,
  });

  const { data: referralData, refetch: refetchReferral } = useQuery({
    queryKey: ["referral-dashboard"],
    queryFn: () => gamificationService.getStudentReferralDashboard().catch(() => null),
    enabled: hasToken || !!user,
    staleTime: 60 * 1000,
  });

  const { data: referralHistory = [], isLoading: isReferralHistoryLoading } = useQuery({
    queryKey: ["referral-history"],
    queryFn: () => gamificationService.getStudentReferralHistory().catch(() => []),
    enabled: hasToken || !!user,
    staleTime: 60 * 1000,
  });

  // 3. Background Data Warming: prefetched once after initial dashboard data renders
  const queryClient = useQueryClient();
  const hasPrefetchedRef = useRef(false);
  useEffect(() => {
    if (!data || hasPrefetchedRef.current) return;
    hasPrefetchedRef.current = true;
    const timer = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: ["syllabus-notes-portal", null],
        queryFn: () => notesApi.getStudentPortalView(undefined),
        staleTime: 5 * 60 * 1000,
      });
    }, 2500);
    return () => clearTimeout(timer);
  }, [data, queryClient]);

  const [mounted, setMounted] = useState(false);
  const [fullOrder, setFullOrder] = useState<FullWidthId[]>([...FULL_WIDTH_WIDGETS]);
  const [gridOrder, setGridOrder] = useState<GridId[]>([...GRID_WIDGETS]);

  useEffect(() => {
    setMounted(true);
    setFullOrder(loadOrder(STORAGE_KEY_FULL, FULL_WIDTH_WIDGETS));
    setGridOrder(loadOrder(STORAGE_KEY_GRID, GRID_WIDGETS));
  }, []);

  if (error) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto">
        <h2 className="text-2xl font-bold mb-2">Dashboard Unavailable</h2>
        <p className="text-muted-foreground mb-6">
          We couldn&apos;t load your dashboard data at this moment.
        </p>
        <Button onClick={() => refetchDashboard()}>Retry</Button>
      </div>
    );
  }

  // Server-enforced package lock view
  if (data && !data.package?.hasActivePackage) {
    const isPending = data.package.latestPayment?.status === "PENDING";
    const isRejected = data.package.latestPayment?.status === "REJECTED";
    const isExpired =
      data.package.status === "EXPIRED" ||
      (data.package.status === "ACTIVE" && data.package.remainingDays === 0);

    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 bg-muted/30">
        <div className="max-w-md w-full bg-card border border-border rounded-[24px] shadow-sm p-10 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#D4A72C]/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col items-center text-center">
            {isPending ? (
              <>
                <div className="w-20 h-20 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center mb-6 shadow-sm border border-yellow-100 dark:border-yellow-900/30">
                  <Clock className="w-10 h-10 text-yellow-500 animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold text-primary dark:text-foreground mb-3">
                  Verification Pending
                </h2>
                <p className="text-muted-foreground mb-6">
                  We are currently verifying your payment for the{" "}
                  <span className="font-semibold text-foreground">
                    {data.package.latestPayment?.planName}
                  </span>{" "}
                  package. This usually takes less than 30 minutes during working hours.
                </p>
                <div className="bg-muted w-full p-4 rounded-xl border border-border text-sm mb-6 text-left">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium text-foreground">
                      Rs. {data.package.latestPayment?.amount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submitted:</span>
                    <span className="font-medium text-foreground" suppressHydrationWarning>
                      {data.package.latestPayment?.submittedAt
                        ? new Date(data.package.latestPayment.submittedAt).toLocaleDateString()
                        : "Recently"}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl"
                  onClick={() => window.location.reload()}
                >
                  Refresh Status
                </Button>
              </>
            ) : isRejected ? (
              <>
                <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6 shadow-sm border border-red-100 dark:border-red-900/30">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-primary dark:text-foreground mb-3">
                  Payment Rejected
                </h2>
                <p className="text-muted-foreground mb-4">
                  Unfortunately, we couldn&apos;t verify your payment for the{" "}
                  <span className="font-semibold text-foreground">
                    {data.package.latestPayment?.planName}
                  </span>{" "}
                  package.
                </p>
                {data.package.latestPayment?.rejectionReason && (
                  <div className="bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 p-4 rounded-xl border border-red-100 dark:border-red-900/50 text-sm mb-6 w-full text-left">
                    <span className="font-semibold block mb-1">Reason:</span>
                    {data.package.latestPayment.rejectionReason}
                  </div>
                )}
                <Button
                  onClick={() => (window.location.href = "/student/plans")}
                  className="w-full bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] font-bold py-6 rounded-xl"
                >
                  Submit Payment Again
                </Button>
              </>
            ) : isExpired ? (
              <>
                <div className="w-20 h-20 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-6 shadow-sm border border-orange-100 dark:border-orange-900/30">
                  <Clock className="w-10 h-10 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-primary dark:text-foreground mb-3">
                  Package Expired
                </h2>
                <p className="text-muted-foreground mb-8">
                  Your{" "}
                  <span className="font-semibold text-foreground">{data.package.planName}</span>{" "}
                  package has expired. Renew your package to restore access to all premium features.
                </p>
                <Button
                  onClick={() => (window.location.href = "/student/plans")}
                  className="w-full bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] font-bold py-6 rounded-xl"
                >
                  Renew Package
                </Button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-[#D4A72C]/10 flex items-center justify-center mb-6 shadow-sm border border-[#D4A72C]/20">
                  <Lock className="w-10 h-10 text-[#D4A72C]" />
                </div>
                <h2 className="text-2xl font-bold text-primary dark:text-foreground mb-3">
                  Welcome to LoksewaAI
                </h2>
                <p className="text-muted-foreground mb-8">
                  Your account is ready. Choose a premium package to unlock your full learning
                  experience, including AI tutoring, mock exams, and analytics.
                </p>
                <Button
                  onClick={() => (window.location.href = "/student/plans")}
                  className="w-full bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] font-bold py-6 rounded-xl"
                >
                  Browse Premium Packages
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const activeCourse =
    studentCtx?.activeCourse ||
    (data?.activeCourse ? { title: data.activeCourse.name, level_name: null } : null);

  const layoutProps = {
    fullOrder,
    gridOrder,
    data,
    loading,
    motivation,
    referralData,
    referralHistory,
    isReferralHistoryLoading,
    onFullOrderChange: setFullOrder,
    onGridOrderChange: setGridOrder,
  };

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-8 bg-muted/50 min-h-[calc(100vh-72px)]">
      {/* 1. HEADER (always pinned at top) */}
      <DashboardHeaderSection
        data={data}
        loading={loading}
        user={user}
        activeCourse={activeCourse}
        isCtxLoading={isCtxLoading}
        dashboardFetching={dashboardFetching}
        mounted={mounted}
        referralData={referralData}
        refetchReferral={refetchReferral}
      />

      {/* 2. Dynamic Package, Entitlements & Usage Tracking */}
      <section>
        <StudentEntitlementsUsageWidget />
      </section>

      {/* 3. Official Loksewa Exam Countdown & Upcoming Mock Exam Banner */}
      <section className="space-y-4">
        <LoksewaExamCountdown />
        <MockExamCountdown />
      </section>

      {/* 4. Widget Sections: Fast static shell on SSR/initial paint, deferred dnd-kit on client */}
      {mounted ? (
        <DraggableDashboardLayout {...layoutProps} />
      ) : (
        <StaticDashboardLayout {...layoutProps} />
      )}
    </div>
  );
}
