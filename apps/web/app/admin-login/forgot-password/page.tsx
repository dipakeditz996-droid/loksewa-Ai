"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BookOpen, Mail, Shield, ArrowLeft, CheckCircle } from "lucide-react";
import { authApi } from "@/lib/api/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await authApi.forgotPassword(email);
      // The backend will currently return a stub message since it's not configured
      setMessage({
        text: response.detail || "Instructions sent if the email exists.",
        isError: !response.configured
      });
    } catch (err: any) {
      const detail = err?.data?.detail || err?.message || "An unexpected error occurred.";
      setMessage({ text: detail, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0B2545]">
      {/* ===== LEFT PANEL — Branding ===== */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-[0.03]">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-[#D4A72C]/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-radial from-[#1a4a7d]/30 to-transparent rounded-full blur-3xl" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 w-fit group">
            <div className="bg-[#D4A72C] p-2.5 rounded-xl shadow-lg shadow-[#D4A72C]/20 group-hover:shadow-[#D4A72C]/40 transition-shadow">
              <BookOpen className="h-6 w-6 text-[#0B2545]" strokeWidth={2.5} />
            </div>
            <div>
              <span className="font-[800] text-[26px] tracking-tight text-white leading-none">
                Loksewa<span className="text-[#D4A72C]">AI</span>
              </span>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.25em] mt-0.5">
                Administration Portal
              </p>
            </div>
          </Link>
        </div>

        <div className="relative z-10 space-y-8 max-w-md">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
              <Shield className="h-3.5 w-3.5 text-[#D4A72C]" />
              <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">Account Recovery</span>
            </div>
            <h1 className="text-[38px] font-[800] text-white leading-[1.1] tracking-tight">
              Reset Your<br />
              Administrator<br />
              <span className="text-[#D4A72C]">Password</span>
            </h1>
            <p className="text-[15px] text-white/50 mt-4 leading-relaxed max-w-[340px]">
              Follow the instructions sent to your registered email address to securely regain access to your account.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-[11px] text-white/20 font-medium">
            © {new Date().getFullYear()} LoksewaAI. All rights reserved.
          </p>
        </div>
      </div>

      {/* ===== RIGHT PANEL — Form ===== */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-gradient-to-br from-slate-50 to-slate-100 relative">
        <div className="w-full max-w-[420px]">
          <Link 
            href="/admin-login" 
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-slate-500 hover:text-[#0B2545] transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>

          <div className="mb-8">
            <h2 className="text-[26px] font-[800] text-[#0B2545] tracking-tight">
              Forgot Password?
            </h2>
            <p className="text-[14px] text-slate-500 mt-1.5 font-medium">
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          {message && (
            <div className={`mb-5 p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
              message.isError 
                ? "bg-red-50 border-red-200 text-red-700" 
                : "bg-amber-50 border-amber-200 text-amber-700" // using amber for the "not configured" state
            }`}>
              <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                message.isError ? "bg-red-100 text-red-500" : "bg-amber-100 text-amber-500"
              }`}>
                {message.isError ? <span className="text-xs font-bold">!</span> : <Shield className="h-3 w-3" />}
              </div>
              <span className="text-[13px] font-medium leading-relaxed">{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400 group-focus-within:text-[#0B2545] transition-colors" />
                <input
                  id="email"
                  type="email"
                  placeholder="admin@loksewa.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-[52px] pl-12 pr-4 bg-white border border-slate-200 rounded-xl text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/15 focus:border-[#0B2545]/40 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[52px] bg-[#0B2545] hover:bg-[#163E6C] disabled:opacity-70 text-white text-[15px] font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0B2545]/20 hover:shadow-[#0B2545]/30 mt-2"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending...</span>
                </div>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
