"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Eye, EyeOff, Save, UploadCloud, AlertCircle, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { adminApi, AdminWebsitePage } from "@/lib/api/admin";
import { LegalContent } from "@/components/public/LegalContent";
import toast from "react-hot-toast";

export default function EditWebsitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [page, setPage] = useState<AdminWebsitePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    setError("");
    adminApi.getWebsitePage(slug)
      .then((p) => {
        setPage(p);
        setTitle(p.title);
        setContent(p.content);
      })
      .catch((err: any) => setError(err.message || err.detail || "Failed to load this page."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const dirty = page ? title !== page.title || content !== page.content : false;

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const updated = await adminApi.updateWebsitePage(slug, { title, content });
      setPage(updated);
      toast.success("Draft saved.");
    } catch (err: any) {
      toast.error(err.message || err.detail || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;

    setUploadingImage(true);
    try {
      const { url } = await adminApi.uploadWebsitePageImage(file);
      const markdown = `![${file.name.replace(/\.[^.]+$/, "")}](${url})`;
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart ?? content.length;
        const end = textarea.selectionEnd ?? content.length;
        // A standalone image line needs its own blank lines around it to
        // parse correctly (LegalContent treats a whole-line image match as
        // its own block) - pad them in only where the surrounding text
        // doesn't already provide a blank line.
        const before = content.slice(0, start);
        const after = content.slice(end);
        const leadingGap = before.length === 0 || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
        const trailingGap = after.length === 0 || after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
        const insertion = `${leadingGap}${markdown}${trailingGap}`;
        const next = before + insertion + after;
        setContent(next);
        requestAnimationFrame(() => {
          textarea.focus();
          const caret = start + insertion.length;
          textarea.setSelectionRange(caret, caret);
        });
      } else {
        setContent((c) => (c ? `${c}\n\n${markdown}` : markdown));
      }
      toast.success("Image uploaded and inserted.");
    } catch (err: any) {
      toast.error(err.message || err.detail || "Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      // Publish always reflects the latest edited text, not whatever was
      // last saved - save first so "Publish" can't ship stale content.
      if (dirty) {
        await adminApi.updateWebsitePage(slug, { title, content });
      }
      const updated = await adminApi.publishWebsitePage(slug);
      setPage(updated);
      setTitle(updated.title);
      setContent(updated.content);
      toast.success("Published. The public page now shows this content.");
    } catch (err: any) {
      toast.error(err.message || err.detail || "Failed to publish.");
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setPublishing(true);
    try {
      const updated = await adminApi.unpublishWebsitePage(slug);
      setPage(updated);
      toast.success("Unpublished. The public page will show \"not published yet\".");
    } catch (err: any) {
      toast.error(err.message || err.detail || "Failed to unpublish.");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="p-6 max-w-2xl">
        <Link href="/admin-dashboard/website-content" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0B2545] mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Website Content
        </Link>
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error || "Page not found."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin-dashboard/website-content" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0B2545] mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Website Content
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#0B2545]">{page.title}</h1>
            <Badge
              variant="outline"
              className={
                page.status === "published"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }
            >
              {page.status === "published" ? "Published" : "Draft"}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            /{page.slug} &middot; Updated {new Date(page.updated_at).toLocaleString()}
            {page.updated_by_name ? ` by ${page.updated_by_name}` : ""}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
          <p className="text-sm font-semibold text-[#0B2545]">{preview ? "Preview" : "Edit"}</p>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPreview((v) => !v)}>
            {preview ? <><EyeOff className="w-3.5 h-3.5" /> Back to editor</> : <><Eye className="w-3.5 h-3.5" /> Preview</>}
          </Button>
        </div>

        <div className="p-5">
          {preview ? (
            <div className="border border-slate-200 rounded-lg p-6 bg-slate-50">
              <h2 className="text-2xl font-[900] text-[#0B2545] mb-1">{title || "Untitled"}</h2>
              <p className="text-xs text-slate-400 mb-6">This is how visitors will see this page once published.</p>
              <LegalContent content={content} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Page title" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700">Content</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleImageSelected}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-7 text-xs"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                    Insert Image
                  </Button>
                </div>
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write the page content here…"
                  className="min-h-[380px] font-mono text-[13px] leading-relaxed"
                />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Blank line = new paragraph &middot; <code className="bg-slate-100 px-1 rounded"># </code>/<code className="bg-slate-100 px-1 rounded">## </code> heading &middot;{" "}
                  <code className="bg-slate-100 px-1 rounded">- </code> bullet list &middot;{" "}
                  <code className="bg-slate-100 px-1 rounded">1. </code> numbered list &middot;{" "}
                  <code className="bg-slate-100 px-1 rounded">**bold**</code> &middot;{" "}
                  <code className="bg-slate-100 px-1 rounded">*italic*</code> &middot;{" "}
                  <code className="bg-slate-100 px-1 rounded">[text](https://url)</code> link &middot;{" "}
                  <code className="bg-slate-100 px-1 rounded">Insert Image</code> button adds a standalone image
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving || !dirty} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </Button>
          {page.status === "published" ? (
            <Button variant="outline" onClick={handleUnpublish} disabled={publishing} className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Unpublish
            </Button>
          ) : (
            <Button onClick={handlePublish} disabled={publishing} className="gap-2 bg-[#0B2545] hover:bg-[#0B2545]/90 text-white font-bold">
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              Publish
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
