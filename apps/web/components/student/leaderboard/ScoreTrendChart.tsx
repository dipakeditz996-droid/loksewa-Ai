"use client";

import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ScoreTrendPoint } from "@/lib/api/leaderboard";

interface ScoreTrendChartProps {
  trend: ScoreTrendPoint[];
}

export default function ScoreTrendChart({ trend }: ScoreTrendChartProps) {
  return (
    <div className="h-[160px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trend} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#0D1F38",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 12,
              color: "#fff",
            }}
            itemStyle={{ color: "#a78bfa" }}
            labelStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#7C3AED"
            strokeWidth={2.5}
            fill="url(#trendGrad)"
            dot={{ r: 3, fill: "#7C3AED", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#a78bfa", strokeWidth: 0 }}
            isAnimationActive
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
