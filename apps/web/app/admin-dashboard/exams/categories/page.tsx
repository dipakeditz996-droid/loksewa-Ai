"use client";

import React, { useState, useEffect } from "react";
import { 
  FolderTree, PlusCircle, Edit2, Archive, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { mockExamCategories } from "@/lib/mock/admin-exams";

export default function ExamCategoriesPage() {
  const [categories, setCategories] = useState(mockExamCategories);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCategories(mockExamCategories);
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-10">
      
      {/* Categories Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#0B2545] flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-blue-500" /> Exam Categories
            </h2>
            <p className="text-slate-500 text-sm mt-1">High-level grouping for exams (e.g., Target Positions or Series).</p>
          </div>
          <Button className="bg-[#0B2545] hover:bg-[#163E6C] text-white">
            <PlusCircle className="w-4 h-4 mr-2" /> Add Category
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Total Exams</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="h-20 text-center"><div className="h-4 bg-slate-100 rounded w-24 mx-auto animate-pulse"></div></TableCell></TableRow>
              ) : categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-bold text-[#0B2545]">{cat.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700">{cat.examCount} exams</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cat.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700"}>{cat.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-amber-600"><Archive className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex gap-4">
        <HelpCircle className="w-6 h-6 text-blue-600 shrink-0" />
        <div>
          <h3 className="font-bold text-blue-900 mb-1">What are Exam Types?</h3>
          <p className="text-sm text-blue-800">
            Exam Types (Mock Test, Subject Test, Practice Test) are system-defined and cannot be created here. They are hardcoded into the system to drive specific analytics and student-facing behavior. Use <strong>Categories</strong> to group exams however you see fit!
          </p>
        </div>
      </div>

    </div>
  );
}
