"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpen, Menu, X, Moon, Sun, ArrowRight, GraduationCap,
  Home, Target, FileText,
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

  // Bottom tab bar — mobile only. Four real destinations plus a "Menu" tab
  // that reuses the existing hamburger drawer instead of duplicating it.
  const mobileTabs = [
    { href: "/", label: "Home", icon: Home },
    { href: "/courses", label: "Courses", icon: BookOpen },
    { href: "/practice", label: "Practice", icon: Target },
    { href: "/notes", label: "Notes", icon: FileText },
  ];

  return (
    <>
      {/* Fixed wrapper is full-width and non-interactive; the actual bar
          floats inside it with margin on every side so it reads as a
          suspended capsule rather than a bar glued to the viewport edge. */}
      <header className="fixed top-0 left-0 w-full z-50 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4">
          <div
            className={`flex items-center justify-between gap-3 rounded-full border transition-all duration-500 ${
              isScrolled
                ? "px-3 py-2 bg-white/85 dark:bg-[#04080F]/90 backdrop-blur-xl border-slate-200/70 dark:border-white/[0.08] shadow-[0_10px_36px_-8px_rgba(11,37,69,0.16)] dark:shadow-[0_10px_36px_-8px_rgba(0,0,0,0.6)]"
                : "px-3 py-2.5 bg-white/55 dark:bg-white/[0.02] backdrop-blur-md border-white/40 dark:border-white/[0.04] shadow-[0_4px_20px_-8px_rgba(11,37,69,0.08)]"
            }`}
          >

            {/* ── Brand ────────────────────────────── */}
            <Link href="/" className="flex items-center gap-2.5 group shrink-0 pl-1">
              <div className="p-1.5 rounded-[9px] bg-gradient-to-br from-[#163E6B] to-[#0B2545] shadow-[0_2px_10px_rgba(11,37,69,0.25)] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-[-3deg]">
                <BookOpen className="h-5 w-5 text-[#D4A72C]" strokeWidth={2.5} />
              </div>
              <span className="font-[800] text-[19px] tracking-tight text-slate-900 dark:text-white hidden sm:inline">
                Loksewa<span className="text-[#D4A72C]">AI</span>
              </span>
            </Link>

            {/* ── Desktop Navigation — pill segment with a sliding active indicator ── */}
            <nav className="hidden lg:flex items-center gap-0.5 bg-slate-900/[0.04] dark:bg-white/[0.05] rounded-full p-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="relative px-3.5 py-1.5 rounded-full text-[13px] font-[600] tracking-wide"
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-pill"
                        className="absolute inset-0 rounded-full bg-white dark:bg-white/10 shadow-[0_2px_10px_rgba(11,37,69,0.1)]"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span
                      className={`relative z-10 transition-colors duration-200 ${
                        isActive
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                      }`}
                    >
                      {link.label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* ── Desktop Actions ──────────────────── */}
            <div className="hidden lg:flex items-center gap-2.5 pr-1">
              {/* Theme Toggle */}
              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-900/[0.05] dark:hover:bg-white/8 transition-all"
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
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#D4A72C]/30 dark:border-[#D4A72C]/20 bg-[#D4A72C]/5 dark:bg-[#D4A72C]/5 hover:bg-[#D4A72C]/10 dark:hover:bg-[#D4A72C]/10 transition-all group"
              >
                <GraduationCap className="w-3.5 h-3.5 text-[#D4A72C]" />
                <span className="text-[12px] font-[700] text-[#D4A72C]">Teacher Portal</span>
                <ArrowRight className="w-3 h-3 text-[#D4A72C] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>

              {/* Admin Portal */}
              <Link
                href="/admin-login"
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-500/30 dark:border-blue-400/20 bg-blue-500/5 dark:bg-blue-400/5 hover:bg-blue-500/10 dark:hover:bg-blue-400/10 transition-all group"
              >
                <span className="text-[12px] font-[700] text-blue-600 dark:text-blue-400">Admin Portal</span>
                <ArrowRight className="w-3 h-3 text-blue-600 dark:text-blue-400 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>

              <div className="h-4 w-px bg-slate-300/60 dark:bg-white/10" />

              {/* Log In */}
              <Link
                href="/login"
                className="text-[13px] font-[600] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors px-1.5"
              >
                Log In
              </Link>

              {/* Get Started */}
              <Link href="/register">
                <Button className="btn-gold-gradient text-[#040B14] h-[36px] px-4.5 rounded-full font-[700] text-[13px] border-none flex items-center gap-1.5 group">
                  Get Started
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
            </div>

            {/* ── Mobile Hamburger ─────────────────── */}
            <div className="flex lg:hidden items-center gap-1 pr-0.5">
              <Link
                href="/login"
                className="mr-0.5 px-3 py-1.5 rounded-full text-[12px] font-[700] text-slate-700 dark:text-white border border-slate-200/80 dark:border-white/15 hover:bg-slate-900/[0.05] dark:hover:bg-white/8 transition-all"
              >
                Login
              </Link>
              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-900/[0.05] dark:hover:bg-white/8 transition-all"
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              )}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 dark:text-white hover:bg-slate-900/[0.05] dark:hover:bg-white/8 transition-all"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* ── Mobile Navigation Drawer — its own floating card below the bar ── */}
          <div className={`lg:hidden overflow-hidden transition-all duration-500 ease-in-out ${
            isMobileMenuOpen ? "max-h-[600px] opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
          }`}>
            <div className="rounded-[24px] border border-slate-200/70 dark:border-white/[0.08] bg-white/97 dark:bg-[#04080F]/97 backdrop-blur-2xl shadow-[0_20px_50px_-12px_rgba(11,37,69,0.18)] overflow-hidden">
              <nav className="flex flex-col p-3 gap-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center text-[15px] font-[600] px-4 py-3 rounded-[14px] transition-all ${
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
                  className="flex items-center justify-between px-4 py-3 rounded-[14px] border border-[#D4A72C]/25 bg-[#D4A72C]/5"
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#D4A72C]" />
                    <span className="text-[14px] font-[700] text-[#D4A72C]">Teacher Portal</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D4A72C]" />
                </Link>

                {/* Admin Portal */}
                <Link
                  href="/admin-login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-[14px] border border-blue-500/25 bg-blue-500/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-[700] text-blue-600 dark:text-blue-400">Admin Portal</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </Link>

                <div className="flex gap-2">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex-1">
                    <Button variant="outline" className="w-full h-[44px] text-[14px] font-[600] border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-[14px] bg-transparent">
                      Log In
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setIsMobileMenuOpen(false)} className="flex-1">
                    <Button className="btn-gold-gradient w-full h-[44px] text-[14px] font-[700] text-[#040B14] rounded-[14px] border-none">
                      Get Started
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile app-style bottom tab bar ──────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)] bg-white/90 dark:bg-[#04080F]/92 backdrop-blur-2xl border-t border-slate-200/70 dark:border-white/[0.08] shadow-[0_-8px_30px_-12px_rgba(11,37,69,0.18)]"
        aria-label="Primary"
      >
        <div className="grid grid-cols-5 h-[64px]">
          {mobileTabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex flex-col items-center justify-center gap-1 group"
              >
                {isActive && (
                  <motion.span
                    layoutId="mobile-tab-active"
                    className="absolute top-1.5 w-9 h-1 rounded-full bg-[#D4A72C]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon
                  className={`w-[21px] h-[21px] transition-colors ${
                    isActive ? "text-[#C29322] dark:text-[#F0C95A]" : "text-slate-400 dark:text-slate-500"
                  }`}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                <span
                  className={`text-[10px] font-[700] transition-colors ${
                    isActive ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}

          <button
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="relative flex flex-col items-center justify-center gap-1"
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen && (
              <motion.span
                layoutId="mobile-tab-active"
                className="absolute top-1.5 w-9 h-1 rounded-full bg-[#D4A72C]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {isMobileMenuOpen ? (
              <X className="w-[21px] h-[21px] text-[#C29322] dark:text-[#F0C95A]" strokeWidth={2.4} />
            ) : (
              <Menu className="w-[21px] h-[21px] text-slate-400 dark:text-slate-500" strokeWidth={2} />
            )}
            <span
              className={`text-[10px] font-[700] transition-colors ${
                isMobileMenuOpen ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"
              }`}
            >
              Menu
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
