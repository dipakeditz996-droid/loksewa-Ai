"use client";

import React, { useState, useEffect } from "react";
import {
  LifeBuoy, Search, Filter, AlertTriangle, Loader2, MessageSquare,
  ChevronRight, Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { adminApi, AdminSupportTicket } from "@/lib/api/admin";

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

export default function AdminSupportPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
    high_priority: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [totalTickets, setTotalTickets] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: currentPage,
        pageSize: 15,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "all") params.status = statusFilter;
      if (priorityFilter !== "all") params.priority = priorityFilter;
      if (categoryFilter !== "all") params.category = categoryFilter;

      const data = await adminApi.getSupportTickets(params);
      setTickets(data.tickets);
      setTotalTickets(data.total);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter, categoryFilter]);

  useEffect(() => {
    fetchTickets();
  }, [currentPage, searchTerm, statusFilter, priorityFilter, categoryFilter]);

  const handleViewTicket = (ticket: AdminSupportTicket) => {
    router.push(`/admin-dashboard/support/${ticket.id}`);
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

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, " ").split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const openTickets = summary.open + summary.in_progress;
  const resolvedTickets = summary.resolved + summary.closed;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-blue-500" />
            Support Tickets
          </h2>
          <p className="text-slate-500 text-sm mt-1">Manage and respond to student support requests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-600 text-sm font-medium">Total Tickets</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{summary.total}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-600 text-sm font-medium">Open/In Progress</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{openTickets}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-600 text-sm font-medium">Resolved/Closed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{resolvedTickets}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-600 text-sm font-medium">High Priority</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{summary.high_priority}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by ticket #, email, or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Status: {statusFilter === "all" ? "All" : getStatusLabel(statusFilter)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                All Statuses
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("open")}>
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("in_progress")}>
                In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("waiting_student")}>
                Waiting for Student
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("resolved")}>
                Resolved
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("closed")}>
                Closed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Flag className="w-4 h-4" />
                Priority: {priorityFilter === "all" ? "All" : priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPriorityFilter("all")}>
                All Priorities
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter("urgent")}>
                Urgent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter("high")}>
                High
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter("normal")}>
                Normal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter("low")}>
                Low
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Category: {categoryFilter === "all" ? "All" : categoryLabels[categoryFilter] || categoryFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCategoryFilter("all")}>
                All Categories
              </DropdownMenuItem>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <DropdownMenuItem key={key} onClick={() => setCategoryFilter(key)}>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <LifeBuoy className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No support tickets found</p>
            <p className="text-slate-400 text-sm mt-1">There are no tickets matching your filters</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="text-slate-600 font-semibold">Ticket #</TableHead>
                <TableHead className="text-slate-600 font-semibold">Subject</TableHead>
                <TableHead className="text-slate-600 font-semibold">Student</TableHead>
                <TableHead className="text-slate-600 font-semibold">Category</TableHead>
                <TableHead className="text-slate-600 font-semibold">Priority</TableHead>
                <TableHead className="text-slate-600 font-semibold">Status</TableHead>
                <TableHead className="text-slate-600 font-semibold text-center">Messages</TableHead>
                <TableHead className="text-slate-600 font-semibold">Last Updated</TableHead>
                <TableHead className="text-slate-600 font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id} className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer" onClick={() => handleViewTicket(ticket)}>
                  <TableCell className="font-mono font-bold text-blue-600">
                    {ticket.ticketNumber}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900 max-w-xs truncate">
                    {ticket.subject}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{ticket.studentName}</span>
                      <span className="text-xs text-slate-500">{ticket.studentEmail}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {categoryLabels[ticket.category as keyof typeof categoryLabels] || ticket.category}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${priorityColors[ticket.priority as keyof typeof priorityColors]?.bg || priorityColors.normal.bg} ${priorityColors[ticket.priority as keyof typeof priorityColors]?.text || priorityColors.normal.text}`}>
                      {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status as keyof typeof statusColors]?.bg || statusColors.open.bg} ${statusColors[ticket.status as keyof typeof statusColors]?.text || statusColors.open.text}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-600">
                      <MessageSquare className="w-4 h-4" />
                      <span className="font-medium">{ticket.messageCount}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {formatDate(ticket.lastUpdated)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewTicket(ticket);
                      }}
                      className="gap-1"
                    >
                      <span>View</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalTickets > 15 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center gap-1 px-3 text-sm text-slate-600">
            Page {currentPage} of {Math.ceil(totalTickets / 15)}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={currentPage >= Math.ceil(totalTickets / 15)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
