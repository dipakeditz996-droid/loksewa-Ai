"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, UploadCloud, FileText, CheckCircle2, 
  Trash2, FilePlus, Sparkles, AlertCircle, FileType2, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function BulkUploadPage() {
  const [files, setFiles] = useState<{name: string, size: string, status: string, subject: string, type: string}[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files).map(file => ({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        status: "Pending",
        subject: "Auto-detecting...",
        type: file.name.endsWith(".pdf") ? "PDF" : "Unknown"
      }));
      setFiles([...files, ...newFiles]);

      // Simulate AI detection delay
      setTimeout(() => {
        setFiles(prev => prev.map(f => ({
          ...f,
          subject: "Constitution of Nepal", // mock detection
          status: "Ready"
        })));
      }, 1500);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

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
            <h1 className="text-2xl font-bold text-[#0B2545]">Bulk Upload Materials</h1>
            <p className="text-slate-500 text-sm mt-1">Upload multiple files or import via CSV mapping.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* File Upload Area */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-[#0B2545]">Select Files</h2>
            </div>
            
            <div className="p-6">
              <div 
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="w-14 h-14 bg-white shadow-sm rounded-full flex items-center justify-center mb-4">
                  <FilePlus className="w-7 h-7 text-blue-500" />
                </div>
                <h3 className="font-bold text-slate-700 text-lg">Drag & drop multiple files or folders here</h3>
                <p className="text-slate-500 text-sm mt-2">Upload up to 50 files at once.</p>
                <Button variant="outline" className="mt-6 bg-white">
                  Browse Files
                </Button>
              </div>
            </div>
          </div>

          {/* Upload Queue */}
          {files.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h2 className="font-bold text-[#0B2545]">Upload Queue ({files.length})</h2>
                <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setFiles([])}>Clear All</Button>
              </div>
              
              <div className="divide-y divide-slate-100">
                {files.map((file, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#0B2545]">{file.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">{file.size}</span>
                          <span className="text-slate-300">•</span>
                          {file.status === "Pending" ? (
                            <span className="text-xs text-amber-500 font-medium flex items-center gap-1"><Sparkles className="w-3 h-3" /> Auto-detecting metadata...</span>
                          ) : (
                            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ready</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-semibold text-slate-500">Detected Subject</p>
                        <p className="text-sm font-medium text-[#0B2545]">{file.subject}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500" onClick={() => removeFile(idx)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Column / Settings */}
        <div className="space-y-6">
          
          {/* Bulk Metadata Application */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-[#0B2545]">Apply Bulk Metadata</h2>
              <p className="text-xs text-slate-500 mt-0.5">Apply these settings to all files in queue.</p>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Common Subject</Label>
                <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option>Do not override</option>
                  <option>Constitution of Nepal</option>
                  <option>General Knowledge</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Common Material Type</Label>
                <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option>Auto-detect</option>
                  <option>PDF Document</option>
                  <option>Video Lecture</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Common Access Control</Label>
                <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option>Free</option>
                  <option>Premium</option>
                </select>
              </div>

              <Button className="w-full bg-[#0B2545] text-white hover:bg-[#163E6C]" disabled={files.length === 0}>
                <Send className="w-4 h-4 mr-2" /> Upload & Publish {files.length > 0 ? `(${files.length})` : ''}
              </Button>
            </div>
          </div>

          {/* CSV Import */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <FileType2 className="w-5 h-5 text-slate-500" />
              <h2 className="font-bold text-[#0B2545]">CSV Metadata Import</h2>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-sm text-slate-600">
                Upload a CSV to map metadata (Title, Subject, Tags) to files already uploaded or linked via external URLs.
              </p>
              
              <div className="border border-slate-200 rounded p-3 bg-slate-50 text-center">
                <Button variant="outline" className="bg-white w-full">
                  <UploadCloud className="w-4 h-4 mr-2" /> Choose CSV File
                </Button>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-blue-600 cursor-pointer hover:underline">Download Template</span>
                <span className="text-xs text-slate-400">Max 500 rows</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
