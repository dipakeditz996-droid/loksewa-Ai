"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LoksewaBadgeIcon } from "@/components/ui/loksewa-badge-icon";
import {
  Trophy, Flame, Swords, Heart, Award, ArrowRight,
  CheckCircle2, Users, Sparkles, Target, Zap, ShieldAlert,
  Share2, BarChart2, HelpCircle
} from "lucide-react";

export function PlayAndEarnContent() {
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
            className="absolute inset-0 opacity-[0.22] blur-[1px] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url('/media/hero-bg.jpg')` }}
          />
          <div className="absolute inset-0 bg-[#0A1118]/80 mix-blend-multiply" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0A1118_100%)] opacity-80" />
          <div className="absolute top-[-10%] right-[-15%] w-[700px] h-[700px] bg-[#D4A72C]/25 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
          <div className="absolute bottom-[-10%] left-[-15%] w-[700px] h-[700px] bg-[#163E6B]/50 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] mix-blend-overlay" />
          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#040B14] to-transparent" />
        </div>

        <div className="container relative z-10 mx-auto px-4 max-w-[1200px] flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4A72C]/10 border border-[#D4A72C]/20 backdrop-blur-md mb-6">
            <Trophy className="w-4 h-4 text-[#D4A72C]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#D4A72C]">
              Gamified Study Experience
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight mb-6 max-w-4xl leading-[1.12]">
            Learn, Play, Earn XP, and{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F0C95A] via-[#D4A72C] to-[#B38318]">
              Stay Consistent
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300/90 max-w-2xl font-normal leading-relaxed mb-6">
            Loksewa preparation requires discipline over months. Turn your daily study routine into a habit by earning XP, keeping your streak alive, and challenging peers in quiz battles.
          </p>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 font-medium mb-10 max-w-lg">
            <Sparkles className="w-3.5 h-3.5 text-[#D4A72C] shrink-0" />
            <span>Academic achievement system: In-platform XP, levels, and badges to fuel preparation motivation.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <Link href={getProtectedHref("/student/games")}>
              <Button className="btn-gold-gradient text-[#040B14] font-bold text-sm h-11 px-6 rounded-full border-none shadow-lg shadow-[#D4A72C]/20 flex items-center gap-2">
                Play Quiz Battles
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={getProtectedHref("/student/leaderboard-analytics")}>
              <Button variant="outline" className="border-white/15 text-white hover:bg-white/10 font-semibold text-sm h-11 px-6 rounded-full bg-white/5 backdrop-blur-sm">
                View Leaderboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. Four Pillars of Gamification ── */}
      <section className="py-20 md:py-28 bg-white dark:bg-[#04080F] border-b border-slate-200/80 dark:border-white/[0.06]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Zap className="w-3.5 h-3.5" />
              Motivation Engine
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              How You Earn & Level Up
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
              Every productive study action on LoksewaAI is tracked and recognized.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Daily Streaks */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] p-6 hover:border-slate-300 dark:hover:border-white/20 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-5">
                  <Flame className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Daily Study Streaks</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Log in and complete at least one study session or practice set each day. Unbroken streaks build the muscle memory needed to pass Loksewa.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 text-xs font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Active streak tracking
              </div>
            </div>

            {/* XP & Levels */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] p-6 hover:border-slate-300 dark:hover:border-white/20 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#D4A72C]/10 flex items-center justify-center text-[#D4A72C] mb-5">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">XP Progression</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Earn experience points for every MCQ answered correctly, full mock exam completed, and syllabus chapter reviewed. Level up as you learn.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 text-xs font-semibold text-[#D4A72C] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Level 1 to Level 50+
              </div>
            </div>

            {/* 1v1 Battle Quiz */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] p-6 hover:border-slate-300 dark:hover:border-white/20 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-5">
                  <Swords className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">1v1 Quiz Battles</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Challenge fellow aspirants or invite study partners using direct match codes. Answer timed questions simultaneously to see who scores highest.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Custom match codes
              </div>
            </div>

            {/* Survival Mode */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] p-6 hover:border-slate-300 dark:hover:border-white/20 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-5">
                  <Heart className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Survival Challenge</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Start with 3 lives. Each incorrect response takes one life. Test your speed and memory retention to set a record high score.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> 3-life endurance mode
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Step-by-Step Flow ── */}
      <section className="py-20 md:py-28 bg-slate-50 dark:bg-[#020610] border-b border-slate-200/80 dark:border-white/[0.06]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              Your Daily Path to Consistent Prep
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
              No complicated rules. Simply study, practice, and watch your rank climb.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            <div className="bg-white dark:bg-[#060E18] rounded-2xl border border-slate-200 dark:border-white/[0.08] p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-extrabold text-lg flex items-center justify-center mx-auto mb-4">
                1
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">Study Daily</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Log in and complete your scheduled practice questions or syllabus lessons.
              </p>
            </div>

            <div className="bg-white dark:bg-[#060E18] rounded-2xl border border-slate-200 dark:border-white/[0.08] p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[#D4A72C]/10 text-[#D4A72C] font-extrabold text-lg flex items-center justify-center mx-auto mb-4">
                2
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">Gain XP</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Receive experience points for accuracy, exam completions, and question sets.
              </p>
            </div>

            <div className="bg-white dark:bg-[#060E18] rounded-2xl border border-slate-200 dark:border-white/[0.08] p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-500 font-extrabold text-lg flex items-center justify-center mx-auto mb-4">
                3
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">Keep Streaks</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Consecutive study days build streak bonuses and unlock study badges.
              </p>
            </div>

            <div className="bg-white dark:bg-[#060E18] rounded-2xl border border-slate-200 dark:border-white/[0.08] p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 font-extrabold text-lg flex items-center justify-center mx-auto mb-4">
                4
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">Rank on Leaderboard</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                See how your discipline and test accuracy ranks against peers nationwide.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Study Partner Referrals ── */}
      <section className="py-20 md:py-28 bg-white dark:bg-[#04080F] border-b border-slate-200/80 dark:border-white/[0.06]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#060E18] p-8 md:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4A72C]/10 border border-[#D4A72C]/20 text-[#D4A72C] text-xs font-bold uppercase tracking-wider mb-4">
                  <Share2 className="w-3.5 h-3.5" />
                  Study Partner Referrals
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4">
                  Prepare Better Together
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                  Studying with friends increases your chances of staying committed. Share your personal referral code from your Student Portal profile. When a friend signs up, both of you earn bonus XP towards your level progression.
                </p>
                <div className="space-y-3 mb-6 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Unique 8-character referral code generated for every registered student</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Instant XP bonus applied upon friend registration and qualification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Milestone badges unlocked at referral milestones</span>
                  </div>
                </div>
                <Link href={getProtectedHref("/student/settings")}>
                  <Button className="btn-gold-gradient text-[#040B14] font-bold text-xs h-10 px-5 rounded-xl border-none">
                    Get Your Referral Code
                  </Button>
                </Link>
              </div>

              <div className="bg-white dark:bg-[#0A1220] rounded-2xl border border-slate-200 dark:border-white/10 p-6 sm:p-8">
                <div className="text-center mb-6">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Sample Student Badge</div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white">Active Aspirant</div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Current Level</span>
                    <span className="font-bold text-slate-900 dark:text-white">Level 4</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Practice XP</span>
                    <span className="font-bold text-[#D4A72C]">1,450 XP</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Current Streak</span>
                    <span className="font-bold text-orange-500 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" /> 7 Days
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Bottom CTA ── */}
      <section className="py-20 bg-gradient-to-br from-[#0B2545] to-[#163E6B] text-white text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight">
            Start Your Daily Streak Today
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8">
            Create an account in 30 seconds, begin your first practice session, and see your name on the LoksewaAI leaderboard.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <Link href="/register">
              <Button className="btn-gold-gradient text-[#040B14] font-bold text-sm h-11 px-7 rounded-full border-none shadow-lg">
                Create Free Account
              </Button>
            </Link>
            <Link href="/practice">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 font-semibold text-sm h-11 px-7 rounded-full bg-white/5">
                Try Practice Quiz
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
