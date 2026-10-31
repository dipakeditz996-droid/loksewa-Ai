"use client";

import React, { useState, useEffect } from "react";
import {
  Mail, Send, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Plus, Trash2, Check, X, ShieldAlert, Loader2, Server, HelpCircle,
  Edit3, SlidersHorizontal, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminApi,
  AdminEmailRecipient,
  EmailDeliveryLog,
  EmailDeliveryHealth,
  AdminNotificationEventsResponse
} from "@/lib/api/admin";
import SendTestEmailCard from "./SendTestEmailCard";
import toast from "react-hot-toast";

const ALL_CATEGORY_IDS = ["registration", "payment", "marketplace", "security", "system"];

const CATEGORIES = [
  { id: "registration", label: "Registration & Accounts", desc: "New student registrations and teacher account notices" },
  { id: "payment", label: "Payments & Subscriptions", desc: "Manual payment slips, approvals, rejections, and plan verifications" },
  { id: "marketplace", label: "Marketplace Orders", desc: "Book orders, COD deposit verifications, and delivery issues" },
  { id: "security", label: "Security & Compliance", desc: "Staff password changes, multiple session anomalies, and account alerts" },
  { id: "system", label: "System & Error Alerts", desc: "Infrastructure health, delivery failures, and provider alerts" },
];

export default function AdminEmailNotificationSettings() {
  const [recipients, setRecipients] = useState<AdminEmailRecipient[]>([]);
  const [health, setHealth] = useState<EmailDeliveryHealth | null>(null);
  const [logs, setLogs] = useState<EmailDeliveryLog[]>([]);
  const [logsCount, setLogsCount] = useState(0);
  const [eventsData, setEventsData] = useState<AdminNotificationEventsResponse | null>(null);
  const [updatingEventKey, setUpdatingEventKey] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // Add recipient form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(ALL_CATEGORY_IDS);
  const [isSubmittingRecipient, setIsSubmittingRecipient] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit recipient modal state
  const [editingRecipient, setEditingRecipient] = useState<AdminEmailRecipient | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Log filters
  const [selectedLogCategory, setSelectedLogCategory] = useState<string>("");
  const [selectedLogStatus, setSelectedLogStatus] = useState<string>("");
  const [logSearch, setLogSearch] = useState<string>("");
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchRecipients(), fetchHealth(), fetchLogs(), fetchNotificationEvents()]);
    setIsLoading(false);
  };

  const fetchNotificationEvents = async () => {
    try {
      const res = await adminApi.getNotificationEvents();
      setEventsData(res);
    } catch (err) {
      console.warn("Failed to load admin notification events:", err);
    }
  };

  const handleToggleEventState = async (key: string, nextVal: boolean) => {
    setUpdatingEventKey(key);
    try {
      await adminApi.updateNotificationEvents({ [key]: nextVal });
      toast.success("Notification event rule updated.");
      fetchNotificationEvents();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update notification event rule.");
    } finally {
      setUpdatingEventKey(null);
    }
  };

  const fetchRecipients = async () => {
    try {
      const res = await adminApi.getEmailRecipients();
      setRecipients(res.recipients || []);
    } catch (err) {
      console.warn("Failed to load email recipients:", err);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await adminApi.getEmailDeliveryHealth();
      setHealth(res);
    } catch (err) {
      console.warn("Failed to load email health metrics:", err);
    }
  };

  const fetchLogs = async (cat = selectedLogCategory, stat = selectedLogStatus, srch = logSearch) => {
    setIsLoadingLogs(true);
    try {
      const res = await adminApi.getEmailDeliveryLogs({
        category: cat || undefined,
        status: stat || undefined,
        search: srch || undefined,
        limit: 30,
      });
      setLogs(res.results || []);
      setLogsCount(res.count || 0);
    } catch (err) {
      console.warn("Failed to load delivery logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const emailNorm = newEmail.trim().toLowerCase();
    if (!emailNorm || !emailNorm.includes("@")) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (selectedCategories.length === 0) {
      setFormError("Please select at least one notification category.");
      return;
    }

    setIsSubmittingRecipient(true);
    try {
      await adminApi.createEmailRecipient({
        email: emailNorm,
        name: newName.trim(),
        event_categories: selectedCategories,
      });
      setNewEmail("");
      setNewName("");
      setSelectedCategories(ALL_CATEGORY_IDS);
      setShowAddForm(false);
      toast.success(`Admin recipient '${emailNorm}' added successfully.`);
      await fetchRecipients();
      fetchHealth();
    } catch (err: any) {
      const errorDetail = err?.data?.email?.[0] || err?.data?.error || err?.message || "Failed to add recipient.";
      setFormError(errorDetail);
    } finally {
      setIsSubmittingRecipient(false);
    }
  };

  const handleOpenEdit = (rec: AdminEmailRecipient) => {
    setEditingRecipient(rec);
    setEditEmail(rec.email);
    setEditName(rec.name || "");
    setEditCategories(rec.event_categories && rec.event_categories.length > 0 ? rec.event_categories : ALL_CATEGORY_IDS);
    setEditIsActive(rec.is_active);
    setEditError(null);
  };

  const handleCloseEdit = () => {
    setEditingRecipient(null);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingRecipient) return;
    setEditError(null);
    const emailNorm = editEmail.trim().toLowerCase();
    if (!emailNorm || !emailNorm.includes("@")) {
      setEditError("Please enter a valid email address.");
      return;
    }
    if (editCategories.length === 0) {
      setEditError("Please select at least one notification category.");
      return;
    }

    setIsSavingEdit(true);
    try {
      await adminApi.updateEmailRecipient(editingRecipient.id, {
        email: emailNorm,
        name: editName.trim(),
        event_categories: editCategories,
        is_active: editIsActive,
      });
      toast.success(`Recipient '${emailNorm}' updated successfully.`);
      handleCloseEdit();
      await fetchRecipients();
      fetchHealth();
    } catch (err: any) {
      const errorDetail = err?.data?.email?.[0] || err?.data?.error || err?.message || "Failed to update recipient.";
      setEditError(errorDetail);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleActive = async (recipient: AdminEmailRecipient) => {
    try {
      const nextState = !recipient.is_active;
      await adminApi.updateEmailRecipient(recipient.id, {
        is_active: nextState,
      });
      toast.success(nextState ? `Recipient '${recipient.email}' activated.` : `Recipient '${recipient.email}' disabled.`);
      await fetchRecipients();
      fetchHealth();
    } catch (err) {
      console.error("Failed to toggle recipient active status:", err);
      toast.error("Failed to update active status.");
    }
  };

  const handleDeleteRecipient = async (rec: AdminEmailRecipient) => {
    if (!confirm(`Are you sure you want to remove admin notification recipient '${rec.email}'?`)) return;
    try {
      await adminApi.deleteEmailRecipient(rec.id);
      toast.success(`Recipient '${rec.email}' removed.`);
      await fetchRecipients();
      fetchHealth();
    } catch (err) {
      console.error("Failed to delete recipient:", err);
      toast.error("Failed to delete recipient.");
    }
  };

  const toggleCategoryInAdd = (catId: string) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const toggleCategoryInEdit = (catId: string) => {
    setEditCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" />
            Admin Email Notifications
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Configure administrator recipient routing. Assign specific categories to designated admin email addresses
            (e.g. accounts for payments, fulfillment team for orders) and audit delivery history.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={loadAll}
          disabled={isLoading}
          className="flex items-center gap-1.5 self-start sm:self-auto text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Delivery Health Cards */}
      {health && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 font-medium">Dispatched Total</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {health.health.total_dispatched}
            </div>
            <span className="text-[11px] text-slate-400">Total delivery attempts</span>
          </div>
          <div className="bg-green-50/60 dark:bg-green-950/20 p-4 rounded-xl border border-green-200 dark:border-green-900/40">
            <span className="text-xs text-green-700 dark:text-green-400 font-medium">Delivered Successfully</span>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">
              {health.health.sent}
            </div>
            <span className="text-[11px] text-green-600/80">Success Rate: {health.health.success_rate_percent}%</span>
          </div>
          <div className="bg-red-50/60 dark:bg-red-950/20 p-4 rounded-xl border border-red-200 dark:border-red-900/40">
            <span className="text-xs text-red-700 dark:text-red-400 font-medium">Failed Attempts</span>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400 mt-1">
              {health.health.failed}
            </div>
            <span className="text-[11px] text-red-600/80">Retrying: {health.health.retrying}</span>
          </div>
          <div className="bg-indigo-50/60 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/40">
            <span className="text-xs text-indigo-700 dark:text-indigo-400 font-medium">Active Admin Recipients</span>
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mt-1">
              {health.configuration.active_admin_recipients}
            </div>
            <span className="text-[11px] text-indigo-600/80">
              Provider: {health.provider.type}
            </span>
          </div>
        </div>
      )}

      {/* Admin Notification Recipients Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-500" />
              Configured Admin Notification Recipients ({recipients.length})
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Administrators receive event notifications based on their subscribed categories. No addresses are hardcoded.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white self-start sm:self-auto text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            {showAddForm ? "Cancel" : "Add Recipient"}
          </Button>
        </div>

        {/* Add Recipient Collapsible Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddRecipient}
            className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Add New Admin Notification Recipient
              </h5>
              {/* Quick Presets */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-medium">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => setSelectedCategories(ALL_CATEGORY_IDS)}
                  className="px-2 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 font-medium"
                >
                  All Notifications
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategories(["payment"])}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200"
                >
                  Payments Only
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategories(["marketplace"])}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200"
                >
                  Orders Only
                </button>
              </div>
            </div>

            {formError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <Input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="admin.lead@loksewaai.com"
                  className="w-full text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Name / Label
                </label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Accounts & Billing, Operations"
                  className="w-full text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                Subscribed Event Categories *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => {
                  const checked = selectedCategories.includes(cat.id);
                  return (
                    <label
                      key={cat.id}
                      onClick={() => toggleCategoryInAdd(cat.id)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs transition ${
                        checked
                          ? "bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-200"
                          : "bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-indigo-600"
                      />
                      <div>
                        <div className="font-semibold">{cat.label}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                          {cat.desc}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingRecipient}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                {isSubmittingRecipient ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Recipient"
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Recipients Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Recipient Email</th>
                <th className="py-2.5 px-3">Name / Label</th>
                <th className="py-2.5 px-3">Subscribed Categories</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {recipients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No admin notification recipients configured. Add an address above to begin receiving administrative notifications.
                  </td>
                </tr>
              ) : (
                recipients.map((rec) => {
                  const isAllCategories =
                    !rec.event_categories ||
                    rec.event_categories.length === 0 ||
                    (rec.event_categories.length === ALL_CATEGORY_IDS.length &&
                      ALL_CATEGORY_IDS.every(c => rec.event_categories.includes(c)));

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                        {rec.email}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                        {rec.name || <span className="text-slate-400 italic">None</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {isAllCategories ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                              All Notifications
                            </span>
                          ) : (
                            rec.event_categories.map((c) => (
                              <span
                                key={c}
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                              >
                                {c}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(rec)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition cursor-pointer ${
                            rec.is_active
                              ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-950/60 dark:text-green-300"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {rec.is_active ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                          {rec.is_active ? "Active" : "Disabled"}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(rec)}
                            className="h-7 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300 flex items-center gap-1 px-2"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteRecipient(rec)}
                            className="h-7 text-xs text-red-600 hover:text-red-700 px-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Recipient Modal */}
      {editingRecipient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  Edit Admin Notification Recipient
                </h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  ID: #{editingRecipient.id}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseEdit}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {editError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="admin@loksewaai.com"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Name / Label
                </label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Accounts & Subscriptions Lead"
                  className="text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Subscribed Categories *
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditCategories(ALL_CATEGORY_IDS)}
                      className="text-[10px] text-indigo-600 hover:underline font-semibold"
                    >
                      All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setEditCategories([])}
                      className="text-[10px] text-slate-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {CATEGORIES.map((cat) => {
                    const checked = editCategories.includes(cat.id);
                    return (
                      <label
                        key={cat.id}
                        onClick={() => toggleCategoryInEdit(cat.id)}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer text-xs transition ${
                          checked
                            ? "bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-200"
                            : "bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-indigo-600"
                        />
                        <div>
                          <div className="font-semibold">{cat.label}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                            {cat.desc}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Recipient Status
                </span>
                <button
                  type="button"
                  onClick={() => setEditIsActive(!editIsActive)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                    editIsActive
                      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                  }`}
                >
                  {editIsActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  {editIsActive ? "Active" : "Disabled"}
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCloseEdit}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSavingEdit}
                onClick={handleSaveEdit}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Administrative Notification Events & Category Controls Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
            Administrative Event & Category Notification Rules
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Control which system, payment, registration, and marketplace events dispatch administrative emails. Changes apply globally at dispatch time and are audited.
          </p>
        </div>

        {eventsData && eventsData.categories && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {eventsData.categories.map((cat) => {
              const catKey = `category:${cat.id}`;
              const isCatEnabled = cat.category_enabled;

              return (
                <div
                  key={cat.id}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
                >
                  {/* Category Bulk Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        {cat.label}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {cat.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={updatingEventKey === catKey}
                      onClick={() => handleToggleEventState(catKey, !isCatEnabled)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                        isCatEnabled
                          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 hover:bg-indigo-200"
                          : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-300"
                      }`}
                    >
                      {updatingEventKey === catKey ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isCatEnabled ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                      <span>{isCatEnabled ? "Category Enabled" : "Category Disabled"}</span>
                    </button>
                  </div>

                  {/* Individual Event Switches */}
                  <div className="space-y-2 pt-1">
                    {cat.events.map((ev) => {
                      const isEventActive = ev.enabled;
                      const isBusy = updatingEventKey === ev.key;

                      return (
                        <div
                          key={ev.key}
                          className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-white dark:hover:bg-slate-800/80 transition text-xs"
                        >
                          <div className="pr-2">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {ev.label}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-mono">
                              {ev.key}
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleEventState(ev.key, !isEventActive)}
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                              isEventActive ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${
                                isEventActive ? "translate-x-4" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Email Delivery Audit Logs View */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-500" />
              Email Delivery Logs & Audit Trail ({logsCount})
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Structured delivery status, attempt counts, and sanitized error diagnostics for all dispatched emails.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchLogs()}
            disabled={isLoadingLogs}
            className="flex items-center gap-1.5 self-start sm:self-auto text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? "animate-spin" : ""}`} />
            Refresh Logs
          </Button>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Input
            value={logSearch}
            onChange={(e) => {
              setLogSearch(e.target.value);
              fetchLogs(selectedLogCategory, selectedLogStatus, e.target.value);
            }}
            placeholder="Search by recipient or subject..."
            className="text-xs"
          />
          <select
            value={selectedLogCategory}
            onChange={(e) => {
              setSelectedLogCategory(e.target.value);
              fetchLogs(e.target.value, selectedLogStatus, logSearch);
            }}
            className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="">All Categories</option>
            <option value="registration">Registration</option>
            <option value="payment">Payment & Subscription</option>
            <option value="marketplace">Marketplace</option>
            <option value="learning">Learning & Exams</option>
            <option value="security">Security</option>
            <option value="system">System Alerts</option>
            <option value="test">Test Diagnostics</option>
          </select>
          <select
            value={selectedLogStatus}
            onChange={(e) => {
              setSelectedLogStatus(e.target.value);
              fetchLogs(selectedLogCategory, e.target.value, logSearch);
            }}
            className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="retrying">Retrying</option>
            <option value="queued">Queued</option>
          </select>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Recipient</th>
                <th className="py-2 px-3">Role</th>
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3">Subject / Event</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Attempts</th>
                <th className="py-2 px-3">Error / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-normal">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500">
                    No email delivery logs found matching the selected filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-2 px-3 font-mono font-medium max-w-[160px] truncate">
                      {log.recipient_email}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
                        log.recipient_role === "admin"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      }`}>
                        {log.recipient_role}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-600 dark:text-slate-400 capitalize">
                      {log.event_category}
                    </td>
                    <td className="py-2 px-3 max-w-[200px] truncate" title={log.subject}>
                      {log.subject}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          log.status === "sent"
                            ? "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300"
                            : log.status === "failed"
                            ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                            : log.status === "retrying"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-[11px]">
                      {log.attempts}/{log.max_attempts}
                    </td>
                    <td className="py-2 px-3 text-[11px] text-slate-500 max-w-[220px] truncate" title={log.error_message || ""}>
                      {log.error_message ? (
                        <span className="text-red-600 font-mono text-[10px]">{log.error_message}</span>
                      ) : (
                        <span className="text-slate-400 italic">None (Delivered)</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
