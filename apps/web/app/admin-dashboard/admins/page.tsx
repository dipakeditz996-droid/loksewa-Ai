"use client";

import React, { useState } from "react";
import { 
  ShieldAlert, UserPlus, Search, 
  MoreVertical, Edit, Key, LogOut, CheckCircle2, AlertCircle
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
import { mockAdmins } from "@/lib/mock/admin-users";

export default function AdminsManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [addAdminModalOpen, setAddAdminModalOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  
  // New Admin Form State
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("Content Manager");

  const handleInviteAdmin = () => {
    console.log("Inviting admin:", newAdminEmail, newAdminRole);
    setAddAdminModalOpen(false);
    // Reset
    setNewAdminEmail("");
    setNewAdminName("");
    setNewAdminRole("Content Manager");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-[#D4A72C]" />
            Administrators
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage platform administrators and staff members.</p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2 bg-[#0B2545] text-white hover:bg-[#0B2545]/90" onClick={() => setAddAdminModalOpen(true)}>
            <UserPlus className="w-4 h-4" /> Add Administrator
          </Button>
        </div>
      </div>

      {/* Admin Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-[#0B2545]">
          <p className="text-slate-500 text-sm font-medium mb-1">Total Admins</p>
          <p className="text-2xl font-bold text-[#0B2545]">{mockAdmins.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-slate-500 text-sm font-medium mb-1">Active Admins</p>
          <p className="text-2xl font-bold text-emerald-600">{mockAdmins.filter(a => a.status === 'Active').length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-purple-500">
          <p className="text-slate-500 text-sm font-medium mb-1">Support Agents</p>
          <p className="text-2xl font-bold text-purple-600">{mockAdmins.filter(a => a.role === 'Support Agent').length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
          <p className="text-slate-500 text-sm font-medium mb-1">Content Managers</p>
          <p className="text-2xl font-bold text-amber-600">{mockAdmins.filter(a => a.role === 'Content Manager').length}</p>
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search admins..." 
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-white hover:bg-white">
                <TableHead>Admin</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAdmins.map((admin) => (
                <TableRow key={admin.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div>
                      <p className="font-semibold text-[#0B2545]">{admin.name}</p>
                      <p className="text-xs text-slate-500">{admin.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      admin.role === 'Super Admin' ? 'bg-[#0B2545] text-white' :
                      admin.role === 'Content Manager' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {admin.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
                      admin.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {admin.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{admin.lastActive}</TableCell>
                  <TableCell className="text-sm text-slate-600">{admin.createdDate}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4 text-slate-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Manage Admin</DropdownMenuLabel>
                        <DropdownMenuItem className="cursor-pointer">
                          <Edit className="w-4 h-4 mr-2" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Key className="w-4 h-4 mr-2" /> Change Role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {admin.status === "Active" ? (
                          <DropdownMenuItem className="cursor-pointer text-red-600" onClick={() => setDeactivateModalOpen(true)}>
                            <LogOut className="w-4 h-4 mr-2" /> Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="cursor-pointer text-emerald-600">
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Activate
                          </DropdownMenuItem>
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

      {/* Add Admin Modal (Invitation based) */}
      <Dialog open={addAdminModalOpen} onOpenChange={setAddAdminModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0B2545]">
              <UserPlus className="w-5 h-5" /> Add Administrator
            </DialogTitle>
            <DialogDescription>
              Invite a new staff member. An invitation link will be sent to their email to securely set up their account and password.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Full Name *</label>
              <Input 
                placeholder="e.g., Jane Doe" 
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Email Address *</label>
              <Input 
                type="email"
                placeholder="jane@loksewaai.com" 
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Assign Role *</label>
              <select 
                className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                value={newAdminRole}
                onChange={(e) => setNewAdminRole(e.target.value)}
              >
                <option>Content Manager</option>
                <option>Support Agent</option>
                <option>Finance Manager</option>
                <option>Admin</option>
                {/* Purposely keeping Super Admin hidden or requiring extra steps */}
              </select>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 mt-4">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700">
                For security reasons, plaintext passwords are never displayed or entered here. The user must configure their own credentials via the secure email link.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAdminModalOpen(false)}>Cancel</Button>
            <Button 
              className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white" 
              onClick={handleInviteAdmin}
              disabled={!newAdminEmail || !newAdminName}
            >
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Deactivate Admin Modal */}
      <Dialog open={deactivateModalOpen} onOpenChange={setDeactivateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <LogOut className="w-5 h-5" /> Deactivate Administrator
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate this administrator? They will immediately lose access to the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeactivateModalOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setDeactivateModalOpen(false)}>Deactivate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
