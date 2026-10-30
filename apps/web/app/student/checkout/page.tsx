"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, CheckCircle2, UploadCloud, AlertTriangle, Loader2, 
  Sparkles, ShieldCheck, BookOpen, Bot, GraduationCap, Clock, Check, QrCode
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { subscriptionsApi, SubscriptionPlan } from "@/lib/api/subscriptions";
import { marketplaceApi, PaymentMethod } from "@/lib/api/marketplace";
import { buildMediaUrl } from "@/lib/api/client";
import { RetryImage } from "@/components/ui/retry-image";
import Link from "next/link";
import bgImage from "@/media/signup.webp";

export default function CheckoutPage() {
  const router = useRouter();

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activatingFree, setActivatingFree] = useState(false);
  const [freeSuccess, setFreeSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State for Paid Plans
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [note, setNote] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedPlanId = localStorage.getItem("onboarding_selected_plan_id");
        const storedCourses = localStorage.getItem("onboarding_selected_courses");
        
        if (!storedPlanId) {
          router.replace("/student/onboarding/preparation");
          return;
        }
        
        if (storedCourses) {
          try {
            const courses = JSON.parse(storedCourses);
            setSelectedCourses(courses);
          } catch {
            setSelectedCourses([]);
          }
        }
        
        const [planData, methodsData] = await Promise.all([
          subscriptionsApi.getPlan(storedPlanId),
          marketplaceApi.getPaymentMethods().catch(() => [])
        ]);
        
        setPlan(planData);
        const activeMethods = (methodsData || []).filter((m: any) => m.is_active !== false);
        setPaymentMethods(activeMethods);
        
        if (activeMethods.length > 0 && activeMethods[0]?.id) {
          setSelectedMethodId(activeMethods[0].id);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load package details. Please try again or return to package selection.");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [router]);

  const isFreePlan = Boolean(
    plan && (plan.is_default_free || plan.is_free || Number(plan.price) === 0)
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        setError("Screenshot must be less than 5MB");
        return;
      }
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleActivateFree = async () => {
    if (!plan) return;
    setActivatingFree(true);
    setError(null);

    try {
      const courseIds = selectedCourses.map((c) => c.id).filter(Boolean);
      const payload = courseIds.length > 0 ? { course_ids: courseIds } : undefined;
      await subscriptionsApi.activateFreePlan(plan.id, payload);
      
      // Clear localStorage onboarding cache
      localStorage.removeItem("onboarding_selected_plan_id");
      localStorage.removeItem("onboarding_selected_courses");
      
      setFreeSuccess(true);
    } catch (err: any) {
      console.error(err);
      const msg = err.detail || err.error || err.message || "Failed to activate Free plan. Please try again.";
      setError(msg);
    } finally {
      setActivatingFree(false);
    }
  };

  const handleSubmitPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;

    if (isFreePlan) {
      // Safety guard: route to free activation
      return handleActivateFree();
    }

    if (!selectedMethodId) {
      setError("Please select a payment method.");
      return;
    }
    if (!transactionId.trim()) {
      setError("Please enter the transaction reference ID.");
      return;
    }
    if (!screenshot) {
      setError("Please upload your payment receipt or screenshot.");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("plan", plan.id.toString());
      formData.append("payment_method", selectedMethodId.toString());
      formData.append("amount", plan.price);
      formData.append("transaction_id", transactionId.trim());
      formData.append("screenshot", screenshot);
      if (note.trim()) formData.append("note", note.trim());
      
      // Append selected course IDs
      selectedCourses.forEach((course) => {
        if (course.id) {
          formData.append("course_ids", course.id.toString());
        }
      });
      
      const res = await subscriptionsApi.submitPayment(formData);
      
      // Clear localStorage
      localStorage.removeItem("onboarding_selected_plan_id");
      localStorage.removeItem("onboarding_selected_courses");
      
      // Navigate to live payment verification screen
      router.push(`/student/payment/verification/${res.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.detail || err.error || err.message || "Payment submission failed. Please check your network and try again.");
      setSubmitting(false);
    }
  };

  const selectedMethod = paymentMethods.find((m) => m.id === selectedMethodId);

  // Success screen for Free Plan Activation
  if (freeSuccess) {
    return (
      <div className="min-h-screen relative flex font-sans overflow-hidden bg-[#0A1118] text-white">
        <div className="absolute inset-0 z-0 bg-cover bg-[25%_top] lg:bg-[center_top] bg-no-repeat" style={{ backgroundImage: `url(${bgImage.src})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/80 to-black/95 mix-blend-multiply" />
        
        <div className="container relative z-10 w-full mx-auto px-6 flex flex-col min-h-screen items-center justify-center">
          <div className="w-full max-w-lg bg-black/60 backdrop-blur-[24px] border border-emerald-500/30 rounded-[28px] p-8 md:p-10 text-center shadow-[0_20px_60px_rgba(16,185,129,0.15)] space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                Free Plan Activated
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">Welcome to LoksewaAI!</h2>
              <p className="text-sm text-white/70 max-w-sm mx-auto">
                Your Free Preparation Plan has been activated instantly. No payment details were required.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left text-xs space-y-2.5">
              <div className="flex items-center gap-2 text-white/90 font-semibold">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Full access to included study notes and syllabus modules</span>
              </div>
              <div className="flex items-center gap-2 text-white/90 font-semibold">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{(plan?.free_mock_attempts ?? 0) > 0 ? `${plan?.free_mock_attempts} Free Mock Exam Attempts` : "Curated Free Mock Tests"}</span>
              </div>
              <div className="flex items-center gap-2 text-white/90 font-semibold">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{(plan?.ai_credits ?? 500).toLocaleString()} AI Tutor Question Credits</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button asChild className="flex-1 h-12 bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-95 text-[#0A1118] font-bold rounded-xl shadow-md">
                <Link href="/student">Go to Student Dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 h-12 border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl">
                <Link href="/student/exams">Start Free Mock Exam</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex font-sans overflow-hidden bg-[#0A1118] text-white">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-[25%_top] lg:bg-[center_top] bg-no-repeat" style={{ backgroundImage: `url(${bgImage.src})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/95 lg:bg-gradient-to-r lg:from-black/50 lg:via-black/20 lg:to-black/80 mix-blend-multiply" />
      </div>

      <div className="container relative z-10 w-full mx-auto px-4 md:px-8 py-8 flex flex-col min-h-screen">
        <div className="flex justify-between items-center w-full mb-6">
          <button 
            onClick={() => router.back()} 
            className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-semibold text-sm">Back</span>
          </button>
        </div>

        <div className="w-full flex justify-center flex-1 py-2 pb-12">
          <div className="w-full max-w-5xl bg-black/50 backdrop-blur-[24px] border border-white/10 rounded-[26px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col">
            
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#D4A72C]/20 text-[#D4A72C] border-[#D4A72C]/30 text-[11px] font-bold uppercase">
                    {isFreePlan ? "Free Plan Activation" : "Verified Payment Checkout"}
                  </Badge>
                  <span className="text-xs text-white/50">Step 3 of 3</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
                  {isFreePlan ? "Confirm Your Free Plan" : "Review & Complete Payment"}
                </h2>
                <p className="text-xs md:text-sm text-white/60 font-medium mt-1">
                  {isFreePlan 
                    ? "Activate instant access to mock exams, notes, and AI assistance at zero cost."
                    : "Complete manual bank/eSewa transfer and upload proof for administrator review."}
                </p>
              </div>
              <div className="hidden sm:flex gap-1.5">
                <div className="h-2 w-8 bg-[#D4A72C] rounded-full"></div>
                <div className="h-2 w-8 bg-[#D4A72C] rounded-full"></div>
                <div className="h-2 w-8 bg-[#D4A72C] rounded-full"></div>
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center py-24">
                <Loader2 className="w-9 h-9 text-[#D4A72C] animate-spin" />
              </div>
            ) : !plan ? (
              <div className="p-12 text-center space-y-4">
                <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                <h3 className="text-lg font-bold text-white">Package Selection Not Found</h3>
                <p className="text-xs text-white/60">Please choose a preparation package from the plans catalog.</p>
                <Button asChild className="rounded-xl">
                  <Link href="/student/plans">Browse Packages</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row flex-1">
                {/* Left Column: Order Summary */}
                <div className="w-full md:w-5/12 bg-white/[0.03] p-6 md:p-8 border-b md:border-b-0 md:border-r border-white/10 space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-4">Package Summary</h3>
                    
                    <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-bold text-[#D4A72C] uppercase tracking-wider block">
                            {plan.package_type} PACKAGE
                          </span>
                          <h4 className="text-xl font-bold text-white mt-0.5">{plan.name}</h4>
                        </div>
                        <Badge className={`${isFreePlan ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-[#D4A72C]/20 text-[#D4A72C] border-[#D4A72C]/30"} text-[10px] font-extrabold uppercase`}>
                          {isFreePlan ? "FREE TIER" : "PREMIUM"}
                        </Badge>
                      </div>

                      <p className="text-xs text-white/70 line-clamp-2">
                        {plan.description || "Loksewa comprehensive preparation syllabus and exams."}
                      </p>

                      <div className="pt-3 border-t border-white/10 flex items-baseline justify-between">
                        <span className="text-xs text-white/60">Total Payable</span>
                        <div className="text-right">
                          <span className={`text-2xl font-black ${isFreePlan ? "text-emerald-400" : "text-[#D4A72C]"}`}>
                            {isFreePlan ? "Rs. 0.00" : `Rs. ${plan.price}`}
                          </span>
                          {isFreePlan && <span className="block text-[10px] font-bold text-emerald-400 uppercase">100% Free</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Included Preparations */}
                  {selectedCourses.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider">
                        Selected Preparations ({selectedCourses.length})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {selectedCourses.map((course) => (
                          <div key={course.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                            <div className="w-8 h-8 rounded-lg bg-[#D4A72C]/10 border border-[#D4A72C]/20 flex items-center justify-center shrink-0 text-[#D4A72C]">
                              <GraduationCap className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-white truncate block">{course.title}</span>
                              {course.exam_name && (
                                <span className="text-[11px] text-white/50 truncate block">{course.exam_name}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trust indicator */}
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 text-xs text-white/60">
                    <ShieldCheck className="w-4 h-4 text-[#D4A72C] shrink-0 mt-0.5" />
                    <span>
                      {isFreePlan 
                        ? "Instant server-side activation. Upgrade to premium packages anytime."
                        : "Payments are securely verified against our official banking accounts."}
                    </span>
                  </div>
                </div>

                {/* Right Column: Dynamic Form */}
                <div className="w-full md:w-7/12 p-6 md:p-8 flex flex-col justify-between">
                  {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-red-200">{error}</div>
                    </div>
                  )}

                  {isFreePlan ? (
                    /* FREE PLAN ACTIVATION VIEW (NO QR CODE, NO TRANSACTION ID, NO SCREENSHOT) */
                    <div className="space-y-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                              Instant Activation
                            </span>
                            <h3 className="text-lg font-bold text-white">No Payment or Verification Required</h3>
                          </div>
                        </div>

                        <p className="text-xs text-white/70 leading-relaxed">
                          This is a free tier provided to support your Loksewa exam preparation. You will immediately receive access to standard practice question sets, public study materials, and AI Tutor trial queries.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-3 pt-2">
                          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">Mock Exam Quota</span>
                            <span className="text-sm font-bold text-white">
                              {(plan.free_mock_attempts ?? 0) > 0 ? `${plan.free_mock_attempts} Free Attempts` : "Curated Free Tests"}
                            </span>
                            <span className="text-[11px] text-white/50 block">Real pattern practice tests</span>
                          </div>

                          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">AI Tutor</span>
                            <span className="text-sm font-bold text-purple-300">
                              {(plan.ai_credits ?? 500).toLocaleString()} Credits
                            </span>
                            <span className="text-[11px] text-white/50 block">Instant doubt clarification</span>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold text-white block">Activation Fee</span>
                            <span className="text-[11px] text-white/50">Zero charge • No credit card required</span>
                          </div>
                          <span className="text-lg font-black text-emerald-400">FREE</span>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-white/10 space-y-3">
                        <Button
                          type="button"
                          onClick={handleActivateFree}
                          disabled={activatingFree}
                          className="w-full h-12 text-sm font-bold bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-95 text-[#0A1118] rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {activatingFree ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Activating Free Plan...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>Activate Free Plan Now</span>
                            </>
                          )}
                        </Button>
                        <p className="text-[11px] text-center text-white/50">
                          By activating, you immediately gain access to Loksewa preparation tools.
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* PAID PLAN PAYMENT FLOW (REQUIRES QR, TRANSACTION ID, PROOF) */
                    <form onSubmit={handleSubmitPaid} className="space-y-6 flex-1 flex flex-col">
                      <div>
                        <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2.5">
                          1. Select Payment Method
                        </h4>
                        <div className="grid grid-cols-2 gap-2.5">
                          {paymentMethods.map((method) => {
                            const isSelected = selectedMethodId === method.id;
                            return (
                              <button
                                key={method.id}
                                type="button"
                                onClick={() => setSelectedMethodId(method.id)}
                                className={`p-3 rounded-xl border text-left transition-all ${
                                  isSelected
                                    ? "border-[#D4A72C] bg-[#D4A72C]/10 text-white shadow-sm"
                                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                                }`}
                              >
                                <span className="font-bold text-xs block">{method.display_name}</span>
                                <span className="text-[10px] text-white/50">{method.method_type}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Payment Instructions & QR */}
                      {selectedMethod && (
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
                          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                            {selectedMethod.qr_image ? (
                              <RetryImage
                                src={buildMediaUrl(selectedMethod.qr_image)}
                                alt={`${selectedMethod.display_name} QR`}
                                className="w-28 h-28 rounded-xl bg-white object-contain p-2 shrink-0 shadow-sm"
                              />
                            ) : (
                              <div className="w-28 h-28 rounded-xl bg-white/10 border border-white/20 flex flex-col items-center justify-center shrink-0 text-white/40">
                                <QrCode className="w-8 h-8 mb-1" />
                                <span className="text-[10px]">Bank Transfer</span>
                              </div>
                            )}

                            <div className="flex-1 min-w-0 space-y-1 text-xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4A72C]">
                                Scan & Transfer Exactly Rs. {plan.price}
                              </span>
                              {selectedMethod.account_name && (
                                <div className="text-white">
                                  <span className="text-white/40">A/C Name:</span>{" "}
                                  <strong className="font-mono">{selectedMethod.account_name}</strong>
                                </div>
                              )}
                              {selectedMethod.account_number && (
                                <div className="text-white">
                                  <span className="text-white/40">A/C Number:</span>{" "}
                                  <strong className="font-mono text-[#D4A72C]">{selectedMethod.account_number}</strong>
                                </div>
                              )}
                              {selectedMethod.bank_name && (
                                <div className="text-white">
                                  <span className="text-white/40">Bank:</span> {selectedMethod.bank_name}
                                </div>
                              )}
                              {selectedMethod.instructions && (
                                <p className="text-[11px] text-white/70 bg-black/20 p-2 rounded-lg border border-white/5 mt-2">
                                  {selectedMethod.instructions}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Proof Inputs */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs text-white/70 font-semibold mb-1">
                            Transaction Reference ID *
                          </label>
                          <Input
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            placeholder="e.g. 9841234567 or Bank Ref 12345678"
                            className="bg-black/30 border-white/10 text-white focus:border-[#D4A72C] h-10 text-xs font-mono"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-white/70 font-semibold mb-1">
                            Payment Screenshot / Receipt *
                          </label>
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                              screenshot
                                ? "border-emerald-500/50 bg-emerald-500/5"
                                : "border-white/20 hover:border-[#D4A72C]/50 bg-black/20"
                            }`}
                          >
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleFileChange}
                              accept="image/jpeg,image/png,image/webp,application/pdf"
                              className="hidden"
                            />
                            {screenshotPreview ? (
                              <div className="flex items-center justify-center gap-3">
                                <img src={screenshotPreview} alt="Receipt preview" className="h-12 w-12 object-cover rounded-lg border border-white/20" />
                                <div className="text-left">
                                  <span className="text-xs text-emerald-400 font-bold block flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Proof Attached
                                  </span>
                                  <span className="text-[11px] text-white/50 truncate max-w-[200px] block">
                                    {screenshot?.name}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2.5 text-xs text-white/60">
                                <UploadCloud className="w-5 h-5 text-[#D4A72C]" />
                                <span>Click to upload receipt (JPG, PNG, PDF up to 5MB)</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-white/70 font-semibold mb-1">
                            Additional Note (Optional)
                          </label>
                          <Textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Optional remark or registered mobile number..."
                            className="bg-black/30 border-white/10 text-white focus:border-[#D4A72C] text-xs min-h-[60px]"
                          />
                        </div>
                      </div>

                      <div className="pt-4 mt-auto border-t border-white/10 space-y-2">
                        <Button
                          type="submit"
                          disabled={submitting}
                          className="w-full h-12 bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-95 text-[#0A1118] font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Submitting Payment Proof...</span>
                            </>
                          ) : (
                            <>
                              <span>Submit Payment for Verification</span>
                            </>
                          )}
                        </Button>
                        <p className="text-[11px] text-center text-white/50">
                          Submitting proof queues your receipt for manual & automated admin verification.
                        </p>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
