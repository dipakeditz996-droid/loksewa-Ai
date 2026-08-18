"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Users, UserCheck, UserPlus, UserX, Search, Filter, 
  MoreVertical, Download, Plus, Eye, Edit, ShieldAlert,
  ShieldCheck, Key, ArrowUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { mockStudents, AdminStudent } from "@/lib/mock/admin-students";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function StudentManagementPage() {
  const [students, setStudents] = useState<AdminStudent[]>(mockStudents);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  
  const [selectedStudent, setSelectedStudent] = useState<AdminStudent | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Selection state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Filtering
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = 
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.username.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "All" || student.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [students, searchQuery, statusFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredStudents.length / rowsPerPage);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredStudents.slice(start, start + rowsPerPage);
  }, [filteredStudents, currentPage, rowsPerPage]);

  const toggleSelectAll = () => {
    if (selectedRows.size === paginatedStudents.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedStudents.map(s => s.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100/80">Active</Badge>;
      case 'Inactive': return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100/80">Inactive</Badge>;
      case 'Suspended': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100/80">Suspended</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto bg-slate-50 min-h-screen">
      {/* 2. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0B2545] tracking-tight">Student Management</h1>
          <p className="text-slate-500 mt-1">Manage students, accounts, activity and learning progress.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button className="bg-[#D4A72C] hover:bg-[#b08b25] text-[#0B2545] font-semibold gap-2" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4" /> Add Student
          </Button>
        </div>
      </div>

      {/* 3. OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Students</p>
              <h3 className="text-2xl font-bold text-[#0B2545]">{students.length.toLocaleString()}</h3>
              <p className="text-xs text-green-600 font-medium mt-1">+8.4% this month</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-700 rounded-lg">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Students</p>
              <h3 className="text-2xl font-bold text-[#0B2545]">{students.filter(s => s.status === 'Active').length.toLocaleString()}</h3>
              <p className="text-xs text-green-600 font-medium mt-1">+2.1% this week</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-700 rounded-lg">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">New Students</p>
              <h3 className="text-2xl font-bold text-[#0B2545]">142</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">In the last 30 days</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-700 rounded-lg">
              <UserX className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Suspended</p>
              <h3 className="text-2xl font-bold text-[#0B2545]">{students.filter(s => s.status === 'Suspended').length.toLocaleString()}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Requires review</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. SEARCH & FILTER BAR */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search by name, username or email..." 
                className="pl-9 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-600">Filters:</span>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || statusFilter !== "All") && (
                <Button 
                  variant="ghost" 
                  className="text-slate-500 hover:text-[#0B2545]"
                  onClick={() => { setSearchQuery(""); setStatusFilter("All"); }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 19. BULK ACTIONS */}
      {selectedRows.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <span className="text-sm font-semibold">{selectedRows.size} students selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="bg-white">Export Selected</Button>
            <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700">Activate Selected</Button>
            <Button size="sm" variant="destructive">Suspend Selected</Button>
          </div>
        </div>
      )}

      {/* 5. STUDENT TABLE */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300"
                    checked={paginatedStudents.length > 0 && selectedRows.size === paginatedStudents.length}
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Target Exam</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined Date</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStudents.length > 0 ? (
                paginatedStudents.map(student => (
                  <TableRow key={student.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300"
                        checked={selectedRows.has(student.id)}
                        onChange={() => toggleSelectRow(student.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-[#0B2545]">{student.name}</p>
                          <p className="text-xs text-slate-500">{student.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-slate-700">{student.targetPosition}</p>
                      <p className="text-xs text-slate-500">{student.targetExam}</p>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(student.status)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {new Date(student.joinedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {new Date(student.lastActiveAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/admin-dashboard/students/${student.id}`} className="cursor-pointer flex items-center">
                              <Eye className="w-4 h-4 mr-2" /> View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedStudent(student); setIsEditModalOpen(true); }}>
                            <Edit className="w-4 h-4 mr-2" /> Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedStudent(student); setIsResetPasswordModalOpen(true); }}>
                            <Key className="w-4 h-4 mr-2" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {student.status !== 'Suspended' ? (
                            <DropdownMenuItem 
                              className="text-red-600 focus:bg-red-50 focus:text-red-700"
                              onClick={() => { setSelectedStudent(student); setIsSuspendModalOpen(true); }}
                            >
                              <ShieldAlert className="w-4 h-4 mr-2" /> Suspend Student
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              className="text-green-600 focus:bg-green-50 focus:text-green-700"
                              onClick={() => { setSelectedStudent(student); setIsActivateModalOpen(true); }}
                            >
                              <ShieldCheck className="w-4 h-4 mr-2" /> Activate Student
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    No students found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* 6. PAGINATION */}
        <div className="flex flex-col md:flex-row items-center justify-between p-4 border-t border-slate-100 gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Show</span>
            <Select value={rowsPerPage.toString()} onValueChange={(val) => { setRowsPerPage(Number(val)); setCurrentPage(1); }}>
              <SelectTrigger className="w-16 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span>rows per page</span>
          </div>
          
          <div className="text-sm text-slate-500 text-center flex-1">
            Showing {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, filteredStudents.length)} of {filteredStudents.length} students
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              Previous
            </Button>
            <div className="text-sm font-medium px-2">
              Page {currentPage} of {totalPages || 1}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* MODALS */}

      {/* Add Student Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>Create a new student account manually.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" placeholder="E.g. Sita Thapa" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Username *</Label>
              <Input id="username" placeholder="sita_thapa" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="sita@example.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="targetPosition">Target Position</Label>
              <Input id="targetPosition" placeholder="E.g. Section Officer" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button className="bg-[#D4A72C] hover:bg-[#b08b25] text-[#0B2545]" onClick={() => setIsAddModalOpen(false)}>Create Student</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>Update profile details for {selectedStudent?.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input id="edit-name" defaultValue={selectedStudent?.name} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" defaultValue={selectedStudent?.email} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input id="edit-phone" defaultValue={selectedStudent?.phone} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button className="bg-[#0B2545] hover:bg-[#163E6B]" onClick={() => setIsEditModalOpen(false)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Confirmation Modal */}
      <Dialog open={isSuspendModalOpen} onOpenChange={setIsSuspendModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Suspend Student?
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to suspend <strong>{selectedStudent?.name}</strong>? 
              This student will temporarily lose access to the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="reason">Suspension Reason (Optional)</Label>
            <Input id="reason" placeholder="Provide a reason for suspension" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSuspendModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => setIsSuspendModalOpen(false)}>Suspend Student</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Confirmation Modal */}
      <Dialog open={isActivateModalOpen} onOpenChange={setIsActivateModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> Activate Student?
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to reactivate <strong>{selectedStudent?.name}</strong>'s account? 
              They will regain full access to the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsActivateModalOpen(false)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => setIsActivateModalOpen(false)}>Activate Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={isResetPasswordModalOpen} onOpenChange={setIsResetPasswordModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600" /> Reset Password
            </DialogTitle>
            <DialogDescription className="pt-2">
              Send a password reset link to <strong>{selectedStudent?.name}</strong>? 
              They will receive instructions at {selectedStudent?.email}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsResetPasswordModalOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsResetPasswordModalOpen(false)}>Send Reset Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
