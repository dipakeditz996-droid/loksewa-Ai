"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, Eye, Gift } from "lucide-react";
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

interface CourseApplication {
  id: number;
  student: { id: number; name: string; username: string; email: string };
  course: { id: number; title: string };
  application_status: "pending" | "approved" | "rejected" | "cancelled";
  applied_at: string;
  payment: { id: number; status: string; amount: string; plan_name: string } | null;
}

// A unified row so the table can render both payment-backed applications
// (paid plans) and free/direct course applications (no payment involved)
// side by side, each dispatching to its own approve/reject endpoint.
type Row =
  | { kind: "payment"; id: number; data: Payment }
  | { kind: "free_application"; id: number; data: CourseApplication };

export default function AdminApplicationsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [freeApplications, setFreeApplications] = useState<CourseApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [paymentsData, applicationsData] = await Promise.all([
        apiClient<Payment[]>("/subscriptions/payments/"),
        apiClient<{ results: CourseApplication[] }>("/admin/course-applications/"),
      ]);
      setPayments((paymentsData as any).results || paymentsData || []);
      // Only applications with no linked payment are shown here — payment-linked
      // ones are already represented (and actioned) via the payments list above,
      // and get auto-synced to 'approved'/kept in sync when that payment is approved.
      setFreeApplications((applicationsData.results || []).filter((a) => !a.payment));
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentAction = async (id: number, action: "approve" | "reject") => {
    setActioningId(`payment-${id}`);
    try {
      await apiClient(`/subscriptions/payments/${id}/${action}/`, { method: "POST" });
      await fetchAll();
    } catch (error) {
      console.error(`Failed to ${action} payment`, error);
      alert(`Failed to ${action} payment`);
    } finally {
      setActioningId(null);
    }
  };

  const handleApplicationAction = async (id: number, action: "approved" | "rejected") => {
    setActioningId(`application-${id}`);
    try {
      await apiClient(`/admin/course-applications/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: action }),
      });
      await fetchAll();
    } catch (error) {
      console.error(`Failed to ${action} application`, error);
      alert(`Failed to update application`);
    } finally {
      setActioningId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "APPROVED":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const rows: Row[] = [
    ...payments.map((p): Row => ({ kind: "payment", id: p.id, data: p })),
    ...freeApplications.map((a): Row => ({ kind: "free_application", id: a.id, data: a })),
  ].sort((a, b) => {
    const dateA = a.kind === "payment" ? a.data.submitted_at : a.data.applied_at;
    const dateB = b.kind === "payment" ? b.data.submitted_at : b.data.applied_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  const pendingCount = payments.filter((p) => p.status === "PENDING").length + freeApplications.filter((a) => a.application_status === "pending").length;
  const approvedCount = payments.filter((p) => p.status === "APPROVED").length + freeApplications.filter((a) => a.application_status === "approved").length;
  const totalRevenue = payments.filter((p) => p.status === "APPROVED").reduce((acc, p) => acc + parseFloat(p.amount), 0);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0B2545]">Student Applications</h1>
          <p className="text-slate-500 mt-1">Review and approve student course applications and subscriptions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-[16px] border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-sm font-medium text-slate-500">Total Requests</p>
          <p className="text-2xl font-bold text-[#0B2545]">{rows.length}</p>
        </div>
        <div className="bg-white p-5 rounded-[16px] border border-amber-200 shadow-sm flex flex-col justify-center bg-amber-50/30">
          <p className="text-sm font-medium text-amber-600">Pending</p>
          <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
        </div>
        <div className="bg-white p-5 rounded-[16px] border border-emerald-200 shadow-sm flex flex-col justify-center bg-emerald-50/30">
          <p className="text-sm font-medium text-emerald-600">Approved</p>
          <p className="text-2xl font-bold text-emerald-700">{approvedCount}</p>
        </div>
        <div className="bg-[#0B2545] p-5 rounded-[16px] border border-[#163E6B] shadow-sm flex flex-col justify-center text-white">
          <p className="text-sm font-medium text-slate-300">Total Revenue</p>
          <p className="text-2xl font-bold text-[#D4A72C]">
            Rs. {totalRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-sm font-medium text-slate-500">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Course / Plan</th>
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
                    Loading applications...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No applications found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  if (row.kind === "payment") {
                    const payment = row.data;
                    const isActioning = actioningId === `payment-${payment.id}`;
                    return (
                      <tr key={`payment-${payment.id}`} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-[#0B2545]">{payment.student_name || "Unknown Student"}</td>
                        <td className="px-6 py-4 text-slate-600">
                          <p className="font-medium">{payment.plan_details?.name}</p>
                          <p className="text-xs text-slate-400">{payment.plan_details?.duration} {payment.plan_details?.duration_unit}</p>
                        </td>
                        <td className="px-6 py-4 text-[#0B2545] font-semibold">
                          Rs. {payment.amount}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-600">{payment.payment_method_details?.display_name || "N/A"}</p>
                          <p className="text-xs font-mono text-slate-400">{payment.transaction_id}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {new Date(payment.submitted_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(payment.status)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {payment.status === "PENDING" ? (
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" disabled={isActioning} onClick={() => handlePaymentAction(payment.id, "reject")} className="border-red-200 text-red-600 hover:bg-red-50">
                                Reject
                              </Button>
                              <Button variant="default" size="sm" disabled={isActioning} onClick={() => handlePaymentAction(payment.id, "approve")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                Approve
                              </Button>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" className="gap-1.5 border-slate-200">
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  const app = row.data;
                  const isActioning = actioningId === `application-${app.id}`;
                  return (
                    <tr key={`application-${app.id}`} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-[#0B2545]">{app.student.name || app.student.username}</td>
                      <td className="px-6 py-4 text-slate-600">
                        <p className="font-medium">{app.course.title}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1"><Gift className="w-3 h-3" /> Free / Direct application</p>
                      </td>
                      <td className="px-6 py-4 text-slate-400">—</td>
                      <td className="px-6 py-4 text-slate-400">No payment required</td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(app.applied_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(app.application_status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {app.application_status === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" disabled={isActioning} onClick={() => handleApplicationAction(app.id, "rejected")} className="border-red-200 text-red-600 hover:bg-red-50">
                              Reject
                            </Button>
                            <Button variant="default" size="sm" disabled={isActioning} onClick={() => handleApplicationAction(app.id, "approved")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                              Approve
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" className="gap-1.5 border-slate-200">
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
