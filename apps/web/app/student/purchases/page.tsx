"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, Eye, AlertCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Subscription {
  id: number;
  plan_details: {
    name: string;
    duration: number;
    duration_unit: string;
    price: string;
  };
  status: string;
  start_date: string;
  expiry_date: string;
}

interface Payment {
  id: number;
  plan_details: {
    name: string;
  };
  amount: string;
  status: string;
  submitted_at: string;
}

export default function StudentPurchasesPage() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [subsRes, paymentsRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/subscriptions/my-subscriptions/", {
          headers: { 'Authorization': 'Bearer test-token' }
        }),
        fetch("http://127.0.0.1:8000/api/subscriptions/payments/", {
          headers: { 'Authorization': 'Bearer test-token' }
        })
      ]);
      
      if (subsRes.ok) {
        const data = await subsRes.json();
        const active = data.find((s: Subscription) => s.status === 'ACTIVE');
        if (active) setActiveSubscription(active);
      }
      
      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPayments(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PENDING':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none"><Clock className="w-3 h-3 mr-1" /> Pending Verification</Badge>;
      case 'APPROVED':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#0B2545]">My Subscriptions</h1>
        <p className="text-slate-500 mt-1">Manage your active plans and view payment history</p>
      </div>

      {success && (
        <Alert className="bg-emerald-50 border-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-800 font-semibold">Payment Submitted Successfully!</AlertTitle>
          <AlertDescription className="text-emerald-700">
            Your payment is currently under review. Your premium features will be unlocked once approved.
          </AlertDescription>
        </Alert>
      )}

      {/* Active Plan Card */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 lg:p-8">
        <h2 className="text-xl font-bold text-[#0B2545] mb-6">Current Plan</h2>
        
        {isLoading ? (
          <div className="h-32 bg-slate-100 animate-pulse rounded-[16px]"></div>
        ) : activeSubscription ? (
          <div className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-[#0B2545] to-[#163E6B] text-white p-6 rounded-[20px] shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-[#D4A72C] text-[#0A1118] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Active
                </span>
              </div>
              <h3 className="text-2xl font-bold">{activeSubscription.plan_details.name}</h3>
              <p className="text-slate-300 mt-1 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Valid until {new Date(activeSubscription.expiry_date).toLocaleDateString()}
              </p>
            </div>
            
            <div className="relative z-10 mt-6 md:mt-0 text-center md:text-right">
              <p className="text-slate-300 text-sm mb-2">Days Remaining</p>
              <div className="text-4xl font-bold text-[#D4A72C]">
                {Math.ceil((new Date(activeSubscription.expiry_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[20px] p-8 text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[#0B2545]">No Active Subscription</h3>
            <p className="text-slate-500 mt-2 mb-6">Unlock premium features, AI tutoring, and advanced mock exams.</p>
            <Button 
              onClick={() => window.location.href = '/student/plans'}
              className="bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] font-bold"
            >
              View Pricing Plans
            </Button>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 lg:p-8 border-b border-slate-200">
          <h2 className="text-xl font-bold text-[#0B2545]">Payment History</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-sm font-medium text-slate-500">
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Date Submitted</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    You haven't made any purchases yet.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-[#0B2545]">{payment.plan_details?.name}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">Rs. {payment.amount}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(payment.submitted_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {payment.status === 'APPROVED' && (
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          View Receipt
                        </Button>
                      )}
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
