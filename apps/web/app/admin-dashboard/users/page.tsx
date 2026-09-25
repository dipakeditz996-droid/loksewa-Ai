"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, UserPlus, Search, Filter,
  MoreVertical, Eye, Edit, ShieldAlert,
  Download, CheckCircle2, AlertTriangle, Loader2, Trash2,
  User, Mail, Phone, MapPin, GraduationCap, Wand2, EyeOff, Send,
  Package, Sparkles, ShieldCheck, Layers, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { adminApi } from "@/lib/api/admin";
import { examPreferencesApi, ExamPreferenceCategory, ExamPreferenceNode } from "@/lib/api/exam-preferences";
import { courseEnrollmentApi, PublicCourse } from "@/lib/api/enrollment";
import { subscriptionsApi, SubscriptionPlan } from "@/lib/api/subscriptions";

// Mirrors core.validators.is_valid_nepal_phone on the backend, same as
// apps/web/app/register/page.tsx - the project's Nepal phone-number
// convention (10 digits, 96/97/98-prefixed).
function isValidNepalPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, "").replace(/^\+?977/, "");
  return /^9[678]\d{8}$/.test(cleaned);
}

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
  // Debounce search: wait for typing to pause before hitting the API,
  // instead of firing a request on every keystroke.
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearchTerm(searchTerm), 350);
    return () => clearTimeout(timeout);
  }, [searchTerm]);
  const [filterRole, setFilterRole] = useState("All Roles");
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [activateModalOpen, setActivateModalOpen] = useState(false);
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Create User Form State
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newRole, setNewRole] = useState("student");
  const [createError, setCreateError] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Create Student - additional registration-style fields (see
  // apps/web/app/register/page.tsx for the field set/shape this mirrors).
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [district, setDistrict] = useState("");
  const [localLevel, setLocalLevel] = useState("");
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false);

  // "What is the student preparing for?" - same progressive/hierarchical
  // ExamCategory -> Exam tree the registration page uses, fetched lazily
  // once Student is selected.
  const [examTree, setExamTree] = useState<ExamPreferenceCategory[]>([]);
  const [examTreeLoading, setExamTreeLoading] = useState(false);
  const [examTreeLoaded, setExamTreeLoaded] = useState(false);
  const [examCategoryId, setExamCategoryId] = useState<number | null>(null);
  const [examPath, setExamPath] = useState<ExamPreferenceNode[]>([]);

  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

  // Multi-package assignment state (Admin Grant)
  interface PackageAssignmentSlot {
    id: string;
    packageId: number | null;
    courseIds: number[];
  }

  const [packages, setPackages] = useState<SubscriptionPlan[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesLoaded, setPackagesLoaded] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState<PackageAssignmentSlot[]>([]);
  const [grantReason, setGrantReason] = useState("Manually enrolled by Admin");

  const selectedExamCategory = examTree.find((c) => c.id === examCategoryId) || null;
  const examOptionsAtDepth = (depth: number): ExamPreferenceNode[] => {
    if (!selectedExamCategory) return [];
    if (depth === 0) return selectedExamCategory.exams;
    const parent = examPath[depth - 1];
    return parent ? parent.children : [];
  };
  const examDepthLabel = (depth: number): string => {
    if (depth === 0) return selectedExamCategory?.name === "PSC Exams" ? "PSC Level" : `${selectedExamCategory?.name ?? ""} Level`;
    if (depth === 1) return "Service / Faculty";
    return "Option";
  };
  const selectExamNode = (depth: number, node: ExamPreferenceNode) => {
    setExamPath((prev) => [...prev.slice(0, depth), node]);
    setSelectedCourseId(null);
  };
  const selectedExamPosition = examPath.length > 0 ? examPath[examPath.length - 1] : null;

  useEffect(() => {
    if (newRole === "student" && !examTreeLoaded) {
      setExamTreeLoading(true);
      examPreferencesApi.getTree()
        .then((data) => { setExamTree(data); setExamTreeLoaded(true); })
        .catch(() => setExamTree([]))
        .finally(() => setExamTreeLoading(false));
    }
  }, [newRole, examTreeLoaded]);

  useEffect(() => {
    if (!createUserModalOpen || !selectedExamPosition) {
      setCourses([]);
      return;
    }
    setCoursesLoading(true);
    courseEnrollmentApi.getPublicCourses(selectedExamPosition.id)
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => setCoursesLoading(false));
  }, [createUserModalOpen, selectedExamPosition?.id]);

  useEffect(() => {
    if (newRole === "student" && !packagesLoaded) {
      setPackagesLoading(true);
      subscriptionsApi.listPlans()
        .then((plans) => {
          setPackages(plans.filter((p) => p.status === "ACTIVE"));
          setPackagesLoaded(true);
        })
        .catch(() => setPackages([]))
        .finally(() => setPackagesLoading(false));
    }
  }, [newRole, packagesLoaded]);

  const initSlotCourses = (plan: SubscriptionPlan): number[] => {
    if (plan.package_type === "SINGLE") {
      if (typeof plan.course === "number") {
        return [plan.course];
      } else if (plan.eligible_courses && plan.eligible_courses.length > 0 && typeof plan.eligible_courses[0] === "number") {
        return [plan.eligible_courses[0]];
      }
      return [];
    } else if (plan.package_type === "BUNDLE") {
      return plan.eligible_courses ? [...plan.eligible_courses] : [];
    } else {
      return [];
    }
  };

  const addPackageSlot = () => {
    const chosenPids = new Set(selectedPackages.map((s) => s.packageId).filter((id): id is number => typeof id === "number"));
    const nextAvail = packages.find((p) => !chosenPids.has(p.id));
    const newSlot: PackageAssignmentSlot = {
      id: `slot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      packageId: nextAvail ? nextAvail.id : null,
      courseIds: nextAvail ? initSlotCourses(nextAvail) : [],
    };
    setSelectedPackages((prev) => [...prev, newSlot]);
  };

  const removePackageSlot = (slotId: string) => {
    setSelectedPackages((prev) => prev.filter((s) => s.id !== slotId));
  };

  const updateSlotPackage = (slotId: string, pkgId: number | null) => {
    const plan = packages.find((p) => p.id === pkgId);
    setSelectedPackages((prev) =>
      prev.map((slot) => {
        if (slot.id !== slotId) return slot;
        return {
          ...slot,
          packageId: pkgId,
          courseIds: plan ? initSlotCourses(plan) : [],
        };
      })
    );
  };

  const toggleSlotCourse = (slotId: string, courseId: number, maxCount?: number) => {
    setSelectedPackages((prev) =>
      prev.map((slot) => {
        if (slot.id !== slotId) return slot;
        const exists = slot.courseIds.includes(courseId);
        if (exists) {
          return { ...slot, courseIds: slot.courseIds.filter((id) => id !== courseId) };
        } else {
          if (maxCount && slot.courseIds.length >= maxCount) {
            return slot;
          }
          return { ...slot, courseIds: [...slot.courseIds, courseId] };
        }
      })
    );
  };

  const setSlotSingleCourse = (slotId: string, courseId: number) => {
    setSelectedPackages((prev) =>
      prev.map((slot) => {
        if (slot.id !== slotId) return slot;
        return { ...slot, courseIds: [courseId] };
      })
    );
  };

  const generateTempPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    let pw = "";
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setNewPassword(pw);
    setShowNewPassword(true);
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let url = '/admin/users/?page=1&page_size=50';
      if (filterRole !== "All Roles") {
        url += `&role=${filterRole.toLowerCase()}`;
      }
      if (debouncedSearchTerm) {
        url += `&search=${encodeURIComponent(debouncedSearchTerm)}`;
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
  }, [filterRole, debouncedSearchTerm]);

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

  const openDeleteModal = (id?: string) => {
    setActionUserId(id || null);
    setDeleteError("");
    setDeleteModalOpen(true);
  };

  const openCreateUserModal = () => {
    setNewUsername("");
    setNewEmail("");
    setNewPassword("");
    setShowNewPassword(false);
    setNewRole("student");
    setCreateError("");
    setFullName("");
    setMobile("");
    setDistrict("");
    setLocalLevel("");
    setSendWelcomeEmail(false);
    setExamCategoryId(null);
    setExamPath([]);
    setSelectedCourseId(null);
    setSelectedPackages([]);
    setGrantReason("Manually enrolled by Admin");
    setCreateUserModalOpen(true);
  };

  const handleCreateUser = async () => {
    setCreateError("");
    if (!newUsername || !newEmail || !newPassword) {
      setCreateError("Username, email, and password are required.");
      return;
    }

    if (newRole === "student") {
      if (!fullName.trim() || !mobile.trim() || !district.trim() || !localLevel.trim()) {
        setCreateError("Full name, phone, district, and local level are required for a student account.");
        return;
      }
      if (!isValidNepalPhone(mobile)) {
        setCreateError("Please enter a valid 10-digit Nepali mobile number.");
        return;
      }
      if (!examCategoryId) {
        setCreateError("Please select what the student is preparing for.");
        return;
      }

      // Validate selected packages
      const seenPackageIds = new Set<number>();
      for (const [i, slot] of selectedPackages.entries()) {
        if (!slot.packageId) {
          setCreateError(`Package #${i + 1}: Please select a package or remove this card.`);
          return;
        }
        if (seenPackageIds.has(slot.packageId)) {
          setCreateError(`Duplicate package selection: The same package cannot be assigned multiple times.`);
          return;
        }
        seenPackageIds.add(slot.packageId);

        const plan = packages.find((p) => p.id === slot.packageId);
        if (plan) {
          if (plan.package_type === "SINGLE" && slot.courseIds.length !== 1) {
            setCreateError(`Package "${plan.name}": Please select exactly 1 course.`);
            return;
          }
          if (plan.package_type === "MULTI") {
            if (slot.courseIds.length === 0) {
              setCreateError(`Package "${plan.name}": Please select at least 1 course.`);
              return;
            }
            if (slot.courseIds.length > plan.allowed_preparation_count) {
              setCreateError(`Package "${plan.name}" allows at most ${plan.allowed_preparation_count} preparation(s).`);
              return;
            }
          }
        }
      }
    }

    setIsCreatingUser(true);
    try {
      const packagesPayload = selectedPackages
        .filter((s) => s.packageId !== null)
        .map((s) => ({
          package_id: s.packageId!,
          course_ids: s.courseIds.length > 0 ? s.courseIds : undefined,
        }));

      await adminApi.createUser({
        username: newUsername,
        email: newEmail,
        password: newPassword,
        role: newRole as "student" | "teacher" | "admin",
        ...(newRole === "student" && {
          name: fullName.trim(),
          mobile: mobile.trim(),
          permanent_district: district.trim(),
          permanent_local_level: localLevel.trim(),
          exam_category_id: examCategoryId ?? undefined,
          exam_position_id: selectedExamPosition?.id,
          course_id: selectedCourseId ?? undefined,
          packages: packagesPayload.length > 0 ? packagesPayload : undefined,
          package_id: packagesPayload.length === 1 ? packagesPayload[0]?.package_id : undefined,
          course_ids: packagesPayload.length === 1 ? packagesPayload[0]?.course_ids : undefined,
          grant_reason: grantReason.trim() || undefined,
          access_source: "admin_grant",
          send_welcome_email: sendWelcomeEmail,
        }),
      });
      setCreateUserModalOpen(false);
      setSearchTerm("");
      setFilterRole("All Roles");
      fetchUsers();
    } catch (error: any) {
      setCreateError(error.data?.error || error.message || "Failed to create user.");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleSuspend = async () => {
    const ids = actionUserId ? [actionUserId] : selectedUsers;
    if (ids.length > 0) {
      try {
        await Promise.all(ids.map((id) =>
          apiClient(`/admin/users/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify({ is_active: false })
          })
        ));
        setSelectedUsers([]);
        fetchUsers();
      } catch (error) {
        console.error(error);
      }
    }
    setSuspendModalOpen(false);
  };

  const handleActivate = async () => {
    const ids = actionUserId ? [actionUserId] : selectedUsers;
    if (ids.length > 0) {
      try {
        await Promise.all(ids.map((id) =>
          apiClient(`/admin/users/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify({ is_active: true })
          })
        ));
        setSelectedUsers([]);
        fetchUsers();
      } catch (error) {
        console.error(error);
      }
    }
    setActivateModalOpen(false);
  };

  const handleDelete = async () => {
    const ids = actionUserId ? [actionUserId] : selectedUsers;
    if (ids.length === 0) return;

    setDeleteError("");
    setIsDeleting(true);
    try {
      await Promise.all(ids.map((id) =>
        apiClient(`/admin/users/${id}/`, { method: 'DELETE' })
      ));
      setSelectedUsers([]);
      setDeleteModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      setDeleteError(error.data?.error || error.message || "Failed to delete user.");
    } finally {
      setIsDeleting(false);
    }
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
            <Button
              size="sm"
              variant="outline"
              className="bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              onClick={() => openActivateModal()}
            >
              Activate
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-white text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => openSuspendModal()}
            >
              Suspend
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-white text-red-700 border-red-300 hover:bg-red-50"
              onClick={() => openDeleteModal()}
            >
              Delete
            </Button>
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
                          <DropdownMenuItem asChild className="cursor-pointer">
                            <Link href={`/admin-dashboard/users/${user.id}`}>
                              <Eye className="w-4 h-4 mr-2" /> View Full Info
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {!user.isActive ? (
                            <DropdownMenuItem className="cursor-pointer text-emerald-600" onClick={() => openActivateModal(user.id)}>
                              <CheckCircle2 className="w-4 h-4 mr-2" /> Activate User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="cursor-pointer text-red-600" onClick={() => openSuspendModal(user.id)}>
                              <ShieldAlert className="w-4 h-4 mr-2" /> Suspend User
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="cursor-pointer text-red-700 focus:text-red-700" onClick={() => openDeleteModal(user.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete User
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

      {/* Suspend Modal */}
      <Dialog open={suspendModalOpen} onOpenChange={setSuspendModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="w-5 h-5" /> Suspend {actionUserId ? "User" : `${selectedUsers.length} Users`}
            </DialogTitle>
            <DialogDescription>
              {actionUserId
                ? "Are you sure you want to suspend this user? User access will be restricted immediately."
                : `Are you sure you want to suspend ${selectedUsers.length} user(s)? Their access will be restricted immediately.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSuspendModalOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleSuspend}>
              Suspend {actionUserId ? "User" : `${selectedUsers.length} Users`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Modal */}
      <Dialog open={activateModalOpen} onOpenChange={setActivateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" /> Activate {actionUserId ? "User" : `${selectedUsers.length} Users`}
            </DialogTitle>
            <DialogDescription>
              {actionUserId
                ? "Activate this account? The user will regain access to the platform immediately."
                : `Activate ${selectedUsers.length} account(s)? They will regain access to the platform immediately.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setActivateModalOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleActivate}>
              Activate {actionUserId ? "User" : `${selectedUsers.length} Users`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={(open) => { if (!isDeleting) setDeleteModalOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="w-5 h-5" /> Delete {actionUserId ? "User" : `${selectedUsers.length} Users`}
            </DialogTitle>
            <DialogDescription>
              {actionUserId
                ? "This permanently deletes the account and all of its data. This cannot be undone."
                : `This permanently deletes ${selectedUsers.length} account(s) and all of their data. This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm rounded-md border border-red-200 dark:border-red-900/50">
              {deleteError}
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>Cancel</Button>
            <Button className="bg-red-700 hover:bg-red-800 text-white gap-2" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                `Delete ${actionUserId ? "User" : `${selectedUsers.length} Users`}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Modal */}
      <Dialog open={createUserModalOpen} onOpenChange={setCreateUserModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <UserPlus className="w-5 h-5" /> {newRole === "student" ? "Create Student" : "Create New User"}
            </DialogTitle>
            <DialogDescription>
              {newRole === "student"
                ? "Complete student registration details - same information collected at self-registration."
                : "Add a new teacher or admin to the platform."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {createError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm rounded-md border border-red-200 dark:border-red-900/50">
                {createError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Role *</label>
              <select
                className="w-full p-2 border border-input rounded-md text-sm bg-background text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Personal Information */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Personal Information
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {newRole === "student" && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Full Name *</label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Dipak Bhandari" className="placeholder:text-muted-foreground" />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Username *</label>
                  <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="e.g. johndoe" className="placeholder:text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email *</label>
                  <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" placeholder="e.g. john@example.com" className="placeholder:text-muted-foreground" />
                </div>
                {newRole === "student" && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone Number *</label>
                    <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="98XXXXXXXX" className="placeholder:text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Permanent Address - student only */}
            {newRole === "student" && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Permanent Address
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">District *</label>
                    <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. Rupandehi" className="placeholder:text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Local Level *</label>
                    <Input value={localLevel} onChange={(e) => setLocalLevel(e.target.value)} placeholder="e.g. Butwal" className="placeholder:text-muted-foreground" />
                  </div>
                </div>
              </div>
            )}

            {/* Exam Preference - student only */}
            {newRole === "student" && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" /> What is the student preparing for? *
                </p>
                {examTreeLoading ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {examTree.map((category) => {
                      const isSelected = examCategoryId === category.id;
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => { setExamCategoryId(category.id); setExamPath([]); setSelectedCourseId(null); }}
                          className={`h-10 px-3 rounded-md border text-sm font-semibold text-left transition-colors ${isSelected ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:bg-muted"}`}
                        >
                          {category.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedExamCategory && examOptionsAtDepth(0).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">{examDepthLabel(0)}</p>
                    <div className="flex flex-wrap gap-2">
                      {examOptionsAtDepth(0).map((node) => {
                        const isSelected = examPath[0]?.id === node.id;
                        return (
                          <button
                            key={node.id}
                            type="button"
                            onClick={() => selectExamNode(0, node)}
                            className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${isSelected ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:bg-muted"}`}
                          >
                            {node.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {examPath[0] && examOptionsAtDepth(1).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">{examDepthLabel(1)}</p>
                    <div className="flex flex-wrap gap-2">
                      {examOptionsAtDepth(1).map((node) => {
                        const isSelected = examPath[1]?.id === node.id;
                        return (
                          <button
                            key={node.id}
                            type="button"
                            onClick={() => selectExamNode(1, node)}
                            className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${isSelected ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:bg-muted"}`}
                          >
                            {node.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedPackages.length === 0 && selectedExamPosition && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Preferred Course (optional)</label>
                    {coursesLoading ? (
                      <div className="h-10 rounded-md bg-muted animate-pulse" />
                    ) : courses.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No courses available for this selection yet.</p>
                    ) : (
                      <select
                        className="w-full p-2 border border-input rounded-md text-sm bg-background text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={selectedCourseId ?? ""}
                        onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : null)}
                      >
                        <option value="">No preferred course</option>
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    )}
                    <p className="text-xs text-muted-foreground">Records a pending application only - no payment or enrollment is created.</p>
                  </div>
                )}
              </div>
            )}

            {/* Course & Package Access */}
            {newRole === "student" && (
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-primary" /> Course & Package Access
                  </p>
                  <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Admin Grant
                  </span>
                </div>

                {packagesLoading ? (
                  <div className="h-20 rounded-md bg-muted animate-pulse" />
                ) : packages.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No active packages available.</p>
                ) : selectedPackages.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">No Package Selected (Free / Basic Account)</p>
                      <p className="text-xs text-muted-foreground">The student will be created with standard platform access without active package subscriptions.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPackageSlot}
                      className="gap-1.5 shrink-0 border-primary text-primary hover:bg-primary/5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Package Access
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedPackages.map((slot, index) => {
                      const plan = packages.find((p) => p.id === slot.packageId) || null;
                      const otherSelectedPids = new Set(
                        selectedPackages
                          .filter((_, i) => i !== index)
                          .map((s) => s.packageId)
                          .filter((id): id is number => typeof id === "number")
                      );

                      return (
                        <div key={slot.id} className="bg-muted/40 border border-border rounded-lg p-3.5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">
                              Package #{index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removePackageSlot(slot.id)}
                              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>

                          {/* Package Selector */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Select Package</label>
                            <select
                              className="w-full p-2 border border-input rounded-md text-sm bg-background text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                              value={slot.packageId ?? ""}
                              onChange={(e) => updateSlotPackage(slot.id, e.target.value ? Number(e.target.value) : null)}
                            >
                              <option value="">-- Choose a package --</option>
                              {packages.map((pkg) => {
                                const isAlreadySelectedElsewhere = otherSelectedPids.has(pkg.id);
                                return (
                                  <option key={pkg.id} value={pkg.id} disabled={isAlreadySelectedElsewhere}>
                                    {pkg.name} — {pkg.package_type} (NPR {pkg.price} / {pkg.duration} {pkg.duration_unit.toLowerCase()})
                                    {isAlreadySelectedElsewhere ? " (Already added)" : ""}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          {/* Plan Details & Course Selection */}
                          {plan && (
                            <div className="space-y-3 pt-2 border-t border-border/60">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <h4 className="text-sm font-bold text-foreground">{plan.name}</h4>
                                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                                    {plan.package_type}
                                  </span>
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
                                    NPR {plan.price}
                                  </span>
                                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {plan.duration} {plan.duration_unit.toLowerCase()}
                                  </span>
                                </div>
                              </div>

                              {/* SINGLE Package Course */}
                              {plan.package_type === "SINGLE" && (
                                <div className="space-y-1.5 pt-1">
                                  <label className="text-xs font-bold text-foreground">Assigned Course (Exactly 1)</label>
                                  {plan.course_details ? (
                                    <div className="p-2.5 rounded-md border border-border bg-background text-xs font-semibold flex items-center justify-between">
                                      <span>{plan.course_details.title}</span>
                                      <span className="text-[10px] text-muted-foreground uppercase">{plan.course_details.exam || "Fixed Course"}</span>
                                    </div>
                                  ) : plan.eligible_courses_details && plan.eligible_courses_details.length > 0 ? (
                                    <select
                                      className="w-full p-2 border border-input rounded-md text-xs bg-background text-foreground font-medium"
                                      value={slot.courseIds[0] ?? ""}
                                      onChange={(e) => {
                                        if (e.target.value) setSlotSingleCourse(slot.id, Number(e.target.value));
                                      }}
                                    >
                                      <option value="">Choose 1 eligible course</option>
                                      {plan.eligible_courses_details.map((c) => (
                                        <option key={c.id} value={c.id}>{c.title} ({c.exam || "Preparation"})</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <p className="text-xs text-amber-600">No eligible courses configured for this plan.</p>
                                  )}
                                </div>
                              )}

                              {/* MULTI Package Course Selection */}
                              {plan.package_type === "MULTI" && (
                                <div className="space-y-2 pt-1">
                                  <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-foreground">Select Courses</label>
                                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                      slot.courseIds.length === plan.allowed_preparation_count
                                        ? "bg-emerald-100 text-emerald-800"
                                        : slot.courseIds.length > plan.allowed_preparation_count
                                        ? "bg-red-100 text-red-800"
                                        : "bg-blue-50 text-blue-700"
                                    }`}>
                                      Selected: {slot.courseIds.length} / {plan.allowed_preparation_count}
                                    </span>
                                  </div>
                                  {plan.eligible_courses_details && plan.eligible_courses_details.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                                      {plan.eligible_courses_details.map((c) => {
                                        const isChecked = slot.courseIds.includes(c.id);
                                        return (
                                          <label
                                            key={c.id}
                                            className={`flex items-start gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                                              isChecked ? "border-primary bg-primary/5 text-foreground font-medium" : "border-input text-muted-foreground hover:bg-muted/50"
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                              className="mt-0.5 rounded border-input"
                                              checked={isChecked}
                                              onChange={() => toggleSlotCourse(slot.id, c.id, plan.allowed_preparation_count)}
                                            />
                                            <div className="flex-1 min-w-0">
                                              <p className="truncate font-semibold">{c.title}</p>
                                              <p className="text-[10px] text-muted-foreground truncate">{c.exam || "Preparation"}</p>
                                            </div>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">No eligible courses attached to this multi-package.</p>
                                  )}
                                </div>
                              )}

                              {/* BUNDLE Package Course Pre-selection */}
                              {plan.package_type === "BUNDLE" && (
                                <div className="space-y-2 pt-1">
                                  <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-foreground">Included Bundle Courses</label>
                                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">All included</span>
                                  </div>
                                  {plan.eligible_courses_details && plan.eligible_courses_details.length > 0 ? (
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {plan.eligible_courses_details.map((c) => (
                                        <div key={c.id} className="flex items-center gap-2 p-1.5 rounded bg-background border border-border text-xs">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                          <span className="truncate font-medium text-foreground">{c.title}</span>
                                          <span className="text-[10px] text-muted-foreground ml-auto">{c.exam}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">No courses attached to this bundle yet.</p>
                                  )}
                                </div>
                              )}

                              {/* ALL_ACCESS Package Info */}
                              {plan.package_type === "ALL_ACCESS" && (
                                <div className="p-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-semibold">Full Platform Access</p>
                                    <p className="text-[11px] opacity-90 mt-0.5">Grants student complete access to all published Loksewa preparation courses on the platform.</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add Another Package Button */}
                    <div className="flex items-center justify-between pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addPackageSlot}
                        disabled={selectedPackages.length >= packages.length}
                        className="gap-1.5 text-xs border-dashed"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Another Package
                      </Button>
                      <button
                        type="button"
                        onClick={() => setSelectedPackages([])}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Clear packages (Free Account)
                      </button>
                    </div>
                  </div>
                )}

                {/* Access Summary Box */}
                {selectedPackages.some((s) => s.packageId !== null) && (
                  <div className="rounded-lg border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-purple-600" /> Access Summary
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          ✓ Admin Granted
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                          ✓ Payment Not Required
                        </span>
                      </div>
                    </div>

                    <div className="text-xs space-y-1.5 pt-1 text-slate-700 dark:text-slate-300">
                      <p>
                        <span className="font-semibold text-foreground">Student: </span>
                        {fullName || newUsername || "New Student"} {newEmail ? `(${newEmail})` : ""}
                      </p>
                      <div className="space-y-1 pt-1">
                        <p className="font-semibold text-foreground">
                          Packages Assigned ({selectedPackages.filter((s) => s.packageId).length}):
                        </p>
                        {selectedPackages.map((slot) => {
                          const plan = packages.find((p) => p.id === slot.packageId);
                          if (!plan) return null;
                          const configuredCourses =
                            plan.package_type === "BUNDLE"
                              ? plan.eligible_courses_details?.map((c) => c.title) || []
                              : plan.package_type === "ALL_ACCESS"
                              ? ["All Published Courses"]
                              : plan.package_type === "SINGLE"
                              ? [plan.course_details?.title || plan.eligible_courses_details?.find((c) => c.id === slot.courseIds[0])?.title || "1 Course"]
                              : plan.eligible_courses_details?.filter((c) => slot.courseIds.includes(c.id)).map((c) => c.title) || [];

                          return (
                            <div key={slot.id} className="p-2 rounded bg-background/80 border border-border/70 text-[11px]">
                              <div className="flex items-center justify-between font-bold text-foreground">
                                <span>✓ {plan.name} ({plan.package_type})</span>
                                <span className="text-muted-foreground">{plan.duration} {plan.duration_unit.toLowerCase()}</span>
                              </div>
                              {configuredCourses.length > 0 && (
                                <p className="text-muted-foreground mt-0.5">
                                  Courses: {configuredCourses.join(", ")}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Access Grant & Reason Note */}
                <div className="pt-2 border-t border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Access Grant Notes
                    </span>
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded border border-purple-200">
                      Payment: Admin Granted
                    </span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Grant Reason (optional note)</label>
                    <Input
                      value={grantReason}
                      onChange={(e) => setGrantReason(e.target.value)}
                      placeholder="e.g. Manually enrolled by Admin"
                      className="text-xs placeholder:text-muted-foreground h-9"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Account */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Account</p>
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Password *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Temporary password"
                      className="placeholder:text-muted-foreground pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button type="button" variant="outline" className="gap-1.5 shrink-0" onClick={generateTempPassword}>
                    <Wand2 className="w-4 h-4" /> Generate
                  </Button>
                </div>
              </div>

              {newRole === "student" && (
                <div className="flex items-start gap-2.5 pt-1">
                  <Checkbox id="sendWelcomeEmail" checked={sendWelcomeEmail} onCheckedChange={(v) => setSendWelcomeEmail(v === true)} className="mt-0.5" />
                  <label htmlFor="sendWelcomeEmail" className="text-sm text-foreground cursor-pointer">
                    <span className="font-medium flex items-center gap-1.5"><Send className="w-3.5 h-3.5" /> Send account details to student</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">Emails the username and a login link. The password itself is never emailed - the student uses "Forgot password?" to set their own.</span>
                  </label>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateUserModalOpen(false)} disabled={isCreatingUser}>Cancel</Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" onClick={handleCreateUser} disabled={isCreatingUser}>
              {isCreatingUser ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                newRole === "student" ? "Create Student" : "Create User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
