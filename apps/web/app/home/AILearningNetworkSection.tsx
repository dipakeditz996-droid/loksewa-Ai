"use client";

import React from "react";
import {
  Brain, Landmark, Newspaper, Lightbulb, Building2, LineChart, Mountain, ScrollText,
} from "lucide-react";
import { useSafeReducedMotion } from "./useHeroDepth";

type Tier = "weak" | "good" | "strong";

interface Subject {
  name: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  accuracy: number;
}

function tierOf(accuracy: number): Tier {
  if (accuracy >= 85) return "strong";
  if (accuracy >= 75) return "good";
  return "weak";
}

const TIER_STYLE: Record<Tier, { line: string; ring: string; dot: string; text: string; label: string }> = {
  weak: { line: "#DC5A5A", ring: "border-red-400/60", dot: "bg-red-500", text: "text-red-500", label: "Needs attention" },
  good: { line: "#D4A72C", ring: "border-[#D4A72C]/60", dot: "bg-[#D4A72C]", text: "text-[#D4A72C]", label: "Good progress" },
  strong: { line: "#159A82", ring: "border-emerald-400/60", dot: "bg-emerald-500", text: "text-emerald-500", label: "Strong" },
};

const NODE_RADIUS_PCT = 38;

function nodePosition(index: number, total: number) {
  const angle = (index * 360) / total - 90;
  const rad = (angle * Math.PI) / 180;
  return {
    x: 50 + NODE_RADIUS_PCT * Math.cos(rad),
    y: 50 + NODE_RADIUS_PCT * Math.sin(rad),
  };
}

// Mirrors the weak/strong split established in AIPreparationSection so the
// "AI has analyzed this student" story stays consistent across sections.
const SUBJECTS: Subject[] = [
  { name: "Constitution", short: "Constitutional Law", icon: Landmark, accuracy: 62 },
  { name: "Current Affairs", short: "Current Affairs", icon: Newspaper, accuracy: 68 },
  { name: "Economics", short: "Economics", icon: LineChart, accuracy: 74 },
  { name: "Gen. Knowledge", short: "General Knowledge", icon: Lightbulb, accuracy: 79 },
  { name: "Public Admin", short: "Public Administration", icon: Building2, accuracy: 71 },
  { name: "Geography", short: "Geography", icon: Mountain, accuracy: 85 },
  { name: "History", short: "Nepal History", icon: ScrollText, accuracy: 91 },
];

// Positions are static (7 fixed subjects, evenly spaced), so they're baked
// into each node once at module scope instead of re-derived via a parallel
// index lookup on every render.
const SUBJECT_NODES = SUBJECTS.map((s, i) => ({ ...s, ...nodePosition(i, SUBJECTS.length) }));

function NetworkDiagram() {
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
        // Bias the tooltip to open toward the diagram's center so it never
        // clips past the section edge, regardless of which side the node sits on.
        const tooltipSide = node.x < 50 ? "left-full ml-3" : "right-full mr-3";

        return (
          <button
            key={node.name}
            type="button"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            aria-label={`${node.short}: ${node.accuracy}% accuracy, ${tier.label.toLowerCase()}`}
            className="absolute z-20 flex flex-col items-center gap-1.5 focus:outline-none"
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
            <span className="text-[9.5px] sm:text-[10.5px] font-[800] text-slate-600 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">
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

// Compact fallback for small screens where the radial diagram has no room to breathe.
function NetworkList() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:hidden">
      {SUBJECT_NODES.map((node) => {
        const tier = TIER_STYLE[tierOf(node.accuracy)];
        const Icon = node.icon;
        return (
          <div key={node.name} className="flex items-center gap-2.5 bg-white dark:bg-[#0B1521] border border-slate-200 dark:border-white/10 rounded-[12px] p-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] font-[700] text-slate-700 dark:text-slate-200 truncate">{node.name}</div>
              <div className={`text-[11px] font-[800] ${tier.text}`}>{node.accuracy}%</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AILearningNetworkSection() {
  return (
    <section className="py-24 bg-white dark:bg-[#020611] relative overflow-hidden">
      <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px section-divider-light dark:section-divider" />
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-500/[0.03] dark:bg-violet-600/[0.06] rounded-full blur-[160px] pointer-events-none" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 mb-5">
            <Brain className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-[10.5px] font-[800] uppercase tracking-widest text-violet-500 dark:text-violet-400">Live AI Understanding</span>
          </div>
          <h2 className="text-[32px] md:text-[44px] font-[900] text-slate-900 dark:text-white tracking-tight mb-4 leading-[1.1]">
            One AI. <span className="text-gradient-blue-violet">Your entire syllabus.</span>
          </h2>
          <p className="text-[17px] text-slate-500 dark:text-slate-400 max-w-[560px] mx-auto font-[500]">
            LoksewaAI continuously maps your performance across every subject — hover a node to see exactly where the AI thinks you stand.
          </p>
        </div>

        <div className="hidden sm:block">
          <NetworkDiagram />
        </div>
        <NetworkList />

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-10 flex-wrap">
          {(["strong", "good", "weak"] as Tier[]).map((t) => (
            <div key={t} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${TIER_STYLE[t].dot}`} />
              <span className="text-[12px] font-[600] text-slate-500 dark:text-slate-400">{TIER_STYLE[t].label}</span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
