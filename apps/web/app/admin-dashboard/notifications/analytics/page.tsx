"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Bell,
  Calendar,
  Layers,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminApi, AdminNotificationsResponse } from "@/lib/api/admin";

interface NotificationSummaryItem {
  id: number;
  title: string;
  type: "alert" | "announcement" | "system";
  status: "draft" | "scheduled" | "sent" | "failed";
  recipientCount: number;
  sentAt: string | null;
  createdAt: string;
}

export default function NotificationAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AdminNotificationsResponse["summary"] | null>(null);
  const [total, setTotal] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<NotificationSummaryItem[]>([]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getNotifications({ page: 1, pageSize: 20 });
      setTotal(data.total);
      setSummary(data.summary ?? null);
      setRecentNotifications(data.notifications || []);
    } catch (err) {
      console.error("Failed to fetch notification analytics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const totalSent = summary?.sent ?? 0;
  const totalDraft = summary?.draft ?? 0;
  const totalScheduled = summary?.scheduled ?? 0;
  const totalCount = summary?.total ?? total;

  const sentRate = totalCount > 0 ? Math.round((totalSent / totalCount) * 100) : 0;
  const draftRate = totalCount > 0 ? Math.round((totalDraft / totalCount) * 100) : 0;
  const schedRate = totalCount > 0 ? Math.round((totalScheduled / totalCount) * 100) : 0;

  // Compute breakdown by type from recent notifications
  const typeCounts = recentNotifications.reduce(
    (acc, cur) => {
      acc[cur.type] = (acc[cur.type] || 0) + 1;
      return acc;
    },
    { announcement: 0, alert: 0, system: 0 } as Record<string, number>
  );

  const totalRecipients = recentNotifications.reduce((acc, cur) => acc + (cur.recipientCount || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#0B2545] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#D4A72C]" />
            Notification & Broadcast Analytics
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Monitor real-time message delivery volume, channel reach, and broadcast performance.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={fetchAnalytics}
            disabled={loading}
            className="w-full sm:w-auto gap-2 bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
          <Link href="/admin-dashboard/notifications">
            <Button className="w-full sm:w-auto bg-[#0B2545] hover:bg-[#163E6C] text-white font-semibold gap-1.5 shadow-xs">
              <Send className="w-3.5 h-3.5" />
              Broadcasts Log
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Broadcasts</span>
            <Bell className="w-4 h-4 text-[#0B2545]" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{totalCount}</p>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Across all student & staff channels
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Successfully Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-600">{totalSent}</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${sentRate}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-1.5">{sentRate}% overall completion rate</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Scheduled & Queued</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-amber-600">{totalScheduled}</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${schedRate}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-1.5">{schedRate}% queued for upcoming release</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Estimated Audience Reach</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-extrabold text-[#0B2545]">
            {totalRecipients.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">Delivered recipient inboxes</p>
        </div>
      </div>

      {/* Grid of Visual Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          <h3 className="font-bold text-[#0B2545] text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#D4A72C]" />
            Delivery Status Distribution
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center text-xs font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Sent & Dispatched
                </span>
                <span className="font-bold text-slate-900">{totalSent} ({sentRate}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${sentRate}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Scheduled for Later
                </span>
                <span className="font-bold text-slate-900">{totalScheduled} ({schedRate}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${schedRate}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  Saved Drafts
                </span>
                <span className="font-bold text-slate-900">{totalDraft} ({draftRate}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-slate-400 h-full rounded-full transition-all duration-500" style={{ width: `${draftRate}%` }} />
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              Notifications sent immediately are dispatched directly to student and teacher notification centers with high-priority push flags.
            </p>
          </div>
        </div>

        {/* Message Type Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          <h3 className="font-bold text-[#0B2545] text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#D4A72C]" />
            Volume by Notification Type
          </h3>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 border border-blue-200/80 p-4 rounded-xl text-center space-y-1">
              <span className="text-xs font-semibold text-blue-700">Announcements</span>
              <p className="text-2xl font-extrabold text-blue-900">{typeCounts.announcement || 0}</p>
              <span className="text-[10px] text-blue-600 block">General platform news</span>
            </div>

            <div className="bg-rose-50 border border-rose-200/80 p-4 rounded-xl text-center space-y-1">
              <span className="text-xs font-semibold text-rose-700">Alerts</span>
              <p className="text-2xl font-extrabold text-rose-900">{typeCounts.alert || 0}</p>
              <span className="text-[10px] text-rose-600 block">Urgent exam notices</span>
            </div>

            <div className="bg-purple-50 border border-purple-200/80 p-4 rounded-xl text-center space-y-1">
              <span className="text-xs font-semibold text-purple-700">System</span>
              <p className="text-2xl font-extrabold text-purple-900">{typeCounts.system || 0}</p>
              <span className="text-[10px] text-purple-600 block">Maintenance & updates</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Template Presets Available</span>
              <span className="font-bold text-slate-800">8 Standard Templates</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Average Audience per Broadcast</span>
              <span className="font-bold text-slate-800">
                {totalSent > 0 ? Math.round(totalRecipients / totalSent) : 0} Recipients
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Dispatches Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Recent Broadcast Activity</h3>
            <p className="text-xs text-slate-500 mt-0.5">Most recent notification deliveries and delivery counts</p>
          </div>
          <Link
            href="/admin-dashboard/notifications"
            className="text-xs font-semibold text-[#0B2545] hover:underline flex items-center gap-1"
          >
            View All Broadcasts <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-left text-slate-600 font-semibold text-xs">
                <th className="px-5 py-3">Title & Type</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Delivered To</th>
                <th className="px-5 py-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentNotifications.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-xs text-slate-400">
                    No notification activity recorded yet.
                  </td>
                </tr>
              ) : (
                recentNotifications.slice(0, 6).map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{n.title}</div>
                      <span className="text-[11px] text-slate-500 capitalize">{n.type} broadcast</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        className={
                          n.status === "sent"
                            ? "bg-emerald-100 text-emerald-800 border-none font-medium text-[11px]"
                            : n.status === "scheduled"
                            ? "bg-amber-100 text-amber-800 border-none font-medium text-[11px]"
                            : "bg-slate-100 text-slate-600 border-none font-medium text-[11px]"
                        }
                      >
                        {n.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      <span className="font-bold text-slate-800">{n.recipientCount || 0}</span> recipients
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 text-right whitespace-nowrap">
                      {n.sentAt
                        ? new Date(n.sentAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : n.createdAt
                        ? new Date(n.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
