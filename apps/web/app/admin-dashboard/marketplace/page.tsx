"use client";

import React, { useEffect, useState } from "react";
import {
  Package, ShoppingCart, CreditCard, DollarSign, TrendingUp,
  BarChart3, PieChart as PieChartIcon, AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { marketplaceApi, MarketplaceOverview } from "@/lib/api/marketplace";
import { Skeleton } from "@/components/ui/skeleton";

const METHOD_COLORS = ["#22c55e", "#a855f7", "#3b82f6", "#f59e0b", "#ef4444"];

export default function MarketplaceDashboardPage() {
  const [stats, setStats] = useState<MarketplaceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await marketplaceApi.adminGetOverview();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch marketplace stats:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading marketplace dashboard">
        {/* Overview Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-center space-y-3">
              <div className="flex justify-between items-start">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Skeleton className="w-5 h-5 rounded" />
              <Skeleton className="h-5 w-44" />
            </div>
            <div className="h-56 flex items-end gap-3 pt-6 px-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="flex-1 rounded-t"
                  style={{ height: `${20 + ((i * 13) % 70)}%` }}
                />
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Skeleton className="w-5 h-5 rounded" />
              <Skeleton className="h-5 w-48" />
            </div>
            <div className="space-y-5 pt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="w-full h-2 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center rounded-xl border border-dashed border-destructive/30 bg-destructive/5 my-6 space-y-3">
        <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
        <h3 className="font-semibold text-foreground">Failed to load marketplace statistics</h3>
        <p className="text-sm text-muted-foreground">An error occurred while fetching dashboard overview metrics.</p>
        <button
          onClick={fetchStats}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium">Total Revenue</p>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-[#0B2545]">Rs. {stats.revenue.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" />
            + Rs. {stats.revenueToday.toLocaleString()} today
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium">Pending Payments</p>
            <CreditCard className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-[#0B2545]">{stats.pendingOrders}</p>
          <p className="text-xs text-amber-600 mt-1 font-medium">Action Required</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium">Total Orders</p>
            <ShoppingCart className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-[#0B2545]">{stats.totalOrders.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            {stats.completedOrders.toLocaleString()} approved &middot; {stats.cancelledOrders.toLocaleString()} rejected
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium">Active Products</p>
            <Package className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-[#0B2545]">{stats.activeProducts}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Out of {stats.totalProducts} total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-[#0B2545] mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-400" />
            Revenue - Last 7 Days
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [`Rs. ${Number(value).toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="#0B2545" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-[#0B2545] mb-6 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-slate-400" />
            Payment Methods Usage
          </h3>
          {stats.paymentMethodBreakdown.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
              <CreditCard className="w-8 h-8" />
              <p className="text-sm">No payment submissions yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {stats.paymentMethodBreakdown.map((m, i) => (
                <div key={m.method} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-slate-700">{m.method}</span>
                    <span className="font-bold" style={{ color: METHOD_COLORS[i % METHOD_COLORS.length] }}>
                      {m.percentage}% ({m.count})
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${m.percentage}%`, backgroundColor: METHOD_COLORS[i % METHOD_COLORS.length] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
