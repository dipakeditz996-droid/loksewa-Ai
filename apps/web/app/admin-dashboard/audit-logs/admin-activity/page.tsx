"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, Activity, ShieldCheck, AlertTriangle, ChevronRight, MoreHorizontal, CheckCircle2, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { mockAdminActivityStats } from "@/lib/mock/admin-audit";
import { Progress } from "@/components/ui/progress";

export default function AdminActivityPage() {
  const [stats, setStats] = useState(mockAdminActivityStats);
  const [loading, setLoading] = useState(true);

  // Simulate fetching data
  useEffect(() => {
    const timer = setTimeout(() => {
      setStats(mockAdminActivityStats);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Active Admins</p>
            <h3 className="text-2xl font-bold text-[#0B2545]">12</h3>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Actions Today</p>
            <h3 className="text-2xl font-bold text-[#0B2545]">1,245</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">High-Risk Actions</p>
            <h3 className="text-2xl font-bold text-[#0B2545]">59</h3>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-lg flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Failed Actions</p>
            <h3 className="text-2xl font-bold text-[#0B2545]">20</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2">Admin Performance & Activity</h2>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Administrator</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Total Actions</TableHead>
                <TableHead className="w-[200px]">Success Rate</TableHead>
                <TableHead>High-Risk Events</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-8 bg-slate-100 rounded w-32 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-slate-100 rounded w-24 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-slate-100 rounded w-16 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-slate-100 rounded w-32 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-slate-100 rounded w-16 animate-pulse"></div></TableCell>
                    <TableCell className="text-right"><div className="h-8 w-8 bg-slate-100 rounded ml-auto animate-pulse"></div></TableCell>
                  </TableRow>
                ))
              ) : (
                stats.map((admin) => {
                  const successRate = Math.round((admin.successfulActions / admin.totalActions) * 100) || 0;
                  return (
                    <TableRow key={admin.id} className="hover:bg-slate-50/50">
                      <TableCell className="align-middle">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-[#0B2545] text-[#D4A72C] flex items-center justify-center font-bold text-xs">
                              {admin.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${admin.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-[#0B2545]">{admin.name}</span>
                            <span className="text-xs text-slate-500">{admin.role}</span>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-sm text-slate-600 font-medium">
                        {admin.lastActive}
                      </TableCell>

                      <TableCell className="text-sm font-bold text-[#0B2545]">
                        {admin.totalActions.toLocaleString()}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={successRate} className="h-2 w-full" />
                          <span className="text-xs font-bold text-slate-600 w-8">{successRate}%</span>
                        </div>
                        {admin.failedActions > 0 && (
                          <p className="text-[10px] text-red-500 mt-1">{admin.failedActions} failed actions</p>
                        )}
                      </TableCell>

                      <TableCell>
                        {admin.highRiskActions > 0 ? (
                          <div className="flex items-center text-amber-600 text-sm font-bold">
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            {admin.highRiskActions}
                          </div>
                        ) : (
                          <div className="flex items-center text-emerald-600 text-sm font-bold">
                            <ShieldCheck className="w-4 h-4 mr-1" />
                            0
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          View Activity <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
