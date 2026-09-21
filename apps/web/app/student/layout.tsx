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
      dashboardApi.getPackageStatus().then(({ package: pkg }) => {
        if (pkg?.enforcementEnabled && !pkg?.hasActivePackage) {
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

  // ONE tree for both modes. The page content stays at the same position in it
  // when an exam / practice session switches focus mode on, so React keeps the
  // page mounted. Two different trees used to unmount and remount the page every
  // time focus mode toggled - and a page that starts something when it mounts
  // (a practice session) started a new one each time, in a loop.
  return (
    <div className={examFocus ? "flex min-h-screen flex-col bg-muted" : "flex min-h-screen bg-muted/20"}>
      {!examFocus && <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} role="student" />}

      <div className={examFocus ? "flex min-w-0 flex-1 flex-col" : "flex min-w-0 flex-1 flex-col lg:pl-72 transition-all duration-300"}>
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
        <main className={examFocus ? "flex-1" : "flex-1 overflow-y-auto"}>
          {children}
        </main>
      </div>

      <FocusAwareToaster />
    </div>
  );
}
