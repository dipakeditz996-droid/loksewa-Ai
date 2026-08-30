"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { BookOpen, Eye, EyeOff, User, Lock, Trophy, BarChart2, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import bgImage from "../../media/login.png";
import leftBranchImg from "../../media/left-branch.png";
import rightBranchImg from "../../media/right-branch.png";
import Image from "next/image";

import { useRouter } from "next/navigation";
import { authApi } from "../../lib/api/auth";
import { useAuth } from "../../contexts/AuthContext";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
    AppleID: any;
  }
}

function LoginContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { refreshUser } = useAuth();
  const loginCardRef = useRef<HTMLDivElement>(null);

  // On mobile the brand/hero copy stacks above the login form, so jump
  // straight to the form instead of making the student scroll past it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    if (isMobile && loginCardRef.current) {
      const timer = setTimeout(() => {
        loginCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSocialSuccess = async (provider: 'google' | 'facebook' | 'apple', token: string) => {
    setIsLoading(true);
    setError("");
    try {
      await authApi.socialLogin(provider, token);
      await refreshUser();
      
      const user = await authApi.me();
      if (user.role === "teacher") {
        router.push("/teacher");
      } else if (user.role === "admin" || user.role === "super-admin") {
        router.push("/admin-dashboard");
      } else {
        router.push("/student");
      }
    } catch (err: any) {
      setError(err.message || err.detail || `Failed to login with ${provider}`);
      setIsLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: (tokenResponse) => handleSocialSuccess('google', tokenResponse.access_token),
    onError: () => setError("Google login failed")
  });

  useEffect(() => {
    // 1. Facebook SDK
    window.fbAsyncInit = function() {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || 'placeholder_fb_id',
        cookie: true,
        xfbml: true,
        version: 'v18.0'
      });
    };
    (function(d, s, id) {
       var js, fjs = d.getElementsByTagName(s)[0] as any;
       if (d.getElementById(id)) {return;}
       js = d.createElement(s) as any; js.id = id;
       js.src = "https://connect.facebook.net/en_US/sdk.js";
       fjs.parentNode.insertBefore(js, fjs);
     }(document, 'script', 'facebook-jssdk'));

    // 2. Apple SDK
    const script = document.createElement("script");
    script.src = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
    script.onload = () => {
      window.AppleID.auth.init({
        clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || 'placeholder_apple_id',
        scope: 'name email',
        redirectURI: process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI || window.location.href.split('?')[0],
        usePopup: true
      });
    };
    document.body.appendChild(script);
  }, []);

  const loginWithFacebook = () => {
    if (!window.FB) return setError("Facebook SDK is still loading, please try again.");
    
    // Facebook SDK throws a hard console.error if called from http:// which crashes Next.js dev overlay
    if (window.location.protocol !== 'https:' && window.location.hostname === 'localhost') {
      setError("Facebook Login requires HTTPS. For local testing, please use ngrok or local HTTPS.");
      return;
    }

    window.FB.login((response: any) => {
      if (response.authResponse) {
        handleSocialSuccess('facebook', response.authResponse.accessToken);
      } else {
        setError("Facebook login was cancelled or failed.");
      }
    }, {scope: 'email,public_profile'});
  };

  const loginWithApple = async () => {
    if (!window.AppleID) return setError("Apple SDK is still loading, please try again.");
    
    if (window.location.protocol !== 'https:' && window.location.hostname === 'localhost') {
      setError("Apple Login requires HTTPS. For local testing, please use ngrok or local HTTPS.");
      return;
    }

    try {
      const response = await window.AppleID.auth.signIn();
      
      // Apple passes `user` object only on the very first login
      const additionalData = response.user ? { name: response.user.name } : undefined;
      
      await handleSocialSuccess('apple', response.authorization.id_token);
    } catch (err: any) {
      if (err.error !== 'popup_closed_by_user') {
        setError("Apple login failed.");
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    const email = (document.getElementById("email") as HTMLInputElement).value;
    const password = (document.getElementById("password") as HTMLInputElement).value;

    try {
      await authApi.login({ username: email, password });
      await refreshUser(); // update context
      
      const user = await authApi.me();
      
      if (user.role === "teacher") {
        router.push("/teacher");
      } else if (user.role === "admin" || user.role === "super-admin") {
        router.push("/admin-dashboard");
      } else {
        router.push("/student");
      }
    } catch (err: any) {
      setError(err.message || err.detail || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex font-sans overflow-hidden bg-black text-white">
      {/* Background Image & Cinematic Overlay */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[center_top] lg:bg-[center_top] bg-no-repeat"
          style={{ backgroundImage: `url(${bgImage.src})` }}
        ></div>
        {/* Mobile: vertical gradient suits the stacked layout (hero copy over card).
            Desktop (lg+): original left-right gradient for the side-by-side layout. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black/95 lg:bg-gradient-to-r lg:from-black/80 lg:via-black/20 lg:to-black/60 mix-blend-multiply"></div>
      </div>

      {/* Back to Home */}
      <Link
        href="/"
        className="fixed top-4 left-4 md:top-6 md:left-6 z-20 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-black/30 backdrop-blur-md border border-white/15 text-white/90 text-[12px] font-semibold hover:bg-black/50 hover:text-white transition-colors shadow-md"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to Home
      </Link>

      <div className="container relative z-10 w-full mx-auto px-6 md:px-12 py-8 flex flex-col lg:flex-row items-center justify-between min-h-screen">

        {/* LEFT SIDE: Brand & Copy */}
        <div className="w-full lg:w-[45%] flex flex-col pt-8 pb-8 lg:pr-8">
          
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 mb-12 hover:opacity-90 transition-opacity w-fit">
            <div className="bg-white p-1.5 rounded-[8px] shadow-sm">
              <BookOpen className="h-5 w-5 text-[#0B2545]" strokeWidth={2} />
            </div>
            <div>
              <span className="font-[800] text-[22px] tracking-tight text-white drop-shadow-md leading-none flex items-center">
                Loksewa<span className="text-[#D4A72C]">AI</span>
              </span>
              <span className="text-[9px] text-white/70 block mt-0.5 font-medium tracking-wide">Your Journey. Our Guidance. Your Success.</span>
            </div>
          </Link>
          
          <h1 className="text-[36px] md:text-[46px] lg:text-[48px] font-[800] text-white mb-4 leading-[1.15] drop-shadow-lg">
            Your Preparation<br />
            Opens the Door to<br />
            <span className="text-[#D4A72C]">Your Future.</span>
          </h1>
          
          <p className="text-[15px] text-white/80 font-medium mb-10 max-w-[380px] drop-shadow-md leading-[1.6]">
            Loksewa is not just an exam, it's the beginning of your impact on the nation.
          </p>

          <div className="space-y-5">
            {/* Feature 1 */}
            <div className="flex items-start gap-4 group">
              <div className="w-11 h-11 rounded-[12px] border border-white/20 bg-transparent flex items-center justify-center shrink-0 group-hover:bg-white/5 transition-colors">
                <BookOpen className="h-5 w-5 text-[#D4A72C]" strokeWidth={1.5} />
              </div>
              <div className="pt-0.5">
                <h3 className="text-[14px] font-bold text-white mb-0.5">Smart Preparation</h3>
                <p className="text-[12px] text-white/60 leading-[1.4] max-w-[220px]">Study the syllabus and practice with purpose.</p>
              </div>
            </div>
            {/* Feature 2 */}
            <div className="flex items-start gap-4 group">
              <div className="w-11 h-11 rounded-[12px] border border-white/20 bg-transparent flex items-center justify-center shrink-0 group-hover:bg-white/5 transition-colors">
                <BarChart2 className="h-5 w-5 text-[#D4A72C]" strokeWidth={1.5} />
              </div>
              <div className="pt-0.5">
                <h3 className="text-[14px] font-bold text-white mb-0.5">Track Progress</h3>
                <p className="text-[12px] text-white/60 leading-[1.4] max-w-[220px]">Analyze performance and improve every day.</p>
              </div>
            </div>
            {/* Feature 3 */}
            <div className="flex items-start gap-4 group">
              <div className="w-11 h-11 rounded-[12px] border border-white/20 bg-transparent flex items-center justify-center shrink-0 group-hover:bg-white/5 transition-colors">
                <Trophy className="h-5 w-5 text-[#D4A72C]" strokeWidth={1.5} />
              </div>
              <div className="pt-0.5">
                <h3 className="text-[14px] font-bold text-white mb-0.5">Achieve Success</h3>
                <p className="text-[12px] text-white/60 leading-[1.4] max-w-[220px]">Stay consistent and achieve your Loksewa dream.</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Login Card */}
        <div ref={loginCardRef} className="w-full lg:w-[460px] flex justify-center lg:justify-end mt-10 lg:mt-0 scroll-mt-6">
          <div className="w-full bg-black/20 backdrop-blur-[24px] border border-white/10 rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)] relative">
            
            {/* Subtle inner light effect */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            
            <div className="p-8 sm:p-10">
              {/* Header */}
              <div className="mb-8">
                <h2 className="text-[26px] font-bold text-white mb-2 tracking-tight flex items-center">Welcome Back <span className="ml-2 text-[22px]">👋</span></h2>
                <p className="text-[13px] text-white/70 font-medium">Login to continue your preparation</p>
              </div>

              {error && (
                <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-[11px] font-bold text-white/90">Email or Username</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-[#D4A72C] transition-colors">
                      <User className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <Input 
                      id="email" 
                      type="text" 
                      placeholder="Enter your email or username" 
                      className="h-[50px] w-full pl-11 bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40"
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-[11px] font-bold text-white/90">Password</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-[#D4A72C] transition-colors">
                      <Lock className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Enter your password"
                      className="h-[50px] w-full pl-11 pr-12 bg-transparent border-white/20 text-[13px] text-white focus:bg-white/5 focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] rounded-[10px] transition-all placeholder:text-white/40"
                      required 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
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

                <div className="pt-1">
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full h-[50px] bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-90 text-white text-[15px] font-bold rounded-[10px] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(212,167,44,0.25)] border-none"
                  >
                    {isLoading ? "Logging in..." : (
                      <>
                        Login <ArrowRight className="h-[18px] w-[18px] ml-1 opacity-90" strokeWidth={2} />
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center mt-5 text-[12px] text-white/70">
                  Don't have an account?{" "}
                  <Link href="/register" className="text-[#D4A72C] font-bold hover:text-[#e0b745] transition-colors">
                    Sign up
                  </Link>
                </div>

                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-[1px] bg-white/10"></div>
                  <span className="text-[10px] text-white/50 lowercase tracking-wide">or continue with</span>
                  <div className="flex-1 h-[1px] bg-white/10"></div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button 
                    type="button" 
                    disabled={isLoading}
                    onClick={() => loginWithGoogle()}
                    className="h-[44px] flex items-center justify-center bg-transparent hover:bg-white/5 border border-white/20 rounded-[10px] transition-colors disabled:opacity-50"
                  >
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
                  <button 
                    type="button" 
                    disabled={isLoading}
                    onClick={loginWithFacebook}
                    className="h-[44px] flex items-center justify-center bg-transparent hover:bg-white/5 border border-white/20 rounded-[10px] transition-colors disabled:opacity-50"
                  >
                    {/* Facebook SVG */}
                    <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z" fill="#1877F2"/>
                      <path d="M15.89 14.96L16.34 12.06H13.56V10.18C13.56 9.39 13.95 8.62 15.19 8.62H16.45V6.15C16.45 6.15 15.31 5.96 14.22 5.96C11.93 5.96 10.44 7.34 10.44 9.85V12.06H7.9V14.96H10.44V21.96C10.96 22.03 11.48 22.06 12 22.06C12.52 22.06 13.04 22.03 13.56 21.96V14.96H15.89Z" fill="white"/>
                    </svg>
                  </button>
                  <button 
                    type="button" 
                    disabled={isLoading}
                    onClick={loginWithApple}
                    className="h-[44px] flex items-center justify-center bg-transparent hover:bg-white/5 border border-white/20 rounded-[10px] transition-colors disabled:opacity-50"
                  >
                    {/* Apple SVG */}
                    <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16.6 9.80005C16.5 7.60005 18.4 6.40005 18.5 6.30005C17.5 4.80005 15.9 4.60005 15.4 4.50005C14.1 4.40005 12.8 5.30005 12.1 5.30005C11.4 5.30005 10.3 4.50005 9.20001 4.50005C7.80001 4.50005 6.50001 5.30005 5.80001 6.50005C4.30001 9.10005 5.40001 12.9 6.80001 15C7.50001 16 8.30001 17.1 9.40001 17.1C10.5 17.1 10.9 16.4 12.2 16.4C13.5 16.4 13.9 17.1 15 17.1C16.2 17.1 16.9 16.1 17.6 15.1C18.4 13.9 18.7 12.7 18.7 12.7C18.7 12.6 16.7 11.9 16.6 9.80005Z" fill="white"/>
                      <path d="M14.6 3.00003C15.2 2.30003 15.6 1.30003 15.5 0.300034C14.6 0.300034 13.6 0.800034 13 1.50003C12.5 2.10003 12 3.10003 12.2 4.10003C13.2 4.20003 14.1 3.70003 14.6 3.00003Z" fill="white"/>
                    </svg>
                  </button>
                </div>

                <div className="mt-8 pt-4 flex items-center justify-between opacity-90 relative px-2">
                  {/* Left Laurel Wreath */}
                  <Image 
                    src={leftBranchImg} 
                    alt="Left Branch" 
                    className="h-[80px] w-auto object-contain drop-shadow-[0_2px_8px_rgba(212,167,44,0.4)] opacity-90 hover:scale-105 transition-transform duration-500"
                  />
                  
                  <div className="text-center px-2 flex-1 flex flex-col items-center">
                    {/* Golden Quote Icon */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#D4A72C] mb-2">
                      <path d="M10.887 14.475C10.887 16.485 9.27899 18.113 7.26899 18.113C5.25899 18.113 3.65099 16.485 3.65099 14.475C3.65099 12.181 5.37299 9.155 8.16999 6.223L9.61099 7.625C7.62599 9.874 6.33199 11.968 5.79599 13.565C6.26299 13.351 6.75899 13.238 7.26899 13.238C9.27899 13.238 10.887 14.866 10.887 14.475ZM20.35 14.475C20.35 16.485 18.742 18.113 16.732 18.113C14.722 18.113 13.114 16.485 13.114 14.475C13.114 12.181 14.836 9.155 17.633 6.223L19.074 7.625C17.089 9.874 15.795 11.968 15.259 13.565C15.726 13.351 16.222 13.238 16.732 13.238C18.742 13.238 20.35 14.866 20.35 14.475Z" fill="currentColor"/>
                    </svg>
                    <p className="text-[11px] text-white/70 leading-[1.6]">
                      The harder you work today,<br/>
                      the closer you get to your dream tomorrow.<br/>
                      <span className="text-[#D4A72C] font-semibold mt-1 block">Keep going!</span>
                    </p>
                  </div>

                  {/* Right Laurel Wreath */}
                  <Image 
                    src={rightBranchImg} 
                    alt="Right Branch" 
                    className="h-[80px] w-auto object-contain drop-shadow-[0_2px_8px_rgba(212,167,44,0.4)] opacity-90 hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </form>


            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "PLACEHOLDER";
  
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <LoginContent />
    </GoogleOAuthProvider>
  );
}
