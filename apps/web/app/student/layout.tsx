"use client";

import { useState } from "react";
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
  const { examFocus } = useFocusMode();

  // While an ExaminationAttempt is in progress the student is in a dedicated
  // examination environment: no sidebar, no header, nothing to navigate away
  // by accident. The exam page renders its own minimal chrome.
  if (examFocus) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
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
