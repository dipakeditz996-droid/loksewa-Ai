"use client";

import React, { useState, useMemo } from "react";
import { 
  Plus, Search, Filter, MoreHorizontal, 
  Edit, Trash2, ArrowUp, ArrowDown, Layers, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockTopics, mockChapters, mockSubjects } from "@/lib/mock/admin-academic";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function TopicsPage() {
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [chapterFilter, setChapterFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // State for the "Add Topic" modal dependent dropdowns
  const [modalSubject, setModalSubject] = useState("");
  const [modalChapter, setModalChapter] = useState("");

  const filteredTopics = useMemo(() => {
    let result = mockTopics;
    
    if (subjectFilter !== "all") {
      result = result.filter(t => t.subjectId === subjectFilter);
    }
    if (chapterFilter !== "all") {
      result = result.filter(t => t.chapterId === chapterFilter);
    }
    if (search) {
      result = result.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
    }
    
    // Sort by order within the chapter
    return result.sort((a, b) => {
      if (a.chapterId === b.chapterId) {
        return a.order - b.order;
      }
      return 0;
    });
  }, [search, subjectFilter, chapterFilter]);

  // Derived state for chapter filters based on selected subject
  const availableChaptersForFilter = useMemo(() => {
    if (subjectFilter === "all") return mockChapters;
    return mockChapters.filter(c => c.subjectId === subjectFilter);
  }, [subjectFilter]);
  
  // Derived state for chapter options in the Add modal
  const availableChaptersForModal = useMemo(() => {
    if (!modalSubject) return [];
    return mockChapters.filter(c => c.subjectId === modalSubject);
  }, [modalSubject]);

  // Reset chapter filter when subject filter changes
  const handleSubjectFilterChange = (val: string) => {
    setSubjectFilter(val);
    setChapterFilter("all");
  };

  const handleModalSubjectChange = (val: string) => {
    setModalSubject(val);
    setModalChapter(""); // reset dependent chapter
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B2545]">Topics</h2>
          <p className="text-slate-500 text-sm mt-1">Manage detailed study units and question categories.</p>
        </div>
        <Button 
          className="bg-[#D4A72C] hover:bg-[#b08b25] text-[#0B2545] font-semibold gap-2"
          onClick={() => {
            setModalSubject(subjectFilter !== 'all' ? subjectFilter : "");
            setModalChapter(chapterFilter !== 'all' ? chapterFilter : "");
            setIsAddModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Add Topic
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Select value={subjectFilter} onValueChange={handleSubjectFilterChange}>
              <SelectTrigger className="w-full sm:w-[200px] bg-white">
                <SelectValue placeholder="Filter by Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {mockSubjects.map(sub => (
                  <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={chapterFilter} 
              onValueChange={setChapterFilter}
              disabled={availableChaptersForFilter.length === 0}
            >
              <SelectTrigger className="w-full sm:w-[200px] bg-white">
                <SelectValue placeholder="Filter by Chapter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chapters</SelectItem>
                {availableChaptersForFilter.map(ch => (
                  <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-16 text-center">Order</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Chapter</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="text-center">Questions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTopics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Layers className="w-8 h-8 text-slate-300 mb-2" />
                      <p>No topics found.</p>
                      {search || subjectFilter !== 'all' ? (
                        <p className="text-xs mt-1">Try adjusting your filters.</p>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTopics.map((topic, index) => {
                  const chapter = mockChapters.find(c => c.id === topic.chapterId);
                  const subject = mockSubjects.find(s => s.id === topic.subjectId);
                  const isFirst = index === 0 || filteredTopics[index - 1]?.chapterId !== topic.chapterId;
                  const isLast = index === filteredTopics.length - 1 || filteredTopics[index + 1]?.chapterId !== topic.chapterId;
                  
                  return (
                    <TableRow key={topic.id} className="group">
                      <TableCell className="text-center">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 inline-flex items-center justify-center text-xs font-bold">
                          {topic.order}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-slate-900">{topic.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-600">{chapter?.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-600">{subject?.name}</span>
                      </TableCell>
                      <TableCell className="text-center font-medium text-slate-600">
                        {topic.questionsCount}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          topic.status === 'Active' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {topic.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" /> Edit Topic
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled={isFirst}>
                              <ArrowUp className="mr-2 h-4 w-4" /> Move Up
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={isLast}>
                              <ArrowDown className="mr-2 h-4 w-4" /> Move Down
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Topic Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Topic</DialogTitle>
            <DialogDescription>
              Create a new study topic. It must be assigned to a subject and chapter.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="topic-subject">Subject <span className="text-red-500">*</span></Label>
              <Select value={modalSubject} onValueChange={handleModalSubjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {mockSubjects.map(sub => (
                    <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="topic-chapter">Chapter <span className="text-red-500">*</span></Label>
              <Select value={modalChapter} onValueChange={setModalChapter} disabled={!modalSubject || availableChaptersForModal.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Chapter" />
                </SelectTrigger>
                <SelectContent>
                  {availableChaptersForModal.map(ch => (
                    <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {modalSubject && availableChaptersForModal.length === 0 && (
                <p className="text-xs text-amber-600">This subject has no chapters. Create a chapter first.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Topic Name <span className="text-red-500">*</span></Label>
              <Input id="name" placeholder="e.g. Mountain Region" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order">Order Number</Label>
                <Input id="order" type="number" min="1" defaultValue="1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue="active">
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white" onClick={() => setIsAddModalOpen(false)}>
              Create Topic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
