"use client";

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, CircleAlert, FileText, HelpCircle, Users, Activity, Search, CreditCard, ClipboardCheck, GraduationCap, UserPlus, UserCog } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

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

interface NotificationsInboxProps {
  subtitle: string;
  settingsHref?: string;
  filters?: { id: string; label: string }[];
}

const DEFAULT_FILTERS = [
  { id: 'all', label: 'All Notifications' },
  { id: 'unread', label: 'Unread' },
  { id: 'student_activity', label: 'Student Activity' },
  { id: 'question_review', label: 'Question Reviews' },
  { id: 'system', label: 'System Alerts' },
];

export function NotificationsInbox({ subtitle, settingsHref, filters = DEFAULT_FILTERS }: NotificationsInboxProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      let endpoint = '/notifications/';
      if (filter === 'unread') endpoint += '?unread=true';
      else if (filter !== 'all') endpoint += `?type=${filter}`;

      const response = await apiClient<any>(endpoint);
      setNotifications(response.results || response);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const handleMarkAllRead = async () => {
    try {
      await apiClient('/notifications/mark-all-read/', { method: 'POST' });
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const handleNotificationClick = async (notif: NotificationData) => {
    if (!notif.is_read) {
      try {
        await apiClient(`/notifications/${notif.id}/read/`, { method: 'PATCH' });
        setNotifications(notifications.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      } catch (error) {
        console.error("Failed to mark as read", error);
      }
    }
    if (notif.action_url) {
      router.push(notif.action_url);
    }
  };

  const filteredNotifications = notifications.filter(n =>
    searchQuery === '' ||
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getIcon = (type: string, priority: string) => {
    if (priority === 'critical') return <CircleAlert className="w-5 h-5 text-rose-500" />;
    switch (type) {
      case 'question_review': return <FileText className="w-5 h-5 text-indigo-500" />;
      case 'material_review': return <FileText className="w-5 h-5 text-emerald-500" />;
      case 'student_activity': return <Users className="w-5 h-5 text-sky-500" />;
      case 'support': return <HelpCircle className="w-5 h-5 text-amber-500" />;
      case 'system': return <Activity className="w-5 h-5 text-slate-500" />;
      case 'payment': return <CreditCard className="w-5 h-5 text-green-600" />;
      case 'evaluation': return <ClipboardCheck className="w-5 h-5 text-violet-500" />;
      case 'course_application': return <GraduationCap className="w-5 h-5 text-blue-500" />;
      case 'new_registration': return <UserPlus className="w-5 h-5 text-teal-500" />;
      case 'account': return <UserCog className="w-5 h-5 text-orange-500" />;
      default: return <Activity className="w-5 h-5 text-slate-400" />;
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 172800) return "Yesterday";
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Notifications</h1>
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {settingsHref && (
            <Button variant="outline" className="text-muted-foreground" onClick={() => router.push(settingsHref)}>
              Settings
            </Button>
          )}
          <Button variant="default" className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-card rounded-2xl border border-border shadow-sm dark:shadow-none p-4 sticky top-24">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                className="pl-9 bg-muted border-border text-sm h-10 rounded-xl focus-visible:ring-[#D4A72C]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-3 mt-6">Filters</h3>
            <div className="space-y-1">
              {filters.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex-1">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-card rounded-2xl border border-border shadow-sm dark:shadow-none p-5 h-28">
                  <div className="flex gap-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-1/3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border shadow-sm dark:shadow-none p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h2 className="text-xl font-bold text-primary mb-2">You're all caught up</h2>
              <p className="text-muted-foreground max-w-sm">
                No new notifications right now. We'll let you know when something needs your attention.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`bg-card rounded-2xl border transition-all cursor-pointer p-5 flex items-start gap-4 ${
                    !notif.is_read
                      ? 'border-indigo-100 dark:border-indigo-900/40 shadow-sm dark:shadow-none bg-indigo-50/20 dark:bg-indigo-950/20'
                      : 'border-border hover:border-primary/30 hover:shadow-sm dark:hover:shadow-none opacity-80'
                  }`}
                >
                  <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    !notif.is_read ? 'bg-card shadow-sm dark:shadow-none border border-border' : 'bg-muted'
                  }`}>
                    {getIcon(notif.type, notif.priority)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h3 className={`text-base truncate pr-4 ${!notif.is_read ? 'font-bold text-primary' : 'font-semibold text-foreground'}`}>
                        {notif.title}
                      </h3>
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap pt-1">
                        {formatTime(notif.created_at)}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.action_url && (
                      <div className="mt-3">
                        <span className="text-sm font-semibold text-[#D4A72C] hover:text-primary transition-colors">
                          View details &rarr;
                        </span>
                      </div>
                    )}
                  </div>

                  {!notif.is_read && (
                    <div className="flex-shrink-0 mt-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
