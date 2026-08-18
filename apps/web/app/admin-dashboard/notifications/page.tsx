"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Search, Filter, Plus, Send, Clock, 
  Archive, FileText, CheckCircle2, MoreHorizontal,
  Mail, Smartphone, BellRing, Eye, Edit, Trash2, Copy, X
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
import { mockNotifications, mockNotificationAnalytics } from "@/lib/mock/admin-notifications";

export default function NotificationsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredNotifications = mockNotifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || n.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Sent": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Scheduled": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Draft": return "bg-slate-100 text-slate-700 border-slate-200";
      case "Sending": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Cancelled": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getChannelIcon = (channel: string) => {
    switch(channel) {
      case "In-App": return <span title="In-App"><BellRing className="w-3.5 h-3.5 text-blue-500" /></span>;
      case "Email": return <span title="Email"><Mail className="w-3.5 h-3.5 text-emerald-500" /></span>;
      case "Push": return <span title="Push"><Smartphone className="w-3.5 h-3.5 text-purple-500" /></span>;
      case "SMS": return <span title="SMS"><Smartphone className="w-3.5 h-3.5 text-amber-500" /></span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Mobile Create Button */}
      <div className="sm:hidden mb-4">
        <Link href="/admin-dashboard/notifications/create" className="block">
          <Button className="w-full bg-[#0B2545] hover:bg-[#0B2545]/90 text-white gap-2">
            <Plus className="w-4 h-4" /> Create Notification
          </Button>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium">Total Sent</p>
            <Send className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-[#0B2545]">{mockNotificationAnalytics.totalSent.toLocaleString()}</p>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium">Scheduled</p>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-[#0B2545]">12</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium">Drafts</p>
            <FileText className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-[#0B2545]">5</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium">Avg. Read Rate</p>
            <CheckCircle2 className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-[#0B2545]">{mockNotificationAnalytics.averageReadRate}%</p>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search notifications..."
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
              <option value="Sent">Sent</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Draft">Draft</option>
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
                <TableHead>Notification</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Read Rate</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <BellRing className="w-8 h-8 text-slate-300 mb-2" />
                      <p>No notifications found.</p>
                      {(search || statusFilter !== "All") && (
                        <Button variant="link" onClick={() => {setSearch(""); setStatusFilter("All");}} className="mt-2 h-auto p-0">
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredNotifications.map((notif) => {
                  const readRate = notif.metrics.delivered > 0 
                    ? Math.round((notif.metrics.read / notif.metrics.delivered) * 100) 
                    : 0;

                  return (
                    <TableRow key={notif.id} className="hover:bg-slate-50/80">
                      <TableCell className="max-w-xs">
                        <div className="font-semibold text-[#0B2545] truncate">{notif.title}</div>
                        <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded w-fit mt-1">
                          {notif.type}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-slate-700">{notif.audience}</span>
                        {notif.metrics.totalRecipients > 0 && (
                          <div className="text-xs text-slate-500">~{notif.metrics.totalRecipients.toLocaleString()} students</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          {notif.channels.map(c => (
                            <div key={c} className="p-1 bg-slate-100 rounded border border-slate-200">
                              {getChannelIcon(c)}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusColor(notif.status)}`}>
                            {notif.status}
                          </span>
                          <span className="text-[10px] text-slate-500 whitespace-nowrap">
                            {notif.status === 'Sent' && notif.sentAt ? new Date(notif.sentAt).toLocaleDateString() : ''}
                            {notif.status === 'Scheduled' && notif.scheduledFor ? new Date(notif.scheduledFor).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {notif.status === 'Sent' ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${readRate > 50 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                style={{ width: `${readRate}%` }} 
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-700">{readRate}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-[#0B2545]">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Link href={`/admin-dashboard/notifications/${notif.id}`}>
                              <DropdownMenuItem className="cursor-pointer">
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </DropdownMenuItem>
                            </Link>
                            {notif.status === 'Draft' && (
                              <DropdownMenuItem className="cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" /> Edit Draft
                              </DropdownMenuItem>
                            )}
                            {notif.status === 'Scheduled' && (
                              <DropdownMenuItem className="cursor-pointer text-amber-600 focus:text-amber-600">
                                <X className="mr-2 h-4 w-4" /> Cancel Send
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="cursor-pointer">
                              <Copy className="mr-2 h-4 w-4" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
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
