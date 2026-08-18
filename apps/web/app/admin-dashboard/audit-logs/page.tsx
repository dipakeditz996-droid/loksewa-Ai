"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, Filter, Calendar, Activity, AlertCircle, Clock, 
  ChevronRight, MoreHorizontal, FileText, CheckCircle2, XCircle, ShieldAlert
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
import { mockAuditEvents, mockAuditAnalytics, AuditEvent, AuditSeverity, AuditStatus } from "@/lib/mock/admin-audit";

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

export default function AllActivityPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulate fetching data
  useEffect(() => {
    const timer = setTimeout(() => {
      setEvents(mockAuditEvents);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const filteredEvents = events.filter(e => 
    e.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.target.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 mb-1">Total Events Today</p>
          <div className="flex items-end gap-2">
            <h3 className="text-2xl font-bold text-[#0B2545]">{mockAuditAnalytics.eventsToday}</h3>
            <span className="text-xs text-emerald-500 mb-1 font-medium">+12% from yesterday</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 mb-1">Security Events</p>
          <div className="flex items-end gap-2">
            <h3 className="text-2xl font-bold text-[#0B2545]">{mockAuditAnalytics.securityEventsToday}</h3>
            <span className="text-xs text-red-500 mb-1 font-medium">Requires review</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 mb-1">Critical Alerts</p>
          <div className="flex items-end gap-2">
            <h3 className="text-2xl font-bold text-red-600">{mockAuditAnalytics.criticalAlerts}</h3>
            <span className="text-xs text-slate-400 mb-1 font-medium">Unresolved</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 mb-1">Most Active Module</p>
          <h3 className="text-xl font-bold text-[#0B2545] truncate">{mockAuditAnalytics.mostActiveModule}</h3>
        </div>
      </div>

      {mockAuditAnalytics.criticalAlerts > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h4 className="font-bold text-red-900">Critical security event detected.</h4>
              <p className="text-sm text-red-700">There are {mockAuditAnalytics.criticalAlerts} unreviewed critical events in the last 24 hours.</p>
            </div>
          </div>
          <Link href="/admin-dashboard/audit-logs/security">
            <Button className="bg-red-600 hover:bg-red-700 text-white">Review Events</Button>
          </Link>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 items-end lg:items-center justify-between">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search actor, action, target or ID..." 
            className="pl-9 bg-slate-50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <Button variant="outline" size="sm" className="bg-slate-50 text-slate-600 border-slate-200">
            <Calendar className="w-4 h-4 mr-2" /> Today
          </Button>
          <Button variant="outline" size="sm" className="bg-slate-50 text-slate-600 border-slate-200">
            <Filter className="w-4 h-4 mr-2" /> Module: All
          </Button>
          <Button variant="outline" size="sm" className="bg-slate-50 text-slate-600 border-slate-200">
            <Filter className="w-4 h-4 mr-2" /> Severity: All
          </Button>
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Real-time Activity Indicator */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 px-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        Live Activity Monitoring Active
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action & Module</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Skeleton Loader
                Array.from({ length: 5 }).map((_, i) => (
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
                    No audit events found. <button onClick={() => setSearchQuery("")} className="text-blue-600 underline">Clear filters</button>
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
                        <span className="text-[10px] text-slate-400 mt-1 font-mono" title="Event ID">{event.id}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="align-top">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#0B2545]">{event.actor.name}</span>
                        <span className="text-xs text-slate-500">{event.actor.type}</span>
                      </div>
                    </TableCell>

                    <TableCell className="align-top">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-800">{event.action}</span>
                        <span className="text-xs text-slate-500">{event.module}</span>
                      </div>
                    </TableCell>

                    <TableCell className="align-top">
                      <div className="flex flex-col max-w-[200px]">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{event.target.type}</span>
                        <span className="text-sm text-[#0B2545] truncate" title={event.target.name}>{event.target.name}</span>
                        <span className="text-xs font-mono text-slate-400">{event.target.id}</span>
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
                            <DropdownMenuItem className="text-amber-600">Escalate Event</DropdownMenuItem>
                            <DropdownMenuItem>Copy JSON</DropdownMenuItem>
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
        
        {/* Pagination mock */}
        <div className="border-t border-slate-200 p-4 flex items-center justify-between text-sm text-slate-500 bg-slate-50">
          <span>Showing 1 to {filteredEvents.length} of 2,450 entries</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled className="h-8">Previous</Button>
            <Button variant="outline" size="sm" className="h-8 bg-white">1</Button>
            <Button variant="outline" size="sm" className="h-8 bg-white">2</Button>
            <Button variant="outline" size="sm" className="h-8 bg-white">3</Button>
            <Button variant="outline" size="sm" className="h-8">Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
