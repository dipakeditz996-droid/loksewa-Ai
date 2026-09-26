"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Upload,
  AlertCircle,
  Loader2,
  GraduationCap,
  ShieldCheck,
  QrCode,
  FileText,
  X,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api/client";
import { subscriptionsApi, SubscriptionPlan } from "@/lib/api/subscriptions";
import { RetryImage } from "@/components/ui/retry-image";
import Link from "next/link";
import { PageSkeleton, ButtonSpinner } from "@/components/ui/loading-states";

export default function PlanCheckoutPage({ params }: { params: Promise<{ planId: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const unwrappedParams = use(params);

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [methods, setMethods] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Preparation selection for MULTI / SINGLE packages
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);

  // Payment form inputs
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, [unwrappedParams.planId]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [planRes, methodsRes, studentPrefRes] = await Promise.all([
        subscriptionsApi.getPlan(unwrappedParams.planId),
        apiClient<any[]>("/marketplace/student/payment-methods/").catch(() => []),
        subscriptionsApi.listAvailablePlans().catch(() => null),
      ]);

      setPlan(planRes);

      // Pre-select course based on student preference or plan configuration
      if (planRes.package_type === "SINGLE") {
        if (planRes.course) {
          setSelectedCourseIds([planRes.course]);
        } else if (planRes.eligible_courses && planRes.eligible_courses.length > 0 && typeof planRes.eligible_courses[0] === "number") {
          setSelectedCourseIds([planRes.eligible_courses[0]]);
        } else if (studentPrefRes?.preparation?.course_id && planRes.eligible_courses?.includes(studentPrefRes.preparation.course_id)) {
          setSelectedCourseIds([studentPrefRes.preparation.course_id]);
        }
      } else if (planRes.package_type === "BUNDLE") {
        if (planRes.eligible_courses) {
          setSelectedCourseIds([...planRes.eligible_courses]);
        }
      } else if (planRes.package_type === "MULTI") {
        // If student had a target course and it's eligible, pre-check it
        if (studentPrefRes?.preparation?.course_id && planRes.eligible_courses?.includes(studentPrefRes.preparation.course_id)) {
          setSelectedCourseIds([studentPrefRes.preparation.course_id]);
        }
      }

      const activeMethods = (methodsRes || []).filter((m: any) => m.is_active);
      setMethods(activeMethods);
      if (activeMethods.length > 0) {
        setSelectedMethod(activeMethods[0]);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load plan details. Please check your internet connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCourse = (courseId: number) => {
    if (!plan || plan.package_type !== "MULTI") return;

    const maxAllowed = plan.allowed_preparation_count || 1;
    if (selectedCourseIds.includes(courseId)) {
      setSelectedCourseIds(selectedCourseIds.filter((id) => id !== courseId));
    } else {
      if (selectedCourseIds.length >= maxAllowed) {
        // Replace or notify
        return;
      }
      setSelectedCourseIds([...selectedCourseIds, courseId]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError("Payment screenshot must be less than 5MB.");
        return;
      }
      setError(null);
      setScreenshot(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshot(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !selectedMethod) return;

    if (!transactionId.trim()) {
      setError("Please enter the transaction reference ID.");
      return;
    }

    if (!screenshot) {
      setError("Please upload a screenshot of your payment receipt.");
      return;
    }

    if (plan.package_type === "MULTI") {
      if (selectedCourseIds.length === 0) {
        setError("Please select at least 1 preparation for this package.");
        return;
      }
      if (selectedCourseIds.length > plan.allowed_preparation_count) {
        setError(`This package allows a maximum of ${plan.allowed_preparation_count} preparations.`);
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("plan", String(plan.id));
    formData.append("payment_method", String(selectedMethod.id));
    formData.append("amount", plan.price);
    formData.append("transaction_id", transactionId.trim());
    formData.append("screenshot", screenshot);
    if (note.trim()) formData.append("note", note.trim());

    // Append course_ids
    selectedCourseIds.forEach((cid) => {
      formData.append("course_ids", String(cid));
    });

    try {
      const res = await subscriptionsApi.submitPayment(formData);
      setSubmitSuccess({
        paymentId: res.id,
        planName: plan.name,
        amount: plan.price,
        transactionId: transactionId.trim(),
        selectedCoursesCount: selectedCourseIds.length,
      });
      // The dashboard's package block (latestPayment/status) and enrollment
      // status both just changed server-side - targeted invalidation so the
      // student sees "pending verification" immediately on their next visit
      // instead of stale "no package" data for up to the cache's staleTime.
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["my-enrollment"] });
    } catch (err: any) {
      console.error(err);
      setError(err.detail || err.error || err.message || "Failed to submit payment. Please verify your details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <PageSkeleton layout="detail" className="max-w-6xl mx-auto py-8" />;
  }

  if (!plan) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
        <h3 className="text-xl font-bold text-foreground">Package Not Found</h3>
        <p className="text-sm text-muted-foreground">The requested package could not be retrieved.</p>
        <Button asChild className="rounded-xl">
          <Link href="/student/plans">Back to Packages</Link>
        </Button>
      </div>
    );
  }

  // If Payment Submitted Successfully
  if (submitSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8 py-12">
        <div className="bg-card border border-emerald-500/30 rounded-[24px] p-8 md:p-10 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
              Payment Under Review
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">
              Payment Submitted Successfully!
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your payment proof has been submitted to admin for verification. Your package and learning access will unlock as soon as verified.
            </p>
          </div>

          {/* Receipt Summary Box */}
          <div className="bg-muted/50 border border-border/80 rounded-[16px] p-5 text-left text-xs space-y-3">
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Package:</span>
              <span className="font-bold text-foreground">{submitSuccess.planName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-bold text-[#D4A72C] text-sm">NPR {submitSuccess.amount}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Transaction ID:</span>
              <span className="font-mono font-semibold text-foreground">{submitSuccess.transactionId}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-bold text-amber-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> PENDING VERIFICATION
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button asChild variant="outline" className="flex-1 rounded-xl h-11">
              <Link href="/student/purchases">View My Payments</Link>
            </Button>
            <Button asChild className="flex-1 bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] font-bold rounded-xl h-11">
              <Link href="/student">Go to Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const eligibleDetails = plan.eligible_courses_details || [];
  const maxPreparations = plan.allowed_preparation_count || 1;

  return (
    <div className="min-h-screen bg-muted/20 pb-24">
      {/* Top Banner */}
      <div className="bg-[#0F1822] text-white pt-10 pb-20 px-4 border-b border-white/10">
        <div className="max-w-5xl mx-auto space-y-3">
          <Button
            variant="ghost"
            onClick={() => router.push("/student/plans")}
            className="mb-2 -ml-3 text-white/70 hover:text-white hover:bg-white/10 text-xs"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Packages
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[#D4A72C]/20 text-[#D4A72C] border-[#D4A72C]/30 text-[11px] font-bold uppercase">
              {plan.package_type} PACKAGE
            </Badge>
            <span className="text-xs text-white/60">
              Valid for {plan.duration} {plan.duration_unit}
            </span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
            Checkout: {plan.name}
          </h1>
          <p className="text-white/70 text-sm max-w-2xl">
            Select your preparations, scan the official QR code to complete payment, and upload your receipt screenshot.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-4 lg:p-8 max-w-5xl mx-auto -mt-12">
        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left Column: Preparations & Payment Details */}
            <div className="lg:col-span-8 space-y-6">
              {/* STEP 1: PREPARATION SELECTION */}
              <div className="bg-card p-6 md:p-7 rounded-[22px] border border-border/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-[#D4A72C] text-[#0A1118] w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold">
                      1
                    </span>
                    <h2 className="text-lg font-bold text-foreground">
                      Preparation Selection
                    </h2>
                  </div>
                  {plan.package_type === "MULTI" && (
                    <span className="text-xs font-semibold text-[#D4A72C] bg-[#D4A72C]/10 px-2.5 py-1 rounded-full">
                      {selectedCourseIds.length} / {maxPreparations} Selected
                    </span>
                  )}
                </div>

                {/* MULTI Choice */}
                {plan.package_type === "MULTI" && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      This package allows you to choose up to{" "}
                      <strong className="text-foreground">{maxPreparations}</strong> preparations from the eligible options below:
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3 pt-1">
                      {eligibleDetails.map((course) => {
                        const isSelected = selectedCourseIds.includes(course.id);
                        const isDisabled = !isSelected && selectedCourseIds.length >= maxPreparations;

                        return (
                          <div
                            key={course.id}
                            onClick={() => !isDisabled && handleToggleCourse(course.id)}
                            className={`p-3.5 rounded-[14px] border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? "border-[#D4A72C] bg-[#D4A72C]/10 shadow-sm"
                                : isDisabled
                                ? "opacity-50 border-border bg-muted/40 cursor-not-allowed"
                                : "border-border hover:border-foreground/20 bg-card hover:bg-muted/40"
                            }`}
                          >
                            <div className="space-y-0.5 pr-2">
                              <span className="text-xs font-bold text-foreground block">
                                {course.title}
                              </span>
                              {course.exam && (
                                <span className="text-[11px] text-muted-foreground">
                                  {course.exam}
                                </span>
                              )}
                            </div>
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "bg-[#D4A72C] border-[#D4A72C] text-[#0A1118]"
                                  : "border-border bg-background"
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SINGLE Package */}
                {plan.package_type === "SINGLE" && (
                  <div className="p-4 rounded-xl bg-muted/50 border border-border flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#D4A72C]/15 text-[#D4A72C] flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#D4A72C] uppercase tracking-wider">
                        Included Preparation
                      </span>
                      <h4 className="text-sm font-bold text-foreground">
                        {plan.course_details?.title || eligibleDetails[0]?.title || plan.name}
                      </h4>
                      {plan.course_details?.exam && (
                        <p className="text-xs text-muted-foreground">{plan.course_details.exam}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* BUNDLE Package */}
                {plan.package_type === "BUNDLE" && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      All preparations included in this bundle:
                    </span>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {eligibleDetails.map((course) => (
                        <div
                          key={course.id}
                          className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="font-semibold text-foreground">{course.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: PAYMENT METHOD & REAL QR */}
              <div className="bg-card p-6 md:p-7 rounded-[22px] border border-border/80 shadow-sm space-y-5">
                <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                  <span className="bg-[#D4A72C] text-[#0A1118] w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold">
                    2
                  </span>
                  <h2 className="text-lg font-bold text-foreground">
                    Select Payment Method & Scan QR
                  </h2>
                </div>

                {/* Payment Methods Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {methods.map((method) => {
                    const isSelected = selectedMethod?.id === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedMethod(method)}
                        className={`p-3.5 rounded-[14px] border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "border-[#D4A72C] bg-[#D4A72C]/10 ring-2 ring-[#D4A72C]/20 shadow-sm"
                            : "border-border hover:border-foreground/30 bg-muted/40"
                        }`}
                      >
                        <span className="font-bold text-xs text-foreground">
                          {method.display_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase mt-1">
                          {method.method_type}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Method Details & QR Display */}
                {selectedMethod && (
                  <div className="bg-muted/60 rounded-[18px] border border-border p-5 space-y-4">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      {/* Real QR Code Image */}
                      <div className="w-48 h-48 bg-white p-2 rounded-[14px] border border-border shadow-md flex items-center justify-center shrink-0">
                        {selectedMethod.qr_image ? (
                          <RetryImage
                            src={selectedMethod.qr_image}
                            alt={`${selectedMethod.display_name} QR`}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <div className="text-center p-4 text-xs text-slate-400">
                            <QrCode className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                            No QR Image Configured
                          </div>
                        )}
                      </div>

                      {/* Account Information */}
                      <div className="space-y-2.5 text-xs flex-1 w-full">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">
                            Account Name
                          </span>
                          <p className="text-sm font-bold text-foreground">
                            {selectedMethod.account_name || "LoksewaAI"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">
                            Account / Mobile Number
                          </span>
                          <p className="text-sm font-mono font-bold text-[#D4A72C]">
                            {selectedMethod.account_number}
                          </p>
                        </div>
                        {selectedMethod.bank_name && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">
                              Bank & Branch
                            </span>
                            <p className="text-xs font-semibold text-foreground">
                              {selectedMethod.bank_name} {selectedMethod.branch && `(${selectedMethod.branch})`}
                            </p>
                          </div>
                        )}
                        {selectedMethod.instructions && (
                          <div className="pt-1 text-[11px] text-muted-foreground">
                            {selectedMethod.instructions}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 3: TRANSACTION ID & SCREENSHOT UPLOAD */}
              <div className="bg-card p-6 md:p-7 rounded-[22px] border border-border/80 shadow-sm space-y-5">
                <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                  <span className="bg-[#D4A72C] text-[#0A1118] w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold">
                    3
                  </span>
                  <h2 className="text-lg font-bold text-foreground">
                    Payment Verification Details
                  </h2>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Transaction ID Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                    Transaction / Reference ID *
                  </label>
                  <Input
                    type="text"
                    required
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. 7A8B9C0123 or Bank Ref #"
                    className="h-11 rounded-xl text-xs font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Enter the unique transaction code shown on your eSewa, Khalti, or Bank receipt.
                  </p>
                </div>

                {/* Screenshot Upload */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                    Payment Receipt Screenshot *
                  </label>

                  {previewUrl ? (
                    <div className="relative border border-border rounded-xl p-3 bg-muted/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={previewUrl}
                          alt="Receipt Preview"
                          className="w-16 h-16 object-cover rounded-lg border border-border"
                        />
                        <div>
                          <p className="text-xs font-semibold text-foreground truncate max-w-[200px]">
                            {screenshot?.name}
                          </p>
                          <span className="text-[11px] text-muted-foreground">
                            {((screenshot?.size || 0) / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveScreenshot}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg text-xs"
                      >
                        <X className="w-4 h-4 mr-1" /> Remove
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border hover:border-[#D4A72C]/50 rounded-[16px] p-6 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs font-bold text-foreground">
                        Click to upload payment screenshot
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        PNG, JPG, or JPEG (Max 5MB)
                      </p>
                    </div>
                  )}
                </div>

                {/* Optional Note */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                    Additional Note (Optional)
                  </label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Any notes for the verification team..."
                    className="min-h-[70px] rounded-xl text-xs resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary & Submit Action */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-card p-6 rounded-[22px] border border-border/80 shadow-md space-y-5 sticky top-24">
                <h3 className="text-base font-bold text-foreground border-b border-border/60 pb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#D4A72C]" /> Order Summary
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Package</span>
                    <span className="font-bold text-foreground text-right">{plan.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-semibold text-foreground">
                      {plan.duration} {plan.duration_unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Package Type</span>
                    <span className="font-semibold text-[#D4A72C]">{plan.package_type}</span>
                  </div>

                  {/* Selected Preparations */}
                  <div className="pt-2 border-t border-border/60">
                    <span className="text-muted-foreground block mb-1.5 font-medium">
                      Selected Preparation(s):
                    </span>
                    {selectedCourseIds.length === 0 ? (
                      <span className="text-amber-500 text-[11px] font-semibold">
                        No preparation selected yet
                      </span>
                    ) : (
                      <div className="space-y-1">
                        {selectedCourseIds.map((cid) => {
                          const c = eligibleDetails.find((item) => item.id === cid);
                          return (
                            <div key={cid} className="flex items-center gap-1.5 font-bold text-foreground text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#D4A72C] shrink-0" />
                              <span className="truncate">{c ? c.title : `Course #${cid}`}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Price Breakdown */}
                  <div className="pt-3 border-t border-border/60 space-y-2">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Package Price</span>
                      <span>Rs. {plan.price}</span>
                    </div>
                    {plan.original_price && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Original Value</span>
                        <span className="line-through">Rs. {plan.original_price}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline pt-2 border-t border-border text-base font-black text-foreground">
                      <span>Total Amount</span>
                      <span className="text-xl text-[#D4A72C]">Rs. {plan.price}</span>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  className="w-full h-12 text-sm font-bold bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-95 text-[#0A1118] rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <ButtonSpinner text="Submitting Payment for Verification..." />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" /> Submit Payment for Verification
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
                  Your package will be verified and approved by the admin team.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
