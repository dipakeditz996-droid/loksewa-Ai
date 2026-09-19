"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Custom tooltip for recharts
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-600 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export function PlatformActivityChart({
  data: formattedChart,
}: {
  data: Array<{ label: string; [key: string]: string | number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={formattedChart} margin={{ top: 4, right: 10, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          interval={Math.floor(formattedChart.length / 6)}
        />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="registrations"
          name="Registrations"
          stroke="#0B2545"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#0B2545" }}
        />
        <Line
          type="monotone"
          dataKey="examAttempts"
          name="Exam Attempts"
          stroke="#D4A72C"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#D4A72C" }}
        />
        <Line
          type="monotone"
          dataKey="aiSessions"
          name="AI Sessions"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#8b5cf6" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AiTrendMiniChart({ data }: { data: Array<{ date: string; sessions: number }> }) {
  return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Bar dataKey="sessions" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="bg-white border border-slate-200 rounded px-2 py-1 text-xs shadow">
                  <span className="font-bold text-violet-700">{payload[0]?.value} sessions</span>
                </div>
              ) : null
            }
          />
        </BarChart>
      </ResponsiveContainer>
  );
}
