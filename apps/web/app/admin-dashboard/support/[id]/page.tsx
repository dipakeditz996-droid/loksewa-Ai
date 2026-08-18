"use client";

import React, { use, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Paperclip, Send, User, Clock, CheckCircle2, AlertTriangle, 
  AlertCircle, MoreVertical, FileText, ChevronDown, ChevronRight, Lock, Calendar, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockTickets } from "@/lib/mock/admin-support";
import toast from "react-hot-toast";

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  
  const ticket = mockTickets.find(t => t.id === resolvedParams.id) || mockTickets[0];

  const [replyText, setReplyText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [messages, setMessages] = useState(ticket?.messages || []);
  const [status, setStatus] = useState(ticket?.status || "");
  const [isStudentPanelOpen, setIsStudentPanelOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!ticket) {
    return <div className="p-12 text-center text-slate-500">Ticket not found</div>;
  }

  const getStatusColor = (s: string) => {
    switch(s) {
      case "Open": return "bg-blue-100 text-blue-700 border-blue-200";
      case "In Progress": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Waiting for Student": return "bg-purple-100 text-purple-700 border-purple-200";
      case "Resolved": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Closed": return "bg-slate-100 text-slate-700 border-slate-200";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch(priority) {
      case "Urgent": return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case "High": return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case "Medium": return <div className="w-2 h-2 rounded-full bg-amber-400 mx-1" />;
      case "Low": return <div className="w-2 h-2 rounded-full bg-slate-300 mx-1" />;
      default: return null;
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;

    const newMessage = {
      id: `msg-new-${Date.now()}`,
      senderId: "admin-current",
      senderName: "Admin (You)",
      senderType: "Admin" as const,
      content: replyText,
      timestamp: new Date().toISOString(),
      isInternalNote: isInternalNote
    };

    setMessages([...messages, newMessage]);
    setReplyText("");
    
    toast.success(isInternalNote ? "Internal note added." : "Reply sent to student.");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin-dashboard/support")} className="h-8 w-8 text-slate-500">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-[#0B2545] truncate max-w-lg">{ticket.subject}</h2>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${getStatusColor(status)}`}>
                {status}
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-full">
                {getPriorityIcon(ticket.priority)}
                <span className={`text-[10px] font-bold uppercase tracking-wider ${ticket.priority === 'Urgent' ? 'text-red-600' : ticket.priority === 'High' ? 'text-orange-600' : 'text-slate-600'}`}>
                  {ticket.priority}
                </span>
              </div>
            </div>
            <div className="flex gap-4 text-sm text-slate-500 mt-1">
              <span>{ticket.ticketId}</span>
              <span>Category: <span className="font-medium text-slate-700">{ticket.category}</span></span>
              <span>Created: {new Date(ticket.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-white">Change Status <ChevronDown className="w-4 h-4 ml-2" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatus("Open")}>Open</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatus("In Progress")}>In Progress</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatus("Waiting for Student")}>Waiting for Student</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatus("Resolved")} className="text-emerald-600">Resolve Ticket</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Toggle Student Panel (Mobile/Tablet) */}
          <Button 
            variant="outline" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setIsStudentPanelOpen(!isStudentPanelOpen)}
          >
            <User className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Conversation Area */}
        <div className="flex flex-col flex-1 bg-slate-50 border-r border-slate-200 relative">
          
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg) => {
              const isAdmin = msg.senderType === "Admin";
              const isInternal = msg.isInternalNote;
              
              return (
                <div key={msg.id} className={`flex gap-4 max-w-[85%] ${isAdmin ? 'ml-auto flex-row-reverse' : ''}`}>
                  <Avatar className="w-8 h-8 shrink-0 mt-1 border border-slate-200">
                    <AvatarFallback className={isAdmin ? 'bg-[#0B2545] text-white text-xs' : 'bg-white text-slate-700 text-xs'}>
                      {msg.senderName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex flex-col gap-1 ${isAdmin ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-xs font-semibold text-slate-700">{msg.senderName}</span>
                      <span className="text-xs text-slate-400">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      {isInternal && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-100 px-1.5 py-0.5 rounded">
                          <Lock className="w-3 h-3" /> Internal
                        </span>
                      )}
                    </div>
                    
                    <div className={`p-4 rounded-2xl shadow-sm text-sm whitespace-pre-wrap ${
                      isInternal 
                        ? 'bg-amber-50 border border-amber-200 text-slate-800 rounded-tr-sm' 
                        : isAdmin 
                          ? 'bg-[#0B2545] text-white rounded-tr-sm' 
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>

                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {msg.attachments.map(att => (
                          <div key={att.name} className="flex items-center gap-2 bg-white border border-slate-200 p-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                            <FileText className="w-4 h-4 text-blue-500" />
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-slate-700 truncate max-w-[150px]">{att.name}</span>
                              <span className="text-[10px] text-slate-400">{att.size}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Box */}
          <div className="bg-white border-t border-slate-200 p-4 shrink-0">
            <div className={`border-2 rounded-xl transition-colors ${isInternalNote ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200 focus-within:border-[#0B2545]/30'}`}>
              <div className="p-3">
                <Textarea 
                  placeholder={isInternalNote ? "Write an internal note (hidden from student)..." : "Write your reply to the student..."}
                  className="min-h-[100px] border-0 focus-visible:ring-0 resize-none p-0 bg-transparent"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between p-3 border-t border-slate-100 bg-white rounded-b-xl">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-[#0B2545]">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                    <Switch 
                      checked={isInternalNote} 
                      onCheckedChange={setIsInternalNote}
                      id="internal-note"
                    />
                    <Label htmlFor="internal-note" className={`text-sm cursor-pointer ${isInternalNote ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}>
                      Internal Note
                    </Label>
                  </div>
                </div>
                
                <Button 
                  className={`${isInternalNote ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#0B2545] hover:bg-[#0B2545]/90'} text-white gap-2 px-6`}
                  onClick={handleSendReply}
                  disabled={!replyText.trim()}
                >
                  {isInternalNote ? <><Lock className="w-4 h-4" /> Save Note</> : <><Send className="w-4 h-4" /> Send Reply</>}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Student Info & Metadata */}
        <div className={`w-80 bg-white shrink-0 overflow-y-auto flex flex-col transition-all duration-300 border-l border-slate-200 ${
          isStudentPanelOpen ? 'block' : 'hidden lg:flex'
        }`}>
          {/* Assignee Section */}
          <div className="p-5 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Assigned To</h4>
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 cursor-pointer hover:border-blue-300 transition-colors">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-xs">
                    {ticket.assignedTo ? ticket.assignedTo.substring(0,2).toUpperCase() : 'UA'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-800 leading-none">{ticket.assignedTo || 'Unassigned'}</span>
                  {ticket.assignedTo && <span className="text-xs text-slate-500 mt-1">Click to reassign</span>}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Student Profile */}
          <div className="p-5 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Student Profile</h4>
            <div className="flex flex-col items-center text-center mb-4">
              <Avatar className="w-16 h-16 mb-3">
                {ticket.student.avatar ? (
                  <AvatarImage src={ticket.student.avatar} alt={ticket.student.name} />
                ) : (
                  <AvatarFallback className="bg-[#D4A72C]/20 text-[#D4A72C] text-lg font-bold">
                    {ticket.student.name.substring(0,2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <h3 className="font-bold text-[#0B2545]">{ticket.student.name}</h3>
              <p className="text-sm text-slate-500">{ticket.student.email}</p>
              <p className="text-xs text-slate-400 mt-0.5">@{ticket.student.username}</p>
            </div>
            
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-500">Target Preparation</p>
                <p className="text-sm font-medium text-slate-800">{ticket.student.targetExam}</p>
                <p className="text-xs text-slate-500 mt-0.5">{ticket.student.targetPosition}</p>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500">Joined {new Date(ticket.student.joinedDate).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <Button variant="outline" className="w-full text-xs h-8">View Full Profile</Button>
            </div>
          </div>

          {/* Ticket Tags */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tags</h4>
              <Button variant="ghost" size="icon" className="h-6 w-6"><Plus className="w-3 h-3" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ticket.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md border border-slate-200">
                  {tag}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
