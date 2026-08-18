"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { marketplaceApi, PaymentSubmission } from "@/lib/api/marketplace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, XCircle, ZoomIn } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import toast from "react-hot-toast";
import Image from "next/image";

export default function AdminPaymentReviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  
  const [submission, setSubmission] = useState<PaymentSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'super-admin'))) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      const data = await marketplaceApi.adminGetSubmissions();
      const match = data.find(s => s.id === id);
      if (match) {
        setSubmission(match);
      } else {
        toast.error("Payment submission not found.");
        router.push("/admin-dashboard/platform/marketplace/payments");
      }
    } catch (error) {
      console.error("Failed to load submission", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'super-admin') {
      loadSubmission();
    }
  }, [user, id]);

  const handleAction = async (status: 'APPROVED' | 'REJECTED') => {
    if (status === 'REJECTED' && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    
    try {
      setProcessing(true);
      await marketplaceApi.adminReviewSubmission(id, status, rejectionReason);
      toast.success(`The payment has been successfully ${status.toLowerCase()}.`);
      loadSubmission(); // reload to get new status
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "An error occurred.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading payment details...</div>;
  }

  if (!submission) return null;

  const isPending = submission.status === 'PENDING';
  const amountMismatch = submission.submitted_amount !== submission.expected_amount;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin-dashboard/platform/marketplace/payments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Review Payment</h2>
          <p className="text-muted-foreground">
            Verify payment details and proof of payment.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Status</span>
                  <Badge variant={isPending ? "outline" : (submission.status === 'APPROVED' ? 'default' : 'destructive')}>
                    {submission.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Submitted Date</span>
                  <span className="font-medium">{format(new Date(submission.submitted_at), "MMM d, yyyy HH:mm")}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Transaction ID</span>
                  <span className="font-mono bg-muted px-2 py-1 rounded">{submission.transaction_id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Payment Method</span>
                  <span className="font-medium">{submission.payment_method_details?.display_name || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Amounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="text-muted-foreground block mb-1">Expected Amount</span>
                  <span className="font-medium text-lg">Rs. {submission.expected_amount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Submitted Amount</span>
                  <span className={`font-medium text-lg ${amountMismatch ? 'text-red-500' : 'text-green-600'}`}>
                    Rs. {submission.submitted_amount}
                  </span>
                </div>
              </div>
              {amountMismatch && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
                  <strong>Warning:</strong> The submitted amount does not match the product's price.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Student & Product</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="text-muted-foreground block mb-1">Student</span>
                <div className="font-medium">{submission.student_details?.first_name} {submission.student_details?.last_name}</div>
                <div className="text-muted-foreground">@{submission.student_details?.username} | {submission.student_details?.email}</div>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Product</span>
                <div className="font-medium">{submission.product_details?.title}</div>
                <div className="text-muted-foreground">{submission.product_details?.category}</div>
              </div>
              {submission.note && (
                <div>
                  <span className="text-muted-foreground block mb-1">Student Note</span>
                  <div className="bg-muted p-3 rounded-md italic">"{submission.note}"</div>
                </div>
              )}
            </CardContent>
          </Card>

          {isPending && (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle>Action</CardTitle>
                <CardDescription>Approve or reject this payment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rejection Reason (if rejecting)</label>
                  <Textarea 
                    placeholder="E.g., Transaction ID incorrect, Amount mismatch, Screenshot unclear..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
                <div className="flex gap-4">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700" 
                    disabled={processing}
                    onClick={() => handleAction('APPROVED')}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve Payment
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full" 
                    disabled={processing}
                    onClick={() => handleAction('REJECTED')}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!isPending && (
            <Card>
              <CardHeader>
                <CardTitle>Verification Record</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground font-medium">Verified On:</span>{" "}
                  {submission.verified_at ? format(new Date(submission.verified_at), "PPP p") : 'N/A'}
                </div>
                {submission.status === 'REJECTED' && submission.rejection_reason && (
                  <div>
                    <span className="text-muted-foreground font-medium block mt-2 mb-1">Rejection Reason:</span>
                    <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
                      {submission.rejection_reason}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>

        <div>
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Payment Proof</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <a href={`${baseUrl}${submission.screenshot}`} target="_blank" rel="noopener noreferrer">
                  <ZoomIn className="mr-2 h-4 w-4" />
                  View Full Size
                </a>
              </Button>
            </CardHeader>
            <CardContent className="flex-grow flex items-center justify-center p-0 overflow-hidden bg-muted/30">
              <div className="relative w-full h-[600px]">
                <Image
                  src={`${baseUrl}${submission.screenshot}`}
                  alt="Payment Proof"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
