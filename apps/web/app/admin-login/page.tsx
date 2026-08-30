"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Eye, EyeOff, Mail, Lock, Shield, ArrowRight, CheckCircle } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"credentials" | "twofa">("credentials");
  const [pendingToken, setPendingToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  // If already authenticated as admin, redirect immediately
  useEffect(() => {
    if (!loading && user && ["admin", "super-admin"].includes(user.role)) {
      router.replace("/admin-dashboard");
    }
  }, [user, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await authApi.adminLogin({ username: email, password });
      if (result.twoFactorRequired && result.pendingToken) {
        setPendingToken(result.pendingToken);
        setStep("twofa");
        setIsLoading(false);
        return;
      }
      await refreshUser();
      router.push("/admin-dashboard");
    } catch (err: any) {
      const detail = err?.data?.detail || err?.message || "";
      if (detail.includes("credentials")) {
        setError("Invalid credentials. Please check your email and password.");
      } else if (detail.includes("deactivated")) {
        setError("This account has been deactivated. Contact support.");
      } else if (detail.includes("administrators")) {
        setError("This login is restricted to administrators only.");
      } else if (detail.includes("Too many failed attempts")) {
        setError(detail);
      } else {
        setError(detail || "An unexpected error occurred. Please try again.");
      }
      setIsLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await authApi.completeTwoFactorLogin(pendingToken, twoFactorCode);
      await refreshUser();
      router.push("/admin-dashboard");
    } catch (err: any) {
      const detail = err?.data?.error || err?.message || "";
      setError(detail || "Invalid or expired code. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* ===== Premium Background ===== */}
      <div
        className="absolute inset-0 z-0 bg-[#0B2545] bg-cover bg-no-repeat bg-[75%_center] lg:bg-center"
        style={{ backgroundImage: 'url(/images/admin_bg.png)' }}
      >
        {/* Dark overlay to ensure form readability */}
        <div className="absolute inset-0 bg-[#0B2545]/40 backdrop-blur-[2px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B2545]/80 via-transparent to-[#0B2545]/40"></div>
      </div>

      {/* ===== Center Content ===== */}
      <div className="relative z-10 w-full max-w-[440px] px-6 py-12 flex flex-col items-center">
        
        {/* Logo & Header outside the card */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl shadow-2xl border border-white/20 mb-4">
            <Shield className="h-8 w-8 text-[#D4A72C]" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-[800] text-white tracking-tight mb-2">
            Loksewa<span className="text-[#D4A72C]">AI</span>
          </h1>
          <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20">
            <span className="text-[11px] font-bold text-white/90 uppercase tracking-[0.15em]">Admin Portal</span>
          </div>
        </div>

        {/* Login Card (Glassmorphism) */}
        <div className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-[24px] shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
          
          <div className="p-8">
            <h2 className="text-xl font-bold text-white mb-2 text-center">
              {step === "twofa" ? "Two-Factor Verification" : "Secure Access"}
            </h2>
            <p className="text-[14px] text-white/70 font-medium mb-8 text-center">
              {step === "twofa"
                ? "Enter the 6-digit code from your authenticator app"
                : "Sign in with your administrative credentials"}
            </p>

            {/* Error */}
            {error && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-500/20 border border-red-500/30 text-white text-[13px] font-medium flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="h-5 w-5 rounded-full bg-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <span>{error}</span>
              </div>
            )}

            {step === "twofa" ? (
              <form onSubmit={handleTwoFactorSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="twofa-code" className="text-[12px] font-bold text-white/80 uppercase tracking-wider">
                    Authentication Code
                  </label>
                  <div className="relative group">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-white/50 group-focus-within:text-white transition-colors" />
                    <input
                      id="twofa-code"
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      placeholder="123456 or backup code"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      required
                      className="w-full h-[52px] pl-12 pr-4 bg-black/20 border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/50 focus:border-[#D4A72C]/50 focus:bg-black/40 transition-all backdrop-blur-sm tracking-widest"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[52px] bg-[#D4A72C] hover:bg-[#b58e23] disabled:opacity-70 text-[#0B2545] text-[15px] font-[800] rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#D4A72C]/20 mt-4"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 border-2 border-[#0B2545]/30 border-t-[#0B2545] rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    <>
                      Verify
                      <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.5} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("credentials");
                    setTwoFactorCode("");
                    setError("");
                  }}
                  className="w-full text-center text-[13px] text-white/60 font-medium hover:text-white transition-colors"
                >
                  ← Back to sign in
                </button>
              </form>
            ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="admin-email" className="text-[12px] font-bold text-white/80 uppercase tracking-wider">
                  Email / Username
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-white/50 group-focus-within:text-white transition-colors" />
                  <input
                    id="admin-email"
                    type="text"
                    placeholder="admin@loksewa.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-[52px] pl-12 pr-4 bg-black/20 border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/50 focus:border-[#D4A72C]/50 focus:bg-black/40 transition-all backdrop-blur-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="admin-password" className="text-[12px] font-bold text-white/80 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-white/50 group-focus-within:text-white transition-colors" />
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-[52px] pl-12 pr-12 bg-black/20 border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/50 focus:border-[#D4A72C]/50 focus:bg-black/40 transition-all backdrop-blur-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[52px] bg-[#D4A72C] hover:bg-[#b58e23] disabled:opacity-70 text-[#0B2545] text-[15px] font-[800] rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#D4A72C]/20 mt-4"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 border-2 border-[#0B2545]/30 border-t-[#0B2545] rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>
            )}
          </div>

          {/* Back to Homepage Footer */}
          <div className="px-8 py-5 bg-black/30 border-t border-white/10 flex justify-center">
            <Link 
              href="/" 
              className="text-[13px] text-white/60 font-medium hover:text-white transition-colors flex items-center gap-1.5"
            >
              ← Back to Homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
