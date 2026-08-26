"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { BookOpen, User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, UserCircle2, Gift, Check, X, GraduationCap, Clock, Zap, CheckCircle2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { apiClient } from "@/lib/api/client";
import { subscriptionPlansApi } from "@/lib/api/gamification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import bgImage from "../../media/signup.png";

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  duration: number;
  duration_unit: string;
  price: string;
  original_price?: string;
  discount: string;
  badge: string;
  features: string[];
  status: string;
}

const STEPS = ["Account", "Select Plan", "Review"];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralStatus, setReferralStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");
  const [error, setError] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [plansLoading, setPlansLoading] = useState(false);
  const [courseId, setCourseId] = useState<string>("");

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) { setReferralCode(ref); validateReferral(ref); }
    
    const course = searchParams.get("course");
    if (course) { setCourseId(course); }
  }, [searchParams]);

  useEffect(() => {
    if (currentStep === 1) {
      setPlansLoading(true);
      subscriptionPlansApi.getPlans()
        .then((data) => setPlans(data.filter((p: SubscriptionPlan) => p.status === 'ACTIVE')))
        .catch(() => setPlans([]))
        .finally(() => setPlansLoading(false));
    }
  }, [currentStep]);

  const validateReferral = async (code: string) => {
    if (!code.trim()) { setReferralStatus("idle"); return; }
    setReferralStatus("validating");
    try {
      const res = await apiClient<{ valid: boolean }>(`/gamification/referrals/validate/?code=${encodeURIComponent(code)}`);
      setReferralStatus(res.valid ? "valid" : "invalid");
    } catch { setReferralStatus("invalid"); }
  };

  const handleNext = () => {
    setError("");
    if (currentStep === 0) {
      if (!fullName || !username || !email || !password || !confirmPassword) { setError("Please fill all required fields."); return; }
      if (password !== confirmPassword) { setError("Passwords do not match."); return; }
      if (referralCode && referralStatus === "invalid") { setError("Please provide a valid referral code or remove it."); return; }
    }
    setCurrentStep((s) => Math.min(s + 1, 2));
  };

  const handleRegister = async () => {
    setError("");
    setIsLoading(true);
    try {
      const payload: Record<string, string> = {
        username,
        email,
        password,
        name: fullName,
        mobile,
        ref: referralCode,
        plan_id: selectedPlanId ? String(selectedPlanId) : "",
      };
      
      if (courseId) {
        payload.course_id = courseId;
      }
      
      await authApi.studentSignup(payload);
      
      if (courseId) {
        router.push(`/student/courses/${courseId}`);
      } else {
        router.push("/student");
      }
    } catch (err: any) {
      setError(err.detail || err.error || "Failed to create account. Please try again.");
      setIsLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (password.length === 0) return { score: 0, label: "", color: "bg-white/10", textColor: "text-white/50" };
    if (password.length < 6) return { score: 1, label: "Weak", color: "bg-red-500", textColor: "text-red-500" };
    if (password.length < 10) return { score: 2, label: "Medium", color: "bg-yellow-500", textColor: "text-yellow-500" };
    if (password.match(/[A-Z]/) && password.match(/[0-9]/) && password.match(/[^A-Za-z0-9]/)) return { score: 4, label: "Strong", color: "bg-[#22c55e]", textColor: "text-[#22c55e]" };
    return { score: 3, label: "Good", color: "bg-[#22c55e]", textColor: "text-[#22c55e]" };
  };

  const strength = getPasswordStrength();
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const getBadgeStyle = (badge: string) => {
    switch (badge) {
      case 'POPULAR': return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
      case 'BEST_VALUE': return 'bg-[#D4A72C]/20 text-[#D4A72C] border border-[#D4A72C]/30';
      case 'RECOMMENDED': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      case 'LIMITED_OFFER': return 'bg-red-500/20 text-red-300 border border-red-500/30';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen relative flex font-sans overflow-hidden bg-[#0A1118] text-white">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-[center_top] bg-no-repeat" style={{ backgroundImage: `url(${bgImage.src})` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-black/80 mix-blend-multiply" />
        <div className="absolute inset-y-0 right-0 w-full lg:w-1/2 bg-gradient-to-l from-[#0A1118]/90 via-[#0A1118]/40 to-transparent" />
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
          <div className={`w-full ${currentStep === 1 ? 'lg:w-[760px]' : 'lg:w-[480px]'} bg-black/20 backdrop-blur-[24px] border border-white/10 rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)] relative transition-all duration-300`}>

            {/* Step Indicator */}
            <div className="flex items-center px-8 pt-7 pb-5 border-b border-white/5">
              {STEPS.map((step, i) => (
                <React.Fragment key={step}>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${i < currentStep ? 'bg-[#D4A72C] text-black' : i === currentStep ? 'bg-[#D4A72C]/20 border-2 border-[#D4A72C] text-[#D4A72C]' : 'bg-white/5 border border-white/20 text-white/30'}`}>
                      {i < currentStep ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                    </div>
                    <span className={`text-[11px] font-semibold tracking-wide ${i === currentStep ? 'text-white' : 'text-white/30'}`}>{step}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className={`flex-1 h-[1px] mx-3 transition-colors duration-300 ${i < currentStep ? 'bg-[#D4A72C]/60' : 'bg-white/10'}`} />}
                </React.Fragment>
              ))}
            </div>

            <div className="p-8 sm:p-10">
              {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[10px] text-red-400 text-[13px] font-medium mb-4">{error}</div>}

              {/* STEP 0: Account Info */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full border border-white/20 bg-white/5 flex items-center justify-center shrink-0">
                      <UserCircle2 className="h-6 w-6 text-white/80" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="text-[26px] font-bold text-white tracking-tight leading-tight">Create <span className="text-[#D4A72C]">Your Account</span></h2>
                      <p className="text-[12px] text-white/60 font-medium">Start your Loksewa success journey today.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors"><User className="h-4 w-4" strokeWidth={1.5} /></div>
                      <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="h-[48px] w-full pl-11 bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40" required />
                    </div>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors"><User className="h-4 w-4" strokeWidth={1.5} /></div>
                      <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="h-[48px] w-full pl-11 bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40" required />
                    </div>
                  </div>

                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors"><Mail className="h-4 w-4" strokeWidth={1.5} /></div>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="h-[48px] w-full pl-11 bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40" required />
                  </div>

                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors"><Phone className="h-4 w-4" strokeWidth={1.5} /></div>
                    <Input id="mobile" type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile Number (Optional)" className="h-[48px] w-full pl-11 bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40" />
                  </div>

                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors"><Lock className="h-4 w-4" strokeWidth={1.5} /></div>
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-[48px] w-full pl-11 pr-12 bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                    </button>
                  </div>

                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors"><Lock className="h-4 w-4" strokeWidth={1.5} /></div>
                    <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" className="h-[48px] w-full pl-11 pr-12 bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40" required />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                    </button>
                  </div>

                  <div className="pt-1 pb-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] text-white/60">Password Strength</span>
                      {strength.label && <span className={`text-[10px] font-bold ${strength.textColor}`}>{strength.label}</span>}
                    </div>
                    <div className="flex gap-1 h-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div key={level} className={`flex-1 rounded-full ${level <= strength.score ? strength.color : "bg-white/10"} transition-colors duration-300`} />
                      ))}
                    </div>
                  </div>

                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors"><Gift className="h-4 w-4" strokeWidth={1.5} /></div>
                    <Input id="referralCode" type="text" placeholder="Referral Code (Optional)" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} onBlur={() => validateReferral(referralCode)} className={`h-[48px] w-full pl-11 pr-11 bg-transparent text-[13px] text-white focus:bg-white/5 focus:ring-1 rounded-[10px] transition-all placeholder:text-white/40 ${referralStatus === "invalid" ? "border-red-500 focus:border-red-500 focus:ring-red-500" : referralStatus === "valid" ? "border-[#22c55e] focus:border-[#22c55e] focus:ring-[#22c55e]" : "border-white/20 focus:border-[#D4A72C] focus:ring-[#D4A72C]"}`} />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {referralStatus === "valid" && <Check className="h-4 w-4 text-[#22c55e]" strokeWidth={2} />}
                      {referralStatus === "invalid" && <X className="h-4 w-4 text-red-500" strokeWidth={2} />}
                    </div>
                  </div>

                  <Button onClick={handleNext} className="w-full h-[48px] bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-90 text-white text-[15px] font-bold rounded-[10px] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(212,167,44,0.25)] border-none">
                    Continue <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2} />
                  </Button>
                </div>
              )}

              {/* STEP 1: Plan Selection */}
              {currentStep === 1 && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-[24px] font-bold text-white mb-1">Select Your <span className="text-[#D4A72C]">Course Plan</span></h2>
                    <p className="text-[12px] text-white/60">Choose a course to enroll in. You can skip and explore for free.</p>
                  </div>

                  {plansLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[1, 2].map(i => <div key={i} className="h-[180px] rounded-[14px] bg-white/5 animate-pulse" />)}
                    </div>
                  ) : plans.length === 0 ? (
                    <div className="text-center py-12 text-white/50">
                      <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No course plans available right now.</p>
                      <p className="text-xs mt-1">You can explore the platform after registration.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-1">
                      {plans.map((plan) => {
                        const isSelected = selectedPlanId === plan.id;
                        return (
                          <button key={plan.id} onClick={() => setSelectedPlanId(isSelected ? null : plan.id)} className={`relative text-left rounded-[14px] border p-5 transition-all duration-200 ${isSelected ? 'border-[#D4A72C] bg-[#D4A72C]/5 shadow-[0_0_20px_rgba(212,167,44,0.12)]' : 'border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5'}`}>
                            {plan.badge !== 'NONE' && <span className={`absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${getBadgeStyle(plan.badge)}`}>{plan.badge.replace('_', ' ')}</span>}
                            {isSelected && <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-[#D4A72C] flex items-center justify-center"><Check className="h-3 w-3 text-black" strokeWidth={3} /></div>}
                            <div className="flex items-start gap-3 mb-3">
                              <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'bg-[#D4A72C]/20' : 'bg-white/5'}`}>
                                <GraduationCap className={`h-4 w-4 ${isSelected ? 'text-[#D4A72C]' : 'text-white/60'}`} />
                              </div>
                              <div>
                                <h3 className={`text-[14px] font-bold leading-tight ${isSelected ? 'text-[#D4A72C]' : 'text-white'}`}>{plan.name}</h3>
                                <p className="text-[11px] text-white/50 mt-0.5 line-clamp-2">{plan.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-[18px] font-bold text-white">Rs. {parseFloat(plan.price).toLocaleString()}</span>
                              {plan.original_price && <span className="text-[11px] text-white/40 line-through">Rs. {parseFloat(plan.original_price).toLocaleString()}</span>}
                              <div className="flex items-center gap-1 text-white/40 text-[11px] ml-auto">
                                <Clock className="h-3 w-3" /><span>{plan.duration} {plan.duration_unit.toLowerCase()}</span>
                              </div>
                            </div>
                            {plan.features && plan.features.length > 0 && (
                              <ul className="space-y-1">
                                {plan.features.slice(0, 3).map((f: string, idx: number) => (
                                  <li key={idx} className="flex items-center gap-1.5 text-[11px] text-white/60">
                                    <CheckCircle2 className={`h-3 w-3 shrink-0 ${isSelected ? 'text-[#D4A72C]' : 'text-white/30'}`} />{f}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <Button onClick={() => setCurrentStep(0)} variant="outline" className="flex-1 h-[48px] border-white/20 bg-transparent text-white hover:bg-white/5 rounded-[10px]">
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <Button onClick={handleNext} className="flex-1 h-[48px] bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-90 text-white font-bold rounded-[10px] border-none">
                      {selectedPlanId ? 'Continue with Plan' : 'Skip & Continue'} <ArrowRight className="h-[18px] w-[18px] ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2: Review & Register */}
              {currentStep === 2 && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-[24px] font-bold text-white mb-1">Review & <span className="text-[#D4A72C]">Register</span></h2>
                    <p className="text-[12px] text-white/60">Confirm your details before creating your account.</p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="rounded-[12px] border border-white/10 bg-white/3 p-4 space-y-2">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-3">Account Details</p>
                      <div className="grid grid-cols-2 gap-2 text-[13px]">
                        <div><span className="text-white/50">Name:</span> <span className="text-white font-medium">{fullName}</span></div>
                        <div><span className="text-white/50">Username:</span> <span className="text-white font-medium">{username}</span></div>
                        <div className="col-span-2"><span className="text-white/50">Email:</span> <span className="text-white font-medium">{email}</span></div>
                        {mobile && <div><span className="text-white/50">Mobile:</span> <span className="text-white font-medium">{mobile}</span></div>}
                        {referralCode && referralStatus === 'valid' && <div><span className="text-white/50">Referral:</span> <span className="text-[#22c55e] font-medium">{referralCode} âœ“</span></div>}
                      </div>
                    </div>

                    {selectedPlan ? (
                      <div className="rounded-[12px] border border-[#D4A72C]/30 bg-[#D4A72C]/5 p-4">
                        <p className="text-[10px] text-[#D4A72C]/70 uppercase tracking-widest font-bold mb-3">Selected Course Plan</p>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-bold text-[15px]">{selectedPlan.name}</p>
                            <p className="text-white/50 text-[12px]">{selectedPlan.duration} {selectedPlan.duration_unit.toLowerCase()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[#D4A72C] font-bold text-[18px]">Rs. {parseFloat(selectedPlan.price).toLocaleString()}</p>
                            <p className="text-[10px] text-white/40">Application pending payment</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[12px] border border-white/10 bg-white/3 p-4 flex items-center gap-3">
                        <Zap className="h-5 w-5 text-white/30" />
                        <div>
                          <p className="text-white/70 text-[13px] font-medium">No course plan selected</p>
                          <p className="text-white/40 text-[11px]">You can enroll in a course after registration.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={() => setCurrentStep(1)} variant="outline" className="flex-1 h-[48px] border-white/20 bg-transparent text-white hover:bg-white/5 rounded-[10px]">
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <Button onClick={handleRegister} disabled={isLoading} className="flex-1 h-[48px] bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-90 text-white font-bold rounded-[10px] shadow-[0_4px_20px_rgba(212,167,44,0.25)] border-none flex items-center justify-center gap-2">
                      {isLoading ? "Creating Account..." : (<>Create Account <CheckCircle2 className="h-5 w-5" /></>)}
                    </Button>
                  </div>

                  <div className="text-center mt-5 text-[11px] text-white/50">
                    By registering you agree to our{" "}<Link href="/terms" className="text-[#D4A72C] hover:underline">Terms</Link>{" "}and{" "}<Link href="/privacy" className="text-[#D4A72C] hover:underline">Privacy Policy</Link>.
                  </div>
                </div>
              )}

              <div className="text-center mt-6 text-[12px] text-white/70">
                Already have an account?{" "}<Link href="/login" className="text-[#D4A72C] font-bold hover:text-[#e0b745] transition-colors">Sign in</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A1118]" />}>
      <RegisterForm />
    </Suspense>
  );
}
