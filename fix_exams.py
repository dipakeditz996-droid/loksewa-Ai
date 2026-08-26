import os

empty_state = '''"use client";

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
'''

layout_state = '''"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function ExamLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin-dashboard/exams" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back to Exams
        </Link>
      </div>
      {children}
    </div>
  );
}
'''

os.makedirs("apps/web/app/admin-dashboard/exams/[id]/analytics", exist_ok=True)
os.makedirs("apps/web/app/admin-dashboard/exams/[id]/questions", exist_ok=True)
os.makedirs("apps/web/app/admin-dashboard/exams/[id]/results", exist_ok=True)

with open("apps/web/app/admin-dashboard/exams/[id]/page.tsx", "w") as f:
    f.write(empty_state)
with open("apps/web/app/admin-dashboard/exams/[id]/analytics/page.tsx", "w") as f:
    f.write(empty_state)
with open("apps/web/app/admin-dashboard/exams/[id]/questions/page.tsx", "w") as f:
    f.write(empty_state)
with open("apps/web/app/admin-dashboard/exams/[id]/results/page.tsx", "w") as f:
    f.write(empty_state)
with open("apps/web/app/admin-dashboard/exams/[id]/layout.tsx", "w") as f:
    f.write(layout_state)

print("Exams placeholder set.")
