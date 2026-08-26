"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export function FinalCTASection() {
  return (
    <section className="relative py-32 overflow-hidden bg-[#020611]">
      
      {/* ── Background Image & Layers ── */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 opacity-20 blur-[2px] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('/media/hero_background.jpg')` }}
        />
        <div className="absolute inset-0 bg-[#020611]/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020611_100%)] opacity-90" />
        
        {/* Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[10%] w-[400px] h-[400px] bg-[#D4A72C]/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        <div className="eyebrow-pill inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
          <Sparkles className="w-3.5 h-3.5 text-[#D4A72C]" />
          <span className="text-[10.5px] font-[800] uppercase tracking-widest text-slate-300">
            Start Your Journey Today
          </span>
        </div>

        <h2 className="text-[40px] md:text-[56px] lg:text-[64px] font-[900] tracking-tight text-white mb-6 leading-[1.1]">
          Ready to transform your <br className="hidden md:block" />
          <span className="text-gradient-gold">Loksewa preparation?</span>
        </h2>
        
        <p className="text-[18px] md:text-[20px] text-slate-400 leading-relaxed mb-10 max-w-[600px] mx-auto font-[500]">
          Join thousands of aspirants who are learning smarter, practicing better, and securing top ranks.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register" className="w-full sm:w-auto">
            <Button className="btn-gold-gradient relative overflow-hidden w-full sm:w-auto text-[#020611] h-[60px] px-10 rounded-[14px] font-[800] text-[17px] shadow-[0_12px_40px_-8px_rgba(212,167,44,0.5)] border-none flex items-center justify-center gap-2.5 group">
              <span className="absolute inset-0 bg-white/20 -translate-x-full group-hover:animate-[shimmer_1.5s_ease-in-out]" />
              Create Free Account
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <p className="text-[13px] font-[600] text-slate-500 mt-3 sm:mt-0 sm:ml-2">
            No credit card required.
          </p>
        </div>

      </div>
    </section>
  );
}
