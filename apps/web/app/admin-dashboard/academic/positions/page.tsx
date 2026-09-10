"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Briefcase, Search, Loader2, MoreVertical, Edit, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminApi, AdminPosition } from "@/lib/api/admin";
import toast from "react-hot-toast";

type ModalMode = "create" | "edit" | "delete" | null;

export default function AcademicPositionsPage() {
  const [positions, setPositions] = useState<AdminPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPositions, setTotalPositions] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedPos, setSelectedPos] = useState<AdminPosition | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [fname, setFname] = useState("");
  const [fcode, setFcode] = useState("");
  const [fcat, setFcat] = useState("");
  const [fdesc, setFdesc] = useState("");
  const [forder, setForder] = useState(0);
  const [factive, setFactive] = useState(true);

  const fetchPositions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getPositions({
        search: searchTerm,
        page: currentPage,
        pageSize: 20,
      });
      const positionsList = Array.isArray(data) ? data : (data.results || []);
      setPositions(positionsList);
      setTotalPositions(data.count || positionsList.length || 0);
    } catch (error) {
      console.error("Failed to fetch positions", error);
      toast.error("Failed to load positions");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, currentPage]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const activeCount = positions.filter((p) => p.is_active).length;

  const openCreate = () => {
    setSelectedPos(null);
    setFname("");
    setFcode("");
    setFcat("");
    setFdesc("");
    setForder(positions.length);
    setFactive(true);
    setModalMode("create");
  };

  const openEdit = (pos: AdminPosition) => {
    setSelectedPos(pos);
    setFname(pos.name);
    setFcode(pos.code || "");
    setFcat(pos.category || "");
    setFdesc((pos as any).description || "");
    setForder(pos.order || 0);
    setFactive(pos.is_active);
    setModalMode("edit");
  };

  const openDelete = (pos: AdminPosition) => {
    setSelectedPos(pos);
    setModalMode("delete");
  };

  const closeModal = () => {
    if (isSaving) return;
    setModalMode(null);
    setSelectedPos(null);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!fname.trim()) {
      toast.error("Position name is required");
      return;
    }

    setIsSaving(true);
    try {
      if (modalMode === "create") {
        await adminApi.createPosition({
          name: fname.trim(),
          code: fcode.trim(),
          category: fcat.trim(),
          order: forder,
          is_active: factive,
        });
        toast.success("Position created successfully");
      } else if (modalMode === "edit" && selectedPos) {
        await adminApi.updatePosition(selectedPos.id, {
          name: fname.trim(),
          code: fcode.trim(),
          category: fcat.trim(),
          description: fdesc.trim(),
          order: forder,
          is_active: factive,
        });
        toast.success("Position updated successfully");
      }
      closeModal();
      await fetchPositions();
    } catch (error: any) {
      console.error("Failed to save position", error);
      toast.error(error.message || "Failed to save position");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPos) return;
    setIsSaving(true);
    try {
      await adminApi.deletePosition(selectedPos.id);
      toast.success("Position deleted successfully");
      closeModal();
      await fetchPositions();
    } catch (error: any) {
      console.error("Failed to delete position", error);
      toast.error(error.message || "Failed to delete position");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-[#D4A72C]" />
            Positions
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage job positions for Loksewa exams.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 bg-[#D4A72C] text-[#0B2545] hover:bg-[#C49B1F] font-semibold"
        >
          <Plus className="w-4 h-4" />
          New Position
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-600 text-sm font-medium mb-1">Total Positions</p>
          <p className="text-2xl font-bold text-[#0B2545]">{totalPositions}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-slate-600 text-sm font-medium mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-slate-400">
          <p className="text-slate-600 text-sm font-medium mb-1">Inactive</p>
          <p className="text-2xl font-bold text-slate-600">{totalPositions - activeCount}</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search positions..."
            className="pl-9 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-500"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-slate-700">Name</TableHead>
                <TableHead className="text-slate-700">Code</TableHead>
                <TableHead className="text-slate-700">Category</TableHead>
                <TableHead className="text-slate-700">Order</TableHead>
                <TableHead className="text-slate-700">Status</TableHead>
                <TableHead className="text-right text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center bg-white">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : positions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500 bg-white">
                    No positions found.
                  </TableCell>
                </TableRow>
              ) : (
                positions.map((position) => (
                  <TableRow
                    key={position.id}
                    className="hover:bg-slate-50/50 border-b border-slate-200 group"
                  >
                    <TableCell>
                      <p className="font-semibold text-[#0B2545]">{position.name}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-600">{position.code || "—"}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-600">{position.category || "—"}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">#{position.order}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          position.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {position.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-80 group-hover:opacity-100 transition-opacity hover:bg-slate-100"
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => openEdit(position)}
                          >
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => openDelete(position)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
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

      {/* Pagination */}
      {!isLoading && totalPositions > 20 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {currentPage} of {Math.ceil(totalPositions / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= Math.ceil(totalPositions / 20)}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* ── Create / Edit Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={modalMode === "create" || modalMode === "edit"}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[#0B2545] dark:text-white">
              {modalMode === "create" ? "Create New Position" : `Edit "${selectedPos?.name}"`}
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300">
              {modalMode === "create"
                ? "Add a new job position or role for Loksewa exams."
                : "Update the position details below."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pos_name" className="text-slate-700 dark:text-slate-200">
                Position Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pos_name"
                placeholder="e.g. Kharidar, Section Officer, Computer Operator"
                value={fname}
                onChange={(e) => setFname(e.target.value)}
                className="text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pos_code" className="text-slate-700 dark:text-slate-200">
                  Code
                </Label>
                <Input
                  id="pos_code"
                  placeholder="e.g. SO, KH, CO"
                  value={fcode}
                  onChange={(e) => setFcode(e.target.value)}
                  className="text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pos_cat" className="text-slate-700 dark:text-slate-200">
                  Category
                </Label>
                <Input
                  id="pos_cat"
                  placeholder="e.g. Gazetted, Non-Gazetted"
                  value={fcat}
                  onChange={(e) => setFcat(e.target.value)}
                  className="text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pos_desc" className="text-slate-700 dark:text-slate-200">
                Description
              </Label>
              <Textarea
                id="pos_desc"
                placeholder="Optional description of this position"
                rows={2}
                value={fdesc}
                onChange={(e) => setFdesc(e.target.value)}
                className="text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pos_order" className="text-slate-700 dark:text-slate-200">
                Order
              </Label>
              <Input
                id="pos_order"
                type="number"
                value={forder}
                onChange={(e) => setForder(parseInt(e.target.value) || 0)}
                className="text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="pos_active"
                checked={factive}
                onChange={(e) => setFactive(e.target.checked)}
                className="w-4 h-4 accent-[#0B2545]"
              />
              <Label htmlFor="pos_active" className="cursor-pointer text-slate-700 dark:text-slate-200">
                Active (Available in system)
              </Label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : modalMode === "create" ? (
                  "Create Position"
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ───────────────────────────────────── */}
      <Dialog
        open={modalMode === "delete"}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Delete Position
            </DialogTitle>
            <DialogDescription asChild>
              <div className="pt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p>
                  Are you sure you want to permanently delete{" "}
                  <strong className="text-[#0B2545] dark:text-white font-semibold">
                    {selectedPos ? `"${selectedPos.name}"` : "this position"}
                  </strong>
                  ?
                </p>
                <p className="text-amber-600 font-medium">
                  ⚠️ This position will be removed from the system.
                </p>
                <p className="text-red-600 font-medium">This action cannot be undone.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...
                </>
              ) : (
                "Yes, Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
