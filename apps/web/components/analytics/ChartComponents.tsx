"use client";

import React from "react";
import { 
  LineChart as RechartsLineChart, 
  Line, 
  BarChart as RechartsBarChart,
  Bar,
  AreaChart as RechartsAreaChart,
  Area,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export const COLORS = ['#0B2545', '#D4A72C', '#10b981', '#ef4444', '#8b5cf6', '#3b82f6'];

interface TrendCardProps {
  title: string;
  value: string | number;
  trend?: number; // percentage, positive or negative
  trendLabel?: string;
  icon?: React.ReactNode;
}

export function TrendCard({ title, value, trend, trendLabel, icon }: TrendCardProps) {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;
  
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
      <div className="flex justify-between items-start mb-2">
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <p className="text-2xl font-bold text-[#0B2545]">{value}</p>
      
      {(trend !== undefined || trendLabel) && (
        <div className="flex items-center gap-2 mt-2">
          {trend !== undefined && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded ${
              isPositive ? "bg-emerald-100 text-emerald-700" : 
              isNegative ? "bg-red-100 text-red-700" : 
              "bg-slate-100 text-slate-700"
            }`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : 
               isNegative ? <TrendingDown className="w-3 h-3" /> : 
               <Minus className="w-3 h-3" />}
              {Math.abs(trend)}%
            </span>
          )}
          {trendLabel && <span className="text-xs text-slate-500">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

export function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-lg">
        <p className="font-semibold text-slate-700 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm mt-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-600 capitalize">{entry.name}:</span>
            <span className="font-bold text-slate-900">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function LineChart({ data, dataKeys, colors = COLORS }: { data: any[], dataKeys: string[], colors?: string[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
        {dataKeys.map((key, index) => (
          <Line 
            key={key} 
            type="monotone" 
            dataKey={key} 
            stroke={colors[index % colors.length]} 
            strokeWidth={2} 
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

export function BarChart({ data, dataKeys, colors = COLORS, stacked = false }: { data: any[], dataKeys: string[], colors?: string[], stacked?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
        {dataKeys.map((key, index) => (
          <Bar 
            key={key} 
            dataKey={key} 
            stackId={stacked ? "a" : undefined}
            fill={colors[index % colors.length]} 
            radius={stacked ? [0, 0, 0, 0] : [4, 4, 0, 0]} 
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

export function AreaChart({ data, dataKeys, colors = COLORS, stacked = false }: { data: any[], dataKeys: string[], colors?: string[], stacked?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
        {dataKeys.map((key, index) => (
          <Area 
            key={key} 
            type="monotone"
            dataKey={key} 
            stackId={stacked ? "a" : undefined}
            stroke={colors[index % colors.length]}
            fillOpacity={0.1}
            fill={colors[index % colors.length]}
            strokeWidth={2}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, dataKey = "value", nameKey = "name", colors = COLORS }: { data: any[], dataKey?: string, nameKey?: string, colors?: string[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey={dataKey}
          nameKey={nameKey}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill || colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}

export function ProgressChart({ data }: { data: { name: string, value: number, color?: string }[] }) {
  return (
    <div className="space-y-4 w-full">
      {data.map((item, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium text-slate-700">{item.name}</span>
            <span className="font-bold text-slate-900">{item.value}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${item.value}%`, backgroundColor: item.color || COLORS[idx % COLORS.length] }} 
            />
          </div>
        </div>
      ))}
    </div>
  );
}
