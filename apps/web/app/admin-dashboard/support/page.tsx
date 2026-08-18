"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Search, Filter, Plus, MessageSquare, Clock, 
  CheckCircle2, MoreHorizontal, Eye, UserPlus, 
  Tag, AlertCircle, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockTickets, mockSupportAnalytics } from "@/lib/mock/admin-support";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function SupportDashboardPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredTickets = mockTickets.filter(t => {
    const matchesSearch = 
      t.ticketId.toLowerCase().includes(search.toLowerCase()) || 
      t.subject.toLowerCase().includes(search.toLowerCase()) || 
      t.student.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
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

  return (
    <div className="space-y-6">
      {/* Mobile Create Button */}
      <div className="sm:hidden mb-4">
        <Button className="w-full bg-[#0B2545] hover:bg-[#0B2545]/90 text-white gap-2">
          <Plus className="w-4 h-4" /> Create Ticket
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium">Total Tickets</p>
            <MessageSquare className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-[#0B2545]">{mockSupportAnalytics.totalTickets.toLocaleString()}</p>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium">Open Tickets</p>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-[#0B2545]">{mockSupportAnalytics.openTickets}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium">In Progress</p>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-[#0B2545]">{mockSupportAnalytics.inProgress}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium">Resolved</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-[#0B2545]">{mockSupportAnalytics.resolved.toLocaleString()}</p>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search ticket ID, student, subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <select 
              className="h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 flex-1 sm:flex-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting for Student">Waiting for Student</option>
              <option value="Resolved">Resolved</option>
            </select>
            <Button variant="outline" className="bg-white gap-2 px-3">
              <Filter className="w-4 h-4" /> <span className="hidden sm:inline">Filters</span>
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-24">Ticket ID</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                      <p>No tickets found.</p>
                      {(search || statusFilter !== "All") && (
                        <Button variant="link" onClick={() => {setSearch(""); setStatusFilter("All");}} className="mt-2 h-auto p-0">
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => {
                  const studentInitials = ticket.student.name.split(" ").map(n => n[0]).join("").substring(0,2);
                  return (
                    <TableRow key={ticket.id} className="hover:bg-slate-50/80 cursor-pointer" onClick={() => window.location.href = `/admin-dashboard/support/${ticket.id}`}>
                      <TableCell className="font-mono text-xs text-slate-500">
                        {ticket.ticketId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {ticket.student.avatar ? (
                              <AvatarImage src={ticket.student.avatar} alt={ticket.student.name} />
                            ) : (
                              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">{studentInitials}</AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 text-sm leading-tight">{ticket.student.name}</span>
                            <span className="text-xs text-slate-500 truncate w-32">{ticket.student.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="font-semibold text-[#0B2545] truncate">{ticket.subject}</div>
                        <div className="flex gap-1 mt-1">
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                            {ticket.category}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {getPriorityIcon(ticket.priority)}
                          <span className={`text-xs font-semibold ${ticket.priority === 'Urgent' ? 'text-red-600' : ticket.priority === 'High' ? 'text-orange-600' : 'text-slate-600'}`}>
                            {ticket.priority}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          {ticket.assignedTo ? (
                            <>
                              <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600">
                                {ticket.assignedTo.substring(0,1)}
                              </div>
                              <span className="truncate w-24">{ticket.assignedTo}</span>
                            </>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Unassigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-[#0B2545]">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Link href={`/admin-dashboard/support/${ticket.id}`}>
                              <DropdownMenuItem className="cursor-pointer">
                                <Eye className="mr-2 h-4 w-4" /> View Ticket
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem className="cursor-pointer">
                              <UserPlus className="mr-2 h-4 w-4" /> Assign Agent
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer">
                              <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" /> Mark as Resolved
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
