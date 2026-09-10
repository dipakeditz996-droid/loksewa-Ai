"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import {
  BookOpen,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  UserCircle2,
  Gift,
  Check,
  X,
  GraduationCap,
  Clock,
  CheckCircle2,
  KeyRound,
  MapPin,
  ShieldQuestion,
  LifeBuoy,
  ChevronDown,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { apiClient } from "@/lib/api/client";
import { examPreferencesApi, ExamPreferenceCategory, ExamPreferenceNode } from "@/lib/api/exam-preferences";
import { ALL_NEPAL_DISTRICTS } from "@/lib/constants/nepal-districts";
import { DistrictSelector } from "@/components/DistrictSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import bgImage from "@/media/signup.png";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";

const STEPS = ["Basic Info", "Address", "Preparation", "Review"];

function isValidNepalPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, "").replace(/^\+?977/, "");
  return /^9[678]\d{8}$/.test(cleaned);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${"*".repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}@${domain}`;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 1: Basic Information
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralStatus, setReferralStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");

  // Step 2: Permanent Address
  const [district, setDistrict] = useState("");
  const [localLevel, setLocalLevel] = useState("");

  // Step 3: Exam Preference (Hierarchical)
  const [examTree, setExamTree] = useState<ExamPreferenceCategory[]>([]);
  const [examTreeLoading, setExamTreeLoading] = useState(true);
  const [examCategoryId, setExamCategoryId] = useState<number | null>(null);
  const [examPath, setExamPath] = useState<ExamPreferenceNode[]>([]);
  const [courseId, setCourseId] = useState<string>("");

  // Step 4 & OTP State
  const [registrationStage, setRegistrationStage] = useState<"form" | "otp">("form");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // OTP inputs
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendActive, setResendActive] = useState(false);

  // Recovery Code Fallback
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryVerified, setRecoveryVerified] = useState(false);

  // Google Auth
  const [googleError, setGoogleError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setReferralCode(ref);
      validateReferral(ref);
    }
    const course = searchParams.get("course");
    if (course) {
      setCourseId(course);
    }
  }, [searchParams]);

  useEffect(() => {
    examPreferencesApi
      .getTree()
      .then((tree) => {
        setExamTree(tree);
        // Default to PSC Exams if available
        const psc = tree.find((c) => c.name.toLowerCase().includes("psc"));
        if (psc) {
          setExamCategoryId(psc.id);
        } else if (tree.length > 0 && tree[0]) {
          setExamCategoryId(tree[0].id);
        }
      })
      .catch(() => setExamTree([]))
      .finally(() => setExamTreeLoading(false));
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (registrationStage !== "otp") return;
    if (resendCooldown <= 0) {
      setResendActive(true);
      return;
    }
    setResendActive(false);
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [registrationStage, resendCooldown]);

  const selectedExamCategory = examTree.find((c) => c.id === examCategoryId) || null;

  const examOptionsAtDepth = (depth: number): ExamPreferenceNode[] => {
    if (!selectedExamCategory) return [];
    if (depth === 0) return selectedExamCategory.exams;
    const parent = examPath[depth - 1];
    return parent ? parent.children : [];
  };

  const selectExamNode = (depth: number, node: ExamPreferenceNode) => {
    setExamPath((prev) => [...prev.slice(0, depth), node]);
  };

  const selectedExamPosition = examPath.length > 0 ? examPath[examPath.length - 1] : null;

  const validateReferral = async (code: string) => {
    if (!code.trim()) {
      setReferralStatus("idle");
      return;
    }
    setReferralStatus("validating");
    try {
      const res = await apiClient<{ valid: boolean }>(
        `/gamification/referrals/validate/?code=${encodeURIComponent(code)}`
      );
      setReferralStatus(res.valid ? "valid" : "invalid");
    } catch {
      setReferralStatus("invalid");
    }
  };

  const handleNext = () => {
    setError("");
    if (currentStep === 0) {
      if (!fullName.trim()) {
        setError("Full name is required.");
        return;
      }
      if (!email.trim() || !isValidEmail(email)) {
        setError("Please provide a valid email address.");
        return;
      }
      if (!mobile.trim() || !isValidNepalPhone(mobile)) {
        setError("Please provide a valid 10-digit Nepali mobile number (98/97/96XXXXXXXX).");
        return;
      }
      if (!password) {
        setError("Please enter a password.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (referralCode && referralStatus === "invalid") {
        setError("Please provide a valid referral code or remove it.");
        return;
      }
    }

    if (currentStep === 1) {
      if (!district.trim()) {
        setError("Please select your permanent district.");
        return;
      }
      if (!localLevel.trim()) {
        setError("Please provide your local level / municipality.");
        return;
      }
    }

    if (currentStep === 2) {
      if (!examCategoryId) {
        setError("Please select what you are preparing for.");
        return;
      }
      if (examOptionsAtDepth(0).length > 0 && !examPath[0]) {
        setError("Please select a level.");
        return;
      }
      if (examOptionsAtDepth(1).length > 0 && !examPath[1]) {
        setError("Please select a service / faculty.");
        return;
      }
    }

    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleRegister = async () => {
    setError("");
    setIsLoading(true);
    try {
      const payload: Record<string, string> = {
        name: fullName.trim(),
        username: username.trim() || email.split("@")[0] || "student",
        email: email.trim(),
        mobile: mobile.trim(),
        password,
        permanent_district: district.trim(),
        permanent_local_level: localLevel.trim(),
        exam_category_id: String(examCategoryId),
        ref: referralCode.trim(),
      };
      if (selectedExamPosition) {
        payload.exam_position_id = String(selectedExamPosition.id);
      }
      if (courseId) {
        payload.course_id = courseId;
      }

      await authApi.studentSignup(payload);
      setRegistrationStage("otp");
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || err.error || err.detail || "Failed to create account. Please check your details.");
      // Return to first step if account validation failed
      if (err.missing_fields?.includes("email") || err.missing_fields?.includes("mobile")) {
        setCurrentStep(0);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Digits Handling
  const handleOtpDigitChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, "");
    const newDigits = [...otpDigits];

    if (cleaned.length > 1) {
      // Paste full OTP
      const pasted = cleaned.slice(0, 6).split("");
      pasted.forEach((ch, idx) => {
        if (idx < 6) newDigits[idx] = ch;
      });
      setOtpDigits(newDigits);
      const nextIdx = Math.min(pasted.length, 5);
      otpInputsRef.current[nextIdx]?.focus();
      return;
    }

    newDigits[index] = cleaned;
    setOtpDigits(newDigits);

    if (cleaned && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    const enteredOtp = otpDigits.join("");
    if (enteredOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }
    setOtpLoading(true);
    try {
      await authApi.verifyEmailOtp(email, enteredOtp);
      // Success: redirect to onboarding preparation or student dashboard
      if (courseId) {
        router.push(`/student/courses/${courseId}`);
      } else {
        router.push("/student/onboarding/preparation");
      }
    } catch (emailErr: any) {
      // If regular OTP failed, attempt verification as recovery code before erroring
      try {
        await authApi.verifyRecoveryCode(email, enteredOtp);
        setRecoveryVerified(true);
      } catch {
        setError(emailErr.message || emailErr.error || "Verification failed. The code may be incorrect or expired.");
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setOtpLoading(true);
    try {
      await authApi.requestSignupOtp(email);
      setResendCooldown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      otpInputsRef.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || err.error || "Could not resend code. Please wait before trying again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyRecovery = async () => {
    setError("");
    if (!recoveryCode.trim()) {
      setError("Please enter the recovery code provided by an administrator.");
      return;
    }
    setRecoveryLoading(true);
    try {
      await authApi.verifyRecoveryCode(email, recoveryCode.trim());
      setRecoveryVerified(true);
    } catch (err: any) {
      setError(err.message || err.error || "Invalid or expired recovery code. Please check with an administrator.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleGoogleSuccess = async (token: string) => {
    setGoogleLoading(true);
    setGoogleError("");
    try {
      const result = await authApi.socialLogin("google", token);
      if (result.user?.role === "teacher") {
        router.push("/teacher");
        return;
      }
      if (result.user?.role === "admin" || result.user?.role === "super-admin") {
        router.push("/admin-dashboard");
        return;
      }
      if (result.is_new_user || !result.profile_complete) {
        router.push("/student/onboarding");
        return;
      }
      router.push("/student");
    } catch (err: any) {
      setGoogleError(err.message || err.detail || "Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  const signUpWithGoogle = useGoogleLogin({
    onSuccess: (tokenResponse) => handleGoogleSuccess(tokenResponse.access_token),
    onError: () => setGoogleError("Google sign-up failed. Please use email."),
  });

  const getPasswordStrength = () => {
    if (password.length === 0) return { score: 0, label: "", color: "bg-white/10", textColor: "text-white/50" };
    if (password.length < 6) return { score: 1, label: "Weak", color: "bg-red-500", textColor: "text-red-500" };
    if (password.length < 8) return { score: 2, label: "Fair", color: "bg-yellow-500", textColor: "text-yellow-500" };
    if (password.match(/[A-Z]/) && password.match(/[0-9]/) && password.match(/[^A-Za-z0-9]/))
      return { score: 4, label: "Strong", color: "bg-[#22c55e]", textColor: "text-[#22c55e]" };
    return { score: 3, label: "Good", color: "bg-[#D4A72C]", textColor: "text-[#D4A72C]" };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen relative flex font-sans overflow-hidden bg-[#0A1118] text-white">
      {/* Background Graphic */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[25%_top] lg:bg-[center_top] bg-no-repeat"
          style={{ backgroundImage: `url(${bgImage.src})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black/95 lg:bg-gradient-to-r lg:from-black/60 lg:via-black/30 lg:to-black/85 mix-blend-multiply" />
        <div className="hidden lg:block absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#0A1118]/95 via-[#0A1118]/60 to-transparent" />
      </div>

      <div className="container relative z-10 w-full mx-auto px-4 md:px-12 py-6 flex flex-col min-h-screen">
        {/* Header Logo */}
        <div className="flex justify-start w-full mb-auto lg:mb-0">
          <Link href="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity w-fit mt-2">
            <div className="bg-transparent border border-white/80 p-1.5 rounded-[8px] flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <span className="font-[800] text-[22px] tracking-tight text-white drop-shadow-md leading-none flex items-center">
                Loksewa<span className="text-[#D4A72C]">AI</span>
              </span>
              <span className="text-[9px] text-white/70 block mt-0.5 font-medium tracking-wide">
                Your Journey. Our Guidance. Your Success.
              </span>
            </div>
          </Link>
        </div>

        {/* Main Card Container */}
        <div className="w-full flex justify-center lg:justify-end flex-1 items-center py-8">
          <div className="w-full lg:w-[520px] bg-black/40 backdrop-blur-[24px] border border-white/15 rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative transition-all duration-300">
            {registrationStage === "form" && (
              <>
                {/* Progressive Step Indicator */}
                <div className="px-6 pt-6 pb-4 border-b border-white/10 bg-white/[0.02]">
                  <div className="flex items-center justify-between">
                    {STEPS.map((step, i) => (
                      <React.Fragment key={step}>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${
                              i < currentStep
                                ? "bg-[#D4A72C] text-black shadow-[0_0_12px_rgba(212,167,44,0.4)]"
                                : i === currentStep
                                ? "bg-[#D4A72C]/20 border-2 border-[#D4A72C] text-[#D4A72C]"
                                : "bg-white/5 border border-white/20 text-white/40"
                            }`}
                          >
                            {i < currentStep ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                          </div>
                          <span
                            className={`text-[11px] font-semibold hidden sm:inline tracking-wide ${
                              i === currentStep ? "text-white" : "text-white/40"
                            }`}
                          >
                            {step}
                          </span>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div
                            className={`flex-1 h-[1px] mx-2 transition-colors duration-300 ${
                              i < currentStep ? "bg-[#D4A72C]/60" : "bg-white/10"
                            }`}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  {error && (
                    <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-[12px] text-red-400 text-[13px] font-medium mb-5 flex items-start gap-2">
                      <X className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* STEP 1: Basic Information */}
                  {currentStep === 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3.5 mb-5">
                        <div className="w-11 h-11 rounded-full border border-white/20 bg-white/5 flex items-center justify-center shrink-0">
                          <UserCircle2 className="h-6 w-6 text-[#D4A72C]" strokeWidth={1.5} />
                        </div>
                        <div>
                          <h2 className="text-[22px] font-bold text-white tracking-tight leading-tight">
                            Basic <span className="text-[#D4A72C]">Information</span>
                          </h2>
                          <p className="text-[12px] text-white/60 font-medium">Step 1 of 4: Enter your account details</p>
                        </div>
                      </div>

                      {googleError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[10px] text-red-400 text-[12px]">
                          {googleError}
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={googleLoading}
                        onClick={() => signUpWithGoogle()}
                        className="h-[46px] w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/20 rounded-[10px] transition-colors disabled:opacity-50 text-[13px] font-semibold text-white"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                          <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                          </g>
                        </svg>
                        {googleLoading ? "Signing in..." : "Continue with Google"}
                      </button>

                      <div className="flex items-center gap-3 py-1">
                        <div className="flex-1 h-[1px] bg-white/10" />
                        <span className="text-[10px] text-white/50 lowercase tracking-wider font-medium">or fill details manually</span>
                        <div className="flex-1 h-[1px] bg-white/10" />
                      </div>

                      {/* Full Name */}
                      <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors">
                          <User className="h-4 w-4" strokeWidth={1.5} />
                        </div>
                        <Input
                          id="fullName"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Full Name *"
                          className="h-[46px] w-full pl-10 bg-transparent border-white/20 text-[13px] text-white focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] placeholder:text-white/40"
                          required
                        />
                      </div>

                      {/* Email */}
                      <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors">
                          <Mail className="h-4 w-4" strokeWidth={1.5} />
                        </div>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                          placeholder="Email Address *"
                          className="h-[46px] w-full pl-10 bg-transparent border-white/20 text-[13px] text-white focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] placeholder:text-white/40"
                          required
                        />
                      </div>

                      {/* Phone Number */}
                      <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors">
                          <Phone className="h-4 w-4" strokeWidth={1.5} />
                        </div>
                        <Input
                          id="mobile"
                          type="tel"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          placeholder="Mobile Number (98XXXXXXXX) *"
                          className="h-[46px] w-full pl-10 bg-transparent border-white/20 text-[13px] text-white focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] placeholder:text-white/40"
                          required
                        />
                      </div>

                      {/* Password */}
                      <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors">
                          <Lock className="h-4 w-4" strokeWidth={1.5} />
                        </div>
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password (minimum 8 chars) *"
                          className="h-[46px] w-full pl-10 pr-10 bg-transparent border-white/20 text-[13px] text-white focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] placeholder:text-white/40"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      {/* Confirm Password */}
                      <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors">
                          <Lock className="h-4 w-4" strokeWidth={1.5} />
                        </div>
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm Password *"
                          className="h-[46px] w-full pl-10 pr-10 bg-transparent border-white/20 text-[13px] text-white focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] placeholder:text-white/40"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      {/* Password Strength Meter */}
                      {password && (
                        <div className="pt-1">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] text-white/60">Strength</span>
                            <span className={`text-[10px] font-bold ${strength.textColor}`}>{strength.label}</span>
                          </div>
                          <div className="flex gap-1 h-1">
                            {[1, 2, 3, 4].map((lvl) => (
                              <div
                                key={lvl}
                                className={`flex-1 rounded-full transition-colors duration-300 ${
                                  lvl <= strength.score ? strength.color : "bg-white/10"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Referral Code (Optional) */}
                      <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors">
                          <Gift className="h-4 w-4" strokeWidth={1.5} />
                        </div>
                        <Input
                          id="referralCode"
                          type="text"
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                          onBlur={() => validateReferral(referralCode)}
                          placeholder="Referral Code (Optional)"
                          className={`h-[46px] w-full pl-10 pr-10 bg-transparent text-[13px] text-white rounded-[10px] placeholder:text-white/40 ${
                            referralStatus === "invalid"
                              ? "border-red-500 focus:border-red-500"
                              : referralStatus === "valid"
                              ? "border-[#22c55e] focus:border-[#22c55e]"
                              : "border-white/20 focus:border-[#D4A72C]"
                          }`}
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                          {referralStatus === "valid" && <Check className="h-4 w-4 text-[#22c55e]" strokeWidth={2} />}
                          {referralStatus === "invalid" && <X className="h-4 w-4 text-red-500" strokeWidth={2} />}
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={handleNext}
                        className="w-full h-[46px] bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-95 text-white font-bold rounded-[10px] shadow-[0_4px_20px_rgba(212,167,44,0.25)] flex items-center justify-center gap-2 mt-4"
                      >
                        Continue to Address <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* STEP 2: Permanent Address */}
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3.5 mb-5">
                        <div className="w-11 h-11 rounded-full border border-white/20 bg-white/5 flex items-center justify-center shrink-0">
                          <MapPin className="h-6 w-6 text-[#D4A72C]" strokeWidth={1.5} />
                        </div>
                        <div>
                          <h2 className="text-[22px] font-bold text-white tracking-tight leading-tight">
                            Permanent <span className="text-[#D4A72C]">Address</span>
                          </h2>
                          <p className="text-[12px] text-white/60 font-medium">Step 2 of 4: Structured location info</p>
                        </div>
                      </div>

                      {/* District Dropdown */}
                      <div>
                        <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-1.5">
                          Permanent District *
                        </label>
                        <DistrictSelector
                          id="districtSelect"
                          value={district}
                          onChange={(d) => setDistrict(d)}
                        />
                        <p className="text-[10px] text-white/40 mt-1">
                          Only official districts of Nepal are accepted to avoid invalid records.
                        </p>
                      </div>

                      {/* Local Level / Municipality */}
                      <div className="pt-2">
                        <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-1.5">
                          Local Level / Municipality / Ward *
                        </label>
                        <div className="relative group">
                          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors">
                            <MapPin className="h-4 w-4" strokeWidth={1.5} />
                          </div>
                          <Input
                            id="localLevelInput"
                            type="text"
                            value={localLevel}
                            onChange={(e) => setLocalLevel(e.target.value)}
                            placeholder="e.g. Kathmandu Metropolitan City - 10"
                            className="h-[46px] w-full pl-10 bg-transparent border-white/20 text-[13px] text-white focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] placeholder:text-white/40"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCurrentStep((s) => s - 1)}
                          className="flex-1 h-[46px] border-white/20 bg-transparent text-white hover:bg-white/5 rounded-[10px]"
                        >
                          <ArrowLeft className="h-4 w-4 mr-2" /> Back
                        </Button>
                        <Button
                          type="button"
                          onClick={handleNext}
                          className="flex-1 h-[46px] bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-95 text-white font-bold rounded-[10px] shadow-[0_4px_20px_rgba(212,167,44,0.25)]"
                        >
                          Continue <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Preparation Selection */}
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3.5 mb-5">
                        <div className="w-11 h-11 rounded-full border border-white/20 bg-white/5 flex items-center justify-center shrink-0">
                          <GraduationCap className="h-6 w-6 text-[#D4A72C]" strokeWidth={1.5} />
                        </div>
                        <div>
                          <h2 className="text-[22px] font-bold text-white tracking-tight leading-tight">
                            What are you <span className="text-[#D4A72C]">preparing for?</span>
                          </h2>
                          <p className="text-[12px] text-white/60 font-medium">Step 3 of 4: Select your exam category & path</p>
                        </div>
                      </div>

                      {/* Exam Category */}
                      <div>
                        <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-2">
                          Exam Category
                        </label>
                        {examTreeLoading ? (
                          <div className="grid grid-cols-2 gap-2">
                            {[1, 2, 3, 4].map((i) => (
                              <div key={i} className="h-[42px] rounded-[10px] bg-white/5 animate-pulse" />
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {examTree.map((cat) => {
                              const isSelected = examCategoryId === cat.id;
                              return (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => {
                                    setExamCategoryId(cat.id);
                                    setExamPath([]);
                                  }}
                                  className={`h-[42px] px-3.5 rounded-[10px] border text-[12px] font-semibold text-left transition-all ${
                                    isSelected
                                      ? "border-[#D4A72C] bg-[#D4A72C]/15 text-[#D4A72C] shadow-[0_0_12px_rgba(212,167,44,0.15)]"
                                      : "border-white/15 bg-white/[0.03] text-white/70 hover:border-white/30"
                                  }`}
                                >
                                  {cat.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Level Selection (Depth 0) */}
                      {examOptionsAtDepth(0).length > 0 && (
                        <div className="pt-2">
                          <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-2">
                            {selectedExamCategory?.name === "PSC Exams" ? "PSC Level" : "Level"}
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {examOptionsAtDepth(0).map((lvl) => {
                              const isSelected = examPath[0]?.id === lvl.id;
                              return (
                                <button
                                  key={lvl.id}
                                  type="button"
                                  onClick={() => selectExamNode(0, lvl)}
                                  className={`py-2.5 px-3 rounded-[10px] border text-[12px] font-semibold text-center transition-all ${
                                    isSelected
                                      ? "border-[#D4A72C] bg-[#D4A72C]/15 text-[#D4A72C]"
                                      : "border-white/15 bg-white/[0.03] text-white/70 hover:border-white/30"
                                  }`}
                                >
                                  {lvl.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Service / Faculty (Depth 1) */}
                      {examOptionsAtDepth(1).length > 0 && (
                        <div className="pt-2">
                          <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-2">
                            Service / Faculty
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {examOptionsAtDepth(1).map((svc) => {
                              const isSelected = examPath[1]?.id === svc.id;
                              return (
                                <button
                                  key={svc.id}
                                  type="button"
                                  onClick={() => selectExamNode(1, svc)}
                                  className={`py-2.5 px-3 rounded-[10px] border text-[12px] font-semibold text-left transition-all ${
                                    isSelected
                                      ? "border-[#D4A72C] bg-[#D4A72C]/15 text-[#D4A72C]"
                                      : "border-white/15 bg-white/[0.03] text-white/70 hover:border-white/30"
                                  }`}
                                >
                                  {svc.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Fixed Canonical Path Preview */}
                      <div className="rounded-[12px] border border-[#D4A72C]/30 bg-[#D4A72C]/5 p-4 mt-3">
                        <div className="flex items-center gap-2 text-[#D4A72C] text-[11px] font-bold uppercase tracking-wider mb-1">
                          <Sparkles className="h-3.5 w-3.5" />
                          Canonical Preparation Path
                        </div>
                        <p className="text-[13px] font-semibold text-white">
                          {[selectedExamCategory?.name, ...examPath.map((n) => n.name)].filter(Boolean).join(" → ")}
                        </p>
                        <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
                          Your registration preference aligns your study materials. You will select your access package on the next step.
                        </p>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCurrentStep((s) => s - 1)}
                          className="flex-1 h-[46px] border-white/20 bg-transparent text-white hover:bg-white/5 rounded-[10px]"
                        >
                          <ArrowLeft className="h-4 w-4 mr-2" /> Back
                        </Button>
                        <Button
                          type="button"
                          onClick={handleNext}
                          className="flex-1 h-[46px] bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-95 text-white font-bold rounded-[10px] shadow-[0_4px_20px_rgba(212,167,44,0.25)]"
                        >
                          Review <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Review & Create Account */}
                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3.5 mb-4">
                        <div className="w-11 h-11 rounded-full border border-white/20 bg-white/5 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-6 w-6 text-[#22c55e]" strokeWidth={1.5} />
                        </div>
                        <div>
                          <h2 className="text-[22px] font-bold text-white tracking-tight leading-tight">
                            Review & <span className="text-[#D4A72C]">Register</span>
                          </h2>
                          <p className="text-[12px] text-white/60 font-medium">Step 4 of 4: Verify details before account creation</p>
                        </div>
                      </div>

                      <div className="rounded-[12px] border border-white/10 bg-white/[0.03] p-4 space-y-3">
                        <div className="flex justify-between items-center text-[12px] border-b border-white/5 pb-2">
                          <span className="text-white/50">Full Name</span>
                          <span className="text-white font-medium">{fullName}</span>
                        </div>
                        <div className="flex justify-between items-center text-[12px] border-b border-white/5 pb-2">
                          <span className="text-white/50">Email Address</span>
                          <span className="text-white font-medium">{email}</span>
                        </div>
                        <div className="flex justify-between items-center text-[12px] border-b border-white/5 pb-2">
                          <span className="text-white/50">Mobile Number</span>
                          <span className="text-white font-medium">{mobile}</span>
                        </div>
                        <div className="flex justify-between items-center text-[12px] border-b border-white/5 pb-2">
                          <span className="text-white/50">Permanent Address</span>
                          <span className="text-white font-medium">{localLevel}, {district}</span>
                        </div>
                        <div className="flex justify-between items-start text-[12px]">
                          <span className="text-white/50">Preparation</span>
                          <span className="text-[#D4A72C] font-semibold text-right max-w-[240px]">
                            {[selectedExamCategory?.name, ...examPath.map((n) => n.name)].filter(Boolean).join(" → ")}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-[10px] border border-blue-500/20 bg-blue-500/5 p-3 text-[11px] text-blue-300 leading-relaxed">
                        Submitting will register your profile as <span className="font-semibold text-white">Pending Verification</span> and send a 6-digit confirmation code via Resend.
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCurrentStep((s) => s - 1)}
                          className="flex-1 h-[46px] border-white/20 bg-transparent text-white hover:bg-white/5 rounded-[10px]"
                        >
                          <ArrowLeft className="h-4 w-4 mr-2" /> Back
                        </Button>
                        <Button
                          type="button"
                          onClick={handleRegister}
                          disabled={isLoading}
                          className="flex-1 h-[46px] bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-95 text-white font-bold rounded-[10px] shadow-[0_4px_20px_rgba(212,167,44,0.25)] flex items-center justify-center gap-2"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              Create Account
                              <CheckCircle2 className="h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="text-center mt-3 text-[11px] text-white/50">
                        By continuing, you agree to our{" "}
                        <Link href="/terms" className="text-[#D4A72C] hover:underline">
                          Terms
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="text-[#D4A72C] hover:underline">
                          Privacy Policy
                        </Link>
                        .
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* STAGE: OTP / EMAIL VERIFICATION */}
            {registrationStage === "otp" && (
              <div className="p-6 sm:p-8">
                {error && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-[12px] text-red-400 text-[13px] font-medium mb-5 flex items-start gap-2">
                    <X className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                {recoveryVerified ? (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 rounded-full bg-[#22c55e]/15 flex items-center justify-center mx-auto mb-4 border border-[#22c55e]/30">
                      <CheckCircle2 className="h-7 w-7 text-[#22c55e]" />
                    </div>
                    <h2 className="text-[20px] font-bold text-white mb-2">Account Verified!</h2>
                    <p className="text-[13px] text-white/60 mb-6 max-w-sm mx-auto leading-relaxed">
                      Your account was verified using an administrative recovery code. Please log in with your credentials to start learning.
                    </p>
                    <Link href="/login">
                      <Button className="w-full h-[46px] bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-95 text-white text-[14px] font-bold rounded-[10px]">
                        Go to Login
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3.5 mb-5">
                      <div className="w-11 h-11 rounded-full border border-white/20 bg-white/5 flex items-center justify-center shrink-0">
                        <KeyRound className="h-6 w-6 text-[#D4A72C]" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h2 className="text-[22px] font-bold text-white tracking-tight leading-tight">
                          Verify <span className="text-[#D4A72C]">your email</span>
                        </h2>
                        <p className="text-[12px] text-white/60 font-medium">
                          Enter code sent to <span className="text-white font-semibold">{maskEmail(email)}</span>
                        </p>
                      </div>
                    </div>

                    {!showRecovery ? (
                      <div className="space-y-5">
                        <p className="text-[13px] text-white/70 leading-relaxed">
                          Please enter the 6-digit verification code sent to your email inbox (or spam folder).
                        </p>

                        {/* 6-Digit OTP Box Grid */}
                        <div className="flex justify-between gap-2 sm:gap-3 my-4">
                          {otpDigits.map((digit, idx) => (
                            <input
                              key={idx}
                              ref={(el) => {
                                otpInputsRef.current[idx] = el;
                              }}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                              onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                              className="w-12 h-13 sm:w-14 sm:h-14 text-center text-[20px] font-bold bg-[#121B24] border border-white/20 rounded-[10px] text-white focus:border-[#D4A72C] focus:ring-2 focus:ring-[#D4A72C]/30 outline-none transition-all"
                            />
                          ))}
                        </div>

                        <Button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={otpLoading || otpDigits.join("").length !== 6}
                          className="w-full h-[46px] bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-95 text-white font-bold rounded-[10px] shadow-[0_4px_20px_rgba(212,167,44,0.25)] flex items-center justify-center gap-2"
                        >
                          {otpLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              Verify Email & Continue
                              <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </Button>

                        <div className="flex items-center justify-between text-[12px] pt-1">
                          <span className="text-white/50">Didn't receive the email?</span>
                          <button
                            type="button"
                            disabled={!resendActive || otpLoading}
                            onClick={handleResendOtp}
                            className={`font-semibold transition-colors ${
                              resendActive
                                ? "text-[#D4A72C] hover:text-[#e0b745] cursor-pointer"
                                : "text-white/40 cursor-not-allowed"
                            }`}
                          >
                            {resendActive ? "Resend Code" : `Resend in ${resendCooldown}s`}
                          </button>
                        </div>

                        {/* Admin Recovery Code Fallback */}
                        <div className="rounded-[12px] border border-white/10 bg-white/[0.03] p-3.5 flex items-start gap-3 mt-4">
                          <LifeBuoy className="h-4 w-4 text-[#D4A72C] shrink-0 mt-0.5" />
                          <div className="text-[11px] text-white/60 leading-relaxed">
                            Email issue or spam filter problem? Your administrator can issue a recovery code.{" "}
                            <button
                              type="button"
                              onClick={() => setShowRecovery(true)}
                              className="text-[#D4A72C] font-semibold hover:underline"
                            >
                              Enter Admin Recovery Code
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-[10px] border border-amber-500/20 bg-amber-500/5 p-3 text-[12px] text-amber-300 flex items-start gap-2.5 leading-relaxed">
                          <ShieldQuestion className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                          <span>
                            Enter the single-use recovery code generated by an authorized platform administrator.
                          </span>
                        </div>

                        <div className="relative group">
                          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors">
                            <KeyRound className="h-4 w-4" strokeWidth={1.5} />
                          </div>
                          <Input
                            id="adminRecoveryCode"
                            type="text"
                            value={recoveryCode}
                            onChange={(e) => setRecoveryCode(e.target.value.trim())}
                            placeholder="6-digit recovery code"
                            className="h-[46px] w-full pl-10 bg-transparent border-white/20 text-[14px] text-white font-mono tracking-widest focus:border-[#D4A72C] rounded-[10px]"
                            required
                          />
                        </div>

                        <Button
                          type="button"
                          onClick={handleVerifyRecovery}
                          disabled={recoveryLoading || !recoveryCode.trim()}
                          className="w-full h-[46px] bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-95 text-white font-bold rounded-[10px] flex items-center justify-center gap-2"
                        >
                          {recoveryLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              Verify Recovery Code
                              <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </Button>

                        <button
                          type="button"
                          onClick={() => setShowRecovery(false)}
                          className="text-[12px] text-white/60 hover:text-white transition-colors block text-center w-full pt-1"
                        >
                          &larr; Return to email OTP
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Footer Navigation */}
            <div className="text-center py-4 border-t border-white/5 bg-white/[0.01] text-[12px] text-white/60">
              Already have an account?{" "}
              <Link href="/login" className="text-[#D4A72C] font-bold hover:text-[#e0b745] transition-colors">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "PLACEHOLDER";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <Suspense fallback={<div className="min-h-screen bg-[#0A1118]" />}>
        <RegisterForm />
      </Suspense>
    </GoogleOAuthProvider>
  );
}
