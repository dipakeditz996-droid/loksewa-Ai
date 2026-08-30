"use client";

import React, { useEffect, useState } from "react";
import {
  Package, ShoppingCart, CreditCard, DollarSign, TrendingUp,
  BarChart3, PieChart as PieChartIcon,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { marketplaceApi, MarketplaceOverview } from "@/lib/api/marketplace";

const METHOD_COLORS = ["#22c55e", "#a855f7", "#3b82f6", "#f59e0b", "#ef4444"];

export default function MarketplaceDashboardPage() {
  const [stats, setStats] = useState<MarketplaceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await marketplaceApi.adminGetOverview();
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch marketplace stats:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-slate-500">Loading dashboard...</div>;
  }

  if (error || !stats) {
    return <div className="p-6 text-center text-red-500">Failed to load marketplace statistics.</div>;
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
