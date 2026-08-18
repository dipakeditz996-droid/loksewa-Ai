"use client";

import React, { useState } from "react";
import { 
  BookOpen, Search, Plus, Filter, Database, FileText, UploadCloud, 
  MoreHorizontal, RefreshCw, Trash2, Edit, CheckCircle2, FileQuestion, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockKnowledgeSources } from "@/lib/mock/admin-ai-tutor";
import toast from "react-hot-toast";

export default function AITutorKnowledgePage() {
  const [search, setSearch] = useState("");
  const [sources, setSources] = useState(mockKnowledgeSources);

  const filteredSources = sources.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.type.toLowerCase().includes(search.toLowerCase())
  );

  const handleReindex = (id: string) => {
    setSources(sources.map(s => s.id === id ? { ...s, status: "Indexing" } : s));
    toast.success("Re-indexing started...");
    
    // Simulate re-indexing completion
    setTimeout(() => {
      setSources(current => current.map(s => 
        s.id === id ? { ...s, status: "Active", lastIndexed: new Date().toISOString() } : s
      ));
      toast.success("Knowledge source successfully re-indexed.");
    }, 3000);
  };

  const getIconForType = (type: string) => {
    switch(type) {
      case 'Question Bank': return <Database className="w-4 h-4 text-purple-500" />;
      case 'PDF': return <FileText className="w-4 h-4 text-red-500" />;
      case 'FAQ': return <HelpCircle className="w-4 h-4 text-amber-500" />;
      default: return <BookOpen className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B2545]">Knowledge Sources</h2>
          <p className="text-sm text-slate-500">Manage documents and databases that the AI Tutor uses for RAG.</p>
        </div>
        <Button className="w-full sm:w-auto bg-[#D4A72C] hover:bg-[#b08b25] text-[#0B2545] font-semibold gap-2">
          <Plus className="w-4 h-4" />
          Add Source
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Coverage Cards */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-1 md:col-span-3 lg:col-span-1">
          <h3 className="font-semibold text-[#0B2545] mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-[#D4A72C]" /> Knowledge Coverage
          </h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Constitution of Nepal</span>
                <span className="font-semibold">80%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>General Knowledge</span>
                <span className="font-semibold">70%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '70%' }}></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Public Management</span>
                <span className="font-semibold">45%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Table Area */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden col-span-1 md:col-span-3 lg:col-span-2">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search knowledge sources..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
            <Button variant="outline" className="w-full sm:w-auto gap-2 bg-white">
              <Filter className="w-4 h-4" /> Filter
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead>Source</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Docs/Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Indexed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <BookOpen className="w-8 h-8 text-slate-300 mb-2" />
                        <p>No knowledge sources found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSources.map((source) => (
                    <TableRow key={source.id} className="hover:bg-slate-50/80">
                      <TableCell>
                        <div className="font-semibold text-[#0B2545]">{source.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{source.description}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getIconForType(source.type)}
                          <span className="text-sm text-slate-600">{source.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-medium text-slate-700">{source.documentCount.toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          source.status === 'Active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          source.status === 'Indexing' ? 'bg-blue-100 text-blue-700 border-blue-200 animate-pulse' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {source.status === 'Active' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {source.status === 'Indexing' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                          {source.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-600">
                          {new Date(source.lastIndexed).toLocaleDateString()}<br/>
                          <span className="text-slate-400">{new Date(source.lastIndexed).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Edit details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleReindex(source.id)} disabled={source.status === 'Indexing'}>
                              <RefreshCw className={`mr-2 h-4 w-4 ${source.status === 'Indexing' ? 'animate-spin' : ''}`} /> 
                              {source.status === 'Indexing' ? 'Indexing...' : 'Re-index Source'}
                            </DropdownMenuItem>
                            <DropdownMenuItem><UploadCloud className="mr-2 h-4 w-4" /> Upload more files</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete source
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
      </div>
    </div>
  );
}
