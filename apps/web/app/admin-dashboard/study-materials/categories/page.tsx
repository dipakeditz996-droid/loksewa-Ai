"use client";

import React, { useState, useEffect } from "react";
import { 
  FolderTree, PlusCircle, LayoutList, GripVertical, Edit2, Archive, ListTodo
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { mockMaterialCategories, mockMaterialCollections } from "@/lib/mock/admin-study-materials";

export default function CategoriesCollectionsPage() {
  const [categories, setCategories] = useState(mockMaterialCategories);
  const [collections, setCollections] = useState(mockMaterialCollections);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCategories(mockMaterialCategories);
      setCollections(mockMaterialCollections);
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
              <FolderTree className="w-5 h-5 text-blue-500" /> Material Categories
            </h2>
            <p className="text-slate-500 text-sm mt-1">High-level grouping for academic subjects.</p>
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
                <TableHead>Total Materials</TableHead>
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
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700">{cat.materialCount} items</Badge>
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

      {/* Collections Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#0B2545] flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-amber-500" /> Curated Collections
            </h2>
            <p className="text-slate-500 text-sm mt-1">Ordered groups of materials (e.g., "Premium Packs").</p>
          </div>
          <Button className="bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100">
            <PlusCircle className="w-4 h-4 mr-2" /> Create Collection
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            [1,2].map(i => <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />)
          ) : collections.map((col) => (
            <div key={col.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-[#0B2545]">{col.name}</h3>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{col.status}</Badge>
              </div>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{col.description}</p>
              
              <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                  <LayoutList className="w-4 h-4 text-slate-400" /> {col.materialIds.length} Materials inside
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Manage Order</Button>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">Edit</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
