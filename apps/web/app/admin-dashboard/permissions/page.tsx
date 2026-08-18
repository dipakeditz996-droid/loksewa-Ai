"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Shield, Check, X, Search, Filter, Save, Undo,
  AlertTriangle, Copy, LayoutTemplate
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
import { mockContentManagerPermissions, Permission, mockRoles } from "@/lib/mock/admin-users";

export default function PermissionsMatrixPage() {
  const [selectedRole, setSelectedRole] = useState(mockRoles[1]!); // Default to Content Manager
  const [permissions, setPermissions] = useState<Permission[]>(mockContentManagerPermissions);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const togglePermission = (moduleIndex: number, action: keyof Permission) => {
    if (!isEditing) return;
    
    const newPermissions = [...permissions];
    const targetModule = newPermissions[moduleIndex];
    if (targetModule && typeof targetModule[action] === "boolean") {
      (targetModule as any)[action] = !targetModule[action];
      setPermissions(newPermissions);
      setHasChanges(true);
    }
  };

  const handleSave = () => {
    console.log("Saving permissions for:", selectedRole.name);
    setIsEditing(false);
    setHasChanges(false);
  };

  const handleCancel = () => {
    // Reset to mock data
    setPermissions(mockContentManagerPermissions);
    setIsEditing(false);
    setHasChanges(false);
  };

  const selectAll = () => {
    const allTrue = permissions.map(p => ({
      module: p.module,
      view: true,
      create: true,
      edit: true,
      delete: true,
      publish: p.publish !== undefined ? true : undefined
    }));
    setPermissions(allTrue);
    setHasChanges(true);
  };

  const clearAll = () => {
    const allFalse = permissions.map(p => ({
      module: p.module,
      view: false,
      create: false,
      edit: false,
      delete: false,
      publish: p.publish !== undefined ? false : undefined
    }));
    setPermissions(allFalse);
    setHasChanges(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#D4A72C]" />
            Permissions Matrix
          </h1>
          <p className="text-slate-500 text-sm mt-1">Configure granular module access for specific roles.</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm font-semibold text-slate-700 mr-2">Editing Role:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-white min-w-[200px] justify-between border-[#0B2545] text-[#0B2545]">
                {selectedRole.name} <Filter className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px]">
              <DropdownMenuLabel>Select Role</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {mockRoles.map(role => (
                <DropdownMenuItem key={role.id} onClick={() => setSelectedRole(role)}>
                  <span className={role.name === "Super Admin" ? "text-red-600 font-bold" : ""}>
                    {role.name}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Editor Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        
        {selectedRole.name === "Super Admin" ? (
          <div className="w-full flex items-center gap-3 bg-red-50 border border-red-200 p-3 rounded-lg text-red-700">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">
              <strong>Super Admin Protection:</strong> This role has unrestricted access to all modules. Individual permissions cannot be edited or restricted.
            </p>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button className="bg-[#0B2545] text-white hover:bg-[#0B2545]/90" onClick={() => setIsEditing(true)}>
                  Edit Permissions
                </Button>
              ) : (
                <>
                  <Button className="bg-emerald-600 text-white hover:bg-emerald-700 gap-2" onClick={handleSave} disabled={!hasChanges}>
                    <Save className="w-4 h-4" /> Save Changes
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={handleCancel}>
                    <Undo className="w-4 h-4" /> Cancel
                  </Button>
                </>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 gap-2">
                      <LayoutTemplate className="w-4 h-4" /> Apply Preset
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Full Admin Preset</DropdownMenuItem>
                    <DropdownMenuItem>Content Manager Preset</DropdownMenuItem>
                    <DropdownMenuItem>Read-Only Preset</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="outline" className="text-slate-600" onClick={selectAll}>Select All</Button>
                <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={clearAll}>Clear All</Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Matrix Table */}
      <div className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-colors ${isEditing ? "border-[#D4A72C] ring-1 ring-[#D4A72C]/50" : "border-slate-200"}`}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50 border-b-2">
                <TableHead className="w-48 font-bold text-[#0B2545]">Module</TableHead>
                <TableHead className="text-center font-bold text-slate-700">View</TableHead>
                <TableHead className="text-center font-bold text-slate-700">Create</TableHead>
                <TableHead className="text-center font-bold text-slate-700">Edit</TableHead>
                <TableHead className="text-center font-bold text-slate-700">Delete</TableHead>
                <TableHead className="text-center font-bold text-slate-700">Publish/Approve</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.map((perm, idx) => {
                const isSuperAdmin = selectedRole.name === "Super Admin";
                return (
                  <TableRow key={perm.module} className="hover:bg-slate-50/50">
                    <TableCell className="font-semibold text-[#0B2545] border-r border-slate-100">
                      {perm.module}
                    </TableCell>
                    
                    {/* View */}
                    <TableCell className="text-center border-r border-slate-100">
                      <button 
                        disabled={!isEditing || isSuperAdmin}
                        onClick={() => togglePermission(idx, 'view')}
                        className={`w-8 h-8 rounded flex items-center justify-center mx-auto transition-colors ${
                          (isSuperAdmin || perm.view) ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                        } ${isEditing && !isSuperAdmin ? "hover:ring-2 hover:ring-offset-1 hover:ring-emerald-400 cursor-pointer" : "cursor-default opacity-80"}`}
                      >
                        {(isSuperAdmin || perm.view) ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                      </button>
                    </TableCell>

                    {/* Create */}
                    <TableCell className="text-center border-r border-slate-100">
                      <button 
                        disabled={!isEditing || isSuperAdmin}
                        onClick={() => togglePermission(idx, 'create')}
                        className={`w-8 h-8 rounded flex items-center justify-center mx-auto transition-colors ${
                          (isSuperAdmin || perm.create) ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                        } ${isEditing && !isSuperAdmin ? "hover:ring-2 hover:ring-offset-1 hover:ring-emerald-400 cursor-pointer" : "cursor-default opacity-80"}`}
                      >
                        {(isSuperAdmin || perm.create) ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                      </button>
                    </TableCell>

                    {/* Edit */}
                    <TableCell className="text-center border-r border-slate-100">
                      <button 
                        disabled={!isEditing || isSuperAdmin}
                        onClick={() => togglePermission(idx, 'edit')}
                        className={`w-8 h-8 rounded flex items-center justify-center mx-auto transition-colors ${
                          (isSuperAdmin || perm.edit) ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                        } ${isEditing && !isSuperAdmin ? "hover:ring-2 hover:ring-offset-1 hover:ring-emerald-400 cursor-pointer" : "cursor-default opacity-80"}`}
                      >
                        {(isSuperAdmin || perm.edit) ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                      </button>
                    </TableCell>

                    {/* Delete (Warning color if active) */}
                    <TableCell className="text-center border-r border-slate-100">
                      <button 
                        disabled={!isEditing || isSuperAdmin}
                        onClick={() => togglePermission(idx, 'delete')}
                        className={`w-8 h-8 rounded flex items-center justify-center mx-auto transition-colors ${
                          (isSuperAdmin || perm.delete) ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"
                        } ${isEditing && !isSuperAdmin ? "hover:ring-2 hover:ring-offset-1 hover:ring-red-400 cursor-pointer" : "cursor-default opacity-80"}`}
                      >
                        {(isSuperAdmin || perm.delete) ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                      </button>
                    </TableCell>

                    {/* Publish / Special Action */}
                    <TableCell className="text-center">
                      {perm.publish !== undefined ? (
                        <button 
                          disabled={!isEditing || isSuperAdmin}
                          onClick={() => togglePermission(idx, 'publish')}
                          className={`w-8 h-8 rounded flex items-center justify-center mx-auto transition-colors ${
                            (isSuperAdmin || perm.publish) ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-400"
                          } ${isEditing && !isSuperAdmin ? "hover:ring-2 hover:ring-offset-1 hover:ring-purple-400 cursor-pointer" : "cursor-default opacity-80"}`}
                        >
                          {(isSuperAdmin || perm.publish) ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

    </div>
  );
}
