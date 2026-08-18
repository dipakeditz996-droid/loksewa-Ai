"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { studentSettingsApi } from "@/lib/api/student-settings";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Trash2, Loader2, Calendar, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";

export function AccountManagementSection() {
  const { user, logout } = useAuth();
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const deactivateMutation = useMutation({
    mutationFn: () => studentSettingsApi.deactivateAccount(deactivatePassword),
    onSuccess: () => {
      toast.success("Account deactivated.");
      logout("/login");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to deactivate account."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => studentSettingsApi.deleteAccount(deletePassword, deleteConfirmation),
    onSuccess: () => {
      toast.success("Account deleted.");
      logout("/login");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete account."),
  });

  return (
    <div className="space-y-6">
      {/* Account Info */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8">
        <h3 className="text-lg font-semibold text-[#0B2545] mb-6">Account Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
            <Calendar className="h-5 w-5 text-slate-500" />
            <div>
              <p className="text-xs text-slate-500">Account Created</p>
              <p className="text-sm font-medium text-[#0B2545]">
                {user ? new Date(user.id as any).toLocaleDateString?.() || "—" : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
            <ShieldAlert className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-xs text-slate-500">Account Status</p>
              <p className="text-sm font-semibold text-green-600">Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl border border-red-200/80 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <div>
            <h3 className="text-lg font-semibold text-red-700">Danger Zone</h3>
            <p className="text-xs text-red-400">These actions are irreversible. Proceed with caution.</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Deactivate */}
          <div className="flex items-center justify-between p-5 rounded-xl border border-slate-200 bg-slate-50/50">
            <div>
              <p className="text-sm font-semibold text-slate-800">Deactivate Account</p>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Temporarily disable your account. You can reactivate later by contacting support.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50 shrink-0"
              onClick={() => setShowDeactivateDialog(true)}
            >
              Deactivate
            </Button>
          </div>

          {/* Delete */}
          <div className="flex items-center justify-between p-5 rounded-xl border border-red-200 bg-red-50/30">
            <div>
              <p className="text-sm font-semibold text-red-700">Delete Account Permanently</p>
              <p className="text-[12px] text-red-400 mt-0.5">
                Permanently delete your account and all associated data. This cannot be undone.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50 shrink-0"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Deactivate Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate Account</DialogTitle>
            <DialogDescription>
              Enter your password to confirm account deactivation. You can contact support to reactivate later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-sm font-medium">Password</Label>
            <Input
              type="password"
              value={deactivatePassword}
              onChange={(e) => setDeactivatePassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={!deactivatePassword || deactivateMutation.isPending}
              onClick={() => deactivateMutation.mutate()}
            >
              {deactivateMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
              ) : "Deactivate Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700">Delete Account Permanently</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. All your data, exam history, notes, and progress will be lost forever.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Password</Label>
              <Input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Type <span className="font-mono text-red-600">DELETE MY ACCOUNT</span> to confirm
              </Label>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={
                !deletePassword ||
                deleteConfirmation !== "DELETE MY ACCOUNT" ||
                deleteMutation.isPending
              }
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Deleting...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-1" /> Delete Permanently</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
