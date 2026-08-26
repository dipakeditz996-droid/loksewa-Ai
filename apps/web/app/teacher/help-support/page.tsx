"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { teacherSupportApi, FAQ, HelpCategory } from "@/lib/api/teacher-support";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, ChevronDown, ChevronUp, FileText, BookOpen, MessageSquare,
  Target, Trophy, ShoppingBag, Shield, CreditCard, Wrench,
  HelpCircle, Plus, TicketIcon, ExternalLink, ThumbsUp, ThumbsDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const ICON_MAP: Record<string, any> = {
  FileText, BookOpen, MessageSquare, Target, Trophy, ShoppingBag,
  Shield, CreditCard, Wrench,
};

const QUICK_LINKS = [
  { label: "How to Create a Mock Exam", href: "#faq-exams", icon: FileText },
  { label: "Question Review Process", href: "#faq-exams", icon: FileText },
  { label: "Teacher Dashboard Guide", href: "#faq-dashboard", icon: Target },
  { label: "Grading Subjective Questions", href: "#faq-evaluations", icon: Trophy },
  { label: "Report Technical Issue", href: "/teacher/help-support/tickets/create", icon: Shield },
];

export default function TeacherHelpSupportPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const { data: categories, isLoading: loadingCats } = useQuery({
    queryKey: ["teacher-help-categories"],
    queryFn: teacherSupportApi.getHelpCategories,
  });

  const { data: faqs, isLoading: loadingFaqs } = useQuery({
    queryKey: ["teacher-faqs", search, selectedCategory],
    queryFn: () => teacherSupportApi.getFAQs({ search, category: selectedCategory || undefined }),
  });

  const handleFeedback = async (faqId: number, helpful: boolean) => {
    try {
      await teacherSupportApi.sendFAQFeedback(faqId, helpful);
      toast.success(helpful ? "Glad it helped!" : "Thanks for your feedback.");
    } catch {
      toast.error("Failed to submit feedback.");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#0B2545] to-[#163E6B] rounded-2xl p-8 md:p-12 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0Menu2yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">How can we help?</h1>
          <p className="text-white/70 text-sm mb-6">Search our help center or browse categories below.</p>
          <div className="relative max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <Input
              placeholder="Search help articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl text-sm focus:bg-white/15 focus:border-[#D4A72C]"
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <Link href="/teacher/help-support/tickets/create">
          <div className="flex items-center gap-3 p-4 bg-[#D4A72C]/10 border border-[#D4A72C]/20 rounded-xl hover:bg-[#D4A72C]/15 transition-colors cursor-pointer">
            <Plus className="h-5 w-5 text-[#D4A72C]" />
            <span className="text-sm font-semibold text-[#0B2545]">Report a Problem</span>
          </div>
        </Link>
        <Link href="/teacher/help-support/tickets">
          <div className="flex items-center gap-3 p-4 bg-[#0B2545]/5 border border-[#0B2545]/10 rounded-xl hover:bg-[#0B2545]/10 transition-colors cursor-pointer">
            <TicketIcon className="h-5 w-5 text-[#0B2545]" />
            <span className="text-sm font-semibold text-[#0B2545]">My Tickets</span>
          </div>
        </Link>
        <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <HelpCircle className="h-5 w-5 text-slate-500" />
          <div>
            <span className="text-xs text-slate-500 block">Response Time</span>
            <span className="text-sm font-semibold text-[#0B2545]">Within 24 hours</span>
          </div>
        </div>
      </div>

      {/* Help Categories */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-[#0B2545] mb-4">Browse by Category</h2>
        {loadingCats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {categories?.map((cat) => {
              const Icon = ICON_MAP[cat.icon] || HelpCircle;
              const isActive = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(isActive ? null : cat.key)}
                  className={cn(
                    "flex flex-col items-start p-5 rounded-xl border-2 text-left transition-all hover:shadow-sm",
                    isActive
                      ? "border-[#D4A72C] bg-[#D4A72C]/5"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <Icon className={cn("h-6 w-6 mb-2", isActive ? "text-[#D4A72C]" : "text-[#0B2545]")} />
                  <p className="text-sm font-semibold text-[#0B2545]">{cat.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{cat.description}</p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* FAQs */}
      <section className="mb-10" id="faqs">
        <h2 className="text-lg font-bold text-[#0B2545] mb-4">
          {selectedCategory ? `FAQs — ${categories?.find(c => c.key === selectedCategory)?.name || ""}` : "Frequently Asked Questions"}
        </h2>

        {loadingFaqs ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : faqs && faqs.length > 0 ? (
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div key={faq.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                  className="flex items-center justify-between w-full p-5 text-left hover:bg-slate-50/50 transition-colors"
                >
                  <span className="text-[14px] font-medium text-[#0B2545] pr-4">{faq.question}</span>
                  {expandedFaq === faq.id ? (
                    <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {expandedFaq === faq.id && (
                  <div className="px-5 pb-5 border-t border-slate-100">
                    <p className="text-[13px] text-slate-600 leading-relaxed pt-4 whitespace-pre-line">
                      {faq.answer}
                    </p>
                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100">
                      <span className="text-[11px] text-slate-400">Was this helpful?</span>
                      <button
                        onClick={() => handleFeedback(faq.id, true)}
                        className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-green-600 transition-colors"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" /> Yes
                      </button>
                      <button
                        onClick={() => handleFeedback(faq.id, false)}
                        className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-500 transition-colors"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" /> No
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <HelpCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">No FAQs found.</p>
            <p className="text-xs text-slate-400 mt-1">Try a different search or category.</p>
          </div>
        )}
      </section>

      {/* Quick Help Links */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#0B2545] mb-4">Quick Help</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            const isExternal = link.href.startsWith("/");
            const Wrapper = isExternal ? Link : "a";
            return (
              <Wrapper
                key={link.label}
                href={link.href}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-[#D4A72C]/50 hover:bg-[#D4A72C]/5 transition-all group"
              >
                <Icon className="h-4 w-4 text-slate-500 group-hover:text-[#D4A72C]" />
                <span className="text-sm font-medium text-slate-700 group-hover:text-[#0B2545]">{link.label}</span>
                <ExternalLink className="h-3 w-3 text-slate-300 ml-auto group-hover:text-[#D4A72C]" />
              </Wrapper>
            );
          })}
        </div>
      </section>
    </div>
  );
}
