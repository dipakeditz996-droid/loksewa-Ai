"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LoksewaBadgeIcon } from "@/components/ui/loksewa-badge-icon";
import {
  BookOpen, Target, Sparkles, BrainCircuit, Trophy, Flame,
  Users, ShoppingBag, ArrowRight, CheckCircle2, Award, Clock,
  BarChart3, ShieldCheck, Zap, HelpCircle, Layers, Swords, Heart
} from "lucide-react";

export function FeaturesContent() {
  const { user } = useAuth();

  const getProtectedHref = (studentPath: string) => {
    return user ? studentPath : `/login?redirect=${encodeURIComponent(studentPath)}`;
  };

  return (
    <div className="w-full">
      {/* ── 1. Hero Section ── */}
      <section className="relative overflow-hidden bg-[#0A1118] border-b border-white/5 py-16 md:py-28">
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 opacity-[0.25] blur-[1px] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url('/media/hero-bg.jpg')` }}
          />
          <div className="absolute inset-0 bg-[#0A1118]/75 mix-blend-multiply" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0A1118_100%)] opacity-80" />
          <div className="absolute top-[-10%] left-[-15%] w-[700px] h-[700px] bg-[#163E6B]/50 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
          <div className="absolute bottom-[-10%] right-[-15%] w-[800px] h-[800px] bg-[#D4A72C]/20 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] mix-blend-overlay" />
          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#040B14] to-transparent" />
        </div>

        <div className="container relative z-10 mx-auto px-4 max-w-[1200px] flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6">
            <LoksewaBadgeIcon className="w-4 h-4 text-[#D4A72C]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
              Complete Preparation Ecosystem
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight mb-6 max-w-4xl leading-[1.12]">
            Everything You Need to Ace Your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F0C95A] via-[#D4A72C] to-[#B38318]">
              Loksewa Examination
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300/90 max-w-2xl font-normal leading-relaxed mb-10">
            A comprehensive, AI-assisted platform engineered specifically for Public Service Commission (PSC) aspirants in Nepal. From structured curriculum courses to timed simulations and peer challenges.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <Link href="/courses">
              <Button className="btn-gold-gradient text-[#040B14] font-bold text-sm h-11 px-6 rounded-full border-none shadow-lg shadow-[#D4A72C]/20 flex items-center gap-2">
                Explore Courses
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/practice">
              <Button variant="outline" className="border-white/15 text-white hover:bg-white/10 font-semibold text-sm h-11 px-6 rounded-full bg-white/5 backdrop-blur-sm">
                Start Practicing Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. Smart Learning Section ── */}
      <section className="py-20 md:py-28 bg-white dark:bg-[#04080F] border-b border-slate-200/80 dark:border-white/[0.06] relative">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
              <BookOpen className="w-3.5 h-3.5" />
              Smart Learning
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              Master the Official Curriculum
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
              Curated by experienced educators and civil servants, structured strictly according to the latest Public Service Commission guidelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Courses */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] p-6 hover:border-slate-300 dark:hover:border-white/20 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-5">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Targeted Courses</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                  Comprehensive modular video lectures, chapter breakdowns, and syllabus notes for Kharidar, Nayab Subba, and Section Officer.
                </p>
              </div>
              <Link href="/courses">
                <Button variant="outline" className="w-full justify-between rounded-xl text-xs font-semibold border-slate-200 dark:border-white/10">
                  Explore Courses
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            {/* Syllabus */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] p-6 hover:border-slate-300 dark:hover:border-white/20 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-5">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Interactive Syllabus</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                  Explore detailed topic trees, subject mark weightages, and tracking checkpoints for every level and faculty.
                </p>
              </div>
              <Link href="/syllabus">
                <Button variant="outline" className="w-full justify-between rounded-xl text-xs font-semibold border-slate-200 dark:border-white/10">
                  Browse Syllabus
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            {/* Notes */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] p-6 hover:border-slate-300 dark:hover:border-white/20 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-5">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Notes & Guides</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                  Downloadable subject notes, rapid revision cards, and curated current affairs summaries for swift recall.
                </p>
              </div>
              <Link href="/notes">
                <Button variant="outline" className="w-full justify-between rounded-xl text-xs font-semibold border-slate-200 dark:border-white/10">
                  View Study Notes
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            {/* Smart Study Plan */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] p-6 hover:border-slate-300 dark:hover:border-white/20 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-5">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Smart Study Plan</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                  Personalized daily study schedules generated around your target exam date, preferred hours, and syllabus coverage.
                </p>
              </div>
              <Link href={getProtectedHref("/student/study-plan")}>
                <Button variant="outline" className="w-full justify-between rounded-xl text-xs font-semibold border-slate-200 dark:border-white/10">
                  Build Study Plan
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Practice & Examination Section ── */}
      <section className="py-20 md:py-28 bg-slate-50 dark:bg-[#020610] border-b border-slate-200/80 dark:border-white/[0.06] relative">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4A72C]/10 border border-[#D4A72C]/20 text-[#D4A72C] text-xs font-bold uppercase tracking-wider mb-4">
              <Target className="w-3.5 h-3.5" />
              Practice & Examination
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              Real Exam Pressure, Real Results
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
              Test your readiness under authentic PSC examination conditions with official question weightages and real-time negative marking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white dark:bg-[#060E18] rounded-2xl border border-slate-200 dark:border-white/[0.08] p-7 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-[#D4A72C] mb-5">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2.5">Topic-wise Practice</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                Unlimited MCQ practice filtered by subject, subtopic, and difficulty. Each question includes instant answers, explanations, and note bookmarking.
              </p>
              <Link href="/practice">
                <Button className="btn-gold-gradient text-[#040B14] font-bold text-xs h-9 px-4 rounded-lg border-none flex items-center gap-1.5">
                  Start Practicing
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            <div className="bg-white dark:bg-[#060E18] rounded-2xl border border-slate-200 dark:border-white/[0.08] p-7 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-5">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2.5">Full-Length Mock Exams</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                Timed exams simulating the exact question counts, section timings, and official 20% negative deduction of actual Loksewa tests.
              </p>
              <Link href="/exams">
                <Button variant="outline" className="font-bold text-xs h-9 px-4 rounded-lg border-slate-200 dark:border-white/10 flex items-center gap-1.5">
                  Explore Mock Exams
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            <div className="bg-white dark:bg-[#060E18] rounded-2xl border border-slate-200 dark:border-white/[0.08] p-7 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-5">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2.5">Performance Analytics</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                Instant score breakdown, subject-level accuracy, speed per question, and diagnosis of topics where you lose marks to negative deduction.
              </p>
              <Link href={getProtectedHref("/student/leaderboard-analytics")}>
                <Button variant="outline" className="font-bold text-xs h-9 px-4 rounded-lg border-slate-200 dark:border-white/10 flex items-center gap-1.5">
                  View Analytics
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. AI Learning Section ── */}
      <section className="py-20 md:py-28 bg-white dark:bg-[#04080F] border-b border-slate-200/80 dark:border-white/[0.06] relative overflow-hidden">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-xs font-bold uppercase tracking-wider mb-4">
                <BrainCircuit className="w-3.5 h-3.5" />
                AI Learning
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-5 leading-tight">
                24/7 Intelligent Study Companion
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-8">
                Stuck on a complex constitutional clause or General Knowledge question? LoksewaAI Tutor breaks down difficult concepts in straightforward Nepali and English.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Instant Concept Explanations</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Ask any Loksewa topic and receive step-by-step reasoning with reference to official provisions.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Weakness Diagnosis</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Automatically suggests practice questions in areas where your recent test scores dipped.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Personalized Study Tips</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Daily study recommendations aligned with your upcoming mock exam targets.</p>
                  </div>
                </div>
              </div>

              <Link href={getProtectedHref("/student/ai-tutor")}>
                <Button className="btn-gold-gradient text-[#040B14] font-bold text-sm h-11 px-6 rounded-xl border-none flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Try AI Tutor
                </Button>
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#070D18] p-6 lg:p-8 shadow-md">
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-4 mb-5">
                <div className="w-10 h-10 rounded-full bg-violet-600/10 flex items-center justify-center text-violet-500">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">LoksewaAI Tutor</h4>
                  <p className="text-[11px] text-slate-500">Specialized Civil Service AI Assistant</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-200/60 dark:bg-white/5 rounded-xl p-3.5 text-xs text-slate-700 dark:text-slate-300 max-w-[85%]">
                  Can you explain the difference between Directive Principles and Fundamental Rights under Nepal's Constitution?
                </div>
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 text-xs text-slate-800 dark:text-slate-200 ml-auto max-w-[95%] space-y-2">
                  <p className="font-semibold text-violet-600 dark:text-violet-400">Constitutional Analysis (Part 3 vs Part 4):</p>
                  <p>1. <strong>Enforceability:</strong> Fundamental Rights (Articles 16–46) are legally enforceable by the Supreme Court via writs under Article 133.</p>
                  <p>2. <strong>Directive Principles:</strong> (Part 4) serve as state guidance for governance and policy formulation, but are not non-justiciable in court (Article 55).</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Gamification (Play & Earn) Section ── */}
      <section className="py-20 md:py-28 bg-slate-50 dark:bg-[#020610] border-b border-slate-200/80 dark:border-white/[0.06]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4A72C]/10 border border-[#D4A72C]/20 text-[#D4A72C] text-xs font-bold uppercase tracking-wider mb-4">
              <Trophy className="w-3.5 h-3.5" />
              Gamification & Discipline
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              Build Daily Consistency with Play & Earn
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
              Loksewa preparation demands persistence. Earn XP, maintain daily study streaks, challenge peers in quiz battles, and climb the leaderboard.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-white dark:bg-[#060E18] rounded-2xl border border-slate-200 dark:border-white/[0.08] p-6">
              <div className="w-10 h-10 rounded-xl bg-[#D4A72C]/10 flex items-center justify-center text-[#D4A72C] mb-4">
                <Trophy className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">XP & Level Progression</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Earn experience points for every question solved, mock exam taken, and course video completed to advance your student level.
              </p>
            </div>

            <div className="bg-white dark:bg-[#060E18] rounded-2xl border border-slate-200 dark:border-white/[0.08] p-6">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-4">
                <Flame className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">Daily Study Streaks</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Log in and practice every day to keep your streak alive. Developing unbroken daily study habits is key to passing.
              </p>
            </div>

            <div className="bg-white dark:bg-[#060E18] rounded-2xl border border-slate-200 dark:border-white/[0.08] p-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4">
                <Swords className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">1v1 Quiz Battles</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Engage in live multiplayer quiz matchups against fellow students with custom invite codes or random matchmaking.
              </p>
            </div>

            <div className="bg-white dark:bg-[#060E18] rounded-2xl border border-slate-200 dark:border-white/[0.08] p-6">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4">
                <Heart className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">Survival Challenge</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Test your endurance with 3 lives. Answer continuous questions without striking out to set your personal best score.
              </p>
            </div>
          </div>

          <div className="text-center">
            <Link href="/play-and-earn">
              <Button className="btn-gold-gradient text-[#040B14] font-bold text-sm h-11 px-6 rounded-full border-none inline-flex items-center gap-2">
                Discover Play & Earn System
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 6. Community & Marketplace Section ── */}
      <section className="py-20 md:py-28 bg-white dark:bg-[#04080F] border-b border-slate-200/80 dark:border-white/[0.06]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {/* Community Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#060E18] p-8 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6">
                  <Users className="w-6 h-6" />
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
                  Aspirant Community
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                  Learn Collaboratively with Peers
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                  Ask questions on tricky GK items, debate current affairs, share handwritten notes, and get answers verified by high-scoring candidates.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Topic-specific discussion threads
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Verified answers & upvoting system
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Civil service preparation networking
                  </li>
                </ul>
              </div>
              <Link href={getProtectedHref("/student/community")}>
                <Button variant="outline" className="w-full justify-between rounded-xl font-bold text-xs h-10 border-slate-200 dark:border-white/10">
                  Join Community Discussions
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Marketplace Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#060E18] p-8 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-[#D4A72C] mb-6">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D4A72C] uppercase tracking-wider mb-2">
                  Student Marketplace
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                  Buy & Sell Preparation Books
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                  Affordable second-hand textbooks, curated syllabus guides, and verified notes traded directly between students across Nepal with tracking.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Student-to-student book listings
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Transparent order & delivery tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Safe, verified seller profiles
                  </li>
                </ul>
              </div>
              <Link href="/marketplace">
                <Button className="btn-gold-gradient w-full justify-between rounded-xl font-bold text-xs h-10 text-[#040B14] border-none">
                  Explore Marketplace
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Final Call to Action ── */}
      <section className="py-20 bg-gradient-to-br from-[#0B2545] to-[#163E6B] text-white text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight">
            Ready to Accelerate Your Loksewa Journey?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8">
            Create your account today to access curriculum notes, begin your first practice session, and start climbing the leaderboard.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <Link href="/register">
              <Button className="btn-gold-gradient text-[#040B14] font-bold text-sm h-11 px-7 rounded-full border-none shadow-lg">
                Create Free Account
              </Button>
            </Link>
            <Link href="/courses">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 font-semibold text-sm h-11 px-7 rounded-full bg-white/5">
                Browse Courses
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
