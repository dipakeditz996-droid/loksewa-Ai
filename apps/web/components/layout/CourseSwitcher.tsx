"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap, ChevronDown, Check, Sparkles, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStudentContext } from "@/contexts/StudentContext";
import { cn } from "@/lib/utils";

export function CourseSwitcher() {
  const {
    activeCourse,
    authorizedCourses,
    isLoading,
    isSwitching,
    selectCourse,
  } = useStudentContext();

  if (isLoading) {
    return (
      <div className="h-8 w-36 rounded-full bg-muted animate-pulse hidden sm:block" />
    );
  }

  // 0 authorized courses -> Honest CTA state
  if (authorizedCourses.length === 0) {
    return (
      <Link href="/student/plans">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 rounded-full border-[#D4A72C]/40 bg-[#D4A72C]/10 hover:bg-[#D4A72C]/20 text-[#D4A72C] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Choose a Course</span>
          <span className="sm:hidden">Courses</span>
        </Button>
      </Link>
    );
  }

  // 1 authorized course -> Single authoritative badge
  if (authorizedCourses.length === 1 && activeCourse) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary max-w-[190px] sm:max-w-[260px] truncate shadow-xs"
        title={activeCourse.title}
      >
        <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="truncate">{activeCourse.title}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
      </div>
    );
  }

  // 2+ authorized courses -> Interactive Course Switcher Dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isSwitching}
          className={cn(
            "h-8 sm:h-9 px-3 rounded-full border-border bg-background/90 hover:bg-accent/80 text-xs font-semibold flex items-center gap-2 max-w-[180px] sm:max-w-[260px] md:max-w-[300px] transition-all shadow-xs",
            isSwitching && "opacity-70 cursor-wait"
          )}
          title={activeCourse?.title || "Switch Course"}
        >
          {isSwitching ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4A72C] shrink-0" />
          ) : (
            <GraduationCap className="w-3.5 h-3.5 text-[#D4A72C] shrink-0" />
          )}
          <span className="truncate text-foreground font-semibold">
            {activeCourse?.title || "Select Course"}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-auto opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[280px] sm:w-[320px] p-2 rounded-2xl shadow-xl border-border bg-popover"
      >
        <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2.5 py-1.5 flex items-center justify-between">
          <span>Active Course Context</span>
          <span className="text-[10px] font-normal lowercase bg-muted px-1.5 py-0.5 rounded-md">
            {authorizedCourses.length} enrolled
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />
        <div className="max-h-[260px] overflow-y-auto space-y-1 py-1">
          {authorizedCourses.map((course) => {
            const isActive = course.id === activeCourse?.id;
            return (
              <DropdownMenuItem
                key={course.id}
                onClick={() => selectCourse(course.id)}
                className={cn(
                  "flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition-colors focus:bg-accent",
                  isActive
                    ? "bg-[#D4A72C]/10 text-foreground font-semibold border border-[#D4A72C]/30"
                    : "hover:bg-muted/70 text-foreground"
                )}
              >
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5 text-muted-foreground">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn("text-xs leading-snug line-clamp-2", isActive && "font-bold text-[#D4A72C]")}>
                    {course.title}
                  </div>
                  {(course.category_name || course.level_name) && (
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {[course.category_name, course.level_name].filter(Boolean).join(" • ")}
                    </div>
                  )}
                </div>
                {isActive && (
                  <div className="shrink-0 mt-1">
                    <Check className="w-4 h-4 text-[#D4A72C]" />
                  </div>
                )}
              </DropdownMenuItem>
            );
          })}
        </div>
        <DropdownMenuSeparator className="my-1" />
        <Link href="/student/learning?tab=courses">
          <DropdownMenuItem className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer px-2.5 py-1.5 justify-center font-medium">
            Manage Enrolled Courses →
          </DropdownMenuItem>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
