"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Mail, ArrowLeft, Lock, Eye, EyeOff, CheckCircle2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [stage, setStage] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await authApi.forgotPassword(email);
      setStage("reset");
    } catch (err: any) {
      setError(err.message || err.detail || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      await authApi.resetPassword(email, otp, password);
      setStage("done");
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: any) {
      setError(err.message || err.detail || "Invalid or expired code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A1118] text-white px-6 py-12">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="flex items-center gap-3 mb-8 w-fit">
          <div className="bg-transparent border border-white/80 p-1.5 rounded-[8px] flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-white" strokeWidth={1.5} />
          </div>
          <span className="font-[800] text-[20px] tracking-tight text-white leading-none">
            Loksewa<span className="text-[#D4A72C]">AI</span>
          </span>
        </Link>

        <div className="bg-black/20 backdrop-blur-[24px] border border-white/10 rounded-[24px] p-8 sm:p-10">
          {stage === "done" ? (
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
              <h1 className="text-[22px] font-bold text-white mb-2">Password Reset</h1>
              <p className="text-[13px] text-white/60">
                Your password has been changed. Redirecting you to sign in...
              </p>
            </div>
          ) : stage === "reset" ? (
            <>
              <h1 className="text-[26px] font-bold text-white mb-1">Enter Verification Code</h1>
              <p className="text-[13px] text-white/60 mb-8">
                We sent a 6-digit code to <span className="text-white/80 font-medium">{email}</span>. Enter it below with your new password.
              </p>
              <form onSubmit={handleReset} className="space-y-5">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[10px] text-red-400 text-[13px] font-medium">
                    {error}
                  </div>
                )}
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors">
                    <KeyRound className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="6-digit code"
                    required
                    className="h-[48px] w-full pl-11 bg-transparent border-white/20 text-[13px] text-white tracking-[0.3em] focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40 placeholder:tracking-normal"
                  />
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors">
                    <Lock className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New Password"
                    required
                    className="h-[48px] w-full pl-11 pr-12 bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40"
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
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm New Password"
                    required
                    className="h-[48px] w-full pl-11 bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[48px] bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-90 text-white text-[15px] font-bold rounded-[10px] border-none"
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
                <button
                  type="button"
                  onClick={() => setStage("email")}
                  className="w-full text-center text-[12px] text-white/50 hover:text-white transition-colors"
                >
                  Use a different email
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-[26px] font-bold text-white mb-1">Forgot Password?</h1>
              <p className="text-[13px] text-white/60 mb-8">
                Enter your account email and we&apos;ll send you a verification code.
              </p>
              <form onSubmit={handleSendCode} className="space-y-5">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[10px] text-red-400 text-[13px] font-medium">
                    {error}
                  </div>
                )}
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors">
                    <Mail className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    required
                    className="h-[48px] w-full pl-11 bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[48px] bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-90 text-white text-[15px] font-bold rounded-[10px] border-none"
                >
                  {isLoading ? "Sending..." : "Send Verification Code"}
                </Button>
              </form>
            </>
          )}

          <Link
            href="/login"
            className="mt-6 flex items-center justify-center gap-2 text-[12px] font-semibold text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
