"use client";

import React, { use } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, BellRing, Mail, Smartphone,
  CheckCircle2, XCircle, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockNotifications } from "@/lib/mock/admin-notifications";

export default function NotificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  
  const notification = mockNotifications.find(n => n.id === resolvedParams.id) || mockNotifications[0];

  if (!notification) {
    return <div className="p-12 text-center text-slate-500">Notification not found</div>;
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Sent": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Scheduled": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Draft": return "bg-slate-100 text-slate-700 border-slate-200";
      case "Sending": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Cancelled": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const readRate = notification.metrics.delivered > 0 
    ? Math.round((notification.metrics.read / notification.metrics.delivered) * 100) 
    : 0;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-8 w-8 bg-white" onClick={() => router.push("/admin-dashboard/notifications")}>
          <ArrowLeft className="w-4 h-4 text-slate-500" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[#0B2545]">{notification.title}</h2>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(notification.status)}`}>
              {notification.status}
            </span>
          </div>
          <div className="flex gap-4 text-sm text-slate-500 mt-1">
            <span>Type: <span className="font-medium text-slate-700">{notification.type}</span></span>
            <span>Created: {new Date(notification.createdAt).toLocaleDateString()}</span>
            {notification.sentAt && <span>Sent: {new Date(notification.sentAt).toLocaleDateString()} at {new Date(notification.sentAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metrics & Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Delivery Funnel */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-[#0B2545] mb-6">Delivery Funnel</h3>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-sm font-medium text-slate-500 mb-1">Targeted</p>
                <p className="text-2xl font-bold text-slate-800">{notification.metrics.totalRecipients.toLocaleString()}</p>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm font-medium text-blue-600 mb-1">Delivered</p>
                <p className="text-2xl font-bold text-blue-700">{notification.metrics.delivered.toLocaleString()}</p>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-red-50 rounded-lg border border-red-100">
                <p className="text-sm font-medium text-red-600 mb-1">Failed</p>
                <p className="text-2xl font-bold text-red-700">{notification.metrics.failed.toLocaleString()}</p>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="text-sm font-medium text-emerald-600 mb-1">Read</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-emerald-700">{notification.metrics.read.toLocaleString()}</p>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">{readRate}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-[#0B2545] mb-4">Message Content</h3>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Title</span>
                <p className="font-semibold text-slate-800">{notification.title}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Short Message</span>
                <p className="text-sm text-slate-600">{notification.shortMessage}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Meta & Channels */}
        <div className="space-y-6">
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-[#0B2545] mb-4">Audience</h3>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
              <p className="font-semibold text-slate-800">{notification.audience}</p>
              <p className="text-sm text-slate-500 mt-1">~{notification.metrics.totalRecipients.toLocaleString()} students</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-[#0B2545] mb-4">Channels Configured</h3>
            <div className="space-y-3">
              {notification.channels.map(channel => {
                let Icon = BellRing;
                let color = "text-blue-500";
                let bg = "bg-blue-50";
                
                if (channel === "Email") { Icon = Mail; color = "text-emerald-500"; bg = "bg-emerald-50"; }
                if (channel === "Push") { Icon = Smartphone; color = "text-purple-500"; bg = "bg-purple-50"; }
                if (channel === "SMS") { Icon = Smartphone; color = "text-amber-500"; bg = "bg-amber-50"; }

                return (
                  <div key={channel} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${bg} ${color} flex items-center justify-center`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-slate-700">{channel}</span>
                    </div>
                    {notification.status === "Sent" && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
