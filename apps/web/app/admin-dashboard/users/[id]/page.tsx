"use client";

import React from "react";
import { User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function UserDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <Link href="/admin-dashboard/users">
          <Button variant="outline">&larr; Back to Users</Button>
        </Link>
      </div>
      
      <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <User className="w-8 h-8 text-slate-500" />
        </div>
        <h2 className="text-xl font-bold text-[#0B2545] mb-2">User Details API</h2>
        <p className="text-slate-500 max-w-md mb-6">
          The backend API for detailed user management, activity history, and individual user editing is currently a backend gap. You can view the list of users from the main Users page.
        </p>
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Pending Backend Integration</span>
        </div>
      </div>
    </div>
  );
}
