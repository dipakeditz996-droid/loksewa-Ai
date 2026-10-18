import React from "react";
import {
  Landmark, Newspaper, Lightbulb, Building2, LineChart, Mountain, ScrollText,
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

export const SUBJECTS: Subject[] = [
  { name: "Constitution", short: "Constitutional Law", icon: Landmark, accuracy: 62 },
  { name: "Current Affairs", short: "Current Affairs", icon: Newspaper, accuracy: 68 },
  { name: "Economics", short: "Economics", icon: LineChart, accuracy: 74 },
  { name: "Gen. Knowledge", short: "General Knowledge", icon: Lightbulb, accuracy: 79 },
  { name: "Public Admin", short: "Public Administration", icon: Building2, accuracy: 71 },
  { name: "Geography", short: "Geography", icon: Mountain, accuracy: 85 },
  { name: "History", short: "Nepal History", icon: ScrollText, accuracy: 91 },
];

export const SUBJECT_NODES = SUBJECTS.map((s, i) => ({ ...s, ...nodePosition(i, SUBJECTS.length) }));
