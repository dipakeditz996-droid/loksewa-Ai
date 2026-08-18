"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BookOpen, Eye, EyeOff, User, Lock, ArrowRight, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import bgImage from "../../../media/login.png";

import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "@/contexts/AuthContext";

export default function TeacherLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { refreshUser } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    const email = (document.getElementById("email") as HTMLInputElement).value;
    const password = (document.getElementById("password") as HTMLInputElement).value;

    try {
      const response = await authApi.login({ username: email, password });
      await refreshUser();
      
      const user = await authApi.me();
      
      if (user.role === "teacher") {
        router.push("/teacher");
      } else {
        // If not a teacher, logout and show error
        authApi.logout("/teacher/login?error=unauthorized");
      }
    } catch (err: any) {
      setError(err.message || err.detail || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Check URL params for unauthorized error redirect
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "unauthorized") {
      setError("This portal is restricted to Teachers only.");
    }
  }, []);

  return (
    <div className="min-h-screen relative flex font-sans overflow-hidden bg-[#0A1118] text-white">
      {/* Background Image & Cinematic Overlay */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-[center_top] bg-no-repeat opacity-40 grayscale"
          style={{ backgroundImage: `url(${bgImage.src})` }}
        ></div>
        {/* Lighter cinematic gradient to let the image shine through */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A1118]/90 via-[#0A1118]/70 to-[#0A1118]/90 mix-blend-multiply"></div>
      </div>

      <div className="container relative z-10 w-full mx-auto px-6 md:px-12 py-8 flex flex-col items-center justify-center min-h-screen">
        
        {/* RIGHT SIDE: Login Card */}
        <div className="w-full lg:w-[460px] flex justify-center mt-10 lg:mt-0">
          <div className="w-full bg-black/40 backdrop-blur-[24px] border border-white/10 rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)] relative">
            
            {/* Subtle inner light effect */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D4A72C]/40 to-transparent"></div>
            
            <div className="p-8 sm:p-10">
              
              {/* Brand Header */}
              <div className="flex justify-center mb-8">
                <Link href="/" className="flex flex-col items-center hover:opacity-90 transition-opacity">
                  <div className="bg-white/10 p-2.5 rounded-[12px] shadow-sm mb-3 border border-white/10">
                    <Briefcase className="h-6 w-6 text-[#D4A72C]" strokeWidth={2} />
                  </div>
                  <span className="font-[800] text-[20px] tracking-tight text-white drop-shadow-md leading-none flex items-center">
                    Loksewa<span className="text-[#D4A72C]">AI</span>
                  </span>
                  <span className="text-[10px] text-white/50 block mt-1 font-medium tracking-widest uppercase">Teacher Portal</span>
                </Link>
              </div>

              {/* Header */}
              <div className="mb-8 text-center">
                <h2 className="text-[22px] font-bold text-white mb-2 tracking-tight">Teacher Login</h2>
                <p className="text-[13px] text-white/60 font-medium">Access your educator dashboard</p>
              </div>

              {error && (
                <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center font-medium">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-[11px] font-bold text-white/80">Email or Username</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors">
                      <User className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <Input 
                      id="email" 
                      type="text" 
                      placeholder="Enter your email or username" 
                      className="h-[50px] w-full pl-11 bg-black/20 border-white/10 text-[13px] text-white focus:bg-black/40 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/30"
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-[11px] font-bold text-white/80">Password</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#D4A72C] transition-colors">
                      <Lock className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Enter your password"
                      className="h-[50px] w-full pl-11 pr-12 bg-black/20 border-white/10 text-[13px] text-white focus:bg-black/40 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/30"
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
                  <div className="flex justify-end pt-2">
                    <Link href="/forgot-password" className="text-[11px] font-medium text-[#D4A72C] hover:text-white transition-colors">
                      Forgot Password?
                    </Link>
                  </div>
                </div>

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full h-[50px] bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-90 text-white text-[15px] font-bold rounded-[10px] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(212,167,44,0.25)] border-none"
                  >
                    {isLoading ? "Authenticating..." : (
                      <>
                        Secure Login <ArrowRight className="h-[18px] w-[18px] ml-1 opacity-90" strokeWidth={2} />
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center mt-5">
                  <Link href="/login" className="text-[12px] text-white/50 hover:text-white transition-colors">
                    Are you a student? Sign in here
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
