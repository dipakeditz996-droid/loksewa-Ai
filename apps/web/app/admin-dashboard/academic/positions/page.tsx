"use client";

import React, { useState, useEffect } from "react";
import { Briefcase, Search, Loader2, MoreVertical, Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { adminApi } from "@/lib/api/admin";

export default function AcademicPositionsPage() {
  const [positions, setPositions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPositions, setTotalPositions] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({ name: "", code: "", category: "", order: 0 });

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const data = await adminApi.getPositions({
          search: searchTerm,
          page: currentPage,
          pageSize: 20
        });
        const positionsList = Array.isArray(data) ? data : (data.results || []);
        setPositions(positionsList);
        setTotalPositions(data.count || positionsList.length || 0);
      } catch (error) {
        console.error("Failed to fetch positions", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPositions();
  }, [searchTerm, currentPage]);

  const activePositions = positions.filter(p => p.is_active).length;

  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createPosition({
        name: createFormData.name,
        code: createFormData.code,
        category: createFormData.category,
        order: createFormData.order,
      });
      setShowCreateModal(false);
      setCreateFormData({ name: "", code: "", category: "", order: 0 });
      const data = await adminApi.getPositions({ page: 1, pageSize: 20 });
      const positionsList = Array.isArray(data) ? data : (data.results || []);
      setPositions(positionsList);
      setTotalPositions(data.count || positionsList.length || 0);
      setCurrentPage(1);
    } catch (error) {
      console.error("Failed to create position", error);
      alert("Failed to create position");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-[#D4A72C]" />
            Positions
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage job positions for Loksewa exams.</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="gap-2 bg-[#D4A72C] text-[#0B2545] hover:bg-[#C49B1F]"
        >
          <Plus className="w-4 h-4" />
          New Position
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-600 text-sm font-medium mb-1">Total Positions</p>
          <p className="text-2xl font-bold text-[#0B2545]">{totalPositions}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-slate-600 text-sm font-medium mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{activePositions}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-slate-400">
          <p className="text-slate-600 text-sm font-medium mb-1">Inactive</p>
          <p className="text-2xl font-bold text-slate-600">{totalPositions - activePositions}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative w-full">
          <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
          <Search className="absolute left-3 bottom-2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search positions..."
            className="pl-9 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-600"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-slate-700">Name</TableHead>
                <TableHead className="text-slate-700">Code</TableHead>
                <TableHead className="text-slate-700">Category</TableHead>
                <TableHead className="text-slate-700">Order</TableHead>
                <TableHead className="text-slate-700">Status</TableHead>
                <TableHead className="text-right text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center bg-white">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : positions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500 bg-white">
                    No positions found.
                  </TableCell>
                </TableRow>
              ) : (
                positions.map((position) => (
                  <TableRow key={position.id} className="hover:bg-slate-50/50 border-b border-slate-200">
                    <TableCell>
                      <p className="font-semibold text-[#0B2545]">{position.name}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-600">{position.code || '-'}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-600">{position.category || '-'}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">#{position.order}</span>
                    </TableCell>
                    <TableCell>
                      <span className={position.is_active ? 'bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-1 rounded' : 'bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-1 rounded'}>
                        {position.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-100">
                            <MoreVertical className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem className="cursor-pointer">
                            <Eye className="w-4 h-4 mr-2" /> View
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

      {!isLoading && totalPositions > 0 && (
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
            Page {currentPage} of {Math.ceil(totalPositions / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= Math.ceil(totalPositions / 20)}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-[#0B2545] mb-4">Create New Position</h2>
            <form onSubmit={handleCreatePosition} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Position Name *</label>
                <Input
                  type="text"
                  placeholder="Enter position name"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  required
                  className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Code</label>
                <Input
                  type="text"
                  placeholder="Enter position code (optional)"
                  value={createFormData.code}
                  onChange={(e) => setCreateFormData({ ...createFormData, code: e.target.value })}
                  className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <Input
                  type="text"
                  placeholder="Enter category (optional)"
                  value={createFormData.category}
                  onChange={(e) => setCreateFormData({ ...createFormData, category: e.target.value })}
                  className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Order</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={createFormData.order}
                  onChange={(e) => setCreateFormData({ ...createFormData, order: parseInt(e.target.value) })}
                  className="bg-slate-50 border-slate-200 text-slate-900"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-[#D4A72C] text-[#0B2545] hover:bg-[#C49B1F]"
                >
                  Create Position
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
