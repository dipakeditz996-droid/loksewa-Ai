"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, MapPin, GraduationCap, ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { examPreferencesApi, ExamPreferenceCategory, ExamPreferenceNode } from "@/lib/api/exam-preferences";
import Link from "next/link";
import bgImage from "../../../media/signup.png";

function isValidNepalPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, "").replace(/^\+?977/, "");
  return /^9[678]\d{8}$/.test(cleaned);
}

export default function OnboardingPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [district, setDistrict] = useState("");
  const [localLevel, setLocalLevel] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [examTree, setExamTree] = useState<ExamPreferenceCategory[]>([]);
  const [examTreeLoading, setExamTreeLoading] = useState(true);
  const [examCategoryId, setExamCategoryId] = useState<number | null>(null);
  const [examPath, setExamPath] = useState<ExamPreferenceNode[]>([]);

  useEffect(() => {
    examPreferencesApi.getTree()
      .then(setExamTree)
      .catch(() => setExamTree([]))
      .finally(() => setExamTreeLoading(false));
  }, [router]);

  const selectedExamCategory = examTree.find((c) => c.id === examCategoryId) || null;
  const examOptionsAtDepth = (depth: number): ExamPreferenceNode[] => {
    if (!selectedExamCategory) return [];
    if (depth === 0) return selectedExamCategory.exams;
    const parent = examPath[depth - 1];
    return parent ? parent.children : [];
  };

  const examDepthLabel = (depth: number): string => {
    if (depth === 0) return selectedExamCategory?.name === "PSC Exams" ? "Select PSC Level" : `Select ${selectedExamCategory?.name} Level`;
    if (depth === 1) return "Select Service / Faculty";
    return "Select an option";
  };

  const selectExamNode = (depth: number, node: ExamPreferenceNode) => {
    setExamPath((prev) => [...prev.slice(0, depth), node]);
  };

  const selectedExamPosition = examPath.length > 0 ? examPath[examPath.length - 1] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) { setError("Please provide your full name."); return; }
    if (!mobile.trim()) { setError("Please provide your mobile number."); return; }
    if (!isValidNepalPhone(mobile)) { setError("Please enter a valid 10-digit Nepali mobile number."); return; }
    if (!district.trim() || !localLevel.trim()) { setError("Please provide your permanent address (District and Local Level)."); return; }
    if (!examCategoryId) { setError("Please select what you are preparing for."); return; }

    setIsLoading(true);
    try {
      await authApi.completeGoogleProfile({
        full_name: fullName,
        phone: mobile,
        permanent_district: district,
        permanent_local_level: localLevel,
        exam_category_id: examCategoryId,
        exam_position_id: selectedExamPosition ? selectedExamPosition.id : null,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push("/student");
      }, 1500);
    } catch (err: any) {
      setError(err.message || err.detail || "Failed to update profile. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex font-sans overflow-hidden bg-[#0A1118] text-white">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-[25%_top] lg:bg-[center_top] bg-no-repeat" style={{ backgroundImage: `url(${bgImage.src})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/95 lg:bg-gradient-to-r lg:from-black/50 lg:via-black/20 lg:to-black/80 mix-blend-multiply" />
        <div className="hidden lg:block absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#0A1118]/90 via-[#0A1118]/40 to-transparent" />
      </div>

      <div className="container relative z-10 w-full mx-auto px-6 md:px-12 py-8 flex flex-col min-h-screen">
        <div className="flex justify-start w-full mb-auto lg:mb-0">
          <Link href="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity w-fit mt-4">
            <div className="bg-transparent border border-white/80 p-1.5 rounded-[8px] flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <span className="font-[800] text-[22px] tracking-tight text-white drop-shadow-md leading-none flex items-center">Loksewa<span className="text-[#D4A72C]">AI</span></span>
              <span className="text-[9px] text-white/70 block mt-0.5 font-medium tracking-wide">Your Journey. Our Guidance. Your Success.</span>
            </div>
          </Link>
        </div>

        <div className="w-full flex justify-center lg:justify-end flex-1 items-center py-10">
          <div className="w-full lg:w-[480px] bg-black/20 backdrop-blur-[24px] border border-white/10 rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)] relative transition-all duration-300">
            
            <div className="p-8 sm:p-10">
              {success ? (
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-full bg-[#22c55e]/15 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-7 w-7 text-[#22c55e]" />
                  </div>
                  <h2 className="text-[20px] font-bold text-white mb-2">Profile Complete!</h2>
                  <p className="text-[13px] text-white/60 mb-6">Redirecting you to your learning dashboard...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="mb-6">
                    <h2 className="text-[26px] font-bold text-white tracking-tight leading-tight">Complete <span className="text-[#D4A72C]">Your Profile</span></h2>
                    <p className="text-[12px] text-white/60 font-medium">Just a few more details to set up your account.</p>
                  </div>

                  {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[10px] text-red-400 text-[13px] font-medium mb-4">{error}</div>}

                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors"><User className="h-4 w-4" strokeWidth={1.5} /></div>
                    <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="h-[48px] w-full pl-11 bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40" required />
                  </div>

                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors"><Phone className="h-4 w-4" strokeWidth={1.5} /></div>
                    <Input id="mobile" type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile Number (98XXXXXXXX)" className="h-[48px] w-full pl-11 bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40" required />
                  </div>

                  <div>
                    <p className="text-[11px] text-white/50 font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Permanent Address</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Input id="district" type="text" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="District" className="h-[48px] w-full bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40" required />
                      <Input id="localLevel" type="text" value={localLevel} onChange={(e) => setLocalLevel(e.target.value)} placeholder="Local Level" className="h-[48px] w-full bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40" required />
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-[11px] text-white/50 font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> What are you preparing for? *</p>
                    {examTreeLoading ? (
                      <div className="grid grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map((i) => <div key={i} className="h-[44px] rounded-[10px] bg-white/5 animate-pulse" />)}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {examTree.map((category) => {
                          const isSelected = examCategoryId === category.id;
                          return (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => { setExamCategoryId(category.id); setExamPath([]); }}
                              className={`h-[44px] px-3 rounded-[10px] border text-[12px] font-semibold text-left transition-colors ${isSelected ? 'border-[#D4A72C] bg-[#D4A72C]/10 text-[#D4A72C]' : 'border-white/15 bg-white/3 text-white/70 hover:border-white/30'}`}
                            >
                              {category.name}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {selectedExamCategory && examOptionsAtDepth(0).length > 0 && (
                      <div className="mt-3">
                        <p className="text-[11px] text-white/50 font-semibold mb-2">{examDepthLabel(0)}</p>
                        <div className="flex flex-wrap gap-2">
                          {examOptionsAtDepth(0).map((node) => {
                            const isSelected = examPath[0]?.id === node.id;
                            return (
                              <button
                                key={node.id}
                                type="button"
                                onClick={() => selectExamNode(0, node)}
                                className={`px-3 py-2 rounded-full border text-[12px] font-medium transition-colors ${isSelected ? 'border-[#D4A72C] bg-[#D4A72C]/10 text-[#D4A72C]' : 'border-white/15 bg-white/3 text-white/70 hover:border-white/30'}`}
                              >
                                {node.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {examPath[0] && examOptionsAtDepth(1).length > 0 && (
                      <div className="mt-3">
                        <p className="text-[11px] text-white/50 font-semibold mb-2">{examDepthLabel(1)}</p>
                        <div className="flex flex-wrap gap-2">
                          {examOptionsAtDepth(1).map((node) => {
                            const isSelected = examPath[1]?.id === node.id;
                            return (
                              <button
                                key={node.id}
                                type="button"
                                onClick={() => selectExamNode(1, node)}
                                className={`px-3 py-2 rounded-full border text-[12px] font-medium transition-colors ${isSelected ? 'border-[#D4A72C] bg-[#D4A72C]/10 text-[#D4A72C]' : 'border-white/15 bg-white/3 text-white/70 hover:border-white/30'}`}
                              >
                                {node.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full h-[48px] bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-90 text-white text-[15px] font-bold rounded-[10px] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(212,167,44,0.25)] border-none mt-6">
                    {isLoading ? "Saving..." : (<>Complete Profile <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2} /></>)}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
