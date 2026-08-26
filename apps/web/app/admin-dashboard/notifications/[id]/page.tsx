"use client";

import React, { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  
  return (
    <div className="space-y-6 pb-12 p-6 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <BellRing className="w-8 h-8 text-slate-400" />
      </div>
      <h2 className="text-2xl font-bold text-slate-700">Notification API Pending</h2>
      <p className="text-slate-500 mt-2 text-center max-w-md">
        This page relies on backend API endpoints that are currently pending integration.
        Fake production data has been removed.
      </p>
      <Button className="mt-6" variant="outline" onClick={() => router.push("/admin-dashboard/notifications")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Notifications
      </Button>
    </div>
  );
}
