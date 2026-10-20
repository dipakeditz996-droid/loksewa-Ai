"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Avatar } from "@/components/ui/avatar";
import { RetryImage } from "@/components/ui/retry-image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { FocusModeHeaderToggle } from "@/components/student/focus/FocusModeHeaderToggle";
import { CourseSwitcher } from "@/components/layout/CourseSwitcher";

interface DashboardHeaderProps {
  onMenuClick: () => void;
  role?: "student" | "teacher" | "admin" | "super-admin";
}

// The dashboard's own hero card already renders a rich time-based greeting,
// so repeating "Good Afternoon, teacher!" up here just above it reads as a
// glitch, not a feature. Every other teacher page shows a plain PageHeader
// title with no greeting at all, so this slot is otherwise empty on those
// pages too - showing the current section name instead gives it a job on
// every page rather than colliding with one page in particular.
const TEACHER_PAGE_TITLES: Record<string, string> = {
  "/teacher": "Dashboard",
  "/teacher/courses": "My Courses",
  "/teacher/students": "Students",
  "/teacher/questions": "Question Bank",
  "/teacher/practice-sets": "Practice Sets",
  "/teacher/mock-exams": "Mock Exams",
  "/teacher/study-materials": "Study Materials",
  "/teacher/evaluations": "Evaluations",
  "/teacher/evaluate": "Subjective Exam Grading",
  "/teacher/analytics": "Analytics & Results",
  "/teacher/notifications": "Notifications",
  "/teacher/settings": "Settings",
  "/teacher/help-support": "Help & Support",
};

function resolveTeacherTitle(pathname: string | null): string {
  if (!pathname) return "Teacher Portal";
  if (TEACHER_PAGE_TITLES[pathname]) return TEACHER_PAGE_TITLES[pathname];
  const nestedMatch = Object.keys(TEACHER_PAGE_TITLES)
    .filter((p) => p !== "/teacher")
    .sort((a, b) => b.length - a.length)
    .find((p) => pathname.startsWith(p));
  return (nestedMatch && TEACHER_PAGE_TITLES[nestedMatch]) || "Teacher Portal";
}

export function DashboardHeader({ onMenuClick, role = "student" }: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const viewAllHref = role === "student" ? "/student/notifications" : "/teacher/notifications";

  let greeting = "Good Day";
  let icon = "👋";
  if (mounted) {
    const hour = new Date().getHours();
    if (hour < 12) {
      greeting = "Good Morning";
      icon = "☀️";
    } else if (hour < 17) {
      greeting = "Good Afternoon";
      icon = "👋";
    } else if (hour < 20) {
      greeting = "Good Evening";
      icon = "🌙";
    } else {
      greeting = "Good Night";
      icon = "🌙";
    }
  }

  const displayName = user?.name ? user.name.split(" ")[0] : "Student";

  return (
    <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-2.5 sm:px-8 gap-1.5 sm:gap-2">
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-4 flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0 h-9 w-9 p-0"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5 text-[#0B2545] dark:text-white" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
        <div className="hidden lg:flex min-w-0 flex-col">
          {role === "teacher" ? (
            <>
              <span className="text-[16px] font-bold text-foreground dark:text-white">
                {resolveTeacherTitle(pathname)}
              </span>
              <span className="text-[12px] font-medium text-muted-foreground dark:text-slate-300">Teacher Portal</span>
            </>
          ) : role === "admin" || role === "super-admin" ? (
            <>
              <span className="text-[16px] font-bold text-foreground dark:text-white">
                Admin Portal
              </span>
              <span className="text-[12px] font-medium text-muted-foreground dark:text-slate-300">Overview</span>
            </>
          ) : (
            <>
              <span className="truncate text-[16px] font-bold text-foreground dark:text-white flex items-center gap-1.5">
                {mounted && user?.name ? (
                  <>
                    {greeting}, {displayName}! <span className="text-xl">{icon}</span>
                  </>
                ) : (
                  <span>Welcome back!</span>
                )}
              </span>
              <span className="truncate text-[12px] font-medium text-muted-foreground dark:text-slate-300">Welcome back! Keep up the excellent work.</span>
            </>
          )}
        </div>
        
        {/* On mobile, place CourseSwitcher here so it can shrink cleanly */}
        {role === "student" && mounted && (
          <div className="block lg:hidden min-w-0">
            <CourseSwitcher />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-4 shrink-0">
        <div className="hidden md:flex relative w-64 lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={role === "teacher" ? "Search students, questions..." : "Search syllabus, notes..."}
            className="w-full bg-muted/50 dark:bg-muted dark:text-foreground dark:border-border dark:placeholder:text-muted-foreground pl-9 focus-visible:ring-1 focus-visible:ring-primary rounded-full text-[13px] h-9"
          />
        </div>

        {/* Active Course Context Switcher - desktop only */}
        {role === "student" && mounted && (
          <div className="hidden lg:block">
            <CourseSwitcher />
          </div>
        )}

        {/* Do Not Disturb / Focus Mode - student portal only. */}
        {role === "student" && mounted && (
          <div className="hidden sm:block">
            <FocusModeHeaderToggle />
          </div>
        )}

        <ThemeToggle />

        {mounted && <NotificationBell viewAllHref={viewAllHref} />}

        {mounted && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full ml-1">
                <Avatar className="h-9 w-9 border border-slate-200 dark:border-[hsl(var(--border))]">
                  <RetryImage src={user.avatar || "/images/profile.png"} alt={user.name || "User"} className="aspect-square h-full w-full object-cover" />
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="text-[13px] cursor-pointer">
                <Link href={role === "student" ? "/student/settings" : `/${role}/settings`}>
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-[13px] cursor-pointer">
                <Link href={role === "student" ? "/student/settings" : `/${role}/settings`}>
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-[13px] text-red-600 dark:text-red-400 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/30 dark:focus:text-red-400 cursor-pointer"
                onClick={() => {
                  logout();
                  window.location.href = "/login";
                }}
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="h-9 w-9 rounded-full bg-muted/60 animate-pulse ml-1" />
        )}
      </div>
    </header>
  );
}
