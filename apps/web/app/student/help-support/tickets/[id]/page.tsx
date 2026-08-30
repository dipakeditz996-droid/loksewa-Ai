"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supportApi } from "@/lib/api/support";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Clock, CheckCircle2, AlertCircle, MessageSquare,
  Send, Loader2, User, UserCog, Lock,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  open: { color: "text-blue-700", bg: "bg-blue-100", icon: AlertCircle, label: "Open" },
  in_progress: { color: "text-amber-700", bg: "bg-amber-100", icon: Clock, label: "In Progress" },
  waiting_student: { color: "text-purple-700", bg: "bg-purple-100", icon: MessageSquare, label: "Waiting for You" },
  resolved: { color: "text-green-700 dark:text-green-300", bg: "bg-green-100", icon: CheckCircle2, label: "Resolved" },
  closed: { color: "text-muted-foreground", bg: "bg-muted/80", icon: CheckCircle2, label: "Closed" },
};

function formatMessageTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  });
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const ticketId = Number(params.id);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyText, setReplyText] = useState("");

  const { data: ticket, isLoading: loadingTicket } = useQuery({
    queryKey: ["support-ticket", ticketId],
    queryFn: () => supportApi.getTicket(ticketId),
    enabled: !!ticketId,
  });

  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ["support-messages", ticketId],
    queryFn: () => supportApi.getMessages(ticketId),
    enabled: !!ticketId,
    refetchInterval: ticket?.status !== "closed" && ticket?.status !== "resolved" ? 10000 : false,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const replyMutation = useMutation({
    mutationFn: (msg: string) => supportApi.sendMessage(ticketId, msg),
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["support-messages", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      setTimeout(scrollToBottom, 100);
    },
    onError: () => toast.error("Failed to send message."),
  });

  const closeMutation = useMutation({
    mutationFn: () => supportApi.closeTicket(ticketId),
    onSuccess: () => {
      toast.success("Ticket closed.");
      queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
    },
    onError: () => toast.error("Failed to close ticket."),
  });

  if (loadingTicket) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground">Ticket Not Found</h2>
        <p className="text-muted-foreground mt-2 mb-6">This ticket may have been deleted or you don't have access.</p>
        <Button onClick={() => router.push("/student/help-support/tickets")}>Back to Tickets</Button>
      </div>
    );
  }

  const statusCfg = (STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.open)!;
  const isClosed = ticket.status === "closed" || ticket.status === "resolved";

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      {/* Header Info */}
      <div className="mb-4 shrink-0">
        <Link href="/student/help-support/tickets" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary dark:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Tickets
        </Link>
        
        <div className="bg-card rounded-2xl border border-border/80 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
                <span className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1", statusCfg.bg, statusCfg.color)}>
                  <statusCfg.icon className="h-3 w-3" /> {statusCfg.label}
                </span>
                <span className="text-[10px] font-medium uppercase text-muted-foreground px-2 bg-muted/80 rounded-full">
                  {ticket.priority} Priority
                </span>
              </div>
              <h1 className="text-xl font-bold text-primary dark:text-foreground">{ticket.subject}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                <span className="capitalize">Category: {ticket.category.replace(/_/g, " ")}</span>
                {ticket.related_exam && <span>· Exam: {ticket.related_exam}</span>}
                {ticket.related_question && <span>· Q: {ticket.related_question}</span>}
                <span>· Created {new Date(ticket.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            {!isClosed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Are you sure you want to close this ticket?")) {
                    closeMutation.mutate();
                  }
                }}
                disabled={closeMutation.isPending}
                className="text-muted-foreground hover:text-foreground"
              >
                {closeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                Close Ticket
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-muted rounded-2xl border border-border/80 shadow-inner overflow-hidden flex flex-col min-h-[400px]">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {loadingMessages ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-2/3 rounded-2xl rounded-tl-sm" />
              <Skeleton className="h-20 w-2/3 ml-auto rounded-2xl rounded-tr-sm" />
            </div>
          ) : messages?.map((msg) => {
            const isMe = !msg.is_staff_reply;
            return (
              <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                <div className={cn("flex max-w-[85%] md:max-w-[75%] gap-3", isMe ? "flex-row-reverse" : "flex-row")}>
                  
                  {/* Avatar */}
                  <div className="shrink-0 pt-1">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center",
                      isMe ? "bg-primary text-primary-foreground text-white" : "bg-[#D4A72C] text-white"
                    )}>
                      {isMe ? <User className="h-4 w-4" /> : <UserCog className="h-4 w-4" />}
                    </div>
                  </div>

                  {/* Bubble */}
                  <div className="flex flex-col">
                    <div className={cn("flex items-center gap-2 mb-1", isMe ? "justify-end" : "justify-start")}>
                      <span className="text-xs font-medium text-muted-foreground">{isMe ? "You" : msg.sender_name}</span>
                      <span className="text-[10px] text-muted-foreground">{formatMessageTime(msg.created_at)}</span>
                    </div>
                    
                    <div className={cn(
                      "px-4 py-3 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap shadow-sm",
                      isMe 
                        ? "bg-primary text-primary-foreground text-white rounded-tr-sm" 
                        : "bg-card border border-border text-foreground rounded-tl-sm"
                    )}>
                      {msg.message}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Input */}
        <div className="p-4 bg-card border-t border-border shrink-0">
          {isClosed ? (
            <div className="text-center p-3 bg-muted rounded-xl border border-border/50">
              <Lock className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm font-medium text-muted-foreground">This ticket is closed</p>
              <p className="text-xs text-muted-foreground">Replies are disabled. If you have a new issue, please open a new ticket.</p>
            </div>
          ) : (
            <form 
              onSubmit={(e) => { e.preventDefault(); if (replyText.trim()) replyMutation.mutate(replyText); }}
              className="flex items-end gap-3"
            >
              <div className="flex-1">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply here..."
                  className="min-h-[60px] max-h-[200px] resize-y bg-muted border-border focus:border-[#D4A72C] focus:ring-[#D4A72C]/20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (replyText.trim()) replyMutation.mutate(replyText);
                    }
                  }}
                />
              </div>
              <Button 
                type="submit" 
                disabled={!replyText.trim() || replyMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-[#163E6B] text-white h-[60px] px-6"
              >
                {replyMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
