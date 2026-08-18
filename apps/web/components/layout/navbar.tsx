"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen, Menu, X, Moon, Sun, ArrowRight, GraduationCap, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/courses", label: "Courses" },
    { href: "/syllabus", label: "Syllabus" },
    { href: "/practice", label: "Practice" },
    { href: "/exams", label: "Exams" },
    { href: "/notes", label: "Notes" },
    { href: "/marketplace", label: "Marketplace" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
          isScrolled
            ? "py-2.5 bg-white/80 dark:bg-[#04080F]/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
            : "py-4 bg-transparent border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 max-w-[1440px]">

          {/* ── Brand ────────────────────────────── */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className={`p-1.5 rounded-[8px] transition-all duration-300 ${
              isScrolled
                ? "bg-[#0B2545] dark:bg-[#D4A72C]/10"
                : "bg-[#0B2545]/90 dark:bg-white/8"
            } group-hover:scale-105`}>
              <BookOpen className="h-5 w-5 text-[#D4A72C]" strokeWidth={2.5} />
            </div>
            <span className={`font-[800] text-[20px] tracking-tight transition-colors duration-300 ${
              isScrolled
                ? "text-slate-900 dark:text-white"
                : "text-slate-900 dark:text-white"
            }`}>
              Loksewa<span className="text-[#D4A72C]">AI</span>
            </span>
          </Link>

          {/* ── Desktop Navigation ───────────────── */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3.5 py-2 rounded-[8px] text-[13.5px] font-[600] tracking-wide transition-all duration-200 group ${
                    isActive
                      ? "text-slate-900 dark:text-white bg-slate-100/80 dark:bg-white/8"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-white/5"
                  }`}
                >
                  {link.label}
                  {/* Active indicator dot */}
                  {isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#D4A72C]" />
                  )}
                  {/* Hover underline */}
                  {!isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-[2px] w-0 bg-[#D4A72C]/50 rounded-full transition-all duration-300 group-hover:w-4" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ── Desktop Actions ──────────────────── */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/8 transition-all"
                aria-label="Toggle theme"
              >
                {theme === "dark"
                  ? <Sun className="h-4 w-4" />
                  : <Moon className="h-4 w-4" />
                }
              </button>
            )}

            {/* Teacher Portal */}
            <Link
              href="/teacher/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#D4A72C]/30 dark:border-[#D4A72C]/20 bg-[#D4A72C]/5 dark:bg-[#D4A72C]/5 hover:bg-[#D4A72C]/10 dark:hover:bg-[#D4A72C]/10 transition-all group"
            >
              <GraduationCap className="w-3.5 h-3.5 text-[#D4A72C]" />
              <span className="text-[12.5px] font-[700] text-[#D4A72C]">Teacher Portal</span>
              <ArrowRight className="w-3 h-3 text-[#D4A72C] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Link>

            <div className="h-4 w-px bg-slate-200 dark:bg-white/10" />

            {/* Log In */}
            <Link
              href="/login"
              className="text-[13.5px] font-[600] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors px-2"
            >
              Log In
            </Link>

            {/* Get Started */}
            <Link href="/register">
              <Button className="bg-[#D4A72C] hover:bg-[#C29322] text-[#040B14] h-[38px] px-5 rounded-[9px] font-[700] text-[13.5px] transition-all hover:shadow-[0_4px_16px_rgba(212,167,44,0.35)] hover:-translate-y-0.5 border-none flex items-center gap-1.5 group">
                Get Started
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* ── Mobile Hamburger ─────────────────── */}
          <div className="flex lg:hidden items-center gap-2">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/8 transition-all"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-9 h-9 rounded-[8px] flex items-center justify-center text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/8 transition-all"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* ── Mobile Navigation Drawer ─────────── */}
        <div className={`lg:hidden overflow-hidden transition-all duration-500 ease-in-out ${
          isMobileMenuOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}>
          <div className="border-t border-slate-100 dark:border-white/5 bg-white/95 dark:bg-[#04080F]/97 backdrop-blur-2xl">
            <nav className="flex flex-col p-3 gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center text-[15px] font-[600] px-4 py-3 rounded-[10px] transition-all ${
                      isActive
                        ? "bg-slate-100 dark:bg-white/8 text-slate-900 dark:text-white"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#D4A72C] mr-3 shrink-0" />}
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="h-px bg-slate-100 dark:bg-white/5 mx-3" />

            <div className="p-3 flex flex-col gap-2.5 pb-4">
              {/* Teacher Portal */}
              <Link
                href="/teacher/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-[10px] border border-[#D4A72C]/25 bg-[#D4A72C]/5"
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#D4A72C]" />
                  <span className="text-[14px] font-[700] text-[#D4A72C]">Teacher Portal</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#D4A72C]" />
              </Link>

              <div className="flex gap-2">
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex-1">
                  <Button variant="outline" className="w-full h-[44px] text-[14px] font-[600] border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-[10px] bg-transparent">
                    Log In
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setIsMobileMenuOpen(false)} className="flex-1">
                  <Button className="w-full h-[44px] text-[14px] font-[700] bg-[#D4A72C] text-[#040B14] hover:bg-[#C29322] rounded-[10px]">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
