"use client";

import React from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { PerformanceTrend } from "@/lib/api/analytics";

interface PerformanceTrendChartProps {
  trend: PerformanceTrend[];
}

export default function PerformanceTrendChart({ trend }: PerformanceTrendChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D4A72C" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#D4A72C" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#64748b" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#64748b" }}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            itemStyle={{ color: "#0B2545", fontWeight: "bold" }}
          />
          <Area
            type="monotone"
            dataKey="accuracy"
            stroke="#D4A72C"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorAccuracy)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
