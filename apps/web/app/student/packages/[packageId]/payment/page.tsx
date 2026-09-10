"use client";

import PlanCheckoutPage from "../../../plans/[planId]/checkout/page";

export default function PackagePaymentPage({ params }: { params: Promise<{ packageId: string }> }) {
  // Pass packageId as planId
  const mappedParams = params.then((p) => ({ planId: p.packageId }));
  return <PlanCheckoutPage params={mappedParams} />;
}
