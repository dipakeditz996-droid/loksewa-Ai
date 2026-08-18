"use client";

import React, { useState } from "react";
import { 
  FileCode2, Search, Plus, Filter, Play, 
  Save, CheckCircle2, Copy, History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { mockPrompts } from "@/lib/mock/admin-ai-tutor";
import toast from "react-hot-toast";

export default function AITutorPromptsPage() {
  const [search, setSearch] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState<any | null>(null);
  const [promptContent, setPromptContent] = useState("");
  const [mockPreview, setMockPreview] = useState("");

  const filteredPrompts = mockPrompts.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (prompt: any) => {
    setSelectedPrompt(prompt);
    setPromptContent(prompt.content);
    setMockPreview("");
  };

  const handleSave = () => {
    if (selectedPrompt) {
      toast.success(`Saved new version of ${selectedPrompt.name}`);
      setSelectedPrompt(null);
    }
  };

  const handleGeneratePreview = () => {
    toast.loading("Generating mock AI response...", { duration: 1000 });
    setTimeout(() => {
      setMockPreview("Here is a clear and concise explanation for your question based on the official Loksewa syllabus. The correct answer is [C] because it directly relates to the constitutional provision mentioned in Article 23. Let me know if you need further clarification on this topic!");
    }, 1000);
  };

  if (selectedPrompt) {
    return (
      <div className="space-y-6 pb-12 h-[calc(100vh-140px)] flex flex-col">
        {/* Editor Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Button variant="ghost" className="h-8 px-2 text-slate-500 hover:text-slate-900 bg-slate-100" onClick={() => setSelectedPrompt(null)}>
                Cancel
              </Button>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                v{selectedPrompt.version}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#0B2545]">{selectedPrompt.name}</h2>
          </div>
          <Button className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white gap-2 w-full sm:w-auto" onClick={handleSave}>
            <Save className="w-4 h-4" /> Save as v{selectedPrompt.version + 1}
          </Button>
        </div>

        {/* Editor Body */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          {/* Left Column: Code Editor */}
          <div className="bg-[#0F172A] rounded-xl shadow-lg border border-slate-800 flex flex-col overflow-hidden">
            <div className="bg-[#1E293B] px-4 py-2 border-b border-slate-700 flex justify-between items-center shrink-0">
              <span className="text-sm font-medium text-slate-300 font-mono">system_prompt.txt</span>
              <span className="text-xs text-slate-500 font-mono">{promptContent.length} chars</span>
            </div>
            <Textarea 
              className="flex-1 bg-transparent border-0 text-slate-300 font-mono p-6 resize-none focus-visible:ring-0 rounded-none leading-relaxed"
              value={promptContent}
              onChange={(e) => setPromptContent(e.target.value)}
              spellCheck={false}
            />
            <div className="bg-[#1E293B] px-4 py-3 border-t border-slate-700 shrink-0">
              <p className="text-xs text-slate-400 font-medium mb-2 uppercase tracking-wider">Available Variables</p>
              <div className="flex flex-wrap gap-2">
                {['{{student_name}}', '{{subject}}', '{{question}}', '{{student_answer}}'].map(v => (
                  <span key={v} className="text-xs bg-slate-800 text-amber-400 px-2 py-1 rounded cursor-pointer hover:bg-slate-700 transition-colors font-mono">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Preview & Variables test */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50">
              <h3 className="font-semibold text-[#0B2545] flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-600" /> Test Prompt
              </h3>
              <Button size="sm" variant="outline" className="bg-white" onClick={handleGeneratePreview}>
                Generate Preview
              </Button>
            </div>
            
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* Test Variables */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">Test Context</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Student Name</Label>
                    <Input className="h-8 text-sm bg-slate-50" defaultValue="Ramesh Nepali" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Subject</Label>
                    <Input className="h-8 text-sm bg-slate-50" defaultValue="Constitution" />
                  </div>
                </div>
              </div>

              {/* Mock AI Output */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                  <span>AI Response Preview</span>
                  <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">Mock Data</span>
                </h4>
                <div className="min-h-[150px] bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 leading-relaxed">
                  {mockPreview ? mockPreview : <span className="text-slate-400 italic">Click 'Generate Preview' to see how the AI responds based on the current prompt structure.</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B2545]">Prompt Management</h2>
          <p className="text-sm text-slate-500">Configure the instructions that guide the AI Tutor's behavior.</p>
        </div>
        <Button className="w-full sm:w-auto bg-[#D4A72C] hover:bg-[#b08b25] text-[#0B2545] font-semibold gap-2">
          <Plus className="w-4 h-4" />
          Create Prompt
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search prompts..."
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
                <TableHead>Prompt Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrompts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <FileCode2 className="w-8 h-8 text-slate-300 mb-2" />
                      <p>No prompts found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPrompts.map((prompt) => (
                  <TableRow key={prompt.id} className="hover:bg-slate-50/80">
                    <TableCell>
                      <div className="font-semibold text-[#0B2545]">{prompt.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{prompt.description}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {prompt.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-medium text-slate-700">v{prompt.version}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        prompt.status === 'Active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        prompt.status === 'Draft' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {prompt.status === 'Active' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {prompt.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-600">
                        {new Date(prompt.updatedAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-[#0B2545]" onClick={() => handleEdit(prompt)}>
                          <FileCode2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-[#0B2545]">
                          <History className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-[#0B2545]">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
