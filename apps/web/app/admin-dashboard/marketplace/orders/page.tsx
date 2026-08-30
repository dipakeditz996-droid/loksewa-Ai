"use client";

import React, { useState, useEffect } from "react";
import {
  Search, Filter, ShoppingCart, CheckCircle2,
  MoreHorizontal, Eye, Ban, X,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { marketplaceApi, Purchase } from "@/lib/api/marketplace";
import { toast } from "sonner";

export default function MarketplaceOrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [viewOrder, setViewOrder] = useState<Purchase | null>(null);

  const fetchPurchases = async () => {
    try {
      const data = await marketplaceApi.adminGetPurchases();
      setPurchases(data);
    } catch (error) {
      console.error("Failed to fetch purchases:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleRevoke = async (order: Purchase) => {
    if (!confirm(`Revoke access for this order? The student will lose access to "${order.product_details?.title}".`)) return;
    setActioningId(order.id);
    try {
      await marketplaceApi.adminRevokePurchase(order.id);
      toast.success("Access revoked.");
      await fetchPurchases();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke access");
    } finally {
      setActioningId(null);
    }
  };

  const handleReactivate = async (order: Purchase) => {
    setActioningId(order.id);
    try {
      await marketplaceApi.adminReactivatePurchase(order.id);
      toast.success("Access restored.");
      await fetchPurchases();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to restore access");
    } finally {
      setActioningId(null);
    }
  };

  const filteredOrders = purchases.filter(o => {
    const studentName = o.payment_submission_details?.student_details?.first_name 
      ? `${o.payment_submission_details.student_details.first_name} ${o.payment_submission_details.student_details.last_name}`
      : o.payment_submission_details?.student_details?.username || "Unknown";
      
    const matchesSearch = 
      o.id.toString().includes(search) || 
      studentName.toLowerCase().includes(search.toLowerCase()) ||
      (o.product_details?.title || "").toLowerCase().includes(search.toLowerCase());
      
    const matchesStatus = statusFilter === "All" || o.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const getOrderStatusColor = (status: string) => {
    switch(status.toUpperCase()) {
      case "PENDING": return "bg-slate-100 text-slate-700 border-slate-200";
      case "PROCESSING": return "bg-blue-100 text-blue-700 border-blue-200";
      case "ACTIVE":
      case "COMPLETED": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "REVOKED":
      case "CANCELLED": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch(status.toUpperCase()) {
      case "PENDING": return "text-slate-500 bg-slate-100";
      case "SUBMITTED": return "text-amber-600 bg-amber-100";
      case "APPROVED": return "text-emerald-600 bg-emerald-100";
      case "REJECTED": return "text-red-600 bg-red-100";
      case "REFUNDED": return "text-purple-600 bg-purple-100";
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
            <option value="ACTIVE">Active</option>
            <option value="REVOKED">Revoked</option>
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    Loading orders...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p>No orders found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const studentDetails = order.payment_submission_details?.student_details;
                  const studentName = studentDetails?.first_name 
                    ? `${studentDetails.first_name} ${studentDetails.last_name}`
                    : studentDetails?.username || "Unknown";
                  const studentEmail = studentDetails?.email || "";
                  const studentInitials = studentName.split(" ").map((n: string) => n[0]).join("").substring(0,2).toUpperCase();
                  
                  return (
                    <TableRow key={order.id} className="hover:bg-slate-50/80">
                      <TableCell>
                        <div className="font-mono text-xs font-semibold text-[#0B2545]">#{order.id}</div>
                        <div className="text-[11px] text-slate-400 mt-1">{new Date(order.created_at).toLocaleDateString()}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 border border-slate-200">
                            <AvatarFallback className="bg-slate-100 text-slate-600 text-[10px] font-bold">{studentInitials}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-700 text-xs">{studentName}</span>
                            <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{studentEmail}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-sm text-[#0B2545] line-clamp-2">{order.product_details?.title || "Unknown Product"}</span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-800">
                        Rs. {Number(order.amount_paid).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${getPaymentStatusColor(order.payment_submission_details?.status || "UNKNOWN")}`}>
                          {order.payment_submission_details?.status || "UNKNOWN"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getOrderStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-[#0B2545]" disabled={actioningId === order.id}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer" onClick={() => setViewOrder(order)}>
                              <Eye className="mr-2 h-4 w-4" /> View Order Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {order.status !== "ACTIVE" && (
                              <DropdownMenuItem
                                className="cursor-pointer text-emerald-600 focus:text-emerald-600"
                                onClick={() => handleReactivate(order)}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Reactivate Access
                              </DropdownMenuItem>
                            )}
                            {order.status === "ACTIVE" && (
                              <DropdownMenuItem
                                className="cursor-pointer text-red-600 focus:text-red-600"
                                onClick={() => handleRevoke(order)}
                              >
                                <Ban className="mr-2 h-4 w-4" /> Revoke Access
                              </DropdownMenuItem>
                            )}
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

      {viewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-[#0B2545]">Order #{viewOrder.id}</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => setViewOrder(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Product</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{viewOrder.product_details?.title || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Amount Paid</p>
                  <p className="font-semibold text-slate-800 mt-0.5">Rs. {Number(viewOrder.amount_paid).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Order Status</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{viewOrder.status}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Payment Status</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {viewOrder.payment_submission_details?.status || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Created</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {new Date(viewOrder.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Transaction ID</p>
                  <p className="font-mono text-xs text-slate-800 mt-0.5">
                    {viewOrder.payment_submission_details?.transaction_id || "N/A"}
                  </p>
                </div>
              </div>
              {viewOrder.payment_submission_details?.student_details && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 font-medium">Student</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {viewOrder.payment_submission_details.student_details.first_name
                      ? `${viewOrder.payment_submission_details.student_details.first_name} ${viewOrder.payment_submission_details.student_details.last_name}`
                      : viewOrder.payment_submission_details.student_details.username}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {viewOrder.payment_submission_details.student_details.email}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
