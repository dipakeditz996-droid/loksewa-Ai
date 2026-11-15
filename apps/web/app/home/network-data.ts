import React from "react";
import {
  Binary, Cpu, Compass, Activity, Cog, Layers, Gauge,
} from "lucide-react";

export type Tier = "weak" | "good" | "strong";

export interface Subject {
  name: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  accuracy: number;
}

export function tierOf(accuracy: number): Tier {
  if (accuracy >= 85) return "strong";
  if (accuracy >= 75) return "good";
  return "weak";
}

export const TIER_STYLE: Record<Tier, { line: string; ring: string; dot: string; text: string; label: string }> = {
  weak: { line: "#DC4545", ring: "border-red-400/60", dot: "bg-red-500", text: "text-red-500", label: "Needs attention" },
  good: { line: "#2563EB", ring: "border-[#2563EB]/60", dot: "bg-[#2563EB]", text: "text-[#2563EB] dark:text-[#60A5FA]", label: "Good progress" },
  strong: { line: "#16A36A", ring: "border-emerald-400/60", dot: "bg-emerald-500", text: "text-emerald-500", label: "Strong" },
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

export const SUBJECTS: Subject[] = [
  { name: "Structures", short: "Structural Analysis", icon: Layers, accuracy: 64 },
  { name: "Hydraulics", short: "Fluid Mechanics & Hydro", icon: Gauge, accuracy: 78 },
  { name: "Math & Stat", short: "Engineering Mathematics", icon: Activity, accuracy: 72 },
  { name: "Circuits", short: "Circuit Analysis", icon: Cpu, accuracy: 82 },
  { name: "Geotech", short: "Geotechnical Engineering", icon: Compass, accuracy: 70 },
  { name: "Thermodynamics", short: "Applied Thermodynamics", icon: Cog, accuracy: 88 },
  { name: "Logic & Digital", short: "Digital Systems", icon: Binary, accuracy: 92 },
];

export const SUBJECT_NODES = SUBJECTS.map((s, i) => ({ ...s, ...nodePosition(i, SUBJECTS.length) }));
