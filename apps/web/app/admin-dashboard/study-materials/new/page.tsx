"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, UploadCloud, Sparkles, FileText, Image as ImageIcon, 
  Settings, X, Check, FileType, Save, Send, Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function AddMaterialPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [access, setAccess] = useState("Free");

  // Mock Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleAiSuggest = () => {
    if (!file) return alert("Please upload a file first to generate metadata.");
    setAiGenerating(true);
    const fileName = file.name;
    setTimeout(() => {
      setTitle("Comprehensive Guide to " + (fileName.split(".")[0] || fileName).replace(/[-_]/g, " "));
      setDescription("This document provides a detailed overview of the core concepts related to " + fileName + ". It is specifically designed for Loksewa Aayog preparation.");
      setTags(["loksewa", "important", "revision"]);
      setAiGenerating(false);
    }, 1500);
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
            <h1 className="text-2xl font-bold text-[#0B2545]">Add New Material</h1>
            <p className="text-slate-500 text-sm mt-1">Upload files and create rich study resources.</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="text-slate-600 bg-white">
            <Save className="w-4 h-4 mr-2" /> Save Draft
          </Button>
          <Button className="bg-[#0B2545] hover:bg-[#163E6C] text-white">
            <Send className="w-4 h-4 mr-2" /> Publish Now
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* File Upload Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-slate-500" />
                <h2 className="font-bold text-[#0B2545]">Material File</h2>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">Supported: PDF, MP4, MP3, DOCX</Badge>
            </div>
            
            <div className="p-6">
              {!file ? (
                <div 
                  className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  <div className="w-14 h-14 bg-white shadow-sm rounded-full flex items-center justify-center mb-4">
                    <UploadCloud className="w-7 h-7 text-blue-500" />
                  </div>
                  <h3 className="font-bold text-slate-700 text-lg">Drag & drop your study material here</h3>
                  <p className="text-slate-500 text-sm mt-2 max-w-sm">Files up to 500MB. Content is securely stored and delivered globally.</p>
                  <Button variant="outline" className="mt-6 bg-white" onClick={(e) => { e.stopPropagation(); document.getElementById("file-upload")?.click(); }}>
                    Choose File
                  </Button>
                  <input type="file" id="file-upload" className="hidden" onChange={handleFileChange} />
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl p-4 flex items-start gap-4 bg-slate-50">
                  <div className="w-16 h-16 bg-white shadow-sm border border-slate-200 rounded-lg flex items-center justify-center shrink-0">
                    <FileType className="w-8 h-8 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[#0B2545] truncate">{file.name}</h4>
                    <p className="text-sm text-slate-500 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB • Upload Complete</p>
                    <div className="w-full bg-emerald-100 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="bg-emerald-500 h-full w-full"></div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 shrink-0" onClick={() => setFile(null)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </div>
            
            {/* AI Assistant Banner */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-blue-900 text-sm">AI Material Assistant</h4>
                  <p className="text-xs text-blue-700">Let AI auto-generate the title, summary, and tags based on your file.</p>
                </div>
              </div>
              <Button size="sm" onClick={handleAiSuggest} disabled={aiGenerating || !file} className="bg-blue-600 hover:bg-blue-700 text-white">
                {aiGenerating ? "Analyzing..." : "Generate Metadata"}
              </Button>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" />
              <h2 className="font-bold text-[#0B2545]">Basic Information</h2>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Material Title <span className="text-red-500">*</span></Label>
                <Input id="title" placeholder="e.g., Constitution of Nepal - Complete Guide" value={title} onChange={e => setTitle(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Subject <span className="text-red-500">*</span></Label>
                  <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2">
                    <option value="">Select Subject...</option>
                    <option value="constitution">Constitution of Nepal</option>
                    <option value="gk">General Knowledge</option>
                    <option value="iq">IQ & Reasoning</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Chapter / Topic</Label>
                  <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2">
                    <option value="">Select Chapter (Optional)...</option>
                    <option value="part3">Part 3: Fundamental Rights</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDesc">Short Description</Label>
                <Input id="shortDesc" placeholder="A brief 1-2 sentence summary for lists..." value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Full Description (Rich Text)</Label>
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 px-2 font-bold">B</Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 italic">I</Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 underline">U</Button>
                    <div className="w-px h-6 bg-slate-300 mx-1 my-auto"></div>
                    <Button variant="ghost" size="sm" className="h-8 px-2">Heading</Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2">List</Button>
                  </div>
                  <Textarea className="min-h-[200px] border-0 rounded-none focus-visible:ring-0 resize-y" placeholder="Detailed description of the material..." />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (Settings) */}
        <div className="space-y-6">
          
          {/* Classification Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-500" />
              <h2 className="font-bold text-[#0B2545]">Classification</h2>
            </div>
            
            <div className="p-4 space-y-5">
              <div className="space-y-2">
                <Label>Material Type</Label>
                <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option>PDF Document</option>
                  <option>Notes / Article</option>
                  <option>Video Lecture</option>
                  <option>Audio Clip</option>
                  <option>Model Set Solution</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Difficulty Level</Label>
                <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option>Not Applicable</option>
                  <option>Easy (Beginner)</option>
                  <option>Medium (Intermediate)</option>
                  <option>Hard (Advanced)</option>
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <Label>Target Exam / Position</Label>
                <Input placeholder="e.g., Section Officer" className="mb-2" />
                <Input placeholder="e.g., Nayab Subba" />
              </div>
            </div>
          </div>

          {/* Access Control */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-slate-500" />
              <h2 className="font-bold text-[#0B2545]">Access Control</h2>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div 
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${access === 'Free' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                  onClick={() => setAccess("Free")}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-[#0B2545]">Free</span>
                    {access === 'Free' && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-xs text-slate-500 leading-tight">Available to all registered students.</p>
                </div>
                
                <div 
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${access === 'Premium' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-slate-300'}`}
                  onClick={() => setAccess("Premium")}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-[#0B2545]">Premium</span>
                    {access === 'Premium' && <Check className="w-4 h-4 text-amber-600" />}
                  </div>
                  <p className="text-xs text-slate-500 leading-tight">Requires purchase or active subscription.</p>
                </div>
              </div>

              {access === "Premium" && (
                <div className="bg-amber-100 border border-amber-200 p-3 rounded-lg text-xs text-amber-800">
                  Students will be prompted to purchase access via the Marketplace if they attempt to view this material.
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-[#0B2545]">Tags</h2>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="bg-slate-100 hover:bg-slate-200 text-slate-700 pr-1">
                    {tag}
                    <div className="ml-1 hover:bg-slate-300 rounded-full p-0.5 cursor-pointer" onClick={() => removeTag(tag)}>
                      <X className="w-3 h-3" />
                    </div>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Add a tag..." 
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button variant="secondary" onClick={addTag}>Add</Button>
              </div>
            </div>
          </div>

          {/* Author/Source */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-[#0B2545]">Author & Source</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Prepared By / Author</Label>
                <Input placeholder="e.g., Content Team, Expert Name" defaultValue="Admin User" />
              </div>
              <div className="space-y-2">
                <Label>External Source (Optional)</Label>
                <Input placeholder="URL or Book Reference" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Ensure ShieldCheck is available, importing here if not at top
import { ShieldCheck } from "lucide-react";
