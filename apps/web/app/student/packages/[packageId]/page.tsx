"use client";

import StudentPlanDetailPage from "../../plans/[planId]/page";

export default function PackageDetailPage({ params }: { params: Promise<{ packageId: string }> }) {
  const mappedParams = params.then((p) => ({ planId: p.packageId }));
  return <StudentPlanDetailPage params={mappedParams} />;
}

