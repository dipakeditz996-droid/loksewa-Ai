"use client";

import { useQuery } from "@tanstack/react-query";
import { supportApi, SupportTicket } from "@/lib/api/support";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Clock, CheckCircle2, AlertCircle, MessageSquare,
  ChevronRight, TicketIcon, Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  open: { color: "text-blue-700", bg: "bg-blue-100", icon: AlertCircle, label: "Open" },
  in_progress: { color: "text-amber-700", bg: "bg-amber-100", icon: Clock, label: "In Progress" },
  waiting_student: { color: "text-purple-700", bg: "bg-purple-100", icon: MessageSquare, label: "Waiting for You" },
  resolved: { color: "text-green-700 dark:text-green-300", bg: "bg-green-100", icon: CheckCircle2, label: "Resolved" },
  closed: { color: "text-muted-foreground", bg: "bg-muted/80", icon: CheckCircle2, label: "Closed" },
};

const PRIORITY_COLOR: Record<string, string> = {
  low: "text-muted-foreground",
  normal: "text-blue-600",
  high: "text-orange-600",
  urgent: "text-red-600",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function TicketsListPage() {
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: supportApi.getTickets,
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary dark:text-foreground">My Support Tickets</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage your support requests.</p>
        </div>
        <Link href="/student/help-support/tickets/create">
          <Button className="bg-primary text-primary-foreground hover:bg-[#163E6B] text-white">
            <Plus className="h-4 w-4 mr-2" /> New Ticket
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : tickets && tickets.length > 0 ? (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const statusCfg = (STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.open)!;
            const StatusIcon = statusCfg.icon;
            return (
              <Link key={ticket.id} href={`/student/help-support/tickets/${ticket.id}`}>
                <div className="bg-card rounded-xl border border-border p-5 hover:border-[#D4A72C]/40 hover:shadow-sm transition-all cursor-pointer group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", statusCfg.bg, statusCfg.color)}>
                          {statusCfg.label}
                        </span>
                        <span className={cn("text-[10px] font-medium uppercase", PRIORITY_COLOR[ticket.priority] || "text-muted-foreground")}>
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="text-[14px] font-semibold text-primary dark:text-foreground truncate">{ticket.subject}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="capitalize">{ticket.category.replace(/_/g, " ")}</span>
                        <span>·</span>
                        <span>{ticket.message_count} messages</span>
                        <span>·</span>
                        <span>Updated {timeAgo(ticket.updated_at)}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#D4A72C] transition-colors shrink-0 mt-2" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Inbox className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-lg font-semibold text-muted-foreground">No support tickets yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">When you report a problem, it will appear here.</p>
          <Link href="/student/help-support/tickets/create">
            <Button className="bg-primary text-primary-foreground hover:bg-[#163E6B] text-white">
              <Plus className="h-4 w-4 mr-2" /> Create Your First Ticket
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
