"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, UserPlus, Search, Filter,
  MoreVertical, Eye, Edit, ShieldAlert,
  Download, CheckCircle2, AlertTriangle, Loader2
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
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { adminApi } from "@/lib/api/admin";

interface AdminData {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  dateJoined: string;
  avatar?: string | null;
}

export default function AdministratorsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAdmins, setSelectedAdmins] = useState<number[]>([]);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getAdministrators({
        search: searchTerm || undefined,
        page: currentPage,
        pageSize: 50,
      });
      setAdmins(data.users);
      setTotalAdmins(data.total);
    } catch (error) {
      console.error("Failed to fetch administrators", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchAdmins();
  }, [currentPage, searchTerm]);

  const activeAdmins = Array.isArray(admins) ? admins.filter(a => a.isActive).length : 0;
  const inactiveAdmins = Array.isArray(admins) ? admins.filter(a => !a.isActive).length : 0;

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedAdmins(admins.map(a => a.id));
    } else {
      setSelectedAdmins([]);
    }
  };

  const toggleSelectAdmin = (id: number) => {
    setSelectedAdmins(prev =>
      prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#D4A72C]" />
            Administrators
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage platform administrators and their specific roles.</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-600 text-sm font-medium mb-1">Total Admins</p>
          <p className="text-2xl font-bold text-[#0B2545]">{totalAdmins.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-slate-600 text-sm font-medium mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{activeAdmins.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-slate-400">
          <p className="text-slate-600 text-sm font-medium mb-1">Inactive</p>
          <p className="text-2xl font-bold text-slate-600">{inactiveAdmins.toLocaleString()}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search name, email or username..."
            className="pl-9 bg-slate-50 placeholder:text-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Bulk Actions Banner */}
      {selectedAdmins.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-center">
          <span className="text-sm font-medium text-blue-800">
            {selectedAdmins.length} admin{selectedAdmins.length > 1 ? 's' : ''} selected
          </span>
        </div>
      )}

      {/* Admins Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-12 text-center">
                  <input type="checkbox" className="rounded border-slate-300" onChange={toggleSelectAll} checked={selectedAdmins.length === admins.length && admins.length > 0} />
                </TableHead>
                <TableHead>Administrator</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    No administrators found.
                  </TableCell>
                </TableRow>
              ) : (
                Array.isArray(admins) && admins.map((admin) => (
                  <TableRow key={admin.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-center">
                      <input type="checkbox" className="rounded border-slate-300" checked={selectedAdmins.includes(admin.id)} onChange={() => toggleSelectAdmin(admin.id)} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-[#0B2545]">{admin.name}</p>
                        <p className="text-xs text-slate-600">{admin.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        admin.role === 'super-admin' ? 'bg-red-100 text-red-700' :
                        admin.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {admin.role === 'super-admin' ? 'Super Admin' : 'Admin'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        admin.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{new Date(admin.dateJoined).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem className="cursor-pointer">
                            <Eye className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer">
                            <Edit className="w-4 h-4 mr-2" /> Edit Role
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
      {!isLoading && totalAdmins > 0 && (
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
            Page {currentPage} of {Math.ceil(totalAdmins / 50)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= Math.ceil(totalAdmins / 50)}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

    </div>
  );
}
