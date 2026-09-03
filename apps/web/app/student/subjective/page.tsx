"use client";

import Link from "next/link";
import { PenTool, FileText, BookOpen, ArrowRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SubjectiveLandingPage() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-8 p-4 md:p-8">
      {/* HEADER */}
      <div className="bg-primary text-primary-foreground rounded-[20px] p-8 md:p-12 text-white relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/10 text-white/90 text-[13px] font-bold tracking-wide uppercase mb-6 border border-white/20">
            <PenTool className="w-4 h-4" />
            Subjective Practice
          </div>
          <h1 className="text-[32px] md:text-[42px] font-bold tracking-tight mb-4 leading-tight">
            Practice descriptive answers and improve your writing with expert feedback.
          </h1>
          <p className="text-[16px] md:text-[18px] text-white/70 leading-relaxed mb-8">
            Master the art of writing long-form answers. Get evaluated by experts and receive annotations and video feedback on your submissions.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[20px] font-bold text-primary dark:text-foreground">Practice Categories</h2>
        <Link href="/student/subjective/history">
          <Button variant="outline" className="text-muted-foreground font-bold">
            <History className="w-4 h-4 mr-2" /> My Evaluations
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* Practice Sets */}
        <div className="bg-card rounded-[16px] border border-border p-8 flex flex-col hover:border-blue-300 transition-colors shadow-sm group">
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-[12px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-[20px] font-bold text-primary dark:text-foreground mb-2">Practice Sets</h3>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Curated collections of descriptive questions. Flexible timing, allowing you to draft and submit at your own pace.
          </p>
          <div className="mt-auto">
            <Link href="/student/subjective/practice-sets" className="w-full">
              <Button className="w-full h-12 bg-primary text-primary-foreground hover:bg-[#1a365d] text-white font-bold text-[15px]">
                View Practice Sets <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Topic-wise Practice */}
        <div className="bg-card rounded-[16px] border border-border p-8 flex flex-col hover:border-green-300 transition-colors shadow-sm group">
          <div className="w-14 h-14 bg-green-50 dark:bg-green-950/30 text-green-600 rounded-[12px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-[20px] font-bold text-primary dark:text-foreground mb-2">Topic-wise Practice</h3>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Select a specific subject and topic to practice isolated descriptive questions to strengthen weak areas.
          </p>
          <div className="mt-auto">
            <Link href="/student/subjective/topic-practice" className="w-full">
              <Button className="w-full h-12 bg-primary text-primary-foreground hover:bg-[#1a365d] text-white font-bold text-[15px]">
                Practice by Topic <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
