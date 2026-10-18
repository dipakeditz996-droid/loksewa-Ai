"use client";

import React from "react";
import { Brain } from "lucide-react";
import { useSafeReducedMotion } from "./useHeroDepth";
import { tierOf, TIER_STYLE, SUBJECT_NODES } from "./network-data";

export function NetworkDiagram() {
  const [active, setActive] = React.useState<number | null>(null);
  const reducedMotion = useSafeReducedMotion();

  return (
    <div className="relative w-full max-w-[560px] aspect-square mx-auto select-none">
      {/* Connecting lines — behind everything, brighten + recolor on hover/focus */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible" aria-hidden="true">
        {SUBJECT_NODES.map((node, i) => {
          const isActive = active === i;
          const tier = TIER_STYLE[tierOf(node.accuracy)];
          return (
            <line
              key={node.name}
              x1={50}
              y1={50}
              x2={node.x}
              y2={node.y}
              vectorEffect="non-scaling-stroke"
              stroke={isActive ? tier.line : "currentColor"}
              strokeOpacity={isActive ? 0.9 : 0.3}
              strokeWidth={isActive ? 1.75 : 1}
              className="text-slate-300 dark:text-[#1E4A7A] transition-[stroke-opacity,stroke-width] duration-300"
            />
          );
        })}
      </svg>

      {/* Center AI core */}
      <div
        className="absolute z-10 flex flex-col items-center justify-center rounded-full bg-gradient-to-br from-[#0B2545] to-[#163E6B] dark:from-[#0B2545] dark:to-[#0B1F3A] shadow-[0_20px_50px_-10px_rgba(11,37,69,0.4)] dark:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.7)] border border-white/10"
        style={{ left: "50%", top: "50%", width: "22%", height: "22%", transform: "translate(-50%, -50%)" }}
      >
        <div className={`absolute inset-0 rounded-full ${reducedMotion ? "" : "animate-pulse-glow"}`} />
        <Brain className="w-[34%] h-[34%] text-[#D4A72C] relative" strokeWidth={1.75} />
        <span className="mt-1 text-[8px] sm:text-[9px] font-[800] uppercase tracking-widest text-white/70 relative">AI Core</span>
      </div>

      {/* Subject nodes */}
      {SUBJECT_NODES.map((node, i) => {
        const isActive = active === i;
        const tier = TIER_STYLE[tierOf(node.accuracy)];
        const Icon = node.icon;
        const tooltipSide = node.x < 50 ? "right-full mr-3" : "left-full ml-3";

        return (
          <button
            key={node.name}
            type="button"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            aria-label={`${node.short}: ${node.accuracy}% accuracy, ${tier.label.toLowerCase()}`}
            className={`absolute flex flex-col items-center gap-1.5 focus:outline-none ${isActive ? 'z-50' : 'z-20'}`}
            style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}
          >
            <div
              className={`relative flex items-center justify-center rounded-full bg-white dark:bg-[#0B1521] border-2 transition-all duration-300 w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] ${
                isActive
                  ? `${tier.ring} scale-110 shadow-[0_12px_30px_rgba(0,0,0,0.15)]`
                  : "border-slate-200 dark:border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
              }`}
            >
              <Icon className={`w-[42%] h-[42%] transition-colors ${isActive ? tier.text : "text-slate-500 dark:text-slate-400"}`} />
              <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-[#04080F] ${tier.dot}`} />
            </div>
            <span className="text-[9.5px] sm:text-[10.5px] font-[800] text-slate-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">
              {node.name}
            </span>

            {/* Hover/focus info card */}
            {isActive && (
              <div
                role="tooltip"
                className={`absolute top-1/2 -translate-y-1/2 ${tooltipSide} z-30 w-[168px] bg-white dark:bg-[#0B1521] border border-slate-200 dark:border-white/10 rounded-[14px] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_16px_45px_rgba(0,0,0,0.6)] text-left animate-fade-in`}
              >
                <div className="text-[11.5px] font-[800] text-slate-800 dark:text-white mb-1.5">{node.short}</div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[15px] font-[900] ${tier.text}`}>{node.accuracy}%</span>
                  <span className={`text-[9px] font-[700] uppercase tracking-wide ${tier.text}`}>{tier.label}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${tier.dot}`} style={{ width: `${node.accuracy}%` }} />
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
