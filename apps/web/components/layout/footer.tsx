"use client";

import Link from "next/link";
import {
  BookOpen, GraduationCap, Mail,
  ShieldCheck, BadgeCheck, Cpu, TrendingUp, ArrowRight, MapPin, Phone,
  Globe, MessageCircle, Share2, Users
} from "lucide-react";

const platformLinks = [
  { name: "Courses", href: "/courses" },
  { name: "Syllabus", href: "/syllabus" },
  { name: "Practice", href: "/practice" },
  { name: "Mock Exams", href: "/exams" },
  { name: "Notes", href: "/notes" },
  { name: "Marketplace", href: "/marketplace" },
];

const resourceLinks = [
  { name: "Study Materials", href: "/notes" },
  { name: "FAQs", href: "/faqs" },
  { name: "Help & Support", href: "/help" },
  { name: "AI Preparation", href: "/student/ai-tutor" },
  { name: "Exam Preparation", href: "/preparation" },
];

const accountLinks = [
  { name: "Login", href: "/login" },
  { name: "Dashboard", href: "/student" },
  { name: "My Courses", href: "/student/courses" },
  { name: "Settings", href: "/student/settings" },
];

const companyLinks = [
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
  { name: "Privacy Policy", href: "/privacy" },
  { name: "Terms of Service", href: "/terms" },
  { name: "Refund Policy", href: "/refund" },
];

const trustBadges = [
  { icon: ShieldCheck, label: "Secure Payments" },
  { icon: BadgeCheck, label: "Verified Content" },
  { icon: Cpu, label: "AI-Powered Prep" },
  { icon: TrendingUp, label: "Progress Tracking" },
];

const socialLinks = [
  { icon: Globe, label: "Facebook", href: "https://facebook.com/loksewaai" },
  { icon: Share2, label: "Instagram", href: "https://instagram.com/loksewaai" },
  { icon: MessageCircle, label: "YouTube", href: "https://youtube.com/@loksewaai" },
  { icon: Users, label: "LinkedIn", href: "https://linkedin.com/company/loksewaai" },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-slate-50 dark:bg-[#020610] border-t border-slate-200 dark:border-white/[0.06]">

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4A72C]/40 to-transparent" />

      {/* ── Background atmosphere ─────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Neural grid */}
        <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-60" />
        {/* Gold glow (dark mode) */}
        <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] bg-[#D4A72C]/[0.04] dark:bg-[#D4A72C]/[0.07] rounded-full blur-[150px] pointer-events-none" />
        {/* Blue glow (dark mode) */}
        <div className="absolute bottom-[-10%] right-[-5%] w-[700px] h-[700px] bg-blue-500/[0.02] dark:bg-[#163E6B]/[0.2] rounded-full blur-[150px] pointer-events-none" />
      </div>

      <div className="relative z-10">

        {/* ── Main footer columns ───────────────── */}
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-8">

            {/* Brand column (spans 2) */}
            <div className="lg:col-span-2">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5 group mb-5 w-fit">
                <div className="p-1.5 rounded-[8px] bg-[#0B2545] dark:bg-white/5 group-hover:scale-105 transition-transform">
                  <BookOpen className="h-5 w-5 text-[#D4A72C]" strokeWidth={2.5} />
                </div>
                <span className="font-[800] text-[20px] tracking-tight text-slate-900 dark:text-white">
                  Loksewa<span className="text-[#D4A72C]">AI</span>
                </span>
              </Link>

              <p className="text-[14px] text-slate-500 dark:text-slate-400 leading-[1.7] mb-6 max-w-[280px]">
                Nepal&apos;s most intelligent Loksewa preparation platform. AI-powered learning, personalized practice, real exam success.
              </p>

              {/* Social links */}
              <div className="flex items-center gap-2.5 mb-8">
                {socialLinks.map(({ icon: Icon, label, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center border border-slate-200 dark:border-white/8 text-slate-500 dark:text-slate-400 hover:text-[#D4A72C] dark:hover:text-[#D4A72C] hover:border-[#D4A72C]/30 dark:hover:border-[#D4A72C]/20 hover:bg-[#D4A72C]/5 dark:hover:bg-[#D4A72C]/5 transition-all"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>

              {/* Support card */}
              <div className="card-hover bg-white dark:bg-[#0A1520] border border-slate-200 dark:border-white/8 rounded-[14px] p-4">
                <div className="text-[11px] font-[800] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Need Help?</div>
                <a
                  href="mailto:support@loksewaai.com"
                  className="flex items-center gap-2 text-[13px] font-[600] text-[#D4A72C] hover:text-[#C29322] transition-colors group"
                >
                  <Mail className="w-3.5 h-3.5" />
                  support@loksewaai.com
                  <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </a>
              </div>
            </div>

            {/* Platform links */}
            <div>
              <h4 className="text-[12px] font-[800] uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Platform</h4>
              <ul className="space-y-2.5">
                {platformLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-[14px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:translate-x-1 transition-all inline-block"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-[12px] font-[800] uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Resources</h4>
              <ul className="space-y-2.5">
                {resourceLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-[14px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:translate-x-1 transition-all inline-block"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account */}
            <div>
              <h4 className="text-[12px] font-[800] uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Account</h4>
              <ul className="space-y-2.5">
                {accountLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-[14px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:translate-x-1 transition-all inline-block"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/teacher/login"
                    className="flex items-center gap-1.5 text-[14px] text-[#D4A72C] hover:text-[#C29322] transition-colors"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    Teacher Portal
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin-login"
                    className="flex items-center gap-1.5 text-[14px] text-red-500 hover:text-red-600 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin Portal
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-[12px] font-[800] uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Company</h4>
              <ul className="space-y-2.5">
                {companyLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-[14px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:translate-x-1 transition-all inline-block"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* ── Trust badges strip ────────────────── */}
        <div className="border-t border-slate-200 dark:border-white/[0.05]">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {trustBadges.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-[12px] font-[600] text-slate-500 dark:text-slate-500">
                  <Icon className="w-3.5 h-3.5 text-[#D4A72C]" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom bar ───────────────────────── */}
        <div className="border-t border-slate-200 dark:border-white/[0.05]">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[12.5px] text-slate-400 dark:text-slate-600">
              © 2026 LoksewaAI. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-[12.5px] text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition-colors">Privacy</Link>
              <Link href="/terms" className="text-[12.5px] text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition-colors">Terms</Link>
              <Link href="/refund" className="text-[12.5px] text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition-colors">Refund</Link>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
