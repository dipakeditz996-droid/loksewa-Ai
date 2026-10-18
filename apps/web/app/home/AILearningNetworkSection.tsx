import React from "react";
import { Brain } from "lucide-react";
import { NetworkDiagram } from "./NetworkDiagram";
import { tierOf, TIER_STYLE, SUBJECT_NODES, Tier } from "./network-data";

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
              <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] font-[700] text-slate-800 dark:text-slate-200 truncate">{node.name}</div>
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
          <p className="text-[17px] text-slate-600 dark:text-slate-300 max-w-[560px] mx-auto font-[500]">
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
              <span className="text-[12px] font-[600] text-slate-600 dark:text-slate-400">{TIER_STYLE[t].label}</span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
