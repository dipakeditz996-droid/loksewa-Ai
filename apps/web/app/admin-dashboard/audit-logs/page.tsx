"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert, Search, Filter, MoreVertical, Eye,
  Loader2, AlertCircle, CheckCircle2, Info
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
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { adminApi, AdminAuditLog } from "@/lib/api/admin";

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getAuditLogs({
        action: actionFilter || undefined,
        search: searchTerm || undefined,
        page: currentPage,
        pageSize: 20,
      });
      setLogs(data.logs);
      setTotalLogs(data.total);
    } catch (error) {
      console.error("Failed to fetch audit logs", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [currentPage, searchTerm, actionFilter]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info':
        return 'bg-blue-900 text-blue-300';
      case 'warning':
        return 'bg-yellow-900 text-yellow-300';
      case 'error':
        return 'bg-red-900 text-red-300';
      case 'success':
        return 'bg-emerald-900 text-emerald-300';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'user_registration':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'content_created':
        return <AlertCircle className="w-4 h-4" />;
      case 'evaluation_submitted':
        return <Info className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const userRegistrationCount = logs.filter(l => l.action === 'user_registration').length;
  const contentCreatedCount = logs.filter(l => l.action === 'content_created').length;
  const evaluationCount = logs.filter(l => l.action === 'evaluation_submitted').length;

  const actionOptions = [
    { value: '', label: 'All Actions' },
    { value: 'user', label: 'User Activities' },
    { value: 'content', label: 'Content Activities' },
    { value: 'evaluation', label: 'Evaluation Activities' },
    { value: 'all', label: 'All Activities' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-[#D4A72C]" />
            Audit Logs
          </h1>
          <p className="text-slate-400 text-sm mt-1">Monitor system activity and track administrative actions.</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 shadow-sm">
          <p className="text-slate-400 text-sm font-medium mb-1">Total Events</p>
          <p className="text-2xl font-bold text-white">{totalLogs.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-slate-400 text-sm font-medium mb-1">User Activities</p>
          <p className="text-2xl font-bold text-blue-400">{userRegistrationCount}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 shadow-sm border-l-4 border-l-purple-500">
          <p className="text-slate-400 text-sm font-medium mb-1">Content Activities</p>
          <p className="text-2xl font-bold text-purple-400">{contentCreatedCount}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-slate-400 text-sm font-medium mb-1">Evaluations</p>
          <p className="text-2xl font-bold text-emerald-400">{evaluationCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            <Input
              placeholder="Search by user, email, or action details..."
              className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A72C]"
          >
            {actionOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-800 hover:bg-slate-800">
                <TableHead className="text-white">Timestamp</TableHead>
                <TableHead className="text-white">Action</TableHead>
                <TableHead className="text-white">User</TableHead>
                <TableHead className="text-white">Details</TableHead>
                <TableHead className="text-white">Severity</TableHead>
                <TableHead className="text-right text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center bg-slate-900">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-600" />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500 bg-slate-900">
                    No audit logs found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-800/50 border-b border-slate-700">
                    <TableCell>
                      <span className="text-sm text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className="text-sm text-white font-medium">{log.actionLabel}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-white">{log.user}</p>
                        <p className="text-xs text-slate-500">{log.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-400 max-w-xs truncate">
                        {log.details}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${getSeverityColor(log.severity)}`}>
                        {log.severity.charAt(0).toUpperCase() + log.severity.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-700">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                          <DropdownMenuLabel className="text-slate-300">Actions</DropdownMenuLabel>
                          <DropdownMenuItem className="cursor-pointer text-slate-300 hover:bg-slate-700">
                            <Eye className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {!isLoading && totalLogs > 0 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
          >
            Previous
          </Button>
          <span className="text-sm text-slate-400">
            Page {currentPage} of {Math.ceil(totalLogs / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= Math.ceil(totalLogs / 20)}
            onClick={() => setCurrentPage(p => p + 1)}
            className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
          >
            Next
          </Button>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-900 border border-blue-800 rounded-xl p-4 text-sm text-blue-300 space-y-2">
        <p className="font-semibold">About Audit Logs</p>
        <p className="text-blue-400">
          This audit log aggregates system activities including user registrations, content creation, and evaluation actions.
          Events are collected from multiple sources and displayed in chronological order for security and compliance purposes.
        </p>
      </div>

    </div>
  );
}
