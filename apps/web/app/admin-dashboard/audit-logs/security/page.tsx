"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ShieldAlert, ShieldX, Key, Unlock, Activity, Search, Filter, 
  AlertTriangle, Clock, ChevronRight, MoreHorizontal, CheckCircle2, XCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockAuditEvents, AuditEvent, AuditSeverity, AuditStatus } from "@/lib/mock/admin-audit";

const SeverityBadge = ({ severity }: { severity: AuditSeverity }) => {
  const styles = {
    Info: "bg-blue-50 text-blue-700 border-blue-200",
    Low: "bg-slate-100 text-slate-700 border-slate-200",
    Medium: "bg-amber-50 text-amber-700 border-amber-200",
    High: "bg-orange-50 text-orange-700 border-orange-200",
    Critical: "bg-red-50 text-red-700 border-red-200 font-bold",
  };
  return <Badge variant="outline" className={`${styles[severity]}`}>{severity}</Badge>;
};

const StatusBadge = ({ status }: { status: AuditStatus }) => {
  if (status === "Success") return <div className="flex items-center text-emerald-600 text-xs font-medium"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Success</div>;
  if (status === "Failed") return <div className="flex items-center text-red-600 text-xs font-medium"><XCircle className="w-3.5 h-3.5 mr-1" /> Failed</div>;
  if (status === "Blocked") return <div className="flex items-center text-amber-600 text-xs font-medium"><ShieldAlert className="w-3.5 h-3.5 mr-1" /> Blocked</div>;
  return null;
};

export default function SecurityEventsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulate fetching data (only high risk/security events)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Filter mock events for security relevancy
      const securityEvents = mockAuditEvents.filter(e => 
        e.severity === "High" || 
        e.severity === "Critical" || 
        e.module === "Authentication" || 
        e.module === "User & Access"
      );
      setEvents(securityEvents);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const filteredEvents = events.filter(e => 
    e.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.actor.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-semibold text-red-800">Failed Logins</p>
            <ShieldX className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="text-2xl font-bold text-red-900">42</h3>
          <p className="text-xs text-red-700 mt-1">Past 24 hours</p>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-semibold text-orange-800">Blocked Events</p>
            <ShieldAlert className="w-5 h-5 text-orange-500" />
          </div>
          <h3 className="text-2xl font-bold text-orange-900">18</h3>
          <p className="text-xs text-orange-700 mt-1">Past 24 hours</p>
        </div>

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-semibold text-amber-800">Suspicious Logins</p>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <h3 className="text-2xl font-bold text-amber-900">5</h3>
          <p className="text-xs text-amber-700 mt-1">New IPs / Devices</p>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-semibold text-blue-800">Account Changes</p>
            <Key className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="text-2xl font-bold text-blue-900">12</h3>
          <p className="text-xs text-blue-700 mt-1">Roles & Permissions</p>
        </div>
      </div>

      {/* High-Risk Activity Banner */}
      <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-amber-500 border-y border-r border-y-slate-200 border-r-slate-200 p-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#0B2545] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> High-Risk Activity Detected
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Super Admin role changed 25 hours ago. Critical severity event requires final review sign-off.
          </p>
        </div>
        <Link href="/admin-dashboard/audit-logs/EVT-20230814-006">
          <Button variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50">View Details</Button>
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search security events..." 
            className="pl-9 bg-slate-50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="bg-slate-50 text-slate-600 border-slate-200">
            <Filter className="w-4 h-4 mr-2" /> Severity: High & Critical
          </Button>
          <Button variant="outline" size="sm" className="bg-slate-50 text-slate-600 border-slate-200">
            <Filter className="w-4 h-4 mr-2" /> Status: All
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[180px]">Time</TableHead>
                <TableHead>User / IP</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Location & Device</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 bg-slate-100 rounded w-24 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-8 bg-slate-100 rounded w-32 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-8 bg-slate-100 rounded w-40 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-8 bg-slate-100 rounded w-32 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-5 bg-slate-100 rounded-full w-16 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-slate-100 rounded w-16 animate-pulse"></div></TableCell>
                    <TableCell className="text-right"><div className="h-8 w-8 bg-slate-100 rounded ml-auto animate-pulse"></div></TableCell>
                  </TableRow>
                ))
              ) : filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    No security events detected.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event) => (
                  <TableRow key={event.id} className="hover:bg-slate-50/50">
                    <TableCell className="align-top">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-[#0B2545]">
                          {new Date(event.timestamp).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="align-top">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#0B2545] truncate max-w-[150px]" title={event.actor.name}>{event.actor.name}</span>
                        <span className="text-xs font-mono text-slate-500 mt-0.5">{event.ipAddress}</span>
                      </div>
                    </TableCell>

                    <TableCell className="align-top">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-800">{event.action}</span>
                        <span className="text-xs text-slate-500 truncate max-w-[200px]" title={event.description}>{event.description}</span>
                      </div>
                    </TableCell>

                    <TableCell className="align-top">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unknown Location</span>
                        <span className="text-sm text-[#0B2545] mt-0.5">{event.sessionInfo}</span>
                      </div>
                    </TableCell>

                    <TableCell className="align-top">
                      <SeverityBadge severity={event.severity} />
                    </TableCell>

                    <TableCell className="align-top">
                      <StatusBadge status={event.status} />
                      {event.reviewStatus === "Unreviewed" && (
                        <span className="inline-block mt-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Unreviewed</span>
                      )}
                      {event.reviewStatus === "Escalated" && (
                        <span className="inline-block mt-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">Escalated</span>
                      )}
                    </TableCell>

                    <TableCell className="align-top text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin-dashboard/audit-logs/${event.id}`}>
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8">
                            View <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Mark as Reviewed</DropdownMenuItem>
                            <DropdownMenuItem className="text-amber-600">Escalate Security Event</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Block IP Address</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
