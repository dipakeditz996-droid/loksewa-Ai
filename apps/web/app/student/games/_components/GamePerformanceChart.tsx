"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PerformanceDataPoint } from "@/lib/api/gamification";

interface GamePerformanceChartProps {
  performance: PerformanceDataPoint[];
}

export default function GamePerformanceChart({ performance }: GamePerformanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={performance} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
        <defs>
          <linearGradient id="arenaXpGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip 
          contentStyle={{ backgroundColor: "#0B1A38", borderColor: "rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff", fontSize: "11px" }}
          itemStyle={{ color: "#fff", fontWeight: "bold" }}
        />
        <Area type="monotone" dataKey="xp" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#arenaXpGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
