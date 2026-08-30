"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar, Search, Plus, MoreVertical, Eye, Edit,
  Loader2, Clock, Pause, Play
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
import { adminApi, AdminStudyPlan } from "@/lib/api/admin";

export default function StudyPlansPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [plans, setPlans] = useState<AdminStudyPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPlans, setTotalPlans] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getStudyPlans({
        level: levelFilter || undefined,
        search: searchTerm || undefined,
        page: currentPage,
        pageSize: 20,
      });
      setPlans(data.plans);
      setTotalPlans(data.total);
    } catch (error) {
      console.error("Failed to fetch study plans", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, levelFilter]);

  useEffect(() => {
    fetchPlans();
  }, [currentPage, searchTerm, levelFilter]);

  const activePlans = plans.filter(p => !p.isPaused).length;
  const pausedPlans = plans.filter(p => p.isPaused).length;

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'BEGINNER':
        return 'bg-green-900 text-green-300';
      case 'INTERMEDIATE':
        return 'bg-yellow-900 text-yellow-300';
      case 'ADVANCED':
        return 'bg-red-900 text-red-300';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  const getStatusColor = (isPaused: boolean) => {
    return isPaused
      ? 'bg-slate-700 text-slate-300'
      : 'bg-emerald-900 text-emerald-300';
  };

  const getTimeColor = (time: string | null) => {
    switch (time) {
      case 'MORNING':
        return 'text-yellow-400';
      case 'AFTERNOON':
        return 'text-orange-400';
      case 'EVENING':
        return 'text-blue-400';
      case 'NIGHT':
        return 'text-purple-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#D4A72C]" />
            Study Plans
          </h1>
          <p className="text-slate-500 text-sm mt-1">Monitor and manage student study plans.</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-600 text-sm font-medium mb-1">Total Plans</p>
          <p className="text-2xl font-bold text-[#0B2545]">{totalPlans.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-slate-600 text-sm font-medium mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{activePlans}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-slate-400">
          <p className="text-slate-600 text-sm font-medium mb-1">Paused</p>
          <p className="text-2xl font-bold text-slate-600">{pausedPlans}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-slate-600 text-sm font-medium mb-1">Avg Daily Minutes</p>
          <p className="text-2xl font-bold text-blue-600">
            {plans.length > 0
              ? Math.round(plans.reduce((sum, p) => sum + p.dailyMinutes, 0) / plans.length)
              : 0}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by student name or email..."
              className="pl-9 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A72C]"
          >
            <option value="">All Levels</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </div>
      </div>

      {/* Plans Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-slate-700">Student</TableHead>
                <TableHead className="text-slate-700">Exam</TableHead>
                <TableHead className="text-slate-700">Level</TableHead>
                <TableHead className="text-slate-700">Daily Minutes</TableHead>
                <TableHead className="text-slate-700">Target Date</TableHead>
                <TableHead className="text-slate-700">Preferred Time</TableHead>
                <TableHead className="text-slate-700">Status</TableHead>
                <TableHead className="text-right text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center bg-white">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-slate-500 bg-white">
                    No study plans found.
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => (
                  <TableRow key={plan.id} className="hover:bg-slate-50/50 border-b border-slate-200">
                    <TableCell>
                      <div>
                        <p className="font-semibold text-[#0B2545]">{plan.student}</p>
                        <p className="text-xs text-slate-600">{plan.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{plan.exam}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${getLevelColor(plan.level)}`}>
                        {plan.level}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {plan.dailyMinutes}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">
                        {new Date(plan.targetDate).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${getTimeColor(plan.preferredTime)}`}>
                        {plan.preferredTime ? plan.preferredTime.charAt(0) + plan.preferredTime.slice(1).toLowerCase() : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-1 rounded flex items-center gap-1 w-fit ${getStatusColor(plan.isPaused)}`}>
                        {plan.isPaused ? (
                          <>
                            <Pause className="w-3 h-3" />
                            Paused
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            Active
                          </>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-100">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin-dashboard/study-plans/${plan.id}`} className="cursor-pointer flex items-center">
                              <Eye className="w-4 h-4 mr-2" /> View Details
                            </Link>
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
      {!isLoading && totalPlans > 0 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {currentPage} of {Math.ceil(totalPlans / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= Math.ceil(totalPlans / 20)}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

    </div>
  );
}
