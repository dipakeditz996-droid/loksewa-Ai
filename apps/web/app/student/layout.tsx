"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { BRAND_ASSETS, BRAND_ALT } from "@/lib/brand";
import { AlertTriangle } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { FocusAwareToaster } from "@/components/student/focus/FocusAwareToaster";
import { useFocusMode } from "@/contexts/FocusModeContext";
import { StudentContextProvider, useStudentContext } from "@/contexts/StudentContext";
import { useAuth } from "@/contexts/AuthContext";

function StudentLayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { examFocus, examSession } = useFocusMode();
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { subscription } = useStudentContext();

  useEffect(() => {
    setMounted(true);
    if (typeof document !== "undefined") {
      let meta = document.querySelector('meta[name="robots"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "robots");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", "noindex, nofollow, noarchive");
    }
  }, []);

  useEffect(() => {
    if (!authLoading && mounted) {
      if (!user) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (user.role !== "student" && user.role !== "admin" && user.role !== "super-admin") {
        router.replace(`/${user.role === "teacher" ? "teacher" : ""}`);
      }
    }
  }, [user, authLoading, mounted, router, pathname]);

  const attemptPath = examSession
    ? `/student/exams/${examSession.examinationId ?? ""}/attempt/${examSession.attemptId}`
    : null;
  const onAttemptPage = !!attemptPath && pathname === attemptPath;

  const isLocked =
    !!subscription &&
    subscription.enforcementEnabled &&
    !subscription.hasActivePackage &&
    subscription.latestPayment?.status !== "PENDING";

  const isExemptPath =
    pathname === "/student" ||
    pathname.startsWith("/student/settings") ||
    pathname.startsWith("/student/help-support") ||
    pathname.startsWith("/student/purchases") ||
    pathname.startsWith("/student/packages") ||
    pathname.startsWith("/student/plans") ||
    pathname.startsWith("/student/checkout") ||
    pathname.startsWith("/student/wallet") ||
    pathname.startsWith("/student/onboarding");

  useEffect(() => {
    if (isExemptPath) {
      return;
    }

    if (isLocked) {
      router.replace("/student");
    }
  }, [pathname, isLocked, isExemptPath, router]);

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-[88px] relative overflow-hidden rounded-[8px] bg-white border border-slate-200 dark:border-white/10 p-1 flex items-center justify-center shadow-xs">
            <Image
              src={BRAND_ASSETS.logo}
              alt={BRAND_ALT}
              width={464}
              height={211}
              priority
              className="w-full h-full object-contain"
            />
          </div>
          <div className="h-6 w-6 border-2 border-[#102D40] border-t-[#2563EB] rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Loading NES Mastery...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (isLocked && !isExemptPath) {
    return <div className="min-h-screen bg-muted/20" />;
  }

  return (
    <div className={examFocus ? "flex min-h-screen flex-col bg-muted overflow-x-clip w-full" : "flex min-h-screen bg-muted/20 overflow-x-clip w-full"}>
      {!examFocus && <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} role="student" />}

      <div className={examFocus ? "flex min-w-0 flex-1 flex-col overflow-x-clip" : "flex min-w-0 flex-1 flex-col lg:pl-72 transition-all duration-300 overflow-x-clip"}>
        {examFocus && !onAttemptPage && attemptPath ? (
          <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>You have an exam in progress. Navigation is hidden until you submit it.</span>
            <Link
              href={attemptPath}
              className="rounded-md bg-card/20 px-3 py-1 hover:bg-card/30 transition-colors"
            >
              Resume Exam
            </Link>
          </div>
        ) : null}
        {!examFocus && (
          <DashboardHeader
            onMenuClick={() => setSidebarOpen(true)}
            role="student"
          />
        )}
        <main className={examFocus ? "flex-1 min-w-0 overflow-x-clip" : "flex-1 min-w-0 overflow-y-auto overflow-x-clip"}>
          {children}
        </main>
      </div>

      <FocusAwareToaster />
    </div>
  );
}

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudentContextProvider>
      <StudentLayoutContent>{children}</StudentLayoutContent>
    </StudentContextProvider>
  );
}
