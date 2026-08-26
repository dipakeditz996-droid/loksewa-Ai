"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, Eye, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api/client";

interface Payment {
  id: number;
  student_name: string;
  plan_details: {
    name: string;
    duration: number;
    duration_unit: string;
  };
  payment_method_details: {
    display_name: string;
  };
  amount: string;
  transaction_id: string;
  status: string;
  submitted_at: string;
}

export default function AdminSubscriptionPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient<Payment[]>("/subscriptions/payments/");
      setPayments(data);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PENDING':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'APPROVED':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0B2545]">Payment Verification</h1>
          <p className="text-slate-500 mt-1">Review and approve student premium subscription purchases</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-[16px] border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-sm font-medium text-slate-500">Total Requests</p>
          <p className="text-2xl font-bold text-[#0B2545]">{payments.length}</p>
        </div>
        <div className="bg-white p-5 rounded-[16px] border border-amber-200 shadow-sm flex flex-col justify-center bg-amber-50/30">
          <p className="text-sm font-medium text-amber-600">Pending</p>
          <p className="text-2xl font-bold text-amber-700">{payments.filter(p => p.status === 'PENDING').length}</p>
        </div>
        <div className="bg-white p-5 rounded-[16px] border border-emerald-200 shadow-sm flex flex-col justify-center bg-emerald-50/30">
          <p className="text-sm font-medium text-emerald-600">Approved</p>
          <p className="text-2xl font-bold text-emerald-700">{payments.filter(p => p.status === 'APPROVED').length}</p>
        </div>
        <div className="bg-[#0B2545] p-5 rounded-[16px] border border-[#163E6B] shadow-sm flex flex-col justify-center text-white">
          <p className="text-sm font-medium text-slate-300">Total Revenue</p>
          <p className="text-2xl font-bold text-[#D4A72C]">
            Rs. {payments.filter(p => p.status === 'APPROVED').reduce((acc, p) => acc + parseFloat(p.amount), 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-sm font-medium text-slate-500">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Method / TXN ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No payment requests found.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-[#0B2545]">{payment.student_name || 'Unknown Student'}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <p className="font-medium">{payment.plan_details?.name}</p>
                      <p className="text-xs text-slate-400">{payment.plan_details?.duration} {payment.plan_details?.duration_unit}</p>
                    </td>
                    <td className="px-6 py-4 text-[#0B2545] font-semibold">
                      Rs. {payment.amount}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-600">{payment.payment_method_details?.display_name || 'N/A'}</p>
                      <p className="text-xs font-mono text-slate-400">{payment.transaction_id}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(payment.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm" className="gap-1.5 border-slate-200">
                        <Eye className="h-3.5 w-3.5" />
                        Review
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
