"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, Filter, PlusCircle, UploadCloud, BookOpen, Clock, 
  ChevronRight, MoreHorizontal, FileText, CheckCircle2,
  Lock, Unlock, Eye, Download, FileVideo, FileAudio, FileBadge2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { mockStudyMaterials, mockMaterialAnalytics, StudyMaterial, MaterialType, AccessType, MaterialStatus } from "@/lib/mock/admin-study-materials";

const MaterialIcon = ({ type }: { type: MaterialType }) => {
  if (type === "Video") return <FileVideo className="w-5 h-5 text-blue-500" />;
  if (type === "Audio") return <FileAudio className="w-5 h-5 text-purple-500" />;
  if (type === "PDF" || type === "Book") return <FileText className="w-5 h-5 text-red-500" />;
  return <FileBadge2 className="w-5 h-5 text-emerald-500" />;
};

const AccessBadge = ({ access }: { access: AccessType }) => {
  if (access === "Premium") {
    return <span className="inline-flex items-center text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-semibold border border-amber-200"><Lock className="w-3 h-3 mr-1" /> Premium</span>;
  }
  return <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold border border-emerald-200"><Unlock className="w-3 h-3 mr-1" /> Free</span>;
};

const StatusBadge = ({ status }: { status: MaterialStatus }) => {
  const styles = {
    Published: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Draft: "bg-slate-100 text-slate-700 border-slate-200",
    Archived: "bg-red-50 text-red-700 border-red-200",
    Scheduled: "bg-blue-50 text-blue-700 border-blue-200"
  };
  return <Badge variant="outline" className={styles[status]}>{status}</Badge>;
};

export default function StudyMaterialsOverviewPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulate fetching data
  useEffect(() => {
    const timer = setTimeout(() => {
      setMaterials(mockStudyMaterials);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const filteredMaterials = materials.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.chapter && m.chapter.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Actions & Analytics Cards */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-3/4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-slate-500 mb-1">Total Materials</p>
            <h3 className="text-2xl font-bold text-[#0B2545]">{mockMaterialAnalytics.totalMaterials}</h3>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-slate-500 mb-1">Published</p>
            <h3 className="text-2xl font-bold text-emerald-600">{mockMaterialAnalytics.published}</h3>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-slate-500 mb-1">Premium</p>
            <h3 className="text-2xl font-bold text-amber-600">{mockMaterialAnalytics.premium}</h3>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-slate-500 mb-1">Total Views</p>
            <h3 className="text-2xl font-bold text-blue-600">{(mockMaterialAnalytics.totalViews / 1000000).toFixed(1)}M</h3>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Link href="/admin-dashboard/study-materials/bulk-upload" className="w-1/2 md:w-auto">
            <Button variant="outline" className="w-full">
              <UploadCloud className="w-4 h-4 mr-2" /> Bulk Upload
            </Button>
          </Link>
          <Link href="/admin-dashboard/study-materials/new" className="w-1/2 md:w-auto">
            <Button className="w-full bg-[#0B2545] text-white hover:bg-[#163E6C]">
              <PlusCircle className="w-4 h-4 mr-2" /> Add New
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 items-end lg:items-center justify-between">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search material title, subject..." 
            className="pl-9 bg-slate-50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <Button variant="outline" size="sm" className="bg-slate-50 text-slate-600 border-slate-200">
            <Filter className="w-4 h-4 mr-2" /> Subject: All
          </Button>
          <Button variant="outline" size="sm" className="bg-slate-50 text-slate-600 border-slate-200">
            <Filter className="w-4 h-4 mr-2" /> Type: All
          </Button>
          <Button variant="outline" size="sm" className="bg-slate-50 text-slate-600 border-slate-200">
            <Filter className="w-4 h-4 mr-2" /> Access: All
          </Button>
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
            Clear
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Subject / Chapter</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Metrics</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-10 bg-slate-100 rounded w-48 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-8 bg-slate-100 rounded w-32 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-5 bg-slate-100 rounded-full w-16 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-5 bg-slate-100 rounded-full w-20 animate-pulse"></div></TableCell>
                    <TableCell className="text-right"><div className="h-8 bg-slate-100 rounded w-24 ml-auto animate-pulse"></div></TableCell>
                    <TableCell className="text-right"><div className="h-8 w-8 bg-slate-100 rounded ml-auto animate-pulse"></div></TableCell>
                  </TableRow>
                ))
              ) : filteredMaterials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    No study materials found. <button onClick={() => setSearchQuery("")} className="text-blue-600 underline">Clear filters</button>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMaterials.map((material) => (
                  <TableRow key={material.id} className="hover:bg-slate-50/50">
                    <TableCell className="align-top">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 bg-slate-100 p-2 rounded-lg">
                          <MaterialIcon type={material.type} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[#0B2545] hover:text-blue-600 cursor-pointer">{material.title}</span>
                          <span className="text-xs text-slate-500 mt-0.5">{material.type} • {material.fileSize}</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-1">{material.id}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="align-top">
                      <div className="flex flex-col max-w-[200px]">
                        <span className="text-sm font-semibold text-slate-800 truncate" title={material.subject}>{material.subject}</span>
                        {material.chapter && (
                          <span className="text-xs text-slate-500 truncate mt-0.5" title={material.chapter}>{material.chapter}</span>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {material.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[9px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">#{tag}</span>
                          ))}
                          {material.tags.length > 2 && <span className="text-[9px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">+{material.tags.length - 2}</span>}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="align-top">
                      <AccessBadge access={material.access} />
                    </TableCell>

                    <TableCell className="align-top">
                      <StatusBadge status={material.status} />
                      <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(material.updatedAt).toLocaleDateString()}
                      </div>
                    </TableCell>

                    <TableCell className="align-top text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center text-xs text-slate-600 font-medium">
                          {material.views.toLocaleString()} <Eye className="w-3 h-3 ml-1 text-slate-400" />
                        </div>
                        <div className="flex items-center text-xs text-slate-600 font-medium">
                          {material.downloads.toLocaleString()} <Download className="w-3 h-3 ml-1 text-slate-400" />
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="align-top text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin-dashboard/study-materials/${material.id}`}>
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
                            <DropdownMenuItem>Edit Material</DropdownMenuItem>
                            <DropdownMenuItem>Preview as Student</DropdownMenuItem>
                            <DropdownMenuItem>Manage Access</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-amber-600">Archive</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
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
          <span>Showing 1 to {filteredMaterials.length} of {mockMaterialAnalytics.totalMaterials} materials</span>
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
