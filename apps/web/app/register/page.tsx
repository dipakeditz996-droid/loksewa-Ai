"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { BookOpen, User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, UserCircle2, Gift, Check, X } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import bgImage from "../../media/signup.png";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setReferralCode(ref);
      validateReferral(ref);
    }
  }, [searchParams]);

  const validateReferral = async (code: string) => {
    if (!code.trim()) {
      setReferralStatus("idle");
      return;
    }
    setReferralStatus("validating");
    try {
      const res = await apiClient<{valid: boolean; message?: string}>(`/gamification/referrals/validate/?code=${encodeURIComponent(code)}`);
      if (res.valid) {
        setReferralStatus("valid");
      } else {
        setReferralStatus("invalid");
      }
    } catch (err) {
      setReferralStatus("invalid");
    }
  };

  const handleReferralBlur = () => {
    validateReferral(referralCode);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (referralCode && referralStatus === "invalid") {
      setError("Please provide a valid referral code or remove it.");
      return;
    }

    setIsLoading(true);
    try {
      await authApi.studentSignup({
        username,
        email,
        password,
        name: fullName,
        mobile,
        ref: referralCode
      });
      router.push("/student");
    } catch (err: any) {
      setError(err.detail || err.error || "Failed to create account. Please try again.");
      setIsLoading(false);
    }
  };

  // Simple password strength calculation
  const getPasswordStrength = () => {
    if (password.length === 0) return { score: 0, label: "", color: "bg-white/10", textColor: "text-white/50" };
    if (password.length < 6) return { score: 1, label: "Weak", color: "bg-red-500", textColor: "text-red-500" };
    if (password.length < 10) return { score: 2, label: "Medium", color: "bg-yellow-500", textColor: "text-yellow-500" };
    if (password.match(/[A-Z]/) && password.match(/[0-9]/) && password.match(/[^A-Za-z0-9]/)) {
      return { score: 4, label: "Strong", color: "bg-[#22c55e]", textColor: "text-[#22c55e]" };
    }
    return { score: 3, label: "Good", color: "bg-[#22c55e]", textColor: "text-[#22c55e]" };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen relative flex font-sans overflow-hidden bg-[#0A1118] text-white">
      {/* Background Image & Cinematic Overlay */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-[center_top] bg-no-repeat"
          style={{ backgroundImage: `url(${bgImage.src})` }}
        ></div>
        {/* Lighter cinematic gradient to let the image shine through */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-black/80 mix-blend-multiply"></div>
        {/* Subtle dark fade on the right specifically for the form */}
        <div className="absolute inset-y-0 right-0 w-full lg:w-1/2 bg-gradient-to-l from-[#0A1118]/90 via-[#0A1118]/40 to-transparent"></div>
      </div>

      <div className="container relative z-10 w-full mx-auto px-6 md:px-12 py-8 flex flex-col min-h-screen">
        
        {/* Top Left Brand */}
        <div className="flex justify-start w-full mb-auto lg:mb-0">
          <Link href="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity w-fit mt-4">
            <div className="bg-transparent border border-white/80 p-1.5 rounded-[8px] flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <span className="font-[800] text-[22px] tracking-tight text-white drop-shadow-md leading-none flex items-center">
                Loksewa<span className="text-[#D4A72C]">AI</span>
              </span>
              <span className="text-[9px] text-white/70 block mt-0.5 font-medium tracking-wide">Your Journey. Our Guidance. Your Success.</span>
            </div>
          </Link>
        </div>

        {/* Form Container positioned on the right */}
        <div className="w-full flex justify-center lg:justify-end flex-1 items-center py-10">
          <div className="w-full lg:w-[480px] bg-black/20 backdrop-blur-[24px] border border-white/10 rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)] relative">
            
            <div className="p-8 sm:p-10">
              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full border border-white/20 bg-white/5 flex items-center justify-center shrink-0">
                  <UserCircle2 className="h-6 w-6 text-white/80" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-[26px] font-bold text-white tracking-tight leading-tight">
                    Create <span className="text-[#D4A72C]">Your Account</span>
                  </h2>
                  <p className="text-[12px] text-white/60 font-medium">Start your Loksewa success journey today.</p>
                </div>
              </div>

              {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[10px] text-red-400 text-[13px] font-medium mb-4">{error}</div>}
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors">
                      <User className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <Input 
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)} 
                      placeholder="Full Name" 
                      className="h-[48px] w-full pl-11 bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40"
                      required 
                    />
                  </div>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors">
                      <User className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <Input 
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)} 
                      placeholder="Username" 
                      className="h-[48px] w-full pl-11 bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40"
                      required 
                    />
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors">
                    <Mail className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <Input 
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="Email Address" 
                    className="h-[48px] w-full pl-11 bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40"
                    required 
                  />
                </div>

                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors">
                    <Phone className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <Input 
                    id="mobile"
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)} 
                    placeholder="Mobile Number" 
                    className="h-[48px] w-full pl-11 bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40"
                    required 
                  />
                </div>

                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors">
                    <Lock className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-[48px] w-full pl-11 pr-12 bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40"
                    required 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                  </button>
                </div>

                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors">
                    <Lock className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <Input 
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="Confirm Password"
                    className="h-[48px] w-full pl-11 pr-12 bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40"
                    required 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                <div className="pt-1 pb-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-white/60">Password Strength</span>
                    {strength.label && (
                      <span className={`text-[10px] font-bold ${strength.textColor}`}>{strength.label}</span>
                    )}
                  </div>
                  <div className="flex gap-1 h-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div 
                        key={level} 
                        className={`flex-1 rounded-full ${
                          level <= strength.score ? strength.color : "bg-white/10"
                        } transition-colors duration-300`}
                      ></div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors">
                      <Gift className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <Input 
                      id="referralCode" 
                      type="text" 
                      placeholder="Referral Code (Optional)" 
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      onBlur={handleReferralBlur}
                      className={`h-[48px] w-full pl-11 pr-11 bg-transparent text-[13px] text-white focus:bg-white/5 focus:ring-1 rounded-[10px] transition-all placeholder:text-white/40 ${referralStatus === "invalid" ? "border-red-500 focus:border-red-500 focus:ring-red-500" : referralStatus === "valid" ? "border-[#22c55e] focus:border-[#22c55e] focus:ring-[#22c55e]" : "border-white/20 focus:border-[#D4A72C] focus:ring-[#D4A72C]"}`}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {referralStatus === "valid" && <Check className="h-4 w-4 text-[#22c55e]" strokeWidth={2} />}
                      {referralStatus === "invalid" && <X className="h-4 w-4 text-red-500" strokeWidth={2} />}
                    </div>
                  </div>
                  {referralStatus === "invalid" && (
                    <p className="text-red-500 text-[11px] mt-1 ml-1">? Invalid referral code</p>
                  )}
                  {referralStatus === "valid" && (
                    <p className="text-[#22c55e] text-[11px] mt-1 ml-1">? Valid referral code</p>
                  )}
                </div>

                <div className="flex items-center space-x-3 pt-1 pb-2">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      id="terms" 
                      className="w-4 h-4 rounded-[4px] border border-white/30 bg-transparent appearance-none checked:bg-[#D4A72C] checked:border-[#D4A72C] transition-colors cursor-pointer"
                      required
                    />
                    <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 checked-icon transition-opacity" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <style jsx>{`
                      input:checked + svg {
                        opacity: 1;
                      }
                    `}</style>
                  </div>
                  <label htmlFor="terms" className="text-[11px] text-white/70 leading-tight">
                    I agree to the <Link href="/terms" className="text-[#D4A72C] hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-[#D4A72C] hover:underline">Privacy Policy</Link>
                  </label>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-[48px] bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-90 text-white text-[15px] font-bold rounded-[10px] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(212,167,44,0.25)] border-none"
                >
                  {isLoading ? "Creating Account..." : (
                    <>
                      Create Account <ArrowRight className="h-[18px] w-[18px] ml-1 opacity-90" strokeWidth={2} />
                    </>
                  )}
                </Button>
              </form>

              <div className="flex items-center gap-4 my-5">
                <div className="flex-1 h-[1px] bg-white/10"></div>
                <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">OR</span>
                <div className="flex-1 h-[1px] bg-white/10"></div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button type="button" className="h-[44px] flex items-center justify-center bg-transparent hover:bg-white/5 border border-white/10 rounded-[10px] transition-colors">
                  {/* Google SVG */}
                  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                    </g>
                  </svg>
                </button>
                <button type="button" className="h-[44px] flex items-center justify-center bg-transparent hover:bg-white/5 border border-white/10 rounded-[10px] transition-colors">
                  {/* Facebook SVG */}
                  <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z" fill="#1877F2"/>
                    <path d="M15.89 14.96L16.34 12.06H13.56V10.18C13.56 9.39 13.95 8.62 15.19 8.62H16.45V6.15C16.45 6.15 15.31 5.96 14.22 5.96C11.93 5.96 10.44 7.34 10.44 9.85V12.06H7.9V14.96H10.44V21.96C10.96 22.03 11.48 22.06 12 22.06C12.52 22.06 13.04 22.03 13.56 21.96V14.96H15.89Z" fill="white"/>
                  </svg>
                </button>
                <button type="button" className="h-[44px] flex items-center justify-center bg-transparent hover:bg-white/5 border border-white/10 rounded-[10px] transition-colors">
                  {/* Apple SVG */}
                  <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.6 9.80005C16.5 7.60005 18.4 6.40005 18.5 6.30005C17.5 4.80005 15.9 4.60005 15.4 4.50005C14.1 4.40005 12.8 5.30005 12.1 5.30005C11.4 5.30005 10.3 4.50005 9.20001 4.50005C7.80001 4.50005 6.50001 5.30005 5.80001 6.50005C4.30001 9.10005 5.40001 12.9 6.80001 15C7.50001 16 8.30001 17.1 9.40001 17.1C10.5 17.1 10.9 16.4 12.2 16.4C13.5 16.4 13.9 17.1 15 17.1C16.2 17.1 16.9 16.1 17.6 15.1C18.4 13.9 18.7 12.7 18.7 12.7C18.7 12.6 16.7 11.9 16.6 9.80005Z" fill="white"/>
                    <path d="M14.6 3.00003C15.2 2.30003 15.6 1.30003 15.5 0.300034C14.6 0.300034 13.6 0.800034 13 1.50003C12.5 2.10003 12 3.10003 12.2 4.10003C13.2 4.20003 14.1 3.70003 14.6 3.00003Z" fill="white"/>
                  </svg>
                </button>
              </div>

              <div className="text-center mt-6 text-[12px] text-white/70">
                Already have an account?{" "}
                <Link href="/login" className="text-[#D4A72C] font-bold hover:text-[#e0b745] transition-colors">
                  Sign in
                </Link>
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
    <Suspense fallback={<div className="min-h-screen bg-[#0A1118]"></div>}>
      <RegisterForm />
    </Suspense>
  );
}
