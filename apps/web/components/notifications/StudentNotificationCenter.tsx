"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Check,
  CheckCheck,
  CircleAlert,
  ClipboardCheck,
  CreditCard,
  FileQuestion,
  FileText,
  GraduationCap,
  HelpCircle,
  Megaphone,
  RotateCcw,
  Sparkles,
  Trophy,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  notificationsApi,
  type NotificationFilter,
  type NotificationItem,
} from "@/lib/api/notifications";

const TABS: { id: NotificationFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "important", label: "Important" },
  { id: "exam", label: "Exam" },
  { id: "learning", label: "Learning" },
  { id: "achievement", label: "Achievement" },
  { id: "payments", label: "Payments" },
  { id: "orders", label: "Orders" },
  { id: "system", label: "System" },
];

function getIcon(type: string, priority: string) {
  if (priority === "critical") return <CircleAlert className="w-5 h-5 text-rose-500" />;
  switch (type) {
    case "exam":
      return <FileQuestion className="w-5 h-5 text-indigo-500" />;
    case "result":
    case "evaluation":
      return <ClipboardCheck className="w-5 h-5 text-violet-500" />;
    case "practice":
      return <RotateCcw className="w-5 h-5 text-sky-500" />;
    case "course":
    case "course_application":
      return <GraduationCap className="w-5 h-5 text-blue-500" />;
    case "study_plan":
      return <BookOpen className="w-5 h-5 text-emerald-500" />;
    case "gamification":
      return <Trophy className="w-5 h-5 text-amber-500" />;
    case "payment":
      return <CreditCard className="w-5 h-5 text-green-600" />;
    case "support":
      return <HelpCircle className="w-5 h-5 text-amber-500" />;
    case "order":
    case "marketplace":
      return <Package className="w-5 h-5 text-pink-500" />;
    case "announcement":
      return <Megaphone className="w-5 h-5 text-fuchsia-500" />;
    case "feedback":
      return <FileText className="w-5 h-5 text-indigo-500" />;
    default:
      return <Sparkles className="w-5 h-5 text-muted-foreground" />;
  }
}

function formatTime(isoString: string) {
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 172800) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function StudentNotificationCenter() {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [page, setPage] = useState(1);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const router = useRouter();

  const load = async () => {
    setIsLoading(true);
    setError(false);
    try {
      const response = await notificationsApi.list({ filter, page });
      setNotifications(response.results);
      setCount(response.count);
      setHasNext(Boolean(response.next));
      setHasPrevious(Boolean(response.previous));
    } catch (err) {
      console.error("Failed to fetch notifications", err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page]);

  const handleTabChange = (tab: NotificationFilter) => {
    setFilter(tab);
    setPage(1);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      try {
        await notificationsApi.markRead(notif.id);
      } catch (err) {
        console.error("Failed to mark as read", err);
      }
    }
    if (notif.action_url) {
      router.push(notif.action_url);
    }
  };

  const unreadOnPage = notifications.some((n) => !n.is_read);

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with your learning, exams, results, achievements, and important
            announcements.
          </p>
        </div>
        <Button
          variant="outline"
          className="shrink-0"
          onClick={handleMarkAllRead}
          disabled={!unreadOnPage}
        >
          <CheckCheck className="w-4 h-4 mr-2" />
          Mark all as read
        </Button>
      </div>

      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors border ${
              filter === tab.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5">
              <div className="flex gap-4">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <CircleAlert className="w-7 h-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Couldn&apos;t load notifications.
          </h2>
          <Button variant="outline" className="mt-2" onClick={load}>
            Retry
          </Button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <Check className="w-7 h-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {filter === "unread" ? "No unread notifications." : "You're all caught up."}
          </h2>
          {filter !== "unread" && (
            <p className="text-muted-foreground max-w-sm text-sm">
              No new notifications right now.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              role="button"
              tabIndex={0}
              onClick={() => handleNotificationClick(notif)}
              onKeyDown={(e) => e.key === "Enter" && handleNotificationClick(notif)}
              className={`bg-card rounded-2xl border transition-all cursor-pointer p-4 sm:p-5 flex items-start gap-4 ${
                !notif.is_read
                  ? "border-primary/20 shadow-sm bg-primary/[0.03]"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <div
                className={`mt-0.5 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  !notif.is_read ? "bg-card shadow-sm border border-border" : "bg-muted"
                }`}
              >
                {getIcon(notif.type, notif.priority)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h3
                    className={`text-sm sm:text-base truncate pr-2 ${
                      !notif.is_read ? "font-semibold text-foreground" : "font-medium text-foreground/90"
                    }`}
                  >
                    {notif.title}
                  </h3>
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap pt-0.5">
                    {formatTime(notif.created_at)}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">{notif.message}</p>

                {(notif.priority === "important" || notif.priority === "critical") && (
                  <span
                    className={`inline-block mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      notif.priority === "critical"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}
                  >
                    {notif.priority === "critical" ? "Urgent" : "Important"}
                  </span>
                )}
              </div>

              {!notif.is_read && (
                <div className="flex-shrink-0 mt-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && count > 0 && (hasNext || hasPrevious) && (
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPrevious}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">{count} total</span>
          <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
