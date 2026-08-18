"use client";

import Link from "next/link";
import { useState } from "react";
import { 
  BookOpen, Play, Calendar, Zap, RefreshCw, Bookmark,
  Target, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PracticeSetupPage() {
  const [exam, setExam] = useState("section-officer");
  const [subject, setSubject] = useState("all");
  const [topic, setTopic] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [questions, setQuestions] = useState("20");
  const [mode, setMode] = useState("flexible");

  const quickStarts = [
    { id: "daily", label: "Daily Practice", icon: Calendar, color: "text-[#D4A72C]", bg: "bg-[#D4A72C]/10" },
    { id: "weak", label: "Weak Topics", icon: Target, color: "text-red-500", bg: "bg-red-500/10" },
    { id: "incorrect", label: "Recently Incorrect", icon: RefreshCw, color: "text-orange-500", bg: "bg-orange-500/10" },
    { id: "bookmark", label: "Bookmarked", icon: Bookmark, color: "text-[#0B2545]", bg: "bg-[#0B2545]/10" },
    { id: "random", label: "Random Practice", icon: Zap, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in-50 duration-500">
      
      {/* HEADER */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-[#0B2545]">Practice</h1>
        <p className="text-slate-500 mt-1 text-[15px]">Strengthen your preparation with focused objective practice.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN - CONFIGURATION */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm p-6 md:p-8">
            <h2 className="text-[18px] font-bold text-[#0B2545] mb-6 flex items-center gap-2">
              <SettingsIcon /> Choose your practice
            </h2>

            <div className="space-y-6">
              
              {/* Exam & Subject */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-slate-500 uppercase tracking-wider block">Exam</label>
                  <select 
                    value={exam} 
                    onChange={(e) => { setExam(e.target.value); setSubject("all"); setTopic("all"); }}
                    className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-[10px] text-[15px] font-medium text-[#0B2545] outline-none focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545]"
                  >
                    <option value="all">All Exams</option>
                    <option value="1">Section Officer</option>
                    <option value="2">Nayab Subba</option>
                    <option value="3">Kharidar</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-slate-500 uppercase tracking-wider block">Subject</label>
                  <select 
                    value={subject} 
                    onChange={(e) => { setSubject(e.target.value); setTopic("all"); }}
                    className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-[10px] text-[15px] font-medium text-[#0B2545] outline-none focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545]"
                  >
                    <option value="all">All Subjects</option>
                    <option value="1">Public Administration</option>
                    <option value="2">Constitution of Nepal</option>
                    <option value="3">Current Affairs</option>
                  </select>
                </div>
              </div>

              {/* Topic & Difficulty */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-slate-500 uppercase tracking-wider block">Topic</label>
                  <select 
                    value={topic} 
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-[10px] text-[15px] font-medium text-[#0B2545] outline-none focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545]"
                  >
                    <option value="all">All Topics</option>
                    <option value="1">Concept and Scope</option>
                    <option value="9">Early Constitutional Developments</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-slate-500 uppercase tracking-wider block">Difficulty</label>
                  <select 
                    value={difficulty} 
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-[10px] text-[15px] font-medium text-[#0B2545] outline-none focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545]"
                  >
                    <option value="all">All Levels</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Number of Questions */}
              <div className="space-y-3 pt-2">
                <label className="text-[13px] font-bold text-slate-500 uppercase tracking-wider block">Number of Questions</label>
                <div className="flex flex-wrap gap-3">
                  {["10", "20", "30", "50", "100"].map((num) => (
                    <label key={num} className="relative cursor-pointer">
                      <input 
                        type="radio" 
                        name="questions" 
                        value={num}
                        checked={questions === num}
                        onChange={(e) => setQuestions(e.target.value)}
                        className="peer sr-only" 
                      />
                      <div className="flex items-center justify-center h-11 px-5 rounded-[10px] border border-slate-200 bg-white text-[15px] font-semibold text-slate-600 transition-all peer-checked:border-[#0B2545] peer-checked:bg-[#0B2545] peer-checked:text-white hover:bg-slate-50">
                        {num}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Practice Mode */}
              <div className="space-y-3 pt-2">
                <label className="text-[13px] font-bold text-slate-500 uppercase tracking-wider block">Practice Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="relative cursor-pointer">
                    <input 
                      type="radio" 
                      name="mode" 
                      value="flexible"
                      checked={mode === "flexible"}
                      onChange={(e) => setMode(e.target.value)}
                      className="peer sr-only" 
                    />
                    <div className="flex flex-col p-4 rounded-[12px] border-2 border-slate-200 bg-white transition-all peer-checked:border-[#D4A72C] peer-checked:bg-amber-50/30 hover:bg-slate-50">
                      <span className="font-bold text-[#0B2545] text-[15px] mb-1">Flexible Practice</span>
                      <span className="text-[13px] text-slate-500 font-medium">Take your time, no strict countdown. Best for learning.</span>
                    </div>
                  </label>
                  
                  <label className="relative cursor-pointer">
                    <input 
                      type="radio" 
                      name="mode" 
                      value="timed"
                      checked={mode === "timed"}
                      onChange={(e) => setMode(e.target.value)}
                      className="peer sr-only" 
                    />
                    <div className="flex flex-col p-4 rounded-[12px] border-2 border-slate-200 bg-white transition-all peer-checked:border-[#0B2545] peer-checked:bg-slate-50 hover:bg-slate-50">
                      <span className="font-bold text-[#0B2545] text-[15px] mb-1">Timed Practice</span>
                      <span className="text-[13px] text-slate-500 font-medium">Simulate exam pressure with a strict countdown timer.</span>
                    </div>
                  </label>
                </div>
              </div>

            </div>
          </div>

          <Link href={`/practice/session?exam=${exam}&subject=${subject}&topic=${topic}&diff=${difficulty}&q=${questions}&mode=${mode}`} className="block">
            <Button className="w-full h-14 rounded-[12px] bg-[#0B2545] hover:bg-[#163E6B] text-white font-bold text-[16px] shadow-[0_8px_20px_rgba(11,37,69,0.2)] transition-all hover:-translate-y-0.5 group">
              Start Practice 
              <Play className="w-5 h-5 ml-2 fill-white/20 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>

        </div>

        {/* RIGHT COLUMN - SMART OPTIONS */}
        <div className="space-y-6">
          <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm p-6">
            <h3 className="text-[14px] font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4A72C]" /> Quick Start
            </h3>
            <div className="space-y-3">
              {quickStarts.map((item) => (
                <button
                  key={item.id}
                  className="w-full flex items-center gap-4 p-4 rounded-[12px] border border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50 transition-all group text-left"
                >
                  <div className={`w-10 h-10 rounded-[8px] flex items-center justify-center ${item.bg} shrink-0`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="font-semibold text-[#0B2545] text-[14px]">{item.label}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#0B2545] to-[#163E6B] rounded-[16px] shadow-sm p-6 text-white">
            <h3 className="font-bold text-[16px] mb-2 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#D4A72C]" /> Performance Tip
            </h3>
            <p className="text-[13px] text-white/80 font-medium leading-relaxed">
              Your accuracy in <strong>Constitution of Nepal</strong> dropped below 60% last week. We recommend starting a focused practice session on that subject today.
            </p>
            <Button className="w-full mt-4 bg-[#D4A72C] text-[#0A1118] hover:bg-[#b58e23] font-bold h-10 rounded-[8px]">
              Practice Constitution
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 20V10" stroke="#0B2545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 4V6" stroke="#0B2545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18 20V16" stroke="#0B2545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18 8V4" stroke="#0B2545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 20V16" stroke="#0B2545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 8V4" stroke="#0B2545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="8" r="2" stroke="#0B2545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="18" cy="12" r="2" stroke="#0B2545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="6" cy="12" r="2" stroke="#0B2545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
