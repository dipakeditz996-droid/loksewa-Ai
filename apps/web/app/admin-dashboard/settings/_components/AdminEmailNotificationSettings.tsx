"use client";

import React, { useState, useEffect } from "react";
import {
  Mail, Send, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Plus, Trash2, Check, X, ShieldAlert, Loader2, Server, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminApi,
  AdminEmailRecipient,
  EmailDeliveryLog,
  EmailDeliveryHealth
} from "@/lib/api/admin";

const CATEGORIES = [
  { id: "registration", label: "Registration", desc: "New student accounts and verifications" },
  { id: "payment", label: "Payments", desc: "Subscription and package payment verification" },
  { id: "marketplace", label: "Marketplace", desc: "Book orders, payment proofs, and order updates" },
  { id: "security", label: "Security", desc: "Password resets and account security events" },
  { id: "system", label: "System Alerts", desc: "Infrastructure, provider, and server error alerts" },
];

export default function AdminEmailNotificationSettings() {
  const [recipients, setRecipients] = useState<AdminEmailRecipient[]>([]);
  const [health, setHealth] = useState<EmailDeliveryHealth | null>(null);
  const [logs, setLogs] = useState<EmailDeliveryLog[]>([]);
  const [logsCount, setLogsCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmailInput, setTestEmailInput] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // New recipient form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "registration", "payment", "marketplace", "security", "system"
  ]);
  const [isSubmittingRecipient, setIsSubmittingRecipient] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
    await Promise.all([fetchRecipients(), fetchHealth(), fetchLogs()]);
    setIsLoading(false);
  };

  const fetchRecipients = async () => {
    try {
      const res = await adminApi.getEmailRecipients();
      setRecipients(res.recipients || []);
    } catch (err) {
      console.error("Failed to load email recipients:", err);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await adminApi.getEmailDeliveryHealth();
      setHealth(res);
    } catch (err) {
      console.error("Failed to load email health metrics:", err);
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
      console.error("Failed to load delivery logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = testEmailInput.trim();
    if (!targetEmail) {
      setTestResult({ success: false, message: "Please enter an email address to send a test message." });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await adminApi.sendTestEmail({ recipient_email: targetEmail });
      setTestResult({
        success: res.success,
        message: res.message || (res.success ? "Test email dispatched successfully." : "Delivery failed."),
      });
      fetchHealth();
      fetchLogs();
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || "Failed to deliver test email. Check server logs and SMTP credentials.";
      setTestResult({ success: false, message: msg });
    } finally {
      setIsSendingTest(false);
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
      setSelectedCategories(["registration", "payment", "marketplace", "security", "system"]);
      setShowAddForm(false);
      await fetchRecipients();
      fetchHealth();
    } catch (err: any) {
      const errorDetail = err?.data?.email?.[0] || err?.data?.error || err?.message || "Failed to add recipient.";
      setFormError(errorDetail);
    } finally {
      setIsSubmittingRecipient(false);
    }
  };

  const handleToggleActive = async (recipient: AdminEmailRecipient) => {
    try {
      await adminApi.updateEmailRecipient(recipient.id, {
        is_active: !recipient.is_active,
      });
      await fetchRecipients();
      fetchHealth();
    } catch (err) {
      console.error("Failed to toggle recipient active status:", err);
    }
  };

  const handleDeleteRecipient = async (id: number) => {
    if (!confirm("Are you sure you want to remove this admin email recipient?")) return;
    try {
      await adminApi.deleteEmailRecipient(id);
      await fetchRecipients();
      fetchHealth();
    } catch (err) {
      console.error("Failed to delete recipient:", err);
    }
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  return (
    <div className="space-y-8 mt-6">
      {/* Section Header */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              Centralized Automatic Email Notification System
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configure administrator recipient routing, trigger diagnostic tests, and inspect real-time delivery logs.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadAll}
            disabled={isLoading}
            className="flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Delivery Health Cards */}
      {health && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 font-medium">Dispatched Total</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {health.health.total_dispatched}
            </div>
            <span className="text-[11px] text-slate-400">Recorded delivery events</span>
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
            <span className="text-[11px] text-red-600/80">Retrying in queue: {health.health.retrying}</span>
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

      {/* Server Environment Notice */}
      <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4 text-xs text-blue-900 dark:text-blue-300 space-y-1.5">
        <div className="font-semibold flex items-center gap-1.5 text-blue-950 dark:text-blue-200">
          <Server className="w-4 h-4 text-blue-600" />
          Server-Side Provider Secrets Protection
        </div>
        <p className="leading-relaxed">
          For security, SMTP passwords and Resend API credentials are never stored in the database, shown in the browser, or bundled into frontend JavaScript.
          Configure them on Render via <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">EMAIL_HOST</code>, <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">EMAIL_PORT</code>, <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">EMAIL_HOST_USER</code>, <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">EMAIL_HOST_PASSWORD</code>, or <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">RESEND_API_KEY</code>.
        </p>
      </div>

      {/* Diagnostic Test Email Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-500" />
            Send Test Diagnostic Email
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dispatches a test notification to verify outbound SMTP/provider delivery without modifying student states.
          </p>
        </div>

        <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row gap-3">
          <Input
            type="email"
            value={testEmailInput}
            onChange={(e) => setTestEmailInput(e.target.value)}
            placeholder="Enter recipient email (e.g. admin@gmail.com)"
            className="flex-1 text-sm"
            disabled={isSendingTest}
          />
          <Button
            type="submit"
            disabled={isSendingTest || !testEmailInput}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
          >
            {isSendingTest ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Dispatching...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Test Email
              </>
            )}
          </Button>
        </form>

        {testResult && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
              testResult.success
                ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-900 dark:text-green-300"
                : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{testResult.success ? "Delivery Successful" : "Delivery Error"}</p>
              <p className="mt-0.5">{testResult.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Admin Notification Recipients Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-500" />
              Configured Admin Notification Recipients
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              These addresses receive event-driven administrative notifications for new registrations, payments, orders, and system alerts.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {showAddForm ? "Cancel" : "Add Recipient"}
          </Button>
        </div>

        {/* Add Recipient Collapsible Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddRecipient}
            className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4"
          >
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Add New Admin Notification Recipient
            </h5>

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
                  placeholder="admin.notifications@example.com"
                  className="w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Name / Label
                </label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Operations Team, Finance Lead"
                  className="w-full text-sm"
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
                      onClick={() => toggleCategory(cat.id)}
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
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingRecipient}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
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
                    No admin notification recipients configured. Add a recipient above to begin receiving automatic alerts.
                  </td>
                </tr>
              ) : (
                recipients.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                      {rec.email}
                    </td>
                    <td className="py-2.5 px-3">
                      {rec.name || <span className="text-slate-400 italic">None</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {rec.event_categories && rec.event_categories.length > 0 ? (
                          rec.event_categories.map((c) => (
                            <span
                              key={c}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                            >
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">All events</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(rec)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition cursor-pointer ${
                          rec.is_active
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                          onClick={() => {
                            setTestEmailInput(rec.email);
                            window.scrollTo({ top: 300, behavior: "smooth" });
                          }}
                          className="h-7 text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          Test
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRecipient(rec.id)}
                          className="h-7 text-xs text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    {isLoadingLogs ? "Loading delivery logs..." : "No delivery logs match the selected filters."}
                  </td>
                </tr>
              ) : (
                logs.map((item) => {
                  const statusColors: Record<string, string> = {
                    sent: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
                    failed: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
                    retrying: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300",
                    queued: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
                  };
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                        {item.recipient_email}
                        <span className="block text-[10px] text-slate-400 font-sans">
                          {item.recipient_role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 uppercase text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                        {item.event_category}
                      </td>
                      <td className="py-2.5 px-3 max-w-[200px] truncate" title={item.subject}>
                        {item.subject}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            statusColors[item.status] || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {item.attempts}/{item.max_attempts}
                      </td>
                      <td className="py-2.5 px-3 max-w-[220px] truncate text-slate-500 text-[11px]" title={item.error_message || ""}>
                        {item.error_message ? (
                          <span className="text-red-600 dark:text-red-400 font-mono text-[10px]">
                            {item.error_message}
                          </span>
                        ) : (
                          item.sent_at ? "Delivered" : "Queued"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

