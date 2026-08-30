"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { teacherSupportApi, SupportTicket } from "@/lib/api/teacher-support";
import { StatusPill } from "@/components/teacher/portal";
import { Button } from "@/components/ui/button";
import { CreateTicketModal } from "../_components/CreateTicketModal";
import { TicketDetailModal } from "../_components/TicketDetailModal";
import { ArrowLeft, Plus, TicketIcon, MessageSquare, Loader2 } from "lucide-react";

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

export default function TeacherTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const data = await teacherSupportApi.getTickets();
      setTickets(data);
    } catch (error) {
      console.error("Failed to load tickets", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/teacher/help-support" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Help Center
          </Link>
          <h1 className="text-2xl font-bold text-primary">My Tickets</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your support requests and replies from the admin team.</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} className="gap-2 rounded-[9px] bg-[#0B2545] hover:bg-[#163E6C] text-white">
          <Plus className="h-4 w-4" /> New Ticket
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <TicketIcon className="h-10 w-10 text-primary" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-foreground">No tickets yet</h3>
          <p className="mx-auto mb-6 max-w-md text-[13px] text-muted-foreground">
            Report a problem or ask a question and the admin team will get back to you.
          </p>
          <Button onClick={() => setCreateModalOpen(true)} className="gap-2 rounded-[9px] bg-[#0B2545] hover:bg-[#163E6C] text-white">
            <Plus className="h-4 w-4" /> New Ticket
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => setSelectedTicketId(ticket.id)}
              className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-border hover:shadow-md"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-bold text-foreground truncate">{ticket.subject}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium">#{ticket.ticket_number}</span>
                  <span>•</span>
                  <span className="capitalize">{ticket.category.replace("_", " ")}</span>
                  <span>•</span>
                  <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {ticket.message_count}
                </div>
                <StatusPill status={ticket.status} label={getStatusText(ticket.status)} tone={getStatusTone(ticket.status)} />
              </div>
            </button>
          ))}
        </div>
      )}

      <CreateTicketModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={fetchTickets}
      />
      <TicketDetailModal
        ticketId={selectedTicketId}
        onOpenChange={(open) => !open && setSelectedTicketId(null)}
      />
    </div>
  );
}
