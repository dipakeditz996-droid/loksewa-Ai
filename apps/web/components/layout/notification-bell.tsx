"use client";

import { useState, useEffect } from "react";
import { Bell, Check, CircleAlert, FileText, HelpCircle, Users, Activity, CreditCard, ClipboardCheck, GraduationCap, UserPlus, UserCog, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiClient } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import { useFocusMode } from "@/contexts/FocusModeContext";
import { onNotificationsChanged, notifyNotificationsChanged } from "@/lib/notification-events";

interface NotificationData {
  id: number;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  priority: string;
  created_at: string;
}

export function NotificationBell({ viewAllHref = "/teacher/notifications" }: { viewAllHref?: string }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // Focus Mode quiets this bell: only critical notifications keep their badge,
  // and the attention-grabbing ping stops. Nothing is deleted - opening the
  // bell still shows everything, so no notification is ever lost.
  const { isFocusActive, examFocus } = useFocusMode();

  const fetchNotifications = async () => {
    try {
      const data = await apiClient<any>("/notifications/unread/");
      setUnreadCount(data.unread_count);
      setNotifications(data.latest);
    } catch (error) {
      // Use warn instead of error so Next.js dev overlay doesn't aggressively pop up if the backend restarts during a poll
      console.warn("Failed to fetch notifications", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 3 minutes
    const interval = setInterval(fetchNotifications, 180000);
    // Other notification surfaces (the full inbox pages) mark things read
    // independently of this bell's own state - refetch whenever any of them
    // reports a change, so the badge doesn't sit stale until the next poll.
    const unsubscribe = onNotificationsChanged(fetchNotifications);
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const handleNotificationClick = async (notif: NotificationData) => {
    setIsOpen(false);
    if (!notif.is_read) {
      try {
        await apiClient(`/notifications/${notif.id}/read/`, { method: "PATCH" });
        setUnreadCount((prev) => Math.max(0, prev - 1));
        notifyNotificationsChanged();
      } catch (error: any) {
        // A 404 just means this notification was already deleted server-side
        // (e.g. its source record was removed) - drop it locally and resync
        // rather than logging it as a hard error, matching fetchNotifications'
        // own console.warn below (Next's dev overlay treats console.error as
        // a crash and pops up intrusively for what's really a stale row).
        if (error?.status === 404) {
          setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
          fetchNotifications();
        } else {
          console.warn("Failed to mark as read", error);
        }
      }
    }
    if (notif.action_url) {
      router.push(notif.action_url);
    }
  };

  const getIcon = (type: string, priority: string) => {
    if (priority === 'critical') return <CircleAlert className="w-4 h-4 text-rose-500" />;
    switch (type) {
      case 'question_review': return <FileText className="w-4 h-4 text-indigo-500" />;
      case 'material_review': return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'student_activity': return <Users className="w-4 h-4 text-sky-500" />;
      case 'support': return <HelpCircle className="w-4 h-4 text-amber-500" />;
      case 'system': return <Activity className="w-4 h-4 text-muted-foreground" />;
      case 'payment': return <CreditCard className="w-4 h-4 text-green-600" />;
      case 'evaluation': return <ClipboardCheck className="w-4 h-4 text-violet-500" />;
      case 'course_application': return <GraduationCap className="w-4 h-4 text-blue-500" />;
      case 'new_registration': return <UserPlus className="w-4 h-4 text-teal-500" />;
      case 'account': return <UserCog className="w-4 h-4 text-orange-500" />;
      case 'order': return <Package className="w-4 h-4 text-pink-500" />;
      case 'marketplace': return <Package className="w-4 h-4 text-pink-500" />;
      default: return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const criticalUnread = notifications.filter(
    (n) => !n.is_read && n.priority === "critical"
  ).length;

  // What the badge is allowed to shout about right now.
  const badgeCount = examFocus
    ? criticalUnread
    : isFocusActive
    ? criticalUnread
    : unreadCount;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            isFocusActive
              ? `Notifications, quieted by Focus Mode${criticalUnread ? `, ${criticalUnread} important` : ""}`
              : `Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`
          }
          className="relative h-9 w-9 text-muted-foreground hover:bg-accent rounded-full transition-colors"
        >
          <Bell className={`h-4 w-4 ${isFocusActive ? "opacity-60" : ""}`} />
          {badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 ring-2 ring-background">
              {/* No ping while Focus Mode is on - that is the whole point. */}
              {!isFocusActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              )}
              <span className="relative text-[10px] font-bold leading-none text-white">
                {badgeCount > 9 ? "9+" : badgeCount}
              </span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80 p-0 rounded-2xl border-border shadow-lg" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
            )}
            {isFocusActive && (
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-0.5">
                Focus Mode is on - only important alerts are highlighted
              </span>
            )}
          </div>
        </div>

        <div className="max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-border">
          {notifications.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <Check className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">You're all caught up</p>
              <p className="text-xs text-muted-foreground mt-1">No new notifications right now.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full text-left p-4 border-b border-border hover:bg-muted transition-colors flex items-start gap-3 ${
                    !notif.is_read ? 'bg-muted/50' : 'opacity-80'
                  }`}
                >
                  <div className="mt-1 flex-shrink-0">
                    {getIcon(notif.type, notif.priority)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notif.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/80 mt-2 font-medium">
                      {formatTime(notif.created_at)}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-2 shrink-0"></span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border bg-muted/50 rounded-b-2xl">
          <Button
            variant="ghost"
            className="w-full text-xs font-semibold text-primary hover:text-foreground hover:bg-background"
            onClick={() => {
              setIsOpen(false);
              router.push(viewAllHref);
            }}
          >
            View all notifications &rarr;
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
