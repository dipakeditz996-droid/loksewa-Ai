"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardList, Search, Filter, MoreVertical, Eye,
  CheckCircle2, Clock, AlertCircle, Loader2
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
import { adminApi, AdminEvaluation } from "@/lib/api/admin";

export default function EvaluationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("submitted");
  const [evaluations, setEvaluations] = useState<AdminEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalEvaluations, setTotalEvaluations] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchEvaluations = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getEvaluations({
        status: statusFilter || undefined,
        search: searchTerm || undefined,
        page: currentPage,
        pageSize: 20,
      });
      setEvaluations(data.evaluations);
      setTotalEvaluations(data.total);
    } catch (error) {
      console.error("Failed to fetch evaluations", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchEvaluations();
  }, [currentPage, searchTerm, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-700';
      case 'under-review':
        return 'bg-yellow-100 text-yellow-700';
      case 'evaluated':
        return 'bg-emerald-100 text-emerald-700';
      case 'returned':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Clock className="w-4 h-4" />;
      case 'under-review':
        return <AlertCircle className="w-4 h-4" />;
      case 'evaluated':
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const pendingCount = evaluations.filter(e => e.status === 'submitted').length;
  const underReviewCount = evaluations.filter(e => e.status === 'under-review').length;
  const evaluatedCount = evaluations.filter(e => e.status === 'evaluated').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-[#D4A72C]" />
            Evaluations
          </h1>
          <p className="text-slate-400 text-sm mt-1">Review and evaluate student subjective answers.</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 shadow-sm">
          <p className="text-slate-400 text-sm font-medium mb-1">Total Pending</p>
          <p className="text-2xl font-bold text-white">{totalEvaluations.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-slate-400 text-sm font-medium mb-1">Submitted</p>
          <p className="text-2xl font-bold text-blue-400">{pendingCount}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 shadow-sm border-l-4 border-l-yellow-500">
          <p className="text-slate-400 text-sm font-medium mb-1">Under Review</p>
          <p className="text-2xl font-bold text-yellow-400">{underReviewCount}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-slate-400 text-sm font-medium mb-1">Evaluated</p>
          <p className="text-2xl font-bold text-emerald-400">{evaluatedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            <Input
              placeholder="Search student name, email, or question..."
              className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A72C]"
          >
            <option value="submitted">Submitted</option>
            <option value="under-review">Under Review</option>
            <option value="evaluated">Evaluated</option>
            <option value="all">All Statuses</option>
          </select>
        </div>
      </div>

      {/* Evaluations Table */}
      <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-800 hover:bg-slate-800">
                <TableHead className="text-white">Student</TableHead>
                <TableHead className="text-white">Question</TableHead>
                <TableHead className="text-white">Marks</TableHead>
                <TableHead className="text-white">Status</TableHead>
                <TableHead className="text-white">Submitted</TableHead>
                <TableHead className="text-white">Evaluator</TableHead>
                <TableHead className="text-right text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center bg-slate-900">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-600" />
                  </TableCell>
                </TableRow>
              ) : evaluations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500 bg-slate-900">
                    No evaluations found.
                  </TableCell>
                </TableRow>
              ) : (
                evaluations.map((evaluation) => (
                  <TableRow key={evaluation.id} className="hover:bg-slate-800/50 border-b border-slate-700">
                    <TableCell>
                      <div>
                        <p className="font-semibold text-white">{evaluation.student}</p>
                        <p className="text-xs text-slate-500">{evaluation.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm text-white truncate">{evaluation.question}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-white font-medium">{evaluation.marks}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(evaluation.status)}
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${getStatusColor(evaluation.status)}`}>
                          {evaluation.status.replace('-', ' ').charAt(0).toUpperCase() + evaluation.status.slice(1).replace('-', ' ')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">
                      {evaluation.submittedAt ? new Date(evaluation.submittedAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-400">
                        {evaluation.evaluator || 'Pending'}
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
                            <Eye className="w-4 h-4 mr-2" /> View Answer
                          </DropdownMenuItem>
                          {evaluation.status === 'submitted' && (
                            <DropdownMenuItem className="cursor-pointer text-slate-300 hover:bg-slate-700">
                              Assign for Evaluation
                            </DropdownMenuItem>
                          )}
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
      {!isLoading && totalEvaluations > 0 && (
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
            Page {currentPage} of {Math.ceil(totalEvaluations / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= Math.ceil(totalEvaluations / 20)}
            onClick={() => setCurrentPage(p => p + 1)}
            className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
          >
            Next
          </Button>
        </div>
      )}

    </div>
  );
}
