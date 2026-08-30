"use client";

import React, { useEffect, useState } from "react";
import { marketplaceApi, PaymentSubmission, Purchase } from "@/lib/api/marketplace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShoppingBag, CheckCircle, Clock, XCircle, Download, Lock } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { RetryNextImage as Image } from "@/components/ui/retry-next-image";
import { Separator } from "@/components/ui/separator";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [purchData, subData] = await Promise.all([
        marketplaceApi.getPurchases(),
        marketplaceApi.getSubmissions()
      ]);
      setPurchases(purchData);
      setSubmissions(subData);
    } catch (error) {
      console.error("Failed to load purchases", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'PENDING': return <Clock className="h-4 w-4 text-yellow-600 mr-2" />;
      case 'APPROVED': return <CheckCircle className="h-4 w-4 text-green-600 mr-2" />;
      case 'REJECTED': return <XCircle className="h-4 w-4 text-red-600 mr-2" />;
      default: return null;
    }
  };

  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/student/marketplace">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">My Purchases</h2>
            <p className="text-muted-foreground">
              Manage your acquired materials and track payment statuses.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(n => (
            <Card key={n} className="animate-pulse h-40 bg-muted"></Card>
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* Active Purchases (Approved) */}
          <section>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" /> Your Materials
            </h3>
            {purchases.length === 0 ? (
              <div className="p-8 text-center border rounded-xl bg-card text-muted-foreground">
                You haven't purchased any materials yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {purchases.map(purchase => (
                  <Card key={purchase.id} className="overflow-hidden">
                    <div className="flex p-4 gap-4 h-full">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 bg-muted rounded-md shrink-0 relative overflow-hidden border">
                        {purchase.product_details?.cover_image && (
                          <Image
                            src={purchase.product_details.cover_image.startsWith('http') ? purchase.product_details.cover_image : `${baseUrl}${purchase.product_details.cover_image.startsWith('/') ? '' : '/'}${purchase.product_details.cover_image}`}
                            alt={purchase.product_details.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        )}
                      </div>
                      <div className="flex flex-col justify-between flex-grow py-1">
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <h4 className="font-semibold line-clamp-2">{purchase.product_details?.title}</h4>
                          </div>
                          <Badge variant="secondary" className="mb-2">{purchase.product_details?.category}</Badge>
                        </div>
                        
                        {purchase.product_details?.product_file ? (
                          <Button asChild size="sm" className="w-full sm:w-auto">
                            <a href={purchase.product_details.product_file.startsWith('http') ? purchase.product_details.product_file : `${baseUrl}${purchase.product_details.product_file.startsWith('/') ? '' : '/'}${purchase.product_details.product_file}`} target="_blank" rel="noopener noreferrer">
                              <Download className="mr-2 h-4 w-4" /> Download / Open
                            </a>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled className="w-full sm:w-auto">
                            <Lock className="mr-2 h-4 w-4" /> Pending File
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* Payment History */}
          <section>
            <h3 className="text-xl font-semibold mb-4">Payment Verification History</h3>
            {submissions.length === 0 ? (
              <div className="p-8 text-center border rounded-xl bg-card text-muted-foreground">
                No payment history found.
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map(sub => (
                  <Card key={sub.id}>
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
                        <div className="flex items-center gap-4 flex-grow">
                          <div className={`p-3 rounded-full shrink-0 ${
                            sub.status === 'PENDING' ? 'bg-yellow-100' :
                            sub.status === 'APPROVED' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {getStatusIcon(sub.status)}
                          </div>
                          <div>
                            <h4 className="font-semibold">{sub.product_details?.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              Transaction: <span className="font-mono">{sub.transaction_id}</span> • {format(new Date(sub.submitted_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:items-end gap-2 shrink-0">
                          <div className="font-semibold text-lg">Rs. {sub.submitted_amount}</div>
                          <Badge variant={
                            sub.status === 'PENDING' ? 'outline' :
                            sub.status === 'APPROVED' ? 'default' : 'destructive'
                          }>
                            {sub.status}
                          </Badge>
                        </div>
                      </div>
                      
                      {sub.status === 'REJECTED' && sub.rejection_reason && (
                        <div className="px-4 pb-4">
                          <div className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 p-3 rounded-md border border-red-100 text-sm">
                            <strong>Rejection Reason:</strong> {sub.rejection_reason}
                            <div className="mt-2">
                              <Button asChild size="sm" variant="outline" className="bg-card hover:bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/50">
                                <Link href={`/student/marketplace/checkout/${sub.product}`}>
                                  Resubmit Payment
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {sub.status === 'PENDING' && (
                        <div className="px-4 pb-4">
                          <div className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-200 p-3 rounded-md border border-yellow-100 text-sm">
                            Your payment is being reviewed by the administrator. Access will be granted automatically upon approval.
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

        </div>
      )}
    </div>
  );
}
