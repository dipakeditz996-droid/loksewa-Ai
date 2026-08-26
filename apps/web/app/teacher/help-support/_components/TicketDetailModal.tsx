"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { teacherSupportApi, SupportTicket, SupportMessage } from "@/lib/api/teacher-support";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusPill } from "@/components/teacher/portal";

interface TicketDetailModalProps {
  ticketId: number | null;
  onOpenChange: (open: boolean) => void;
}

export function TicketDetailModal({ ticketId, onOpenChange }: TicketDetailModalProps) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ticketId) return;

    let isMounted = true;
    const fetchTicket = async () => {
      try {
        setIsLoading(true);
        const data = await teacherSupportApi.getTicket(ticketId);
        if (isMounted) {
          setTicket(data);
          setMessages(data.messages || []);
        }
      } catch (error) {
        if (isMounted) toast.error("Failed to load ticket details");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchTicket();

    return () => { isMounted = false; };
  }, [ticketId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !ticketId) return;

    try {
      setIsSending(true);
      const newMsg = await teacherSupportApi.sendMessage(ticketId, replyText);
      setMessages((prev) => [...prev, newMsg]);
      setReplyText("");
    } catch (error: any) {
      toast.error("Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  const getStatusTone = (status: string): "success" | "pending" | "neutral" => {
    if (status === "resolved") return "success";
    if (status === "closed") return "neutral";
    return "pending"; // open, in_progress, waiting_student
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "waiting_student": return "Waiting on You";
      default: return status.replace("_", " ");
    }
  };

  return (
    <Dialog open={!!ticketId} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] flex-col gap-0 rounded-2xl border-[#E7EBF3] bg-white p-0 sm:max-w-[700px]">

        {isLoading || !ticket ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0B2545]" />
          </div>
        ) : (
          <>
            <DialogHeader className="shrink-0 border-b border-[#EEF1F6] px-6 py-4">
              <div className="flex items-start justify-between pr-6">
                <div>
                  <DialogTitle className="mb-1 text-xl text-[#101828]">{ticket.subject}</DialogTitle>
                  <div className="flex items-center gap-3 text-sm text-[#667085]">
                    <span className="font-medium">Ticket #{ticket.ticket_number}</span>
                    <span>•</span>
                    <span className="capitalize">{ticket.category.replace("_", " ")}</span>
                    <span>•</span>
                    <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <StatusPill status={ticket.status} label={getStatusText(ticket.status)} tone={getStatusTone(ticket.status)} />
              </div>
            </DialogHeader>

            <div
              ref={scrollRef}
              className="flex-1 space-y-6 overflow-y-auto bg-[#F7F9FC] p-6"
            >
              {messages.map((msg, index) => (
                <div key={msg.id || index} className={`flex gap-4 ${!msg.is_staff_reply ? "flex-row-reverse" : ""}`}>
                  <Avatar className="h-10 w-10 shrink-0 border border-[#E7EBF3]">
                    <AvatarFallback className={msg.is_staff_reply ? "bg-[#EEF2F8] text-[#0B2545]" : "bg-[#EEF1F6] text-[#475467]"}>
                      {msg.is_staff_reply ? "LS" : msg.sender_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex max-w-[80%] flex-col ${!msg.is_staff_reply ? "items-end" : "items-start"}`}>
                    <div className="mb-1 flex items-baseline gap-2">
                      <span className="text-sm font-medium text-[#101828]">
                        {msg.sender_name}
                      </span>
                      <span className="text-xs text-[#8A98AE]">
                        {new Date(msg.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className={`whitespace-pre-wrap rounded-2xl p-4 text-sm ${
                      !msg.is_staff_reply
                        ? "rounded-tr-sm bg-[#0B2545] text-white"
                        : "rounded-tl-sm border border-[#E7EBF3] bg-white text-[#344054] shadow-sm"
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="shrink-0 border-t border-[#EEF1F6] bg-white p-4">
              {ticket.status === "closed" || ticket.status === "resolved" ? (
                <div className="rounded-lg border border-[#EEF1F6] bg-[#F7F9FC] p-4 text-center text-sm text-[#667085]">
                  This ticket is {ticket.status}. No further replies can be added.
                </div>
              ) : (
                <div className="flex gap-3">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    className="min-h-[80px] resize-none rounded-lg border-[#D9E1EA] focus-visible:ring-[#0B2545]/30"
                  />
                  <Button
                    className="h-auto shrink-0 rounded-[9px] bg-[#0B2545] px-6 hover:bg-[#163E6C]"
                    onClick={handleSendReply}
                    disabled={isSending || !replyText.trim()}
                  >
                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
