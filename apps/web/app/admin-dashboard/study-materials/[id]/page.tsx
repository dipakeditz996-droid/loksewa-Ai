"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  ArrowLeft, FileText, Lock, Unlock, Users, BarChart3, Settings, Eye, 
  Download, Clock, Edit2, PlayCircle, History, Trash2, Archive, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockStudyMaterials, StudyMaterial } from "@/lib/mock/admin-study-materials";

export default function MaterialDetailPage() {
  const params = useParams();
  const materialId = params.id as string;
  
  const [material, setMaterial] = useState<StudyMaterial | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      const found = mockStudyMaterials.find(m => m.id === materialId);
      setMaterial(found || null);
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [materialId]);

  if (loading) {
    return <div className="p-8 h-32 bg-slate-100 rounded-xl animate-pulse mx-8 mt-6"></div>;
  }

  if (!material) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <FileText className="w-12 h-12 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-700">Material Not Found</h2>
        <Link href="/admin-dashboard/study-materials">
          <Button variant="outline">Return to Materials</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin-dashboard/study-materials">
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-[#0B2545] hover:bg-slate-200">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#0B2545]">{material.title}</h1>
              {material.status === "Published" && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">Published</Badge>}
              {material.status === "Draft" && <Badge className="bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100">Draft</Badge>}
            </div>
            <p className="text-slate-500 text-sm mt-1">{material.shortDescription}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">
            <Eye className="w-4 h-4 mr-2" /> Preview as Student
          </Button>
          <Link href={`/admin-dashboard/study-materials/new`}>
            <Button className="bg-[#0B2545] hover:bg-[#163E6C] text-white">
              <Edit2 className="w-4 h-4 mr-2" /> Edit Material
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full md:w-[600px] grid-cols-5 bg-white border border-slate-200">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Metadata Card */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h2 className="font-bold text-[#0B2545]">Metadata Details</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Subject</p>
                    <p className="text-base font-medium text-[#0B2545]">{material.subject}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Chapter / Topic</p>
                    <p className="text-base font-medium text-[#0B2545]">{material.chapter || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Material Type</p>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 mt-1">{material.type}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Access Control</p>
                    <div className="mt-1">
                      {material.access === "Premium" 
                        ? <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100"><Lock className="w-3 h-3 mr-1" /> Premium Content</Badge>
                        : <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><Unlock className="w-3 h-3 mr-1" /> Free Access</Badge>
                      }
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-slate-100 pt-6">
                  <p className="text-sm font-semibold text-slate-500 mb-2">Full Description</p>
                  <div className="text-slate-700 text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{__html: material.fullDescription}}></div>
                </div>
              </div>
            </div>

            {/* Quick Stats & File Info */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h2 className="font-bold text-[#0B2545]">File Information</h2>
                </div>
                <div className="p-4 space-y-4 text-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Filename</span>
                    <span className="font-mono text-xs truncate max-w-[150px]" title={material.fileName}>{material.fileName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Size</span>
                    <span className="font-medium text-[#0B2545]">{material.fileSize}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Author</span>
                    <span className="font-medium text-[#0B2545]">{material.author}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Uploaded</span>
                    <span className="text-[#0B2545]">{new Date(material.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#0B2545] to-[#163E6C] text-white rounded-xl shadow-sm p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><BarChart3 className="w-16 h-16" /></div>
                <h3 className="font-bold mb-4 relative z-10">Quick Performance</h3>
                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div>
                    <p className="text-blue-200 text-xs uppercase font-bold tracking-wider mb-1">Total Views</p>
                    <p className="text-2xl font-bold">{material.views.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-blue-200 text-xs uppercase font-bold tracking-wider mb-1">Downloads</p>
                    <p className="text-2xl font-bold">{material.downloads.toLocaleString()}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-blue-200 text-xs uppercase font-bold tracking-wider mb-1">Student Rating</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-[#D4A72C] fill-[#D4A72C]" />
                      <span className="font-bold">{material.averageRating.toFixed(1)}</span>
                      <span className="text-blue-200 text-xs ml-1">({material.totalRatings} reviews)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* CONTENT TAB */}
        <TabsContent value="content" className="mt-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="font-bold text-[#0B2545] flex items-center gap-2"><FileText className="w-5 h-5" /> Media Viewer</h2>
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" /> Download Original</Button>
            </div>
            
            <div className="bg-slate-100 h-[500px] flex flex-col items-center justify-center relative">
              {material.type === "Video" ? (
                <>
                  <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors">
                    <PlayCircle className="w-12 h-12 text-[#0B2545]" />
                  </div>
                  <p className="mt-4 font-bold text-slate-700">Video Preview Mockup</p>
                  <p className="text-sm text-slate-500">{material.duration}</p>
                </>
              ) : (
                <>
                  <FileText className="w-20 h-20 text-slate-300 mb-4" />
                  <p className="font-bold text-slate-700">Document Preview Mockup</p>
                  <p className="text-sm text-slate-500">{material.pageCount} Pages • {material.fileSize}</p>
                </>
              )}
            </div>

            <div className="p-4 bg-amber-50 border-t border-amber-200 flex items-center justify-between">
              <p className="text-sm text-amber-800">Need to update this file? Replacing the file will create a new version.</p>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">Replace File</Button>
            </div>
          </div>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="mt-6 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-[#0B2545] flex items-center gap-2"><History className="w-5 h-5 text-blue-500" /> Version History</h2>
            </div>
            <div className="p-6">
              <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                <div className="relative pl-6">
                  <div className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[7px] top-1.5 ring-4 ring-white" />
                  <p className="text-sm font-bold text-[#0B2545]">Version 2 (Current)</p>
                  <p className="text-xs text-slate-500 mt-0.5">Updated by Suman Nepal on {new Date(material.updatedAt).toLocaleDateString()}</p>
                  <p className="text-sm text-slate-600 mt-1">Replaced PDF with corrected typos in Chapter 3.</p>
                </div>
                <div className="relative pl-6 opacity-60">
                  <div className="absolute w-3 h-3 bg-slate-300 rounded-full -left-[7px] top-1.5 ring-4 ring-white" />
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-slate-700">Version 1 (Initial Release)</p>
                      <p className="text-xs text-slate-500 mt-0.5">Created by LoksewaAI Content Team on {new Date(material.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Button variant="outline" size="sm">Restore V1</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden border-t-4 border-t-red-500">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-[#0B2545]">Danger Zone</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div>
                  <h4 className="font-bold text-slate-800">Archive Material</h4>
                  <p className="text-sm text-slate-500 mt-1">Hide this material from students, but keep it in the system.</p>
                </div>
                <Button variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50"><Archive className="w-4 h-4 mr-2" /> Archive</Button>
              </div>
              
              <div className="flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-lg">
                <div>
                  <h4 className="font-bold text-red-800">Delete Material</h4>
                  <p className="text-sm text-red-600 mt-1">Permanently remove this material and all its files from storage.</p>
                </div>
                <Button className="bg-red-600 hover:bg-red-700 text-white"><Trash2 className="w-4 h-4 mr-2" /> Delete</Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Fallbacks for other tabs */}
        <TabsContent value="students" className="mt-6">
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-bold text-lg text-slate-700">Student Access List</h3>
            <p className="text-slate-500 mt-2">Mock list of students who have accessed or purchased this material would appear here.</p>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="mt-6">
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm">
            <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-bold text-lg text-slate-700">Detailed Analytics</h3>
            <p className="text-slate-500 mt-2">Charts showing views over time and completion rates would render here.</p>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
