"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, ArrowRight, Download, Eye, FileText, CheckCircle2, Target, BrainCircuit, Activity, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

// --- MOCK DATA ---
const examsData = [
  {
    id: "section-officer",
    name: "Section Officer",
    level: "Officer Level · First Class",
    papersCount: 3,
    subjectsCount: 12,
    description: "The core administrative examination for Gazetted Third Class officers.",
    papers: [
      {
        id: "paper-1",
        name: "Paper I",
        title: "Governance Systems",
        subjects: [
          {
            id: "sub-1",
            name: "Constitution",
            topicsCount: 18,
            questionsCount: 320,
            topicGroups: [
              {
                id: "tg-1",
                name: "1. Constitutional Development",
                topics: [
                  "Historical background",
                  "Constitutional evolution",
                  "Major constitutional milestones"
                ]
              },
              {
                id: "tg-2",
                name: "2. Fundamental Rights",
                topics: [
                  "Right to equality",
                  "Right to freedom",
                  "Constitutional remedies",
                  "Duties and responsibilities"
                ]
              },
              {
                id: "tg-3",
                name: "3. Constitutional Bodies",
                topics: [
                  "Commission structures",
                  "Roles and responsibilities",
                  "Constitutional appointments"
                ]
              },
              {
                id: "tg-4",
                name: "4. Federal Structure",
                topics: [
                  "Federal government",
                  "Provincial government",
                  "Local government",
                  "Inter-government relations"
                ]
              }
            ]
          },
          {
            id: "sub-2",
            name: "Public Administration",
            topicsCount: 15,
            questionsCount: 280,
            topicGroups: [
              {
                id: "tg-5",
                name: "1. Basics of Administration",
                topics: [
                  "Concept of Public Administration",
                  "New Public Management",
                  "Administrative Ethics"
                ]
              }
            ]
          }
        ]
      },
      {
        id: "paper-2",
        name: "Paper II",
        title: "Contemporary Issues",
        subjects: [
          {
            id: "sub-3",
            name: "General Knowledge",
            topicsCount: 12,
            questionsCount: 450,
            topicGroups: [
              {
                id: "tg-6",
                name: "1. Geography",
                topics: ["Physical Geography", "Economic Geography", "Human Geography"]
              }
            ]
          },
          {
            id: "sub-4",
            name: "Current Affairs",
            topicsCount: 10,
            questionsCount: 350,
            topicGroups: [
              {
                id: "tg-7",
                name: "1. National Events",
                topics: ["Political events", "Economic policies", "Social developments"]
              }
            ]
          }
        ]
      },
      {
        id: "paper-3",
        name: "Paper III",
        title: "Service Related Subject",
        subjects: [
          {
            id: "sub-5",
            name: "Revenue Administration",
            topicsCount: 8,
            questionsCount: 200,
            topicGroups: [
              {
                id: "tg-8",
                name: "1. Taxation",
                topics: ["Income Tax", "VAT", "Customs Duty"]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "nayab-subba",
    name: "Nayab Subba",
    level: "Non-Gazetted · First Class",
    papersCount: 2,
    subjectsCount: 8,
    description: "First Class Non-Gazetted position examination for technical and non-technical staff.",
    papers: [
      {
        id: "paper-1",
        name: "Paper I",
        title: "General Awareness",
        subjects: [
          {
            id: "sub-6",
            name: "General Knowledge",
            topicsCount: 14,
            questionsCount: 300,
            topicGroups: [
              {
                id: "tg-9",
                name: "1. History",
                topics: ["Ancient History", "Medieval History", "Modern History"]
              }
            ]
          }
        ]
      },
      {
        id: "paper-2",
        name: "Paper II",
        title: "Job Based Knowledge",
        subjects: [
          {
            id: "sub-7",
            name: "Office Management",
            topicsCount: 10,
            questionsCount: 250,
            topicGroups: [
              {
                id: "tg-10",
                name: "1. Basics of Office Management",
                topics: ["Filing System", "Record Management", "Office Layout"]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "kharidar",
    name: "Kharidar",
    level: "Non-Gazetted · Second Class",
    papersCount: 2,
    subjectsCount: 6,
    description: "Entry-level administrative position examination.",
    papers: [
      {
        id: "paper-1",
        name: "Paper I",
        title: "General Knowledge and Aptitude",
        subjects: [
          {
            id: "sub-8",
            name: "Basic Knowledge",
            topicsCount: 8,
            questionsCount: 150,
            topicGroups: [
              {
                id: "tg-11",
                name: "1. Basic Science",
                topics: ["Physics basics", "Chemistry basics", "Biology basics"]
              }
            ]
          }
        ]
      },
      {
        id: "paper-2",
        name: "Paper II",
        title: "Basic Office Knowledge",
        subjects: [
          {
            id: "sub-9",
            name: "Clerical Knowledge",
            topicsCount: 6,
            questionsCount: 120,
            topicGroups: [
              {
                id: "tg-12",
                name: "1. Typing and Drafting",
                topics: ["Drafting letters", "Memo writing", "Meeting minutes"]
              }
            ]
          }
        ]
      }
    ]
  }
];

export default function SyllabusPage() {
  const [selectedExamId, setSelectedExamId] = useState(examsData[0].id);
  const [selectedPaperId, setSelectedPaperId] = useState(examsData[0].papers[0].id);
  
  const selectedExam = examsData.find((exam) => exam.id === selectedExamId) || examsData[0];
  const selectedPaper = selectedExam.papers.find((paper) => paper.id === selectedPaperId) || selectedExam.papers[0];

  const handleExamChange = (examId: string) => {
    setSelectedExamId(examId);
    const newExam = examsData.find(e => e.id === examId);
    if (newExam && newExam.papers.length > 0) {
      setSelectedPaperId(newExam.papers[0].id);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0A1118]">
      <Navbar />
      
      {/* 1. HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        {/* Subtle premium background visual */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#163E6B_0%,transparent_70%)] opacity-20 dark:opacity-40"></div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#D4A72C]/10 rounded-full blur-[100px] mix-blend-screen hidden dark:block"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000003_1px,transparent_1px),linear-gradient(to_bottom,#00000003_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10 max-w-[900px] text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#163E6B]/10 dark:bg-[#D4A72C]/10 border border-[#163E6B]/20 dark:border-[#D4A72C]/20 backdrop-blur-md mb-6 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#163E6B] dark:text-[#D4A72C]">
              OFFICIAL PREPARATION STRUCTURE
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-[900] tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
            Explore the Complete Loksewa <span className="text-[#D4A72C]">Syllabus</span>.
          </h1>

          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10 font-[500]">
            Explore every paper, subject, and topic in one organized preparation system. Know exactly what to study before you start practicing.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-2xl mx-auto">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search subjects, topics, papers..." 
                className="w-full h-14 pl-12 pr-16 rounded-[12px] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0A1118]/80 backdrop-blur-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/50 shadow-sm transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-100 dark:bg-white/10 rounded-[6px] text-xs font-semibold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5">
                ⌘ K
              </div>
            </div>
            <Button variant="outline" className="h-14 px-6 rounded-[12px] border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 backdrop-blur-sm gap-2 whitespace-nowrap">
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </Button>
          </div>
        </div>
      </section>

      {/* 2. EXAM SELECTOR */}
      <section className="py-12 bg-white dark:bg-[#0B1521] border-y border-slate-200 dark:border-white/5">
        <div className="container mx-auto px-4 max-w-[1200px]">
          <h2 className="text-2xl font-[800] text-slate-900 dark:text-white mb-8 text-center">Choose Your Examination</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {examsData.map((exam) => {
              const isSelected = exam.id === selectedExamId;
              return (
                <div 
                  key={exam.id}
                  onClick={() => handleExamChange(exam.id)}
                  className={`relative p-6 rounded-[16px] cursor-pointer transition-all duration-300 border ${
                    isSelected 
                      ? "bg-[#0B2545] dark:bg-[#163E6B]/40 border-[#D4A72C]/50 shadow-[0_8px_30px_rgba(212,167,44,0.15)]" 
                      : "bg-slate-50 dark:bg-[#0A1118] border-slate-200 dark:border-white/10 hover:border-[#163E6B]/30 dark:hover:border-white/20 hover:shadow-md"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-0 right-0 p-4">
                      <CheckCircle2 className="w-6 h-6 text-[#D4A72C]" />
                    </div>
                  )}
                  <h3 className={`text-xl font-[800] mb-1 ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                    {exam.name}
                  </h3>
                  <div className={`text-sm font-[600] mb-4 ${isSelected ? 'text-[#D4A72C]' : 'text-[#163E6B] dark:text-slate-400'}`}>
                    {exam.level}
                  </div>
                  <div className={`flex gap-4 text-sm font-[500] mb-4 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    <span>{exam.papersCount} Papers</span>
                    <span>•</span>
                    <span>{exam.subjectsCount} Subjects</span>
                  </div>
                  <p className={`text-sm leading-relaxed mb-6 ${isSelected ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400'}`}>
                    {exam.description}
                  </p>
                  <div className={`text-sm font-[700] flex items-center gap-1 ${isSelected ? 'text-[#D4A72C]' : 'text-slate-700 dark:text-slate-300'}`}>
                    View Syllabus <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. SYLLABUS EXPLORER & 4. PAPER NAVIGATION */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-[1200px]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-[900] text-slate-900 dark:text-white mb-2">
                {selectedExam.name} Syllabus
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 font-[500]">
                Complete paper-wise and subject-wise syllabus
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="h-[44px] rounded-[10px] bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-[600]">
                <Eye className="w-4 h-4 mr-2" /> View Full Syllabus
              </Button>
              <Button className="h-[44px] rounded-[10px] bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] font-[700]">
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </Button>
            </div>
          </div>

          {/* Paper Navigation */}
          <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-10 border-b border-slate-200 dark:border-white/10 pb-[1px]">
            {selectedExam.papers.map((paper) => {
              const isSelected = paper.id === selectedPaperId;
              return (
                <button
                  key={paper.id}
                  onClick={() => setSelectedPaperId(paper.id)}
                  className={`relative px-6 py-4 font-[700] text-[15px] whitespace-nowrap transition-colors ${
                    isSelected 
                      ? "text-slate-900 dark:text-white" 
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {paper.name}
                  {isSelected && (
                    <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#D4A72C] rounded-t-full shadow-[0_0_10px_rgba(212,167,44,0.5)]"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* 5. SUBJECT LIST & 6. TOPIC EXPLORER */}
          <div className="max-w-[900px]">
            <div className="mb-6">
              <h3 className="text-xl font-[800] text-slate-900 dark:text-white">
                {selectedPaper.title}
              </h3>
            </div>
            
            <Accordion type="multiple" className="space-y-4">
              {selectedPaper.subjects.map((subject) => (
                <AccordionItem 
                  key={subject.id} 
                  value={subject.id} 
                  className="bg-white dark:bg-[#0B1521] border border-slate-200 dark:border-white/10 rounded-[12px] overflow-hidden data-[state=open]:shadow-md transition-shadow"
                >
                  <AccordionTrigger className="px-6 py-5 hover:no-underline [&[data-state=open]>div>div>svg]:rotate-180">
                    <div className="flex flex-col md:flex-row md:items-center justify-between w-full text-left gap-4 pr-6">
                      <div>
                        <h4 className="text-xl font-[800] text-slate-900 dark:text-white mb-1">
                          {subject.name}
                        </h4>
                        <div className="text-[14px] font-[500] text-slate-500 dark:text-slate-400 flex items-center gap-3">
                          <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {subject.topicsCount} Topics</span>
                          <span>•</span>
                          <span className="flex items-center gap-1.5"><Target className="w-4 h-4" /> {subject.questionsCount}+ Practice Questions</span>
                        </div>
                      </div>
                      <div className="text-[14px] font-[700] text-[#163E6B] dark:text-[#D4A72C] flex items-center shrink-0">
                        Explore Topics <ArrowRight className="w-4 h-4 ml-1.5" />
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-6 pb-6 pt-2 bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="space-y-6 mt-4">
                      {subject.topicGroups.map((group) => (
                        <div key={group.id} className="border-l-2 border-slate-200 dark:border-white/10 pl-5 relative">
                          <div className="absolute w-2.5 h-2.5 bg-[#D4A72C] rounded-full -left-[7px] top-1.5"></div>
                          <h5 className="text-[16px] font-[800] text-slate-900 dark:text-white mb-3">
                            {group.name}
                          </h5>
                          <ul className="space-y-3">
                            {group.topics.map((topic, i) => (
                              <li key={i} className="flex items-start gap-3 group/topic cursor-default">
                                <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                  {i + 1}
                                </div>
                                <span className="text-[15px] font-[500] text-slate-600 dark:text-slate-300 group-hover/topic:text-slate-900 dark:group-hover/topic:text-white transition-colors">
                                  {topic}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* 7. SMART SYLLABUS FLOW */}
      <section className="py-20 bg-slate-900 dark:bg-[#060A0F] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#163E6B_0%,transparent_70%)] opacity-30"></div>
        
        <div className="container mx-auto px-4 max-w-[1200px] relative z-10 text-center">
          <h2 className="text-3xl md:text-4xl font-[900] mb-16 tracking-tight">From Syllabus to Success</h2>
          
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8">
            <div className="flex flex-col items-center w-full md:w-[200px]">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-4 border border-white/20">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-[18px] font-[700] mb-2">Syllabus</h4>
              <p className="text-[13px] text-slate-400 font-[500] leading-snug">Official curriculum breakdown</p>
            </div>
            
            <ArrowRight className="w-6 h-6 text-slate-600 rotate-90 md:rotate-0 flex-shrink-0 my-2 md:my-0" />
            
            <div className="flex flex-col items-center w-full md:w-[200px]">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-4 border border-white/20">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-[18px] font-[700] mb-2">Topics</h4>
              <p className="text-[13px] text-slate-400 font-[500] leading-snug">Granular subject concepts</p>
            </div>

            <ArrowRight className="w-6 h-6 text-slate-600 rotate-90 md:rotate-0 flex-shrink-0 my-2 md:my-0" />
            
            <div className="flex flex-col items-center w-full md:w-[200px]">
              <div className="w-16 h-16 rounded-2xl bg-[#D4A72C]/20 backdrop-blur-md flex items-center justify-center mb-4 border border-[#D4A72C]/50 shadow-[0_0_20px_rgba(212,167,44,0.3)]">
                <Activity className="w-8 h-8 text-[#D4A72C]" />
              </div>
              <h4 className="text-[18px] font-[700] mb-2 text-[#D4A72C]">Practice</h4>
              <p className="text-[13px] text-slate-300 font-[500] leading-snug">Topic-wise targeted questions</p>
            </div>

            <ArrowRight className="w-6 h-6 text-slate-600 rotate-90 md:rotate-0 flex-shrink-0 my-2 md:my-0" />
            
            <div className="flex flex-col items-center w-full md:w-[200px]">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-4 border border-white/20">
                <BrainCircuit className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-[18px] font-[700] mb-2">Mock Exams</h4>
              <p className="text-[13px] text-slate-400 font-[500] leading-snug">Full-length realistic tests</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FEATURE HIGHLIGHTS */}
      <section className="py-20 bg-white dark:bg-[#0A1118]">
        <div className="container mx-auto px-4 max-w-[1200px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-8 rounded-[20px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
              <div className="w-12 h-12 rounded-[12px] bg-[#163E6B]/10 dark:bg-white/10 flex items-center justify-center mb-6">
                <BookOpen className="w-6 h-6 text-[#163E6B] dark:text-[#D4A72C]" />
              </div>
              <h3 className="text-lg font-[800] text-slate-900 dark:text-white mb-3">Complete Coverage</h3>
              <p className="text-sm font-[500] text-slate-600 dark:text-slate-400 leading-relaxed">
                Every paper and topic organized in one place for comprehensive study.
              </p>
            </div>
            
            <div className="p-8 rounded-[20px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
              <div className="w-12 h-12 rounded-[12px] bg-[#163E6B]/10 dark:bg-white/10 flex items-center justify-center mb-6">
                <Target className="w-6 h-6 text-[#163E6B] dark:text-[#D4A72C]" />
              </div>
              <h3 className="text-lg font-[800] text-slate-900 dark:text-white mb-3">Structured Preparation</h3>
              <p className="text-sm font-[500] text-slate-600 dark:text-slate-400 leading-relaxed">
                Know exactly what to study and in what order for maximum efficiency.
              </p>
            </div>

            <div className="p-8 rounded-[20px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
              <div className="w-12 h-12 rounded-[12px] bg-[#163E6B]/10 dark:bg-white/10 flex items-center justify-center mb-6">
                <Activity className="w-6 h-6 text-[#163E6B] dark:text-[#D4A72C]" />
              </div>
              <h3 className="text-lg font-[800] text-slate-900 dark:text-white mb-3">Practice Integration</h3>
              <p className="text-sm font-[500] text-slate-600 dark:text-slate-400 leading-relaxed">
                Move directly from syllabus topics to highly relevant practice questions.
              </p>
            </div>

            <div className="p-8 rounded-[20px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
              <div className="w-12 h-12 rounded-[12px] bg-[#163E6B]/10 dark:bg-white/10 flex items-center justify-center mb-6">
                <BrainCircuit className="w-6 h-6 text-[#163E6B] dark:text-[#D4A72C]" />
              </div>
              <h3 className="text-lg font-[800] text-slate-900 dark:text-white mb-3">AI-Powered Guidance</h3>
              <p className="text-sm font-[500] text-slate-600 dark:text-slate-400 leading-relaxed">
                Use our built-in AI Tutor to understand difficult or complex topics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. DOWNLOAD / REFERENCE SECTION */}
      <section className="py-20 bg-[#0B2545] dark:bg-[#050C14] text-white">
        <div className="container mx-auto px-4 max-w-[900px] text-center">
          <h2 className="text-3xl md:text-4xl font-[900] mb-4">Keep Your Syllabus With You</h2>
          <p className="text-lg text-slate-300 font-[500] mb-10 max-w-2xl mx-auto">
            Download the complete syllabus and use it as your preparation reference anytime. Access it fully integrated within our app.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button className="h-14 px-8 rounded-[12px] bg-white text-[#0B2545] hover:bg-slate-100 font-[800] text-[16px] transition-all">
              <Download className="w-5 h-5 mr-2" /> Download Syllabus PDF
            </Button>
            <Link href="/courses">
              <Button variant="outline" className="h-14 px-8 rounded-[12px] bg-transparent border-white/30 text-white hover:bg-white/10 font-[700] text-[16px]">
                Explore Courses
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 10. FINAL CTA */}
      <section className="py-24 bg-white dark:bg-[#0B1521] border-t border-slate-200 dark:border-white/5 text-center">
        <div className="container mx-auto px-4 max-w-[800px]">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#163E6B]/10 dark:bg-[#D4A72C]/10 mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#163E6B] dark:text-[#D4A72C]">
              READY TO BEGIN?
            </span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-[900] text-slate-900 dark:text-white mb-6 tracking-tight">
            Turn Your Syllabus Into a Preparation Strategy.
          </h2>
          
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 font-[500] mb-10 leading-relaxed">
            Explore courses, practice questions, mock exams, and AI-powered learning tools built around your Loksewa target.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/courses">
              <Button className="h-14 px-8 rounded-[12px] bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] font-[800] text-[16px] transition-all shadow-[0_0_20px_rgba(212,167,44,0.2)] hover:shadow-[0_0_30px_rgba(212,167,44,0.4)] flex items-center justify-center gap-2 group/btn">
                Explore Courses <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/courses">
              <Button variant="outline" className="h-14 px-8 rounded-[12px] bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white font-[700] text-[16px]">
                Start Preparing <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
