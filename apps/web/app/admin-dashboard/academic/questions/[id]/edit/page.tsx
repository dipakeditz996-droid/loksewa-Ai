"use client";

import React from "react";
import { AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PendingIntegrationPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
        <Clock className="w-8 h-8 text-slate-400" />
      </div>
      
      <h2 className="text-2xl font-bold text-[#0B2545] mb-2">API Integration Pending</h2>
      <p className="text-slate-500 max-w-md mx-auto mb-8">
        This module is currently being integrated with the live Django API. The previous mock data implementation has been removed.
      </p>
      
      <div className="flex gap-4">
        <Link href="/admin-dashboard">
          <Button variant="outline" className="gap-2">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
