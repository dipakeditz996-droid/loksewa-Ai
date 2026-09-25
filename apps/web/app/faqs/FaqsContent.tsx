"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  HelpCircle, Search, BookOpen, Target, CreditCard,
  ShoppingBag, Shield, CheckCircle2, ArrowRight, MessageSquare
} from "lucide-react";

interface FAQItem {
  id: string;
  category: "General" | "Courses" | "Practice & Exams" | "Payments" | "Marketplace" | "Account";
  question: string;
  answer: string;
}

const FAQS_DATA: FAQItem[] = [
  // ── General ──
  {
    id: "gen-1",
    category: "General",
    question: "What is LoksewaAI?",
    answer: "LoksewaAI is Nepal's dedicated civil service examination preparation platform. It integrates official PSC curriculum tracking, video and modular courses, unlimited topic-wise MCQ practice, full-length timed mock exams with official 20% negative deduction, an intelligent AI Tutor, gamified study streaks, and a peer-to-peer student marketplace for study books."
  },
  {
    id: "gen-2",
    category: "General",
    question: "Who is LoksewaAI for?",
    answer: "LoksewaAI is designed for anyone preparing for competitive civil service exams in Nepal, including Section Officer (Sakha Adhikrit), Nayab Subba, Kharidar, Teachers Service Commission (TSC), provincial PSC (Pradesh Lok Sewa), banking examinations, and technical service posts."
  },
  {
    id: "gen-3",
    category: "General",
    question: "Which exams are supported?",
    answer: "The platform supports major Public Service Commission examinations across administrative and technical cadres. It covers Section Officer (General Administration, Revenue, Justice, Foreign Affairs), Nayab Subba, Kharidar, health & engineering technical posts, and selected national banking exam curricula."
  },

  // ── Courses ──
  {
    id: "crs-1",
    category: "Courses",
    question: "How do courses work on LoksewaAI?",
    answer: "Courses are broken down into topic-wise modules covering both Paper I (General Knowledge & General Mental Ability) and specialized second/third papers. Each module features structured video explanations, downloadable summary notes, and associated test questions to evaluate understanding immediately after watching."
  },
  {
    id: "crs-2",
    category: "Courses",
    question: "How can I access a course?",
    answer: "You can browse all available public courses on the Courses page. Once enrolled, your courses appear under 'My Learning' in your Student Portal. You can track completion percentages, resume video lessons from where you left off, and access lesson notes anytime from any device."
  },
  {
    id: "crs-3",
    category: "Courses",
    question: "How does syllabus-based learning work?",
    answer: "Our curriculum explorer breaks down the official PSC syllabus into hierarchical topic units with assigned mark weightages. As you study notes or solve practice sets associated with a syllabus node, the system marks topics as covered so you can systematically ensure zero blind spots before your exam."
  },

  // ── Practice & Exams ──
  {
    id: "prc-1",
    category: "Practice & Exams",
    question: "How does practice work?",
    answer: "Topic-wise practice lets you choose any subject—such as Constitution & Governance, Nepal Geography, History, Current Affairs, or Science—and select your difficulty level. Each question gives you instant feedback upon selection, complete with verified explanations and reference sources."
  },
  {
    id: "prc-2",
    category: "Practice & Exams",
    question: "What are mock exams?",
    answer: "Mock exams are realistic simulations adhering strictly to PSC formats. They feature precise time limits, authentic question counts (e.g., 50 questions in 45 minutes for Paper I), a live countdown clock, question palette navigation, and automated score computation."
  },
  {
    id: "prc-3",
    category: "Practice & Exams",
    question: "How are results and scores calculated?",
    answer: "Results strictly implement the official Public Service Commission scoring formula: each correct answer adds the question's full mark, unattempted questions do not affect the score, and incorrect answers incur a 20% negative deduction (-0.20 of the mark value). After submitting, you receive a detailed score sheet with accuracy, time taken, and question-by-question reviews."
  },

  // ── Payments ──
  {
    id: "pay-1",
    category: "Payments",
    question: "How do I purchase a package or course?",
    answer: "Navigate to the course or package you wish to purchase and click Enroll/Buy. The checkout screen provides payment instructions for domestic digital wallets (eSewa, Khalti) and direct Bank Transfer with our official merchant details. After transferring the amount, enter your transaction reference number and upload a screenshot or photo of your receipt."
  },
  {
    id: "pay-2",
    category: "Payments",
    question: "How does payment verification work?",
    answer: "Once you upload your transaction slip, our billing administration team verifies the transaction ID against banking records. Manual verification ensures complete security and accuracy for every transaction."
  },
  {
    id: "pay-3",
    category: "Payments",
    question: "What happens after payment?",
    answer: "Upon verification, your purchase status is updated to Approved and the course or mock exam package is immediately unlocked in your Student Portal under 'My Learning' and 'My Purchases'. You will also receive an in-app notification confirming activation."
  },

  // ── Marketplace ──
  {
    id: "mkt-1",
    category: "Marketplace",
    question: "Can I buy books on LoksewaAI?",
    answer: "Yes. The LoksewaAI Marketplace allows students to purchase new and pre-owned Loksewa reference textbooks, syllabus question banks, and handwritten guidebooks. Each listing indicates the condition, price, publisher/author, and seller details."
  },
  {
    id: "mkt-2",
    category: "Marketplace",
    question: "Can students sell used books?",
    answer: "Yes! Any registered student can create a listing for their second-hand Loksewa books through their Student Portal under 'Sell a Book'. You provide the book title, condition (Like New, Good, Fair), price, photos, and contact/delivery details. Once reviewed, the listing goes live in the public Marketplace."
  },
  {
    id: "mkt-3",
    category: "Marketplace",
    question: "How does marketplace order tracking work?",
    answer: "When a book order is placed, both buyer and seller can monitor the order status in real time through the Marketplace dashboard. Status transitions move from Order Placed to Confirmed, Dispatched, and Delivered with delivery address and contact information recorded."
  },

  // ── Account ──
  {
    id: "acc-1",
    category: "Account",
    question: "How do I register for an account?",
    answer: "Click the 'Get Started' button in the top navigation. Enter your full name, email address, phone number, and create a secure password. You can also select your target Loksewa examination level to customize your dashboard."
  },
  {
    id: "acc-2",
    category: "Account",
    question: "How is email verification handled?",
    answer: "Upon registering, an email verification message is sent to your registered address. Verifying your email ensures account recovery is possible and protects your purchase records and mock exam history."
  },
  {
    id: "acc-3",
    category: "Account",
    question: "How can I reset or change my password?",
    answer: "If you have forgotten your password, click 'Forgot password?' on the Login screen and enter your registered email to receive a secure password reset link. If you are already logged in, you can update your password at any time from Student Portal Settings under Account Management."
  }
];

const CATEGORIES = [
  "All",
  "General",
  "Courses",
  "Practice & Exams",
  "Payments",
  "Marketplace",
  "Account"
] as const;

export function FaqsContent() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const filteredFaqs = useMemo(() => {
    return FAQS_DATA.filter((faq) => {
      const matchesCat = activeCategory === "All" || faq.category === activeCategory;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q) ||
        faq.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [search, activeCategory]);

  return (
    <div className="w-full">
      {/* ── 1. Hero Section ── */}
      <section className="relative overflow-hidden bg-[#0A1118] border-b border-white/5 py-16 md:py-24">
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 opacity-[0.20] blur-[1px] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url('/media/hero-bg.jpg')` }}
          />
          <div className="absolute inset-0 bg-[#0A1118]/80 mix-blend-multiply" />
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#163E6B]/50 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#D4A72C]/20 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
          <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-[#040B14] to-transparent" />
        </div>

        <div className="container relative z-10 mx-auto px-4 max-w-[900px] flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6">
            <HelpCircle className="w-4 h-4 text-[#D4A72C]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
              Help & Information Center
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
            Frequently Asked{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F0C95A] via-[#D4A72C] to-[#B38318]">
              Questions
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-xl mb-8 leading-relaxed">
            Have questions about how LoksewaAI courses, syllabus tracking, timed mock tests, payments, or the student marketplace work? Find comprehensive answers below.
          </p>

          {/* Search Bar */}
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search questions (e.g., negative marking, payments, courses)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-12 rounded-full bg-white/10 border-white/15 text-white placeholder:text-slate-400 text-sm focus:bg-white/15 focus:border-[#D4A72C]"
            />
          </div>
        </div>
      </section>

      {/* ── 2. Category Filter & Accordion ── */}
      <section className="py-16 md:py-24 bg-white dark:bg-[#04080F]">
        <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? "bg-[#D4A72C] text-[#040B14] shadow-md shadow-[#D4A72C]/20"
                      : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-white/5"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-6 px-1">
            <span>Showing {filteredFaqs.length} question{filteredFaqs.length === 1 ? "" : "s"}</span>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-[#D4A72C] hover:underline font-semibold"
              >
                Clear search
              </button>
            )}
          </div>

          {/* FAQ Accordion List */}
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
              <HelpCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No matching questions found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Try searching with different keywords or select a different category.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setActiveCategory("All");
                }}
                className="rounded-full text-xs font-semibold"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full space-y-3.5">
              {filteredFaqs.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="border border-slate-200/80 dark:border-white/[0.08] rounded-2xl bg-slate-50/60 dark:bg-[#060E18] px-5 sm:px-6 shadow-sm overflow-hidden"
                >
                  <AccordionTrigger className="text-left font-bold text-slate-900 dark:text-white hover:no-underline py-4 text-sm sm:text-base">
                    <div className="flex items-center gap-3 pr-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-300 shrink-0">
                        {faq.category}
                      </span>
                      <span>{faq.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed pt-1 pb-5 border-t border-slate-200/60 dark:border-white/5 mt-1">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}

          {/* Quick Help Card */}
          <div className="mt-16 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#060E18] p-8 text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-6">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">
                Still have questions?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Can't find what you are looking for? Reach out to our student support team.
              </p>
            </div>
            <div className="mt-4 sm:mt-0 shrink-0">
              <Link href="/contact">
                <Button className="btn-gold-gradient text-[#040B14] font-bold text-xs h-10 px-5 rounded-full border-none">
                  Contact Support
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Bottom CTA ── */}
      <section className="py-16 bg-gradient-to-br from-[#0B2545] to-[#163E6B] text-white text-center relative overflow-hidden">
        <div className="max-w-2xl mx-auto px-4 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-black mb-3 tracking-tight">
            Ready to Start Studying?
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
            Join LoksewaAI and experience structured, intelligent civil service preparation today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/register">
              <Button className="btn-gold-gradient text-[#040B14] font-bold text-xs h-10 px-6 rounded-full border-none shadow-md">
                Create Free Account
              </Button>
            </Link>
            <Link href="/courses">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 font-semibold text-xs h-10 px-6 rounded-full bg-white/5">
                Browse Courses
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
