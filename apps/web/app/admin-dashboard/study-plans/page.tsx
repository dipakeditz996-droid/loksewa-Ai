"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  CalendarDays, Search, Plus, Filter, MoreHorizontal,
  Edit, Copy, Eye, Send, Archive, Trash2, Users,
  CheckCircle, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockStudyPlans, mockStudyPlanStudents } from "@/lib/mock/admin-study-plans";
import { mockExamCategories, mockPositions } from "@/lib/mock/admin-academic";

export default function StudyPlansOverviewPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredPlans = useMemo(() => {
    let result = mockStudyPlans;
    
    if (categoryFilter !== "all") {
      result = result.filter(e => e.categoryId === categoryFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter(e => e.status === statusFilter);
    }
    if (search) {
      result = result.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));
    }
    
    return result;
  }, [search, categoryFilter, statusFilter]);

  // Overview Stats
  const totalPlans = mockStudyPlans.length;
  const activePlans = mockStudyPlans.filter(e => e.status === "Active").length;
  const completedPlans = mockStudyPlans.filter(e => e.status === "Completed").length;
  const draftPlans = mockStudyPlans.filter(e => e.status === "Draft").length;
  const totalStudents = mockStudyPlanStudents.length;

  const statCards = [
    { label: "Total Plans", value: totalPlans, icon: CalendarDays, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Active Plans", value: activePlans, icon: Send, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Completed", value: completedPlans, icon: CheckCircle, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Drafts", value: draftPlans, icon: FileText, color: "text-slate-500", bg: "bg-slate-50" },
    { label: "Students Using Plans", value: totalStudents, icon: Users, color: "text-amber-500", bg: "bg-amber-50" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Published": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Draft": return "bg-slate-100 text-slate-700 border-slate-200";
      case "Active": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Completed": return "bg-purple-100 text-purple-700 border-purple-200";
      case "Archived": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-[#0B2545] hidden sm:block">Plan Overview</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="gap-2 bg-white flex-1 sm:flex-none">
            Import Plan
          </Button>
          <Link href="/admin-dashboard/study-plans/create" className="flex-1 sm:flex-none">
            <Button className="w-full bg-[#D4A72C] hover:bg-[#b08b25] text-[#0B2545] font-semibold gap-2">
              <Plus className="w-4 h-4" />
              Create Study Plan
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
              <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#0B2545]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Table Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search study plans..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px] bg-white">
                <SelectValue placeholder="Filter Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {mockExamCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Published">Published</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" onClick={() => { setSearch(""); setCategoryFilter("all"); setStatusFilter("all"); }} className="text-slate-500 hover:text-slate-900">
              Clear
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead>Plan</TableHead>
                <TableHead>Target Exam / Position</TableHead>
                <TableHead className="text-center">Duration</TableHead>
                <TableHead className="text-center">Students</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <CalendarDays className="w-8 h-8 text-slate-300 mb-2" />
                      <p>No study plans found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlans.map((plan) => {
                  const category = mockExamCategories.find(c => c.id === plan.categoryId);
                  const position = mockPositions.find(p => p.id === plan.positionId);
                  const studentsCount = mockStudyPlanStudents.filter(s => s.planId === plan.id).length;
                  
                  return (
                    <TableRow key={plan.id} className="group cursor-pointer hover:bg-slate-50/80">
                      <TableCell>
                        <div className="font-medium text-[#0B2545]">{plan.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{plan.type}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-700">{category?.shortName || "N/A"}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{position?.name || "N/A"}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium text-slate-700">{plan.durationDays} Days</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-slate-600">{studentsCount}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(plan.status)}`}>
                          {plan.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-600">
                          {new Date(plan.updatedAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin-dashboard/study-plans/${plan.id}`} className="cursor-pointer">
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" /> Edit Plan
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" /> Duplicate
                            </DropdownMenuItem>
                            
                            {plan.status === 'Draft' ? (
                              <DropdownMenuItem className="text-emerald-600 focus:text-emerald-600">
                                <Send className="mr-2 h-4 w-4" /> Publish
                              </DropdownMenuItem>
                            ) : plan.status === 'Published' || plan.status === 'Active' ? (
                              <DropdownMenuItem className="text-amber-600 focus:text-amber-600">
                                <Archive className="mr-2 h-4 w-4" /> Archive
                              </DropdownMenuItem>
                            ) : null}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600">
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
