"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen, Search, FileText, MoreVertical, Eye, Edit,
  Plus, Loader2, BookMarked
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
import { adminApi, AdminStudyMaterial } from "@/lib/api/admin";

export default function StudyMaterialsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("published");
  const [typeFilter, setTypeFilter] = useState("");
  const [materials, setMaterials] = useState<AdminStudyMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalMaterials, setTotalMaterials] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getStudyMaterials({
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        search: searchTerm || undefined,
        page: currentPage,
        pageSize: 20,
      });
      setMaterials(data.materials);
      setTotalMaterials(data.total);
    } catch (error) {
      console.error("Failed to fetch study materials", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter]);

  useEffect(() => {
    fetchMaterials();
  }, [currentPage, searchTerm, statusFilter, typeFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-slate-700 text-slate-300';
      case 'pending_review':
        return 'bg-yellow-900 text-yellow-300';
      case 'published':
        return 'bg-emerald-900 text-emerald-300';
      case 'changes_requested':
        return 'bg-orange-900 text-orange-300';
      case 'rejected':
        return 'bg-red-900 text-red-300';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'text-green-400';
      case 'intermediate':
        return 'text-yellow-400';
      case 'advanced':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const getAccessTypeColor = (accessType: string) => {
    return accessType === 'free' ? 'text-emerald-400' : 'text-purple-400';
  };

  const publishedCount = materials.filter(m => m.status === 'published').length;
  const draftCount = materials.filter(m => m.status === 'draft').length;
  const pendingCount = materials.filter(m => m.status === 'pending_review').length;

  const materialTypes = [
    { value: '', label: 'All Types' },
    { value: 'notes', label: 'Notes' },
    { value: 'pdf', label: 'PDF' },
    { value: 'video', label: 'Video' },
    { value: 'document', label: 'Document' },
    { value: 'presentation', label: 'Presentation' },
    { value: 'external_link', label: 'External Link' },
    { value: 'study_guide', label: 'Study Guide' },
    { value: 'reference', label: 'Reference Material' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-[#D4A72C]" />
            Study Materials
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage and review published study materials and resources.</p>
        </div>
        <Link href="/admin-dashboard/study-materials/new">
          <Button className="gap-2 bg-[#D4A72C] text-[#0B2545] hover:bg-[#C49B1F]">
            <Plus className="w-4 h-4" />
            New Material
          </Button>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 shadow-sm">
          <p className="text-slate-400 text-sm font-medium mb-1">Total Materials</p>
          <p className="text-2xl font-bold text-white">{totalMaterials.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-slate-400 text-sm font-medium mb-1">Published</p>
          <p className="text-2xl font-bold text-emerald-400">{publishedCount}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 shadow-sm border-l-4 border-l-slate-600">
          <p className="text-slate-400 text-sm font-medium mb-1">Draft</p>
          <p className="text-2xl font-bold text-slate-400">{draftCount}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 shadow-sm border-l-4 border-l-yellow-500">
          <p className="text-slate-400 text-sm font-medium mb-1">Pending Review</p>
          <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            <Input
              placeholder="Search by title, teacher, subject..."
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
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="pending_review">Pending Review</option>
            <option value="all">All Statuses</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A72C]"
          >
            {materialTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-800 hover:bg-slate-800">
                <TableHead className="text-white">Title</TableHead>
                <TableHead className="text-white">Teacher</TableHead>
                <TableHead className="text-white">Subject</TableHead>
                <TableHead className="text-white">Type</TableHead>
                <TableHead className="text-white">Difficulty</TableHead>
                <TableHead className="text-white">Status</TableHead>
                <TableHead className="text-white">Access</TableHead>
                <TableHead className="text-right text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center bg-slate-900">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-600" />
                  </TableCell>
                </TableRow>
              ) : materials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-slate-500 bg-slate-900">
                    No study materials found.
                  </TableCell>
                </TableRow>
              ) : (
                materials.map((material) => (
                  <TableRow key={material.id} className="hover:bg-slate-800/50 border-b border-slate-700">
                    <TableCell>
                      <div>
                        <p className="font-semibold text-white">{material.title}</p>
                        <p className="text-xs text-slate-500">{material.description.substring(0, 40)}...</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-400">{material.teacher}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-400">{material.subject}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                        {material.materialType.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${getDifficultyColor(material.difficulty)}`}>
                        {material.difficulty.charAt(0).toUpperCase() + material.difficulty.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${getStatusColor(material.status)}`}>
                        {material.status.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${getAccessTypeColor(material.accessType)}`}>
                        {material.accessType.charAt(0).toUpperCase() + material.accessType.slice(1)}
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
                            <Eye className="w-4 h-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-slate-300 hover:bg-slate-700">
                            <Edit className="w-4 h-4 mr-2" /> Edit
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
      {!isLoading && totalMaterials > 0 && (
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
            Page {currentPage} of {Math.ceil(totalMaterials / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= Math.ceil(totalMaterials / 20)}
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
