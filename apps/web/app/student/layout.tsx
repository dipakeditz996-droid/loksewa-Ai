"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { FocusAwareToaster } from "@/components/student/focus/FocusAwareToaster";
import { useFocusMode } from "@/contexts/FocusModeContext";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { examFocus, examSession } = useFocusMode();
  const pathname = usePathname();

  const attemptPath = examSession
    ? `/student/exams/${examSession.examinationId ?? ""}/attempt/${examSession.attemptId}`
    : null;
  const onAttemptPage = !!attemptPath && pathname === attemptPath;

  // While an ExaminationAttempt is in progress the student is in a dedicated
  // examination environment: no sidebar, no header, nothing to navigate away
  // by accident. The exam page renders its own minimal chrome.
  //
  // The attempt is server-truth, not tied to which page is open - a closed
  // tab, a crash, or an untimed exam the student never submitted can leave
  // one "in-progress" indefinitely. Without an escape hatch that traps the
  // student on every /student page with no sidebar and no way back short of
  // finding the exam URL themselves. So: anywhere except the attempt page
  // itself, show a real way back in instead of just blank chrome.
  const [packageLocked, setPackageLocked] = useState(false);

  useEffect(() => {
    // Only check if we are NOT on the main dashboard, onboarding, or checkout pages
    if (pathname === "/student" || pathname.startsWith("/student/onboarding") || pathname.startsWith("/student/checkout") || pathname.startsWith("/student/plans")) {
      return;
    }
    
    // We do a lightweight check to see if they should be locked out
    // Since HasActiveSubscription is enforced on backend, we could wait for 403s,
    // but proactive redirect provides a better UX.
    import("@/lib/api/dashboard").then(({ dashboardApi }) => {
      dashboardApi.getStudentDashboard().then(data => {
        if (data.package?.enforcementEnabled && !data.package?.hasActivePackage) {
          setPackageLocked(true);
        }
      }).catch(() => {});
    });
  }, [pathname]);

  if (packageLocked) {
    // Redirect to dashboard where the locked UI is rendered
    if (typeof window !== "undefined") {
      window.location.href = "/student";
    }
    return <div className="min-h-screen bg-muted/20" />;
  }

  if (examFocus) {
    return (
      <div className="flex min-h-screen flex-col bg-muted">
        {!onAttemptPage && attemptPath && (
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
        )}
        <main className="flex-1">{children}</main>
        <FocusAwareToaster />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} role="student" />
      
      <div className="flex flex-1 flex-col lg:pl-72 transition-all duration-300">
        <DashboardHeader 
          onMenuClick={() => setSidebarOpen(true)} 
          role="student" 
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <FocusAwareToaster />
    </div>
  );
}
