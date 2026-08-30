"use client";

import React, { useState, useEffect } from "react";
import {
  Quote, Plus, Search, Edit, Trash2, Star, Eye, EyeOff, Loader2, MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminApi, AdminTestimonial, AdminTestimonialInput } from "@/lib/api/admin";
import toast from "react-hot-toast";

const EMPTY_FORM: AdminTestimonialInput = {
  name: "",
  role_title: "",
  quote: "",
  avatar_url: "",
  rating: 5,
  is_published: false,
  display_order: 0,
};

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<AdminTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTestimonial | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<AdminTestimonialInput>(EMPTY_FORM);

  const [deleteTarget, setDeleteTarget] = useState<AdminTestimonial | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async (search?: string) => {
    try {
      setLoading(true);
      const res = await adminApi.getTestimonials(search);
      setTestimonials(res);
    } catch (err) {
      console.error("Failed to load testimonials", err);
      toast.error("Failed to load testimonials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => loadData(searchTerm || undefined), 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const openCreate = () => {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (t: AdminTestimonial) => {
    setEditing(t);
    setFormData({
      name: t.name,
      role_title: t.role_title,
      quote: t.quote,
      avatar_url: t.avatar_url,
      rating: t.rating,
      is_published: t.is_published,
      display_order: t.display_order,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.quote.trim()) {
      toast.error("Name and quote are required.");
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await adminApi.updateTestimonial(editing.id, formData);
        toast.success("Testimonial updated.");
      } else {
        await adminApi.createTestimonial(formData);
        toast.success("Testimonial created.");
      }
      setModalOpen(false);
      loadData(searchTerm || undefined);
    } catch (err: any) {
      console.error("Failed to save testimonial", err);
      toast.error(err?.data?.detail || "Failed to save testimonial.");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePublish = async (t: AdminTestimonial) => {
    try {
      await adminApi.updateTestimonial(t.id, { is_published: !t.is_published });
      setTestimonials((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, is_published: !x.is_published } : x))
      );
      toast.success(t.is_published ? "Unpublished." : "Published.");
    } catch (err) {
      console.error("Failed to toggle publish", err);
      toast.error("Failed to update.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteTestimonial(deleteTarget.id);
      toast.success("Testimonial deleted.");
      setTestimonials((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete testimonial", err);
      toast.error("Failed to delete testimonial.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Quote className="w-6 h-6 text-primary" />
            Testimonials
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the student testimonials shown on the public homepage. Only published
            testimonials appear there.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add Testimonial
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>All Testimonials</CardTitle>
              <CardDescription>{testimonials.length} total</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
            </div>
          ) : testimonials.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Quote className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No testimonials yet.</p>
              <p className="text-sm mt-1">Add one to have it appear on the homepage once published.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Quote</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testimonials.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      {t.submitted_by_student ? (
                        <Badge variant="outline" className="text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-900">
                          Student{t.submitted_by_name ? ` · ${t.submitted_by_name}` : ""}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Admin</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{t.role_title || "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{t.quote}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-sm">{t.rating}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.is_published ? "success" : "secondary"}>
                        {t.is_published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(t)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => togglePublish(t)}>
                            {t.is_published ? (
                              <><EyeOff className="w-4 h-4 mr-2" /> Unpublish</>
                            ) : (
                              <><Eye className="w-4 h-4 mr-2" /> Publish</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(t)}
                            className="text-red-600 focus:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Testimonial" : "Add Testimonial"}</DialogTitle>
            <DialogDescription>
              Shown on the public homepage only while published.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ramesh Karki"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Role / Result</label>
                <Input
                  value={formData.role_title}
                  onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                  placeholder="Section Officer (Recommended)"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Quote *</label>
              <Textarea
                rows={4}
                value={formData.quote}
                onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                placeholder="What the student said..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Avatar URL (optional)</label>
                <Input
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Rating (1–5)</label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Display Order</label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-3 pb-2">
                <Switch
                  checked={!!formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
                <span className="text-sm font-medium">Published</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Create Testimonial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Testimonial</DialogTitle>
            <DialogDescription>
              This will permanently delete the testimonial from {deleteTarget?.name}. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
