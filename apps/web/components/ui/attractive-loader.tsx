"use client";

import React, { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";

interface AttractiveLoaderProps {
  text?: string;
}

const loadingMessages = [
  "Loading your dashboard...",
  "Fetching your progress...",
  "Preparing study materials...",
  "Almost there...",
];

export function AttractiveLoader({ text }: AttractiveLoaderProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (text) return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <div className="flex h-[70vh] w-full flex-col items-center justify-center bg-transparent">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing spinning ring */}
        <div className="absolute w-24 h-24 rounded-full border-[3px] border-transparent border-t-[#D4A72C] border-b-[#D4A72C] animate-[spin_2s_linear_infinite] opacity-80 shadow-[0_0_15px_rgba(212,167,44,0.3)]"></div>
        
        {/* Inner reverse spinning ring */}
        <div className="absolute w-16 h-16 rounded-full border-[3px] border-transparent border-r-[#0B2545] border-l-[#0B2545] dark:border-r-blue-400 dark:border-l-blue-400 animate-[spin_1.5s_linear_infinite_reverse] opacity-90"></div>
        
        {/* Central pulse icon */}
        <div className="relative bg-gradient-to-br from-[#0B2545] to-[#163E6B] p-4 rounded-full shadow-lg animate-pulse">
          <BookOpen className="w-8 h-8 text-[#D4A72C]" />
        </div>
      </div>
      
      {/* Dynamic Text */}
      <div className="mt-8 relative overflow-hidden h-6 w-64 flex justify-center">
        <p className="absolute text-sm font-semibold tracking-wide text-[#0B2545]/80 dark:text-blue-100/80 animate-[pulse_2.5s_ease-in-out_infinite]">
          {text || loadingMessages[messageIndex]}
        </p>
      </div>
    </div>
  );
}
