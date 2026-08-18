"use client";

import React, { useState } from "react";
import { 
  Search, Filter, ShoppingCart, CheckCircle2, 
  MoreHorizontal, Eye, Ban, Download, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockOrders } from "@/lib/mock/admin-marketplace";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function MarketplaceOrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredOrders = mockOrders.filter(o => {
    const matchesSearch = 
      o.orderId.toLowerCase().includes(search.toLowerCase()) || 
      o.student.name.toLowerCase().includes(search.toLowerCase()) ||
      o.productName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || o.orderStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getOrderStatusColor = (status: string) => {
    switch(status) {
      case "Pending": return "bg-slate-100 text-slate-700 border-slate-200";
      case "Processing": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Completed": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Cancelled": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch(status) {
      case "Pending": return "text-slate-500 bg-slate-100";
      case "Submitted": return "text-amber-600 bg-amber-100";
      case "Approved": return "text-emerald-600 bg-emerald-100";
      case "Rejected": return "text-red-600 bg-red-100";
      case "Refunded": return "text-purple-600 bg-purple-100";
      default: return "text-slate-500 bg-slate-100";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search Order ID, Student, Product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-50"
            />
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select 
            className="h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 flex-1 sm:flex-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <Button variant="outline" className="bg-white gap-2 px-3">
            <Filter className="w-4 h-4" /> <span className="hidden sm:inline">More Filters</span>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-32">Order ID & Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Order Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p>No orders found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const studentInitials = order.student.name.split(" ").map(n => n[0]).join("").substring(0,2).toUpperCase();
                  return (
                    <TableRow key={order.id} className="hover:bg-slate-50/80">
                      <TableCell>
                        <div className="font-mono text-xs font-semibold text-[#0B2545]">{order.orderId}</div>
                        <div className="text-[11px] text-slate-400 mt-1">{new Date(order.createdAt).toLocaleDateString()}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 border border-slate-200">
                            {order.student.avatar ? (
                              <AvatarImage src={order.student.avatar} alt={order.student.name} />
                            ) : (
                              <AvatarFallback className="bg-slate-100 text-slate-600 text-[10px] font-bold">{studentInitials}</AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-700 text-xs">{order.student.name}</span>
                            <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{order.student.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-sm text-[#0B2545] line-clamp-2">{order.productName}</span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-800">
                        Rs. {order.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${getPaymentStatusColor(order.paymentStatus)}`}>
                          {order.paymentStatus}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getOrderStatusColor(order.orderStatus)}`}>
                          {order.orderStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-[#0B2545]">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer">
                              <Eye className="mr-2 h-4 w-4" /> View Order Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              <Download className="mr-2 h-4 w-4" /> Download Invoice
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {order.orderStatus !== "Completed" && (
                              <DropdownMenuItem className="cursor-pointer text-emerald-600 focus:text-emerald-600">
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Completed
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="cursor-pointer text-amber-600 focus:text-amber-600">
                              <RotateCcw className="mr-2 h-4 w-4" /> Process Refund
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600">
                              <Ban className="mr-2 h-4 w-4" /> Cancel Order
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
