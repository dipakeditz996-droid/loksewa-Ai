"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Database, Plus, Edit, Copy, Trash2, Shield, Users, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { mockRoles } from "@/lib/mock/admin-users";

export default function RolesManagementPage() {
  const [createRoleModalOpen, setCreateRoleModalOpen] = useState(false);
  
  // Create Role State
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");

  const handleCreateRole = () => {
    console.log("Creating role:", newRoleName);
    setCreateRoleModalOpen(false);
    setNewRoleName("");
    setNewRoleDesc("");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
            <Database className="w-6 h-6 text-[#D4A72C]" />
            Roles Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">Define custom roles and assign them to administrators.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin-dashboard/permissions">
            <Button variant="outline" className="gap-2 bg-white text-[#0B2545] border-[#0B2545]/20">
              <Shield className="w-4 h-4" /> View Permission Matrix
            </Button>
          </Link>
          <Button className="gap-2 bg-[#0B2545] text-white hover:bg-[#0B2545]/90" onClick={() => setCreateRoleModalOpen(true)}>
            <Plus className="w-4 h-4" /> Create Role
          </Button>
        </div>
      </div>

      {/* Role Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Total Roles</p>
            <p className="text-2xl font-bold text-[#0B2545]">{mockRoles.length}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Assigned Users</p>
            <p className="text-2xl font-bold text-[#0B2545]">
              {mockRoles.reduce((acc, curr) => acc + curr.userCount, 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">System Roles</p>
            <p className="text-2xl font-bold text-[#0B2545]">{mockRoles.filter(r => r.isSystem).length}</p>
          </div>
        </div>
      </div>

      {/* Roles Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Users</TableHead>
                <TableHead className="text-center">Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockRoles.map((role) => (
                <TableRow key={role.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <p className={`font-bold ${role.name === "Super Admin" ? "text-red-600" : "text-[#0B2545]"}`}>
                        {role.name}
                      </p>
                      {role.isSystem && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">System</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs text-sm text-slate-600 truncate">
                    {role.description}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                      {role.userCount.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-medium text-slate-600">{role.permissionsCount}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      role.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {role.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{role.updatedAt}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 mr-2">
                      <Edit className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <span className="font-bold text-slate-500">...</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer">
                          <Copy className="w-4 h-4 mr-2" /> Duplicate Role
                        </DropdownMenuItem>
                        {!role.isSystem && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" /> Deactivate
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Role Modal */}
      <Dialog open={createRoleModalOpen} onOpenChange={setCreateRoleModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0B2545]">
              <Plus className="w-5 h-5" /> Create Custom Role
            </DialogTitle>
            <DialogDescription>
              Define a new role. You can edit its specific permissions after creation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Role Name *</label>
              <Input 
                placeholder="e.g., Marketing Lead" 
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Description</label>
              <textarea 
                className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white min-h-[80px]"
                placeholder="Briefly describe what this role does..."
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateRoleModalOpen(false)}>Cancel</Button>
            <Button 
              className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white" 
              onClick={handleCreateRole}
              disabled={!newRoleName}
            >
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </div>
  );
}
