"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, Filter, CheckCircle2, XCircle, CreditCard, AlertCircle,
  Eye, Image as ImageIcon, MessageSquareWarning, X, Download, ZoomIn, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { marketplaceApi, PaymentSubmission } from "@/lib/api/marketplace";
import { toast } from "sonner";

export default function MarketplacePaymentsPage() {
  const [search, setSearch] = useState("");
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentSubmission | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  
  const [rejectionReason, setRejectionReason] = useState("Invalid / Unclear Screenshot");
  const [rejectionNote, setRejectionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const data = await marketplaceApi.adminGetSubmissions();
      setSubmissions(data);
      if (selectedPayment) {
        const updated = data.find(p => p.id === selectedPayment.id);
        setSelectedPayment(updated || null);
      }
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = submissions.filter(p => {
    const studentName = p.student_details?.first_name 
      ? `${p.student_details.first_name} ${p.student_details.last_name}`
      : p.student_details?.username || "Unknown";
    return (
      p.transaction_id.toLowerCase().includes(search.toLowerCase()) || 
      studentName.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toString().includes(search)
    );
  });

  const getStatusColor = (status: string) => {
    switch(status.toUpperCase()) {
      case "PENDING": return "bg-amber-100 text-amber-700 border-amber-200";
      case "NEEDS REVIEW": return "bg-orange-100 text-orange-700 border-orange-200";
      case "APPROVED": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "REJECTED": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const handleApprove = async () => {
    if(!selectedPayment) return;
    if(confirm(`Are you sure you want to approve transaction ${selectedPayment.transaction_id}? This will grant access to the student.`)) {
      setSubmitting(true);
      try {
        await marketplaceApi.adminReviewSubmission(selectedPayment.id, 'APPROVED');
        toast.success("Payment Approved successfully.");
        await fetchSubmissions();
      } catch (err: any) {
        toast.error(err.message || "Failed to approve payment");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleReject = async () => {
    if(!selectedPayment) return;
    setSubmitting(true);
    try {
      const fullReason = `${rejectionReason}${rejectionNote ? ' - ' + rejectionNote : ''}`;
      await marketplaceApi.adminReviewSubmission(selectedPayment.id, 'REJECTED', fullReason);
      toast.success("Payment Rejected.");
      setIsRejectModalOpen(false);
      await fetchSubmissions();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 relative">
      
      {/* Main Table Area */}
      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${selectedPayment ? 'hidden lg:flex lg:w-1/2' : 'w-full'}`}>
        <div className="bg-white p-4 rounded-t-xl shadow-sm border border-b-0 border-slate-200 flex justify-between items-center shrink-0">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search Transaction ID, Order ID, Student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-50"
            />
          </div>
          <Button variant="outline" className="bg-white gap-2">
            <Filter className="w-4 h-4" /> Filters
          </Button>
        </div>

        <div className="bg-white rounded-b-xl shadow-sm border border-slate-200 flex-1 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-slate-50 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <TableRow>
                <TableHead>Code & Student</TableHead>
                <TableHead>Amount & Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                    Loading payments...
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                    <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p>No payments found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => {
                  const studentName = payment.student_details?.first_name 
                    ? `${payment.student_details.first_name} ${payment.student_details.last_name}`
                    : payment.student_details?.username || "Unknown";
                    
                  return (
                    <TableRow 
                      key={payment.id} 
                      className={`cursor-pointer hover:bg-slate-50 transition-colors ${selectedPayment?.id === payment.id ? 'bg-blue-50/50 border-l-4 border-l-[#0B2545]' : 'border-l-4 border-l-transparent'}`}
                      onClick={() => setSelectedPayment(payment)}
                    >
                      <TableCell>
                        <div className="font-mono text-xs font-bold text-[#0B2545]">{payment.transaction_id}</div>
                        <div className="text-sm font-medium text-slate-700 mt-1">{studentName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-800">Rs. {Number(payment.submitted_amount).toLocaleString()}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{payment.payment_method_details?.display_name || 'N/A'}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-[#0B2545]">
                          Verify <Eye className="w-4 h-4 ml-1" />
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

      {/* Verification Panel (Slide-over/Side Panel) */}
      {selectedPayment && (
        <div className="flex flex-col w-full lg:w-1/2 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden shrink-0">
          {/* Panel Header */}
          <div className="bg-[#0B2545] text-white p-4 flex justify-between items-center shrink-0">
            <div>
              <h3 className="font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#D4A72C]" />
                Verify Payment
              </h3>
              <p className="text-white/60 text-xs mt-0.5">Order: #{selectedPayment.id}</p>
            </div>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-8 w-8" onClick={() => setSelectedPayment(null)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Warning State */}
            {selectedPayment.status === "PENDING" && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-sm flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                <p>Carefully verify the <strong>Transaction Code</strong> and <strong>Amount</strong> against the uploaded screenshot before approving.</p>
              </div>
            )}

            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Student</p>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-[#0B2545] text-white text-[10px]">
                      {(selectedPayment.student_details?.first_name?.[0] || selectedPayment.student_details?.username?.[0] || 'U').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {selectedPayment.student_details?.first_name 
                      ? `${selectedPayment.student_details.first_name} ${selectedPayment.student_details.last_name}`
                      : selectedPayment.student_details?.username || "Unknown"}
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Product</p>
                <p className="font-semibold text-[#0B2545] text-sm mt-1 truncate">{selectedPayment.product_details?.title}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Payment Method</p>
                <p className="font-bold text-slate-800 mt-1">{selectedPayment.payment_method_details?.display_name}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Amount to Verify</p>
                <p className="font-bold text-emerald-600 text-lg mt-0.5 leading-none">Rs. {Number(selectedPayment.submitted_amount).toLocaleString()}</p>
              </div>
            </div>

            {/* Transaction Code Box */}
            <div className="bg-slate-800 rounded-lg p-4 text-center">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Student Entered Code</p>
              <div className="bg-slate-900 rounded p-3 font-mono text-xl text-white tracking-widest break-all">
                {selectedPayment.transaction_id}
              </div>
            </div>

            {/* Screenshot Preview */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <h4 className="font-bold text-[#0B2545] flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                  Uploaded Screenshot
                </h4>
                <div className="flex gap-2">
                  <a href={selectedPayment.screenshot} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground h-7 px-3 text-xs bg-white text-slate-600">
                    <ZoomIn className="w-3 h-3 mr-1"/> Zoom
                  </a>
                </div>
              </div>
              
              <div className="border-2 border-dashed border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center min-h-[300px]">
                {selectedPayment.screenshot ? (
                  <img src={selectedPayment.screenshot} alt="Payment Screenshot" className="max-w-full max-h-[400px] object-contain" />
                ) : (
                  <div className="text-center text-slate-400 p-6">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="font-medium text-sm">No screenshot uploaded.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Note Box */}
            {selectedPayment.note && (
              <div className="bg-slate-50 rounded-lg p-4 text-left border border-slate-100">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Student Note</p>
                <div className="text-slate-700 text-sm">
                  {selectedPayment.note}
                </div>
              </div>
            )}

          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3 shrink-0">
            {selectedPayment.status === "PENDING" && (
              <Button onClick={handleApprove} disabled={submitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Approve & Grant Access
              </Button>
            )}
            
            {selectedPayment.status === "PENDING" && (
              <Button 
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-11 font-semibold bg-white"
                onClick={() => setIsRejectModalOpen(true)}
                disabled={submitting}
              >
                <XCircle className="w-5 h-5 mr-2" />
                Reject Payment
              </Button>
            )}

            {selectedPayment.status === "REJECTED" && (
              <div className="flex-1 text-center text-red-600 font-semibold p-2">
                Rejected: {selectedPayment.rejection_reason}
              </div>
            )}
            
            {selectedPayment.status === "APPROVED" && (
              <div className="flex-1 text-center text-emerald-600 font-semibold p-2">
                Approved
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal Overlay */}
      {isRejectModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-red-50/50">
              <h3 className="font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Reject Payment
              </h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => setIsRejectModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">Please provide a reason for rejecting this payment. The student will be notified.</p>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Rejection Reason *</label>
                <select 
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                >
                  <option>Invalid / Unclear Screenshot</option>
                  <option>Incorrect Transaction Code</option>
                  <option>Payment Amount Incorrect</option>
                  <option>Duplicate Payment Detected</option>
                  <option>Payment Not Found in Statement</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Additional Note to Student</label>
                <Textarea 
                  placeholder="E.g., Please upload a clearer screenshot where the transaction code is visible." 
                  className="resize-none" 
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsRejectModalOpen(false)} disabled={submitting}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleReject} disabled={submitting}>
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
