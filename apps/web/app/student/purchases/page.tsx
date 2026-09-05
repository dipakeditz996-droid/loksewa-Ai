"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, Eye, AlertCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiClient } from "@/lib/api/client";

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
  remaining_days: number;
  computed_status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "CANCELLED";
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

import { Suspense } from "react";

function StudentPurchasesContent() {
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
        apiClient<Subscription[]>("/subscriptions/my-subscriptions/"),
        apiClient<Payment[]>("/subscriptions/payments/")
      ]);
      
      const active = subsRes.find((s: Subscription) => s.status === 'ACTIVE');
      if (active) setActiveSubscription(active);
      
      setPayments(paymentsRes);
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
        return <Badge className="bg-red-100 text-red-700 dark:text-red-300 hover:bg-red-100 border-none"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-primary dark:text-foreground">My Subscriptions</h1>
        <p className="text-muted-foreground mt-1">Manage your active plans and view payment history</p>
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
      <div className="bg-card rounded-[24px] border border-border shadow-sm p-6 lg:p-8">
        <h2 className="text-xl font-bold text-primary dark:text-foreground mb-6">Current Plan</h2>
        
        {isLoading ? (
          <div className="h-32 bg-muted/80 animate-pulse rounded-[16px]"></div>
        ) : activeSubscription ? (
          <div className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-[#0B2545] to-[#163E6B] text-white p-6 rounded-[20px] shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-card/5 rounded-full blur-3xl -mr-20 -mt-20"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  activeSubscription.computed_status === 'EXPIRED'
                    ? 'bg-red-500 text-white'
                    : activeSubscription.computed_status === 'EXPIRING_SOON'
                    ? 'bg-amber-400 text-[#0A1118]'
                    : 'bg-[#D4A72C] text-[#0A1118]'
                }`}>
                  {activeSubscription.computed_status === 'EXPIRED'
                    ? 'Expired'
                    : activeSubscription.computed_status === 'EXPIRING_SOON'
                    ? 'Expiring Soon'
                    : 'Active'}
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
              <div className={`text-4xl font-bold ${
                activeSubscription.computed_status === 'EXPIRED'
                  ? 'text-red-400'
                  : activeSubscription.computed_status === 'EXPIRING_SOON'
                  ? 'text-amber-400'
                  : 'text-[#D4A72C]'
              }`}>
                {activeSubscription.remaining_days}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-muted border-2 border-dashed border-border rounded-[20px] p-8 text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-primary dark:text-foreground">No Active Subscription</h3>
            <p className="text-muted-foreground mt-2 mb-6">Unlock premium features, AI tutoring, and advanced mock exams.</p>
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
      <div className="bg-card rounded-[24px] border border-border shadow-sm overflow-hidden">
        <div className="p-6 lg:p-8 border-b border-border">
          <h2 className="text-xl font-bold text-primary dark:text-foreground">Payment History</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted text-left text-sm font-medium text-muted-foreground">
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
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    You haven't made any purchases yet.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-primary dark:text-foreground">{payment.plan_details?.name}</td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">Rs. {payment.amount}</td>
                    <td className="px-6 py-4 text-muted-foreground">{new Date(payment.submitted_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {payment.status === 'APPROVED' && (
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:bg-blue-950/30">
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

export default function StudentPurchasesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading purchases...</div>}>
      <StudentPurchasesContent />
    </Suspense>
  );
}
