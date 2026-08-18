"use client";

import React from "react";
import { 
  Package, ShoppingCart, CreditCard, DollarSign, TrendingUp,
  BarChart3, PieChart
} from "lucide-react";
import { mockMarketplaceAnalytics } from "@/lib/mock/admin-marketplace";

export default function MarketplaceDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium">Total Revenue</p>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-[#0B2545]">Rs. {mockMarketplaceAnalytics.totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" />
            + Rs. {mockMarketplaceAnalytics.revenueToday.toLocaleString()} today
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium">Pending Payments</p>
            <CreditCard className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-[#0B2545]">{mockMarketplaceAnalytics.pendingPayments}</p>
          <p className="text-xs text-amber-600 mt-1 font-medium">Action Required</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium">Total Orders</p>
            <ShoppingCart className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-[#0B2545]">{mockMarketplaceAnalytics.totalOrders.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">{mockMarketplaceAnalytics.approvedPayments.toLocaleString()} approved</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium">Active Products</p>
            <Package className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-[#0B2545]">{mockMarketplaceAnalytics.publishedProducts}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Out of {mockMarketplaceAnalytics.totalProducts} total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mock Chart Area - Sales over time */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center min-h-[300px]">
          <h3 className="font-bold text-[#0B2545] mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-400" />
            Revenue Over Time (Mock)
          </h3>
          <div className="flex-1 flex items-end justify-between gap-2 px-4 pb-4 border-b border-slate-100 relative h-48">
            {/* Simple CSS bars for mock data */}
            {[40, 65, 45, 80, 55, 90, 75].map((height, i) => (
              <div key={i} className="w-full relative flex items-end justify-center h-full group">
                <div 
                  className="w-full bg-[#0B2545] rounded-t-sm opacity-80 group-hover:opacity-100 transition-all duration-300"
                  style={{ height: `${height}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2 px-4">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>

        {/* Mock Chart Area - Payment Methods */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center min-h-[300px]">
          <h3 className="font-bold text-[#0B2545] mb-6 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-slate-400" />
            Payment Methods Usage (Mock)
          </h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-700">eSewa</span>
                <span className="font-bold text-green-600">65%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full w-[65%]" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-700">Khalti</span>
                <span className="font-bold text-purple-600">25%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full w-[25%]" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-700">Bank Transfer</span>
                <span className="font-bold text-blue-600">10%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full w-[10%]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
