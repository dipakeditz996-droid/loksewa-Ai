"use client";

import React, { useState, useEffect } from "react";
import {
  Bell, Plus, Trash2, Search, Filter, AlertTriangle, Loader2,
  Calendar, User, Clock, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  adminApi, AdminNotification, AdminNotificationsResponse, NotificationAudience,
} from "@/lib/api/admin";

interface NotificationData {
  id: number;
  title: string;
  content: string;
  type: "alert" | "announcement" | "system";
  status: "draft" | "scheduled" | "sent" | "failed";
  recipientCount: number;
  sentAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const typeColors = {
  alert: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", badge: "bg-red-100" },
  announcement: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", badge: "bg-blue-100" },
  system: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", badge: "bg-purple-100" },
};

const statusColors = {
  draft: { text: "text-slate-600", bg: "bg-slate-100" },
  scheduled: { text: "text-amber-600", bg: "bg-amber-100" },
  sent: { text: "text-green-600", bg: "bg-green-100" },
  failed: { text: "text-red-600", bg: "bg-red-100" },
};

export default function AdminNotificationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [summary, setSummary] = useState<AdminNotificationsResponse["summary"] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationData | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "announcement" as "alert" | "announcement" | "system",
    // Audience is resolved into recipients by Django, never in the browser.
    targetRole: "students" as NotificationAudience,
    delivery: "now" as "now" | "schedule" | "draft",
    scheduledFor: "",
    courseId: "",
  });
  const [formError, setFormError] = useState("");
  const [resultBanner, setResultBanner] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: currentPage,
        pageSize: 10,
      };
      if (searchTerm) params.search = searchTerm;
      if (typeFilter !== "all") params.type = typeFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const data = await adminApi.getNotifications(params);
      setNotifications(data.notifications);
      setTotalNotifications(data.total);
      setSummary(data.summary ?? null);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [currentPage, searchTerm, typeFilter, statusFilter]);

  const handleCreateNotification = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      setFormError("Title and content are required");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    try {
      const res = await adminApi.createNotification({
        title: formData.title,
        content: formData.content,
        type: formData.type,
        targetRole: formData.targetRole,
        delivery: formData.delivery,
        scheduledFor: formData.delivery === "schedule"
          ? new Date(formData.scheduledFor).toISOString() : undefined,
        courseId: formData.targetRole === "course" && formData.courseId
          ? Number(formData.courseId) : undefined,
      });

      // "Created" and "delivered" are distinct: a draft or scheduled campaign
      // is stored but has reached nobody.
      setResultBanner(
        res.delivered > 0
          ? `Notification sent to ${res.delivered} recipient(s).`
          : res.status === "scheduled"
            ? "Notification scheduled. It has been stored but not delivered yet."
            : "Draft saved. It has not been sent to anyone."
      );

      setCreateDialogOpen(false);
      setFormData({
        title: "", content: "", type: "announcement",
        targetRole: "students", delivery: "now", scheduledFor: "", courseId: "",
      });
      fetchNotifications();
    } catch (error: unknown) {
      const data = (error as { data?: { error?: string; details?: Record<string, string> } })?.data;
      const firstDetail = data?.details ? Object.values(data.details)[0] : undefined;
      setFormError(firstDetail || data?.error || "Failed to create notification");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNotification = async () => {
    if (!selectedNotification) return;

    try {
      await adminApi.deleteNotification(selectedNotification.id);
      setDeleteDialogOpen(false);
      setSelectedNotification(null);
      fetchNotifications();
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-500" />
            Notifications & Announcements
          </h2>
          <p className="text-slate-500 text-sm mt-1">Create and manage system-wide notifications</p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Notification
        </Button>
      </div>

      {resultBanner && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start justify-between gap-3">
          <p className="text-sm text-blue-900">{resultBanner}</p>
          <button onClick={() => setResultBanner("")}
            className="text-blue-500 hover:text-blue-800 text-sm shrink-0">Dismiss</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-600 text-sm font-medium">Total Notifications</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{summary?.total ?? totalNotifications}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-600 text-sm font-medium">Sent</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {summary?.sent ?? 0}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-600 text-sm font-medium">Drafted</p>
          <p className="text-2xl font-bold text-slate-600 mt-1">
            {summary?.draft ?? 0}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-600 text-sm font-medium">Scheduled</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {summary?.scheduled ?? 0}
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by title or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Type: {typeFilter === "all" ? "All" : typeFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTypeFilter("all")}>
                All Types
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("alert")}>
                Alert
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("announcement")}>
                Announcement
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("system")}>
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Status: {statusFilter === "all" ? "All" : statusFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                All Statuses
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("draft")}>
                Draft
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("scheduled")}>
                Scheduled
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("sent")}>
                Sent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("failed")}>
                Failed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Bell className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No notifications found</p>
            <p className="text-slate-400 text-sm mt-1">Create a new notification to get started</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="text-slate-600 font-semibold">Title</TableHead>
                <TableHead className="text-slate-600 font-semibold">Type</TableHead>
                <TableHead className="text-slate-600 font-semibold">Status</TableHead>
                <TableHead className="text-slate-600 font-semibold text-center">Recipients</TableHead>
                <TableHead className="text-slate-600 font-semibold">Created</TableHead>
                <TableHead className="text-slate-600 font-semibold">Sent</TableHead>
                <TableHead className="text-slate-600 font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((notif) => (
                <TableRow key={notif.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <TableCell className="font-medium text-slate-900 max-w-xs truncate">
                    {notif.title}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${typeColors[notif.type].badge} ${typeColors[notif.type].text}`}>
                      {notif.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[notif.status as keyof typeof statusColors].bg} ${statusColors[notif.status as keyof typeof statusColors].text}`}>
                      {notif.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-slate-600">
                    {notif.recipientCount}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {formatDate(notif.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {notif.sentAt ? formatDate(notif.sentAt) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <AlertTriangle className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedNotification(notif);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalNotifications > 10 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center gap-1 px-3 text-sm text-slate-600">
            Page {currentPage} of {Math.ceil(totalNotifications / 10)}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={currentPage >= Math.ceil(totalNotifications / 10)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create Notification Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Notification</DialogTitle>
            <DialogDescription>
              Create a system-wide notification for all users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Title
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Notification title"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value="announcement">Announcement</option>
                <option value="alert">Alert</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Notification content"
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>

            {/* Audience — the backend turns this into the actual recipients */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Audience
              </label>
              <select
                value={formData.targetRole}
                onChange={(e) => setFormData({
                  ...formData, targetRole: e.target.value as NotificationAudience,
                })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value="students">All Students</option>
                <option value="teachers">All Teachers</option>
                <option value="admins">Admins</option>
                <option value="all">Everyone</option>
                <option value="course">Students in a Course</option>
              </select>
            </div>

            {/* Only shown when the audience needs it */}
            {formData.targetRole === "course" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Course ID
                </label>
                <Input
                  type="number"
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  placeholder="Numeric course id"
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Only students with an active enrolment receive it.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Delivery
              </label>
              <div className="space-y-2">
                {([
                  ["now", "Send now", "Delivers to every recipient immediately."],
                  ["schedule", "Schedule", "Stored with a time. Requires a scheduler to send automatically."],
                  ["draft", "Save as draft", "Stored only. Nobody receives it."],
                ] as const).map(([value, label, hint]) => (
                  <label key={value} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="delivery"
                      checked={formData.delivery === value}
                      onChange={() => setFormData({ ...formData, delivery: value })}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm text-slate-800">{label}</span>
                      <span className="block text-xs text-slate-500">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {formData.delivery === "schedule" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Scheduled for
                </label>
                <Input
                  type="datetime-local"
                  value={formData.scheduledFor}
                  onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                  className="w-full"
                />
                <p className="text-xs text-amber-700 mt-1">
                  Scheduled notifications are stored, not delivered — automatic sending
                  needs a background scheduler, which this project does not run yet.
                </p>
              </div>
            )}

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                {formError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNotification}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Notification</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedNotification?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteNotification}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
