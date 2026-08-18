"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === "/teacher/login";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && mounted && !isLoginPage) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "teacher" && user.role !== "admin" && user.role !== "super-admin") {
        router.push(`/${user.role === "student" ? "student" : ""}`);
      }
    }
  }, [user, loading, router, mounted]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!mounted || loading || (!user || (user.role !== "teacher" && user.role !== "admin" && user.role !== "super-admin"))) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} role="teacher" />
      
      <div className="flex flex-1 flex-col lg:pl-72 transition-all duration-300">
        <DashboardHeader 
          onMenuClick={() => setSidebarOpen(true)} 
          role="teacher" 
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
