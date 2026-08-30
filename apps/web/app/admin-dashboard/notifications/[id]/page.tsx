"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Bell, Loader2, AlertCircle, Send, XCircle, Trash2,
  Users, Eye, EyeOff, Clock, User, CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminApi, NotificationDetail } from "@/lib/api/admin";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const typeColors: Record<string, string> = {
  alert: "bg-red-100 text-red-700",
  announcement: "bg-blue-100 text-blue-700",
  system: "bg-purple-100 text-purple-700",
};

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  scheduled: "bg-amber-100 text-amber-600",
  sent: "bg-green-100 text-green-600",
  failed: "bg-red-100 text-red-600",
};

export default function NotificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const notifId = parseInt(resolvedParams.id);
  const router = useRouter();

  const [notif, setNotif] = useState<NotificationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [banner, setBanner] = useState("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await adminApi.getNotificationDetail(notifId);
      setNotif(data);
    } catch (error) {
      console.error("Failed to load notification", error);
      setNotif(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const handleSend = async () => {
    setIsActing(true);
    try {
      const res = await adminApi.sendNotification(notifId);
      setBanner(`Notification sent to ${res.delivered} recipient(s).`);
      loadData();
    } catch (error) {
      console.error("Failed to send notification", error);
    } finally {
      setIsActing(false);
    }
  };

  const handleCancel = async () => {
    setIsActing(true);
    try {
      await adminApi.cancelScheduledNotification(notifId);
      setBanner("Scheduled notification cancelled.");
      loadData();
    } catch (error) {
      console.error("Failed to cancel notification", error);
    } finally {
      setIsActing(false);
    }
  };

  const handleDelete = async () => {
    try {
      await adminApi.deleteNotification(notifId);
      router.push("/admin-dashboard/notifications");
    } catch (error) {
      console.error("Failed to delete notification", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!notif) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-500 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <p>Notification not found.</p>
        </div>
        <Link href="/admin-dashboard/notifications" className="text-sm text-[#0B2545] underline mt-4 inline-block">
          Back to Notifications
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-2" onClick={() => router.push("/admin-dashboard/notifications")}>
          <ArrowLeft className="w-4 h-4" /> Back to Notifications
        </Button>

        {banner && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start justify-between gap-3 mb-4">
            <p className="text-sm text-blue-900">{banner}</p>
            <button onClick={() => setBanner("")} className="text-blue-500 hover:text-blue-800 text-sm shrink-0">Dismiss</button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${typeColors[notif.type] || "bg-slate-100 text-slate-600"}`}>
                {notif.type}
              </span>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[notif.status] || "bg-slate-100 text-slate-600"}`}>
                {notif.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-6 h-6 text-amber-500" />
              {notif.title}
            </h1>
          </div>
          <div className="flex gap-2">
            {(notif.status === "draft" || notif.status === "scheduled") && (
              <Button onClick={handleSend} disabled={isActing} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <Send className="w-4 h-4" /> Send Now
              </Button>
            )}
            {notif.status === "scheduled" && (
              <Button variant="outline" onClick={handleCancel} disabled={isActing} className="gap-2">
                <XCircle className="w-4 h-4" /> Cancel
              </Button>
            )}
            <Button variant="outline" onClick={() => setDeleteDialogOpen(true)} className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Content</h3>
        <p className="text-slate-800 whitespace-pre-wrap">{notif.content}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-slate-400" />
          <div>
            <p className="text-slate-500 text-xs font-medium">Recipients</p>
            <p className="text-xl font-bold text-slate-900">{notif.recipient_count}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
          <Eye className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-slate-500 text-xs font-medium">Read</p>
            <p className="text-xl font-bold text-emerald-600">{notif.read_count}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
          <EyeOff className="w-5 h-5 text-slate-400" />
          <div>
            <p className="text-slate-500 text-xs font-medium">Unread</p>
            <p className="text-xl font-bold text-slate-700">{notif.unread_count}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
          <div className="w-5 h-5 flex items-center justify-center text-blue-500 font-bold text-xs">%</div>
          <div>
            <p className="text-slate-500 text-xs font-medium">Read Rate</p>
            <p className="text-xl font-bold text-blue-600">{notif.read_rate}%</p>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <User className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Created By</p>
            <p className="text-sm font-medium text-slate-800">{notif.createdBy || "System"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Created At</p>
            <p className="text-sm font-medium text-slate-800">{formatDate(notif.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CalendarClock className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Scheduled For</p>
            <p className="text-sm font-medium text-slate-800">{formatDate(notif.scheduledFor)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Send className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Sent At</p>
            <p className="text-sm font-medium text-slate-800">{formatDate(notif.sentAt)}</p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Notification</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{notif.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
