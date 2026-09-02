"use client";

import React, { useState, useEffect } from "react";
import {
  Search, Filter, ShoppingCart, CheckCircle2,
  MoreHorizontal, Eye, Box, MapPin, Loader2, ArrowRight
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
import { marketplaceApi, Order } from "@/lib/api/marketplace";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function MarketplaceOrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);
  
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusNote, setStatusNote] = useState<string>("");

  const fetchOrders = async () => {
    try {
      const data = await marketplaceApi.adminGetOrders();
      setOrders(data);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewOrder || !newStatus) return;
    
    try {
      setActioningId(viewOrder.id);
      await marketplaceApi.adminUpdateOrderStatus(viewOrder.id, newStatus, statusNote);
      toast.success("Order status updated successfully.");
      setStatusNote("");
      await fetchOrders();
      
      // Update local viewOrder to reflect new history
      const updatedOrders = await marketplaceApi.adminGetOrders();
      const updatedOrder = updatedOrders.find(o => o.id === viewOrder.id);
      if (updatedOrder) setViewOrder(updatedOrder);
      
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update order status");
    } finally {
      setActioningId(null);
    }
  };

  const handleUpdateItemStatus = async (itemId: number, fulfillment_status: string, payout_status: string) => {
    if (!viewOrder) return;
    try {
      await marketplaceApi.adminUpdateOrderItemStatus(viewOrder.id, itemId, fulfillment_status, payout_status);
      toast.success("Item status updated successfully.");
      
      const updatedOrders = await marketplaceApi.adminGetOrders();
      setOrders(updatedOrders);
      const updatedOrder = updatedOrders.find(o => o.id === viewOrder.id);
      if (updatedOrder) setViewOrder(updatedOrder);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update item status");
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.id.toString().includes(search) || 
      (o.shipping_address || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.contact_number || "").includes(search);
      
    const matchesStatus = statusFilter === "All" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getOrderStatusColor = (status: string) => {
    switch(status) {
      case "PENDING_PAYMENT": return "bg-slate-100 text-slate-700 border-slate-200";
      case "PAYMENT_SUBMITTED": return "bg-amber-100 text-amber-700 border-amber-200";
      case "PAYMENT_VERIFICATION": return "bg-blue-100 text-blue-700 border-blue-200";
      case "CONFIRMED": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "PROCESSING": return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "SHIPPED": return "bg-purple-100 text-purple-700 border-purple-200";
      case "OUT_FOR_DELIVERY": return "bg-pink-100 text-pink-700 border-pink-200";
      case "DELIVERED": return "bg-green-100 text-green-700 border-green-200";
      case "CANCELLED":
      case "REFUNDED": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const statusOptions = [
    "PENDING_PAYMENT", "PAYMENT_SUBMITTED", "PAYMENT_VERIFICATION", 
    "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", 
    "DELIVERED", "CANCELLED", "REFUNDED"
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search Order ID, Address, Contact..."
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
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-32">Order ID & Date</TableHead>
                <TableHead>Contact & Address</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Grand Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p>No orders found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  return (
                    <TableRow key={order.id} className="hover:bg-slate-50/80">
                      <TableCell>
                        <div className="font-mono text-xs font-semibold text-[#0B2545]">#ORD-{order.id}</div>
                        <div className="text-[11px] text-slate-400 mt-1">{new Date(order.created_at).toLocaleDateString()}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700 text-xs">{order.contact_number}</span>
                          <span className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5">{order.shipping_address}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                          {order.items.length} item(s)
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-bold text-slate-800">Rs. {Number(order.total_amount) + Number(order.delivery_fee)}</div>
                        {Number(order.delivery_fee) > 0 && <div className="text-[10px] text-slate-400">inc. Rs {order.delivery_fee} del.</div>}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getOrderStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setViewOrder(order);
                            setNewStatus(order.status);
                          }}
                        >
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!viewOrder} onOpenChange={(open: boolean) => !open && setViewOrder(null)}>
        <DialogContent className="w-full max-w-2xl overflow-y-auto max-h-[90vh] bg-slate-50">
          {viewOrder && (
            <div className="space-y-8 py-4">
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <Box className="w-6 h-6 text-primary" /> Order #ORD-{viewOrder.id}
                </DialogTitle>
              </DialogHeader>
              
              <div className="bg-white rounded-xl border p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b pb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getOrderStatusColor(viewOrder.status)}`}>
                    {viewOrder.status}
                  </span>
                  <span className="text-sm font-semibold">Total: Rs. {Number(viewOrder.total_amount) + Number(viewOrder.delivery_fee)}</span>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-slate-700">
                    <MapPin className="w-4 h-4" /> Shipping Address
                  </h4>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border">
                    {viewOrder.shipping_address}
                    <br/><br/>
                    <strong>Contact:</strong> {viewOrder.contact_number}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-slate-700">Order Items (S2S Fulfillment)</h4>
                  <div className="space-y-4">
                    {viewOrder.items.map(item => (
                      <div key={item.id} className="flex flex-col gap-3 bg-slate-50 p-4 rounded-lg border text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-slate-800">{item.product_details?.title || item.snapshot_product_name || `Product #${item.product}`}</div>
                            <div className="text-slate-500 text-xs mt-1">
                              Qty: {item.quantity} × Rs. {item.price}
                            </div>
                            <div className="text-slate-500 text-xs mt-1">
                              Seller: {item.product_details?.seller_details?.full_name || item.snapshot_seller_name || "LoksewaAI Official"}
                            </div>
                          </div>
                          <div className="text-right text-xs">
                            <div className="text-emerald-600 font-semibold">Earnings: Rs. {item.seller_earning || 0}</div>
                            <div className="text-rose-500 font-medium">Comm: Rs. {item.commission_amount || 0}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-2 pt-3 border-t border-slate-200">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">Fulfillment Status</label>
                            <Select 
                              value={item.fulfillment_status || "PENDING"} 
                              onValueChange={(val) => handleUpdateItemStatus(item.id, val, item.payout_status || "PENDING")}
                            >
                              <SelectTrigger className="h-8 text-xs bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].map(s => (
                                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">Payout Status</label>
                            <Select 
                              value={item.payout_status || "PENDING"} 
                              onValueChange={(val) => handleUpdateItemStatus(item.id, item.fulfillment_status || "PENDING", val)}
                            >
                              <SelectTrigger className="h-8 text-xs bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {["PENDING", "ELIGIBLE", "PROCESSING", "PAID", "FAILED", "CANCELLED"].map(s => (
                                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border p-5 shadow-sm space-y-4">
                <h4 className="font-semibold text-slate-800">Update Status</h4>
                <form onSubmit={handleUpdateStatus} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500">New Status</label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500">Note (Optional)</label>
                    <Textarea 
                      placeholder="Add a tracking number or internal note..." 
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={actioningId !== null || newStatus === viewOrder.status}>
                    {actioningId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Confirm Status Change
                  </Button>
                </form>
              </div>
              
              {viewOrder.status_history && viewOrder.status_history.length > 0 && (
                <div className="bg-white rounded-xl border p-5 shadow-sm space-y-4">
                  <h4 className="font-semibold text-slate-800">Status History</h4>
                  <div className="space-y-4">
                    {viewOrder.status_history.map((history, idx) => (
                      <div key={history.id} className="relative pl-6 border-l-2 border-slate-200 ml-2">
                        <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-white" />
                        <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <span className="text-slate-500 line-through">{history.previous_status}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="text-primary">{history.new_status}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          By {history.changed_by_name} on {new Date(history.created_at).toLocaleString()}
                        </div>
                        {history.note && (
                          <div className="mt-2 text-xs bg-slate-50 p-2 rounded border text-slate-600">
                            {history.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
