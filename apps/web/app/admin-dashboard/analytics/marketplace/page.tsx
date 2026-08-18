"use client";

import React from "react";
import { Store, ShoppingCart, CreditCard, DollarSign, Ban } from "lucide-react";
import { 
  mockMarketplaceMetrics, 
  mockProductPerformance,
} from "@/lib/mock/admin-analytics";
import { TrendCard, BarChart, DonutChart } from "@/components/analytics/ChartComponents";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function MarketplaceAnalyticsPage() {
  return (
    <div className="space-y-6">
      
      {/* Marketplace Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TrendCard 
          title="Total Orders" 
          value={mockMarketplaceMetrics.totalOrders.toLocaleString()} 
          trend={15} 
          icon={<ShoppingCart className="w-5 h-5 text-blue-500" />} 
        />
        <TrendCard 
          title="Approved Orders" 
          value={mockMarketplaceMetrics.approvedOrders.toLocaleString()} 
          trend={18} 
          icon={<Store className="w-5 h-5 text-emerald-500" />} 
        />
        <TrendCard 
          title="Pending Payments" 
          value={mockMarketplaceMetrics.pendingPayments} 
          trend={-5} 
          icon={<CreditCard className="w-5 h-5 text-amber-500" />} 
        />
        <TrendCard 
          title="Total Revenue" 
          value={`Rs. ${mockMarketplaceMetrics.revenue.toLocaleString()}`} 
          trend={12} 
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Over Time */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[350px] lg:col-span-2">
          <h3 className="font-bold text-[#0B2545] mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-slate-400" />
            Revenue Over Time (Last 7 Days)
          </h3>
          <div className="flex-1">
            <BarChart 
              data={[
                { name: "Mon", Revenue: 45000 },
                { name: "Tue", Revenue: 52000 },
                { name: "Wed", Revenue: 38000 },
                { name: "Thu", Revenue: 61000 },
                { name: "Fri", Revenue: 75000 },
                { name: "Sat", Revenue: 82000 },
                { name: "Sun", Revenue: 79000 },
              ]} 
              dataKeys={["Revenue"]} 
              colors={["#10b981"]}
            />
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[350px]">
          <h3 className="font-bold text-[#0B2545] mb-6 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-slate-400" />
            Payment Methods
          </h3>
          <div className="flex-1">
            <DonutChart 
              data={[
                { name: "eSewa", value: 65, fill: "#10b981" },
                { name: "Khalti", value: 25, fill: "#8b5cf6" },
                { name: "Bank Transfer", value: 10, fill: "#3b82f6" },
              ]} 
            />
          </div>
        </div>
      </div>

      {/* Product Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-[#0B2545]">Product Sales Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-white hover:bg-white">
                <TableHead>Product Name</TableHead>
                <TableHead className="text-center">Total Orders</TableHead>
                <TableHead className="text-right">Revenue Generated</TableHead>
                <TableHead className="text-center">Conversion Rate</TableHead>
                <TableHead className="text-center">Refunds</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockProductPerformance.map((product, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-semibold text-[#0B2545]">{product.name}</TableCell>
                  <TableCell className="text-center font-medium text-slate-700">{product.orders.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-700">Rs. {product.revenue.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                      {product.conversion}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {product.refunds > 0 ? (
                      <span className="flex items-center justify-center gap-1 text-red-600 font-medium">
                        <Ban className="w-3 h-3" /> {product.refunds}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-[#0B2545] hover:bg-slate-100">
                      View Orders
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
