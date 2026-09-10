"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Eye, EyeOff, GripVertical, Package as PackageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import toast from "react-hot-toast";
import {
  subscriptionsApi, SubscriptionPlan, SubscriptionPlanInput,
} from "@/lib/api/subscriptions";

const EMPTY_FORM: SubscriptionPlanInput = {
  name: "",
  description: "",
  duration: 30,
  duration_unit: "DAYS",
  price: "0",
  original_price: null,
  discount: "0",
  badge: "NONE",
  features: [],
  course: null,
  package_type: "SINGLE",
  eligible_courses: [],
  status: "INACTIVE",
  display_order: 0,
  is_flexible: false,
  allowed_preparation_count: 1,
};

const FEATURE_OPTIONS = [
  { key: "*", label: "Full Platform Access (all features)" },
  { key: "ai_tutor", label: "AI Tutor" },
  { key: "premium_materials", label: "Premium Study Materials" },
  { key: "advanced_mock_exam", label: "Advanced Mock Exams" },
  { key: "analytics", label: "Advanced Analytics" },
];

import { publicApi, PublicCourse } from "@/lib/api/public-api";

export default function AdminPackagesPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SubscriptionPlanInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      subscriptionsApi.adminListPlans(),
      publicApi.getCourses()
    ])
      .then(([planData, coursesData]) => {
        setPlans([...planData].sort((a, b) => a.display_order - b.display_order));
        if (coursesData) setCourses(coursesData);
      })
      .catch(() => toast.error("Failed to load packages."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, display_order: plans.length });
    setDialogOpen(true);
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      description: plan.description,
      duration: plan.duration,
      duration_unit: plan.duration_unit,
      price: plan.price,
      original_price: plan.original_price,
      discount: plan.discount,
      badge: plan.badge,
      features: plan.features,
      course: plan.course,
      package_type: plan.package_type,
      eligible_courses: plan.eligible_courses || [],
      status: plan.status,
      display_order: plan.display_order,
      is_flexible: plan.is_flexible,
      allowed_preparation_count: plan.allowed_preparation_count,
    });
    setDialogOpen(true);
  };

  const toggleFeature = (key: string) => {
    setForm((f) => ({
      ...f,
      features: f.features.includes(key) ? f.features.filter((k) => k !== key) : [...f.features, key],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Package name is required.");
      return;
    }
    
    // For SINGLE type, we still rely on course field if it's set, 
    // or maybe the user just selects one eligible course.
    // For MULTI/BUNDLE, ensure there's at least one eligible course.
    if (form.package_type !== "SINGLE" && form.eligible_courses.length === 0) {
      toast.error(`Please select at least one eligible course for ${form.package_type} packages.`);
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await subscriptionsApi.adminUpdatePlan(editingId, form);
        toast.success("Package updated.");
      } else {
        await subscriptionsApi.adminCreatePlan(form);
        toast.success("Package created.");
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast.error(err?.message || err?.detail || "Failed to save package.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (plan: SubscriptionPlan) => {
    const nextStatus = plan.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await subscriptionsApi.adminUpdatePlan(plan.id, { status: nextStatus });
      toast.success(nextStatus === "ACTIVE" ? "Package published." : "Package unpublished.");
      load();
    } catch {
      toast.error("Failed to update package status.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0B2545]">Packages</h1>
          <p className="text-sm text-slate-500">Manage the subscription packages students can purchase.</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-[#0B2545] hover:bg-[#0B2545]/90">
          <Plus className="w-4 h-4" /> Create Package
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-200 rounded-xl">
          <PackageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No packages yet. Create your first one to start selling access.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-500">
                <th className="px-5 py-3 font-medium">Package</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Duration</th>
                <th className="px-5 py-3 font-medium">Features</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-[#0B2545]">{plan.name}</div>
                    {plan.badge !== "NONE" && (
                      <Badge variant="outline" className="mt-1 text-[10px] uppercase">{plan.badge.replace("_", " ")}</Badge>
                    )}
                  </td>
                  <td className="px-5 py-4 font-medium text-[#0B2545]">
                    Rs. {plan.price}
                    {plan.original_price && (
                      <span className="ml-1.5 text-xs text-slate-400 line-through">Rs. {plan.original_price}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    <div className="font-medium">{plan.duration} {plan.duration_unit.toLowerCase()}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Type: <span className="font-semibold">{plan.package_type}</span>
                      {plan.package_type === "MULTI" && ` (Limit: ${plan.allowed_preparation_count})`}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-xs max-w-[220px]">
                    {plan.features.length ? plan.features.join(", ") : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <Badge className={plan.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700 border-none" : "bg-slate-100 text-slate-500 border-none"}>
                      {plan.status === "ACTIVE" ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right space-x-1">
                    <Button variant="outline" size="sm" onClick={() => togglePublish(plan)} className="gap-1.5">
                      {plan.status === "ACTIVE" ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {plan.status === "ACTIVE" ? "Unpublish" : "Publish"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(plan)} className="gap-1.5">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Package" : "Create Package"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. PSC Foundation" />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Price (NPR)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Original Price (optional)</Label>
                <Input
                  type="number"
                  value={form.original_price ?? ""}
                  onChange={(e) => setForm({ ...form, original_price: e.target.value || null })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Duration</Label>
                <Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>Duration Unit</Label>
                <Select value={form.duration_unit} onValueChange={(v) => setForm({ ...form, duration_unit: v as SubscriptionPlanInput["duration_unit"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAYS">Days</SelectItem>
                    <SelectItem value="WEEKS">Weeks</SelectItem>
                    <SelectItem value="MONTHS">Months</SelectItem>
                    <SelectItem value="YEAR">Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Package Type</Label>
                <Select value={form.package_type} onValueChange={(v) => setForm({ ...form, package_type: v as any, course: null })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINGLE">Single Preparation</SelectItem>
                    <SelectItem value="MULTI">Multi Preparation</SelectItem>
                    <SelectItem value="BUNDLE">Bundle (All Included)</SelectItem>
                    <SelectItem value="ALL_ACCESS">All Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.package_type === "MULTI" && (
                <div className="space-y-1.5">
                  <Label>Allowed Preparations</Label>
                  <Input type="number" min={1} value={form.allowed_preparation_count} onChange={(e) => setForm({ ...form, allowed_preparation_count: parseInt(e.target.value) || 1 })} />
                </div>
              )}
            </div>

            {form.package_type !== "ALL_ACCESS" && (
              <div className="space-y-1.5">
                <Label>Eligible Courses</Label>
                {courses.length === 0 ? (
                  <div className="text-xs text-slate-400">Loading courses...</div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 max-h-[200px] overflow-y-auto gap-1.5 border border-slate-200 rounded-lg p-3">
                      {courses.map((c) => {
                        const isSelected = form.package_type === "SINGLE"
                          ? form.course === c.id
                          : form.eligible_courses.includes(c.id);
                        const isCS = c.is_coming_soon;

                        return (
                          <label key={c.id} className={`flex items-start gap-2 text-sm cursor-pointer rounded p-1.5 ${isCS ? "hover:bg-amber-50" : "hover:bg-slate-50"}`}>
                            <input
                              type={form.package_type === "SINGLE" ? "radio" : "checkbox"}
                              name="eligible_courses"
                              checked={isSelected}
                              onChange={() => {
                                if (form.package_type === "SINGLE") {
                                  setForm({ ...form, course: c.id, eligible_courses: [c.id] });
                                } else {
                                  const newSelection = isSelected
                                    ? form.eligible_courses.filter((id) => id !== c.id)
                                    : [...form.eligible_courses, c.id];
                                  setForm({ ...form, eligible_courses: newSelection, course: null });
                                }
                              }}
                              className="mt-1 rounded border-slate-300"
                            />
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium flex items-center gap-1.5 flex-wrap ${isCS ? "text-amber-700" : ""}`}>
                                {c.title}
                                {isCS && (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-600 border border-amber-200 uppercase tracking-wide">
                                    Coming Soon
                                  </span>
                                )}
                              </div>
                              {c.exam && (
                                <div className="text-[10px] text-slate-400">
                                  {c.exam.category_name && `${c.exam.category_name} › `}
                                  {c.exam.parent_name && `${c.exam.parent_name} › `}
                                  {c.exam.title}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-400">
                      Amber-labelled courses are <span className="font-semibold text-amber-600">Coming Soon</span> — students cannot purchase them yet but you can pre-configure packages.
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Badge</Label>
              <Select value={form.badge} onValueChange={(v) => setForm({ ...form, badge: v as SubscriptionPlanInput["badge"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="POPULAR">Popular</SelectItem>
                  <SelectItem value="BEST_VALUE">Best Value</SelectItem>
                  <SelectItem value="RECOMMENDED">Recommended</SelectItem>
                  <SelectItem value="LIMITED_OFFER">Limited Offer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Included Features</Label>
              <div className="grid grid-cols-1 gap-2 border border-slate-200 rounded-lg p-3">
                {FEATURE_OPTIONS.map((f) => (
                  <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.features.includes(f.key)}
                      onChange={() => toggleFeature(f.key)}
                      className="rounded border-slate-300"
                    />
                    {f.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                These keys gate access to Practice, Mock Exams, Study Materials, AI Tutor, and Games
                once package enforcement is turned on in Admin Settings.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Display Order</Label>
              <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#0B2545] hover:bg-[#0B2545]/90">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? "Save Changes" : "Create Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
