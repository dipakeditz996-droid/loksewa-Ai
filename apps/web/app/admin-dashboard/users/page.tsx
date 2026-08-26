"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, UserPlus, Search, Filter, 
  MoreVertical, Eye, Edit, ShieldAlert,
  Download, CheckCircle2, AlertTriangle, Loader2
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
import { apiClient } from "@/lib/api/client";

interface UserData {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  dateJoined: string;
  avatar: string | null;
}

export default function UsersManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("All Roles");
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [activateModalOpen, setActivateModalOpen] = useState(false);
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  
  // Create User Form State
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("student");
  const [createError, setCreateError] = useState("");

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let url = '/admin/users/?page=1&page_size=50';
      if (filterRole !== "All Roles") {
        url += `&role=${filterRole.toLowerCase()}`;
      }
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      const data = await apiClient<{users: UserData[], total: number}>(url);
      setUsers(data.users);
      setTotalUsers(data.total);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filterRole, searchTerm]);

  const activeUsers = users.filter(u => u.isActive).length;
  const inactiveUsers = users.filter(u => !u.isActive).length;

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUsers(users.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const toggleSelectUser = (id: string) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(userId => userId !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  const openSuspendModal = (id?: string) => {
    setActionUserId(id || null);
    setSuspendModalOpen(true);
  };

  const openActivateModal = (id?: string) => {
    setActionUserId(id || null);
    setActivateModalOpen(true);
  };
  
  const openCreateUserModal = () => {
    setNewUsername("");
    setNewEmail("");
    setNewPassword("");
    setNewRole("student");
    setCreateError("");
    setCreateUserModalOpen(true);
  };

  const handleCreateUser = async () => {
    setCreateError("");
    if (!newUsername || !newEmail || !newPassword) {
      setCreateError("All fields are required.");
      return;
    }
    
    try {
      await apiClient('/admin/users/', {
        method: 'POST',
        body: JSON.stringify({
          username: newUsername,
          email: newEmail,
          password: newPassword,
          role: newRole
        })
      });
      setCreateUserModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      setCreateError(error.error || "Failed to create user.");
    }
  };

  const handleSuspend = async () => {
    if (actionUserId) {
      try {
        await apiClient(`/admin/users/${actionUserId}/`, {
          method: 'PATCH',
          body: JSON.stringify({ is_active: false })
        });
        fetchUsers();
      } catch (error) {
        console.error(error);
      }
    }
    setSuspendModalOpen(false);
  };

  const handleActivate = async () => {
    if (actionUserId) {
      try {
        await apiClient(`/admin/users/${actionUserId}/`, {
          method: 'PATCH',
          body: JSON.stringify({ is_active: true })
        });
        fetchUsers();
      } catch (error) {
        console.error(error);
      }
    }
    setActivateModalOpen(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#D4A72C]" />
            User Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage students, teachers, and platform access.</p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2 bg-[#0B2545] text-white font-bold hover:bg-[#0B2545]/90" onClick={openCreateUserModal}>
            <UserPlus className="w-4 h-4" /> Add User
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium mb-1">Total Users</p>
          <p className="text-2xl font-bold text-[#0B2545]">{totalUsers.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-slate-500 text-sm font-medium mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{activeUsers.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-slate-400">
          <p className="text-slate-500 text-sm font-medium mb-1">Inactive</p>
          <p className="text-2xl font-bold text-slate-600">{inactiveUsers.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search name, email or username..."
            className="pl-9 bg-slate-50 placeholder:text-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex w-full md:w-auto gap-2 items-center overflow-x-auto pb-2 md:pb-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-white border border-slate-300 text-slate-700 font-medium gap-2 whitespace-nowrap hover:bg-slate-50">
                <Filter className="w-4 h-4" /> {filterRole}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterRole("All Roles")}>All Roles</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterRole("Student")}>Student</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterRole("Teacher")}>Teacher</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterRole("Admin")}>Admin</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" className="border border-slate-300 text-slate-700 font-medium whitespace-nowrap hover:bg-slate-50" onClick={() => { setSearchTerm(""); setFilterRole("All Roles"); }}>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Bulk Actions Banner */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-center">
          <span className="text-sm font-medium text-blue-800">
            {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <span className="text-xs text-blue-600 flex items-center">Bulk actions not implemented</span>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-12 text-center">
                  <input type="checkbox" className="rounded border-slate-300" onChange={toggleSelectAll} checked={selectedUsers.length === users.length && users.length > 0} />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-center">
                      <input type="checkbox" className="rounded border-slate-300" checked={selectedUsers.includes(user.id)} onChange={() => toggleSelectUser(user.id)} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-[#0B2545]">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        user.role === 'teacher' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'admin' || user.role === 'super-admin' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{new Date(user.dateJoined).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          {!user.isActive ? (
                            <DropdownMenuItem className="cursor-pointer text-emerald-600" onClick={() => openActivateModal(user.id)}>
                              <CheckCircle2 className="w-4 h-4 mr-2" /> Activate User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="cursor-pointer text-red-600" onClick={() => openSuspendModal(user.id)}>
                              <ShieldAlert className="w-4 h-4 mr-2" /> Suspend User
                            </DropdownMenuItem>
                          )}
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

      {/* Suspend Modal */}
      <Dialog open={suspendModalOpen} onOpenChange={setSuspendModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="w-5 h-5" /> Suspend User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend this user? User access will be restricted immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSuspendModalOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleSuspend}>Suspend User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Modal */}
      <Dialog open={activateModalOpen} onOpenChange={setActivateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" /> Activate User
            </DialogTitle>
            <DialogDescription>
              Activate this account? The user will regain access to the platform immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setActivateModalOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleActivate}>Activate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Modal */}
      <Dialog open={createUserModalOpen} onOpenChange={setCreateUserModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0B2545]">
              <UserPlus className="w-5 h-5" /> Create New User
            </DialogTitle>
            <DialogDescription>
              Add a new student, teacher, or admin to the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {createError && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
                {createError}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-bold text-white">Username *</label>
              <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="e.g. johndoe" className="placeholder:text-slate-600" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-white">Email *</label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" placeholder="e.g. john@example.com" className="placeholder:text-slate-600" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-white">Password *</label>
              <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" placeholder="Temporary password" className="placeholder:text-slate-600" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-white">Role *</label>
              <select
                className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-[#0B2545] font-medium focus:outline-none focus:ring-2 focus:ring-[#0B2545]"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateUserModalOpen(false)}>Cancel</Button>
            <Button className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white" onClick={handleCreateUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
