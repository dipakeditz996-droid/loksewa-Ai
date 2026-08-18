"use client";

import React, { useState } from "react";
import { 
  FolderTree, Search, Plus, MoreHorizontal, Edit, Trash2, 
  Settings, UserPlus, Clock, AlertTriangle, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockSupportCategories, mockSupportAgents } from "@/lib/mock/admin-support";

export default function SupportCategoriesPage() {
  const [search, setSearch] = useState("");

  const filteredCategories = mockSupportCategories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const getPriorityIcon = (priority: string) => {
    switch(priority) {
      case "Urgent": return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case "High": return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case "Medium": return <div className="w-2 h-2 rounded-full bg-amber-400 mx-1" />;
      case "Low": return <div className="w-2 h-2 rounded-full bg-slate-300 mx-1" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B2545]">Categories & Routing</h2>
          <p className="text-sm text-slate-500">Manage support categories, auto-assignment, and SLA settings.</p>
        </div>
        <Button className="w-full sm:w-auto bg-[#D4A72C] hover:bg-[#b08b25] text-[#0B2545] font-semibold gap-2">
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center bg-slate-50/50">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead>Category</TableHead>
                  <TableHead>Default Priority</TableHead>
                  <TableHead className="text-center">Open Tickets</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                      <FolderTree className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p>No categories found.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((cat) => (
                    <TableRow key={cat.id} className="hover:bg-slate-50/80">
                      <TableCell className="max-w-[200px]">
                        <div className="font-semibold text-[#0B2545] truncate">{cat.name}</div>
                        <div className="text-xs text-slate-500 truncate mt-1">{cat.description}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {getPriorityIcon(cat.defaultPriority)}
                          <span className={`text-xs font-semibold ${cat.defaultPriority === 'Urgent' ? 'text-red-600' : cat.defaultPriority === 'High' ? 'text-orange-600' : 'text-slate-600'}`}>
                            {cat.defaultPriority}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700">
                        {cat.openTickets}
                      </TableCell>
                      <TableCell>
                         <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cat.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          {cat.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-[#0B2545]">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer">
                              <Edit className="mr-2 h-4 w-4" /> Edit Category
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              <Settings className="mr-2 h-4 w-4" /> Auto-assign Rules
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
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

        {/* Settings Panels */}
        <div className="space-y-6">
          {/* Auto Assignment Rules */}
          <div className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-4 mb-4">
              <UserPlus className="w-5 h-5 text-blue-500" />
              <h3 className="font-bold text-[#0B2545]">Auto-Assignment</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-3 border border-slate-200 rounded-lg">
                <div>
                  <Label className="text-sm font-semibold text-slate-800">Enable Auto-Routing</Label>
                  <p className="text-xs text-slate-500">Automatically assign new tickets to specific agents.</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Payment Issues →</Label>
                <Select defaultValue="Finance Team">
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {mockSupportAgents.map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Exam & Results →</Label>
                <Select defaultValue="Sarah Connor">
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {mockSupportAgents.map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* SLA Settings */}
          <div className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-4 mb-4">
              <Clock className="w-5 h-5 text-purple-500" />
              <h3 className="font-bold text-[#0B2545]">SLA Targets</h3>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2 bg-white p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <Label className="text-sm font-bold text-slate-800">Urgent Tickets</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[10px] text-slate-500 uppercase">First Response</Label>
                    <Input defaultValue="1" type="number" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500 uppercase">Resolution (Hrs)</Label>
                    <Input defaultValue="4" type="number" className="h-8 text-sm" />
                  </div>
                </div>
              </div>

              <div className="space-y-2 bg-white p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  <Label className="text-sm font-bold text-slate-800">High Priority</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[10px] text-slate-500 uppercase">First Response</Label>
                    <Input defaultValue="4" type="number" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500 uppercase">Resolution (Hrs)</Label>
                    <Input defaultValue="24" type="number" className="h-8 text-sm" />
                  </div>
                </div>
              </div>
              
              <Button className="w-full bg-[#0B2545] hover:bg-[#0B2545]/90 text-white">
                Save SLA Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
