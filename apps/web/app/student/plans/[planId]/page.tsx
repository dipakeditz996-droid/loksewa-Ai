"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscriptionsApi, SubscriptionPlan } from "@/lib/api/subscriptions";
import { StudentPackageDetailView } from "@/components/packages/StudentPackageDetailView";

interface PageProps {
  params: Promise<{ planId: string }>;
}

export default function StudentPlanDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { planId } = use(params);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!planId) return;
    fetchPlan();
  }, [planId]);

  const fetchPlan = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await subscriptionsApi.getPlan(planId);
      setPlan(data);
    } catch (err: any) {
      console.error("Failed to load plan details:", err);
      setError(err?.detail || err?.message || "Package not found or currently unavailable.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Packages</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="h-[600px] rounded-[24px] bg-muted/60 animate-pulse border border-border" />
      ) : error || !plan ? (
        <div className="text-center py-16 bg-card border border-border rounded-[24px] p-8 max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Package Unavailable</h3>
          <p className="text-xs text-muted-foreground">{error || "Could not retrieve details for this package."}</p>
          <div className="pt-2">
            <Button asChild variant="outline" className="rounded-xl text-xs">
              <Link href="/student/plans">Browse All Packages</Link>
            </Button>
          </div>
        </div>
      ) : (
        <StudentPackageDetailView 
          plan={plan}
          onSelect={() => router.push(`/student/plans/${plan.id}/checkout`)}
        />
      )}
    </div>
  );
}
