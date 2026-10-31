"use client";

import React, { useState, useEffect } from "react";
import {
  Mail, Shield, Eye, Edit3, RotateCcw, Check, X,
  Lock, AlertTriangle, RefreshCw, Search, Sparkles, Loader2, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminApi,
  StudentEmailTemplate,
  StudentEmailTemplateCategory,
  StudentEmailPreviewResponse
} from "@/lib/api/admin";
import toast from "react-hot-toast";

const CATEGORY_ICONS: Record<string, string> = {
  account: "🛡️",
  payment: "💳",
  marketplace: "🛒",
  learning: "🎓",
};

export default function StudentEmailNotificationSettings() {
  const [templates, setTemplates] = useState<StudentEmailTemplate[]>([]);
  const [categories, setCategories] = useState<StudentEmailTemplateCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Toggle state
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  // Edit modal state
  const [editingTemplate, setEditingTemplate] = useState<StudentEmailTemplate | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBodyHtml, setEditBodyHtml] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState<"editor" | "preview">("editor");

  // Standalone Preview modal state
  const [previewData, setPreviewData] = useState<StudentEmailPreviewResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getStudentEmailTemplates();
      setTemplates(res.templates || []);
      setCategories(res.categories || []);
    } catch (err: any) {
      console.error("Failed to load student email templates:", err);
      toast.error(err?.message || "Failed to load student email notification settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (template: StudentEmailTemplate) => {
    if (template.is_mandatory) {
      toast.error("Mandatory authentication and security notifications cannot be disabled.");
      return;
    }

    const nextState = !template.is_enabled;
    setTogglingKey(template.event_key);
    try {
      const updated = await adminApi.updateStudentEmailTemplate(template.event_key, {
        is_enabled: nextState,
      });
      setTemplates(prev =>
        prev.map(t => (t.event_key === template.event_key ? updated : t))
      );
      toast.success(
        nextState
          ? `Enabled email notification for '${template.name}'.`
          : `Disabled email notification for '${template.name}'.`
      );
    } catch (err: any) {
      toast.error(err?.data?.is_enabled?.[0] || err?.message || "Failed to toggle notification status.");
    } finally {
      setTogglingKey(null);
    }
  };

  const openEditModal = (template: StudentEmailTemplate) => {
    setEditingTemplate(template);
    setEditSubject(template.subject);
    setEditBodyHtml(template.body_html);
    setActiveEditorTab("editor");
  };

  const closeEditModal = () => {
    setEditingTemplate(null);
    setEditSubject("");
    setEditBodyHtml("");
  };

  const handleSaveEdit = async () => {
    if (!editingTemplate) return;
    if (!editSubject.trim()) {
      toast.error("Subject line cannot be empty.");
      return;
    }
    if (!editBodyHtml.trim()) {
      toast.error("Template body cannot be empty.");
      return;
    }

    setIsSavingEdit(true);
    try {
      const updated = await adminApi.updateStudentEmailTemplate(editingTemplate.event_key, {
        subject: editSubject.trim(),
        body_html: editBodyHtml.trim(),
      });
      setTemplates(prev =>
        prev.map(t => (t.event_key === editingTemplate.event_key ? updated : t))
      );
      toast.success(`Template for '${editingTemplate.name}' saved successfully.`);
      closeEditModal();
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || "Failed to save template.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleResetToDefault = async (template: StudentEmailTemplate) => {
    if (!confirm(`Are you sure you want to reset '${template.name}' to the system default template?`)) {
      return;
    }

    try {
      const res = await adminApi.resetStudentEmailTemplate(template.event_key);
      setTemplates(prev =>
        prev.map(t => (t.event_key === template.event_key ? res.template : t))
      );
      if (editingTemplate && editingTemplate.event_key === template.event_key) {
        setEditSubject(res.template.subject);
        setEditBodyHtml(res.template.body_html);
      }
      toast.success(`Reset '${template.name}' to system default.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset template.");
    }
  };

  const handleOpenPreview = async (template: StudentEmailTemplate) => {
    setIsLoadingPreview(true);
    setPreviewModalOpen(true);
    setPreviewData(null);
    try {
      const res = await adminApi.previewStudentEmailTemplate(template.event_key);
      setPreviewData(res);
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate email preview.");
      setPreviewModalOpen(false);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleLiveEditPreview = async () => {
    if (!editingTemplate) return;
    setIsLoadingPreview(true);
    try {
      const res = await adminApi.previewStudentEmailTemplate(editingTemplate.event_key, {
        subject: editSubject,
        body_html: editBodyHtml,
      });
      setPreviewData(res);
      setActiveEditorTab("preview");
    } catch (err: any) {
      toast.error(err?.message || "Failed to render preview.");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    const tag = `{{${placeholder}}}`;
    setEditBodyHtml(prev => prev + tag);
    toast.success(`Inserted ${tag}`);
  };

  // Filtered list
  const filteredTemplates = templates.filter(t => {
    const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === "" ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.event_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" />
            Student Email Notifications
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Control which transactional, educational, and marketplace emails are dispatched to students.
            Customize subjects, edit body templates with dynamic variables, and preview rendered emails.
            Mandatory authentication and security notifications remain protected.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchTemplates}
          disabled={isLoading}
          className="flex items-center gap-1.5 self-start md:self-auto text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Security Rule Notice Banner */}
      <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3">
        <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-950 dark:text-amber-200">
            Protected Mandatory Account & Security Notifications
          </p>
          <p className="leading-relaxed">
            Essential authentication emails (Email Verification, Password Reset, and Password Change Confirmation)
            are protected by backend enforcement. Disabling optional notifications will never break student sign-in,
            OTP delivery, or password recovery.
          </p>
        </div>
      </div>

      {/* Category Pills & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              selectedCategory === "all"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            All Categories ({templates.length})
          </button>
          {categories.map(c => {
            const count = templates.filter(t => t.category === c.id).length;
            const isSelected = selectedCategory === c.id;
            const icon = CATEGORY_ICONS[c.id] || "📌";

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                <span>{icon}</span>
                <span>{c.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? "bg-indigo-700 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search student notifications..."
            className="pl-8 text-xs h-9"
          />
        </div>
      </div>

      {/* Templates List */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="text-xs">Loading student notification templates...</span>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="py-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          No notification events match your filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredTemplates.map(template => {
            const isBusy = togglingKey === template.event_key;
            const icon = CATEGORY_ICONS[template.category] || "📌";

            return (
              <div
                key={template.event_key}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base">{icon}</span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {template.name}
                      </h4>
                      <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                        {template.event_key}
                      </span>
                      {template.is_mandatory && (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900">
                          <Lock className="w-2.5 h-2.5" />
                          Protected Mandatory
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {template.description}
                    </p>
                  </div>

                  {/* Enable / Disable Toggle */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {template.is_enabled ? "Enabled" : "Disabled"}
                    </span>
                    {template.is_mandatory ? (
                      <button
                        type="button"
                        disabled
                        title="Mandatory security event cannot be disabled"
                        className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-indigo-600 cursor-not-allowed opacity-80"
                      >
                        <span className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform translate-x-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleToggle(template)}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                          template.is_enabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${
                            template.is_enabled ? "translate-x-4" : "translate-x-1"
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Subject Line Box */}
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 text-xs border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0">
                      Subject:
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate font-mono text-[11px]">
                      {template.subject}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenPreview(template)}
                      className="h-7 text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 px-2.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(template)}
                      className="h-7 text-xs flex items-center gap-1 px-2.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Template
                    </Button>
                  </div>
                </div>

                {/* Footer Meta & Placeholders */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-slate-500">Variables:</span>
                    {template.available_placeholders.map(p => (
                      <span
                        key={p}
                        className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono text-[10px]"
                      >
                        {`{{${p}}}`}
                      </span>
                    ))}
                  </div>

                  <div>
                    {template.updated_by_name ? (
                      <span>Last updated by {template.updated_by_name} on {new Date(template.updated_at).toLocaleDateString()}</span>
                    ) : (
                      <span>System Default Template</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Template Editing Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  Customize Template: {editingTemplate.name}
                </h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {editingTemplate.event_key}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 bg-slate-50 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={() => setActiveEditorTab("editor")}
                className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition ${
                  activeEditorTab === "editor"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Template Editor
              </button>
              <button
                type="button"
                onClick={handleLiveEditPreview}
                className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                  activeEditorTab === "preview"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Live Rendered Preview
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {activeEditorTab === "editor" ? (
                <>
                  {/* Subject input */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Email Subject Line *
                    </label>
                    <Input
                      value={editSubject}
                      onChange={e => setEditSubject(e.target.value)}
                      placeholder="e.g. Welcome to LoksewaAI, {{student_name}}!"
                      className="text-xs font-mono"
                    />
                  </div>

                  {/* Placeholder Pill Inserters */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      Available Placeholder Tags (Click to insert):
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {editingTemplate.available_placeholders.map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => insertPlaceholder(p)}
                          className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-mono transition"
                        >
                          + {`{{${p}}}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Body HTML Editor */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Email Body Template (HTML / Message Content) *
                    </label>
                    <textarea
                      value={editBodyHtml}
                      onChange={e => setEditBodyHtml(e.target.value)}
                      rows={9}
                      className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 leading-relaxed focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      The template body will be automatically wrapped inside LoksewaAI&apos;s responsive branded container with header and footer.
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  {isLoadingPreview ? (
                    <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                      <span className="text-xs">Rendering live email preview...</span>
                    </div>
                  ) : previewData ? (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-100 dark:bg-slate-800 p-2.5 text-xs border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Subject: {previewData.subject}
                        </span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                          Live Rendered
                        </span>
                      </div>
                      <iframe
                        srcDoc={previewData.rendered_html}
                        title="Live Rendered Email Preview"
                        className="w-full h-80 border-0 bg-white"
                      />
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleResetToDefault(editingTemplate)}
                className="text-xs text-amber-700 hover:text-amber-800 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to Default
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeEditModal}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSavingEdit}
                  onClick={handleSaveEdit}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Save Template
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Standalone Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  Email Preview: {previewData?.name || "Rendered Layout"}
                </h4>
                {previewData && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-mono">
                    Subject: {previewData.subject}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {isLoadingPreview ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="text-xs">Generating rendered preview...</span>
                </div>
              ) : previewData ? (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <iframe
                    srcDoc={previewData.rendered_html}
                    title="Student Email Preview"
                    className="w-full h-96 border-0 bg-white"
                  />
                </div>
              ) : null}
            </div>

            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-800/40">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPreviewModalOpen(false)}
                className="text-xs"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

