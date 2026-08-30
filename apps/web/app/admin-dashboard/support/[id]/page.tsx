"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminApi, AdminSupportTicketDetail } from "@/lib/api/admin";

const priorityColors = {
  low: { text: "text-blue-600", bg: "bg-blue-100" },
  normal: { text: "text-slate-600", bg: "bg-slate-100" },
  high: { text: "text-orange-600", bg: "bg-orange-100" },
  urgent: { text: "text-red-600", bg: "bg-red-100" },
};

const statusColors = {
  open: { text: "text-red-600", bg: "bg-red-100" },
  in_progress: { text: "text-blue-600", bg: "bg-blue-100" },
  waiting_student: { text: "text-amber-600", bg: "bg-amber-100" },
  resolved: { text: "text-green-600", bg: "bg-green-100" },
  closed: { text: "text-slate-600", bg: "bg-slate-100" },
};

const categoryLabels: Record<string, string> = {
  exam_problem: "Exam Problem",
  wrong_question: "Wrong Question/Answer",
  technical: "Technical Issue",
  ai_tutor: "AI Tutor Problem",
  account: "Account Problem",
  payment: "Payment/Marketplace",
  other: "Other",
};

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = parseInt(params.id as string, 10);

  const [ticketDetail, setTicketDetail] = useState<AdminSupportTicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState("");

  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("normal");
  const [isUpdatingMeta, setIsUpdatingMeta] = useState(false);

  const fetchTicketDetail = async () => {
    setIsLoading(true);
    try {
      const detail = await adminApi.getSupportTicketDetail(ticketId);
      setTicketDetail(detail);
      setStatus(detail.ticket.status);
      setPriority(detail.ticket.priority);
    } catch (error) {
      console.error("Failed to fetch ticket details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isNaN(ticketId)) {
      fetchTicketDetail();
    }
  }, [ticketId]);

  const handleReply = async () => {
    if (!replyText.trim() || !ticketDetail) return;
    setIsReplying(true);
    setReplyError("");
    try {
      await adminApi.replyToSupportTicket(ticketId, replyText);
      setReplyText("");
      await fetchTicketDetail();
    } catch (error) {
      setReplyError("Failed to send reply");
      console.error(error);
    } finally {
      setIsReplying(false);
    }
  };

  const handleUpdateMeta = async () => {
    if (!ticketDetail) return;
    setIsUpdatingMeta(true);
    try {
      await adminApi.updateSupportTicketStatus(ticketId, { status, priority });
      await fetchTicketDetail();
    } catch (error) {
      console.error("Failed to update ticket status/priority:", error);
    } finally {
      setIsUpdatingMeta(false);
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

  const getStatusLabel = (s: string) => {
    return s.replace(/_/g, " ").split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!ticketDetail) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] space-y-4">
        <p className="text-slate-500 font-medium">Ticket not found.</p>
        <Button variant="outline" onClick={() => router.push("/admin-dashboard/support")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Support Tickets
        </Button>
      </div>
    );
  }

  const { ticket, messages } = ticketDetail;
  const pColor = priorityColors[ticket.priority as keyof typeof priorityColors] || priorityColors.normal;
  const sColor = statusColors[ticket.status as keyof typeof statusColors] || statusColors.open;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <Button variant="link" onClick={() => router.push("/admin-dashboard/support")} className="p-0 text-slate-500 hover:text-slate-900 mb-4 h-auto">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Support
        </Button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-900">
            Ticket {ticket.ticketNumber}
          </h2>
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${sColor.bg} ${sColor.text}`}>
            {getStatusLabel(ticket.status)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Conversation */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{ticket.subject}</h3>
            
            <div className="space-y-6 mt-6">
              <h4 className="text-sm font-medium text-slate-700 border-b border-slate-100 pb-2">Conversation</h4>
              
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-4 ${msg.isStaffReply ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold text-white ${msg.isStaffReply ? 'bg-blue-600' : 'bg-slate-400'}`}>
                      {msg.sender?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className={`flex-1 ${msg.isStaffReply ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center gap-2 ${msg.isStaffReply ? 'justify-end' : 'justify-start'}`}>
                        <p className="text-sm font-semibold text-slate-900">{msg.sender}</p>
                        {msg.isStaffReply && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            Staff
                          </span>
                        )}
                        <span className="text-xs text-slate-500">{formatDate(msg.createdAt)}</span>
                      </div>
                      <div className={`mt-2 inline-block max-w-full text-left p-3 rounded-lg border ${msg.isStaffReply ? 'bg-blue-50 border-blue-100 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h4 className="text-sm font-medium text-slate-700">Send Reply</h4>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your response..."
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {replyError && (
              <p className="text-sm text-red-600">{replyError}</p>
            )}
            <div className="flex justify-end">
              <Button
                onClick={handleReply}
                disabled={!replyText.trim() || isReplying}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isReplying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Reply
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Metadata */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h4 className="text-sm font-medium text-slate-700 border-b border-slate-100 pb-2">Student Information</h4>
            <div>
              <p className="text-sm font-medium text-slate-900">{ticket.studentName}</p>
              <p className="text-sm text-slate-500">{ticket.studentEmail}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h4 className="text-sm font-medium text-slate-700 border-b border-slate-100 pb-2">Ticket Details</h4>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Category</p>
                <p className="text-sm font-medium text-slate-900 mt-1">
                  {categoryLabels[ticket.category as keyof typeof categoryLabels] || ticket.category}
                </p>
              </div>
              
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Created</p>
                <p className="text-sm font-medium text-slate-900 mt-1">
                  {formatDate(ticket.createdAt)}
                </p>
              </div>

              {ticket.closedAt && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Closed</p>
                  <p className="text-sm font-medium text-slate-900 mt-1">
                    {formatDate(ticket.closedAt)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h4 className="text-sm font-medium text-slate-700 border-b border-slate-100 pb-2">Manage Ticket</h4>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_student">Waiting for Student</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <Button 
                onClick={handleUpdateMeta} 
                disabled={isUpdatingMeta || (status === ticket.status && priority === ticket.priority)}
                className="w-full"
                variant="outline"
              >
                {isUpdatingMeta ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
