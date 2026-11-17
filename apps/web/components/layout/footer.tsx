"use client";

import Link from "next/link";
import Image from "next/image";
import { BRAND_ASSETS, BRAND_ALT } from "@/lib/brand";
import {
  BookOpen, Mail,
  ShieldCheck, BadgeCheck, Cpu, TrendingUp, ArrowRight,
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
  { icon: Globe, label: "Facebook", href: "https://facebook.com/nesmastery" },
  { icon: Share2, label: "Instagram", href: "https://instagram.com/nesmastery" },
  { icon: MessageCircle, label: "YouTube", href: "https://youtube.com/@nesmastery" },
  { icon: Users, label: "LinkedIn", href: "https://linkedin.com/company/nesmastery" },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-slate-50 dark:bg-[#020610] border-t border-slate-200 dark:border-white/[0.06]">

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2563EB]/40 to-transparent" />

      {/* ── Background atmosphere ─────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Neural grid */}
        <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-60" />
        {/* Gold glow (dark mode) */}
        <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] bg-[#2563EB]/[0.04] dark:bg-[#2563EB]/[0.07] rounded-full blur-[150px] pointer-events-none" />
        {/* Blue glow (dark mode) */}
        <div className="absolute bottom-[-10%] right-[-5%] w-[700px] h-[700px] bg-blue-500/[0.02] dark:bg-[#174A68]/[0.2] rounded-full blur-[150px] pointer-events-none" />
      </div>

      <div className="relative z-10">

        {/* ── Main footer columns ───────────────── */}
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-14 lg:pt-16 pb-8 sm:pb-10 lg:pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-8">

            {/* Brand column (spans 2) */}
            <div className="lg:col-span-2">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group mb-5 w-fit" aria-label="NES Mastery Home">
                <div className="h-[40px] w-[88px] relative overflow-hidden rounded-[8px] bg-white border border-slate-200/80 dark:border-white/10 p-1 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Image
                    src={BRAND_ASSETS.logo}
                    alt={BRAND_ALT}
                    width={464}
                    height={211}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="font-[800] text-[20px] tracking-tight text-slate-900 dark:text-white">
                  NES <span className="text-[#2563EB] dark:text-[#60A5FA]">Mastery</span>
                </span>
              </Link>

              <p className="text-[14px] text-slate-500 dark:text-slate-400 leading-[1.7] mb-6 max-w-[280px]">
                Nepal&apos;s premier competitive engineering examination preparation platform. Expert curriculum, topic drills, and proven success.
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
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center border border-slate-200 dark:border-white/8 text-slate-500 dark:text-slate-400 hover:text-[#2563EB] dark:hover:text-[#60A5FA] hover:border-[#2563EB]/30 dark:hover:border-[#60A5FA]/20 hover:bg-[#2563EB]/5 dark:hover:bg-[#2563EB]/5 transition-all"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>

              {/* Support card */}
              <div className="card-hover bg-white dark:bg-[#0A1520] border border-slate-200 dark:border-white/8 rounded-[14px] p-4">
                <div className="text-[11px] font-[800] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Need Help?</div>
                <a
                  href="mailto:support@nesmastery.com"
                  className="flex items-center gap-2 text-[13px] font-[600] text-[#2563EB] hover:text-[#1D4ED8] dark:text-[#60A5FA] transition-colors group"
                >
                  <Mail className="w-3.5 h-3.5" />
                  support@nesmastery.com
                  <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </a>
              </div>
            </div>

            {/* Platform links */}
            <div>
              <h3 className="text-[12px] font-[800] uppercase tracking-widest text-slate-800 dark:text-slate-300 mb-4">Platform</h3>
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
              <h3 className="text-[12px] font-[800] uppercase tracking-widest text-slate-800 dark:text-slate-300 mb-4">Resources</h3>
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
              <h3 className="text-[12px] font-[800] uppercase tracking-widest text-slate-800 dark:text-slate-300 mb-4">Account</h3>
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
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-[12px] font-[800] uppercase tracking-widest text-slate-800 dark:text-slate-300 mb-4">Company</h3>
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
                <div key={label} className="flex items-center gap-2 text-[12px] font-[600] text-slate-700 dark:text-slate-300">
                  <Icon className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom bar ───────────────────────── */}
        <div className="border-t border-slate-200 dark:border-white/[0.05]">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[12.5px] text-slate-600 dark:text-slate-400">
              © 2026 NES Mastery. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-[12.5px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="text-[12.5px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Terms</Link>
              <Link href="/refund" className="text-[12.5px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Refund</Link>
            </div>
          </div>
        </div>

        {/* Clears the fixed mobile bottom tab bar so this row is never hidden behind it. */}
        <div className="h-[64px] lg:hidden" aria-hidden="true" />

      </div>
    </footer>
  );
}
