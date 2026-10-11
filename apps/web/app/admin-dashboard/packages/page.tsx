"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Eye,
  EyeOff,
  Package as PackageIcon,
  Loader2,
  Check,
  X,
  Search,
  BookOpen,
  Layers,
  Sparkles,
  Trash2,
  Copy,
  Users,
  BarChart3,
  Infinity as InfinityIcon,
  Clock,
  GraduationCap,
  FileText,
  Bot,
  Zap,
  Target,
  Download,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import {
  subscriptionsApi,
  SubscriptionPlan,
  SubscriptionPlanInput,
  PackageSubscriber,
  PackageUsageStats,
} from "@/lib/api/subscriptions";
import { publicApi, PublicCourse } from "@/lib/api/public-api";
import { adminSyllabusApi, AdminExamCategory, AdminPosition } from "@/lib/api/admin-syllabus";

const EMPTY_FORM: SubscriptionPlanInput = {
  name: "",
  slug: "",
  description: "",
  has_expiry: true,
  duration: 30,
  duration_unit: "DAYS",
  price: "0",
  original_price: null,
  discount: "0",
  badge: "NONE",
  display_badge: "",
  features: [],
  course: null,
  package_type: "SINGLE",
  course_access_type: "SELECTED",
  eligible_courses: [],
  allowed_preparation_count: 1,
  is_flexible: false,
  exam_quotas: {
    past_year: { enabled: true, attempts: 10 },
    model: { enabled: true, attempts: 5 },
    live: { enabled: true, attempts: 2 },
    topicwise: { enabled: true, attempts: -1 },
  },
  free_mock_exams: [],
  free_mock_attempts: 0,
  notes_access_type: "COURSE_NOTES",
  can_download_notes: false,
  practice_enabled: true,
  practice_question_limit: -1,
  ai_tutor_enabled: true,
  ai_credits: 5000,
  ai_daily_limit: 20,
  ai_monthly_limit: 0,
  reset_frequency: "NEVER",
  status: "ACTIVE",
  is_published: true,
  is_featured: false,
  terms: "",
  display_order: 0,
};

const FEATURE_OPTIONS = [
  { key: "*", label: "Full Platform Access (all features)" },
  { key: "ai_tutor", label: "AI Tutor" },
  { key: "premium_materials", label: "Premium Study Materials" },
  { key: "advanced_mock_exam", label: "Advanced Mock Exams" },
  { key: "analytics", label: "Advanced Analytics" },
];

function getCourseLevel(
  course: PublicCourse,
  academicExamById: Map<number, AdminPosition>
): AdminPosition | null {
  if (!course.exam || course.status !== "published") return null;
  let exam = academicExamById.get(course.exam.id);
  if (!exam) return null;

  const visited = new Set<number>();
  while (true) {
    if (exam.status !== "active" || !exam.is_active) return null;
    if (exam.parent === null) return exam;
    if (visited.has(exam.id)) return null;
    visited.add(exam.id);
    const parent = academicExamById.get(exam.parent);
    if (!parent) return null;
    exam = parent;
  }
}

export default function AdminPackagesPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [academicExams, setAcademicExams] = useState<AdminPosition[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Package CRUD & Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SubscriptionPlanInput>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<"basic" | "validity" | "courses" | "exams" | "notes_ai">("basic");
  const [saving, setSaving] = useState(false);
  const [togglingPlanId, setTogglingPlanId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [planPendingDelete, setPlanPendingDelete] = useState<SubscriptionPlan | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<number | null>(null);

  // Subscribers modal
  const [subscribersDialogOpen, setSubscribersDialogOpen] = useState(false);
  const [selectedPlanForSubs, setSelectedPlanForSubs] = useState<SubscriptionPlan | null>(null);
  const [subscribers, setSubscribers] = useState<PackageSubscriber[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // Usage stats modal
  const [usageStatsDialogOpen, setUsageStatsDialogOpen] = useState(false);
  const [selectedPlanForUsage, setSelectedPlanForUsage] = useState<SubscriptionPlan | null>(null);
  const [usageStats, setUsageStats] = useState<PackageUsageStats | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // Filter & search state
  const [tableSearch, setTableSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Hierarchy filter inside the course picker inside modal
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const load = () => {
    setLoading(true);
    Promise.all([
      subscriptionsApi.adminListPlans(),
      publicApi.getCourses(),
      adminSyllabusApi.getCategories().catch(() => [] as AdminExamCategory[]),
      adminSyllabusApi.getPositions().catch(() => [] as AdminPosition[]),
    ])
      .then(([planData, coursesData, categoriesData, examsData]) => {
        setPlans([...planData].sort((a, b) => a.display_order - b.display_order));
        if (coursesData) setCourses(coursesData);
        setAcademicExams(examsData);
        if (categoriesData && categoriesData.length > 0) {
          const names = categoriesData
            .filter((cat) => cat.is_active)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((cat) => cat.name);
          setAllCategories(names);
        }
      })
      .catch(() => toast.error("Failed to load packages."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const academicExamById = useMemo(
    () => new Map(academicExams.map((exam) => [exam.id, exam])),
    [academicExams]
  );

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && p.package_type !== typeFilter) return false;
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.price.includes(q)
        );
      }
      return true;
    });
  }, [plans, statusFilter, typeFilter, tableSearch]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setActiveTab("basic");
    setDialogOpen(true);
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      slug: plan.slug || "",
      description: plan.description,
      has_expiry: plan.has_expiry ?? true,
      duration: plan.duration ?? 30,
      duration_unit: plan.duration_unit ?? "DAYS",
      price: plan.price,
      original_price: plan.original_price,
      discount: plan.discount,
      badge: plan.badge,
      display_badge: plan.display_badge || "",
      features: plan.features || [],
      course: plan.course,
      package_type: plan.package_type,
      course_access_type: plan.course_access_type || "SELECTED",
      eligible_courses: plan.eligible_courses || [],
      allowed_preparation_count: plan.allowed_preparation_count || 1,
      is_flexible: plan.is_flexible || false,
      exam_quotas: plan.exam_quotas || {
        past_year: { enabled: true, attempts: 10 },
        model: { enabled: true, attempts: 5 },
        live: { enabled: true, attempts: 2 },
        topicwise: { enabled: true, attempts: -1 },
      },
      free_mock_exams: plan.free_mock_exams || [],
      free_mock_attempts: plan.free_mock_attempts || 0,
      notes_access_type: plan.notes_access_type || "COURSE_NOTES",
      can_download_notes: plan.can_download_notes || false,
      practice_enabled: plan.practice_enabled ?? true,
      practice_question_limit: plan.practice_question_limit ?? -1,
      ai_tutor_enabled: plan.ai_tutor_enabled ?? true,
      ai_credits: plan.ai_credits ?? 5000,
      ai_daily_limit: plan.ai_daily_limit ?? 20,
      ai_monthly_limit: plan.ai_monthly_limit ?? 0,
      reset_frequency: plan.reset_frequency || "NEVER",
      status: plan.status,
      is_published: plan.is_published ?? true,
      is_featured: plan.is_featured ?? false,
      terms: plan.terms || "",
      display_order: plan.display_order,
    });
    setActiveTab("basic");
    setDialogOpen(true);
  };

  const applyPreset = (preset: "FREE" | "PREMIUM" | "PRO") => {
    if (preset === "FREE") {
      setForm((prev) => ({
        ...prev,
        name: "Free Preparation Tier",
        price: "0",
        original_price: null,
        discount: "0",
        badge: "NONE",
        has_expiry: false,
        duration: null,
        duration_unit: null,
        exam_quotas: {
          past_year: { enabled: false, attempts: 0 },
          model: { enabled: false, attempts: 0 },
          live: { enabled: false, attempts: 0 },
          topicwise: { enabled: true, attempts: 3 },
        },
        free_mock_attempts: 2,
        notes_access_type: "NONE",
        can_download_notes: false,
        practice_enabled: true,
        practice_question_limit: 50,
        ai_tutor_enabled: true,
        ai_credits: 200,
        ai_daily_limit: 5,
      }));
      toast.success("Applied Free Tier template.");
    } else if (preset === "PREMIUM") {
      setForm((prev) => ({
        ...prev,
        name: "Premium Preparation",
        price: "1999",
        original_price: "2999",
        discount: "33",
        badge: "POPULAR",
        has_expiry: true,
        duration: 90,
        duration_unit: "DAYS",
        exam_quotas: {
          past_year: { enabled: true, attempts: 15 },
          model: { enabled: true, attempts: 10 },
          live: { enabled: true, attempts: 5 },
          topicwise: { enabled: true, attempts: -1 },
        },
        free_mock_attempts: 5,
        notes_access_type: "COURSE_NOTES",
        can_download_notes: false,
        practice_enabled: true,
        practice_question_limit: -1,
        ai_tutor_enabled: true,
        ai_credits: 5000,
        ai_daily_limit: 30,
      }));
      toast.success("Applied Premium Package template.");
    } else if (preset === "PRO") {
      setForm((prev) => ({
        ...prev,
        name: "Pro All-Access Package",
        price: "3999",
        original_price: "5999",
        discount: "33",
        badge: "BEST_VALUE",
        package_type: "ALL_ACCESS",
        course_access_type: "ALL_ACCESS",
        has_expiry: true,
        duration: 180,
        duration_unit: "DAYS",
        exam_quotas: {
          past_year: { enabled: true, attempts: -1 },
          model: { enabled: true, attempts: -1 },
          live: { enabled: true, attempts: -1 },
          topicwise: { enabled: true, attempts: -1 },
        },
        free_mock_attempts: -1,
        notes_access_type: "ALL",
        can_download_notes: true,
        practice_enabled: true,
        practice_question_limit: -1,
        ai_tutor_enabled: true,
        ai_credits: 25000,
        ai_daily_limit: 100,
      }));
      toast.success("Applied Pro All-Access template.");
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Package name is required.");
      return;
    }

    if (form.package_type === "SINGLE") {
      const selectedId = form.course || (form.eligible_courses.length === 1 ? form.eligible_courses[0] : null);
      if (!selectedId) {
        toast.error("Please select a preparation course for this Single Package.");
        return;
      }
      form.course = selectedId;
      form.eligible_courses = [selectedId];
    } else if (form.package_type === "MULTI" || form.package_type === "BUNDLE") {
      if (form.eligible_courses.length === 0) {
        toast.error(`Please select at least one eligible preparation for ${form.package_type} packages.`);
        return;
      }
    } else if (form.package_type === "ALL_ACCESS") {
      form.course = null;
      form.eligible_courses = [];
    }

    setSaving(true);
    try {
      if (editingId) {
        await subscriptionsApi.adminUpdatePlan(editingId, form);
        toast.success("Package updated successfully.");
      } else {
        await subscriptionsApi.adminCreatePlan(form);
        toast.success("Package created successfully.");
      }
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save package.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const duplicatePlan = async (plan: SubscriptionPlan) => {
    setDuplicatingId(plan.id);
    try {
      await subscriptionsApi.duplicatePlan(plan.id);
      toast.success(`Duplicated "${plan.name}".`);
      load();
    } catch {
      toast.error("Failed to duplicate package.");
    } finally {
      setDuplicatingId(null);
    }
  };

  const togglePublish = async (plan: SubscriptionPlan) => {
    const nextStatus = plan.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setTogglingPlanId(plan.id);
    try {
      await subscriptionsApi.toggleStatus(plan.id, nextStatus);
      toast.success(nextStatus === "ACTIVE" ? "Package published." : "Package deactivated.");
      load();
    } catch {
      toast.error("Failed to update package status.");
    } finally {
      setTogglingPlanId(null);
    }
  };

  const deletePlan = async () => {
    if (!planPendingDelete) return;
    setDeletingPlanId(planPendingDelete.id);
    try {
      const result = await subscriptionsApi.adminDeletePlan(planPendingDelete.id);
      toast.success(result.archived ? "Package archived safely." : "Package deleted.");
      setPlanPendingDelete(null);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete package.");
    } finally {
      setDeletingPlanId(null);
    }
  };

  const viewSubscribers = async (plan: SubscriptionPlan) => {
    setSelectedPlanForSubs(plan);
    setSubscribersDialogOpen(true);
    setLoadingSubs(true);
    try {
      const data = await subscriptionsApi.getSubscribers(plan.id);
      setSubscribers(data);
    } catch {
      toast.error("Failed to load subscribers.");
    } finally {
      setLoadingSubs(false);
    }
  };

  const viewUsageStats = async (plan: SubscriptionPlan) => {
    setSelectedPlanForUsage(plan);
    setUsageStatsDialogOpen(true);
    setLoadingUsage(true);
    try {
      const data = await subscriptionsApi.getUsageStats(plan.id);
      setUsageStats(data);
    } catch {
      toast.error("Failed to load usage statistics.");
    } finally {
      setLoadingUsage(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <PackageIcon className="w-6 h-6 text-[#0B2545]" /> Package &amp; Subscription Builder
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Dynamic entitlement engine: configure courses, exam quotas, free mock tests, notes, and AI credits with zero hardcoding.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={openCreate}
            className="gap-2 bg-[#0B2545] hover:bg-[#0B2545]/90 shrink-0 shadow-sm text-white"
          >
            <Plus className="w-4 h-4" /> Create Package
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search packages by name or price..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Published (Active)</SelectItem>
              <SelectItem value="INACTIVE">Draft (Inactive)</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder="Package Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Access Types</SelectItem>
              <SelectItem value="SINGLE">Single Course</SelectItem>
              <SelectItem value="MULTI">Multi Course</SelectItem>
              <SelectItem value="BUNDLE">Course Bundle</SelectItem>
              <SelectItem value="ALL_ACCESS">All Access</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Packages Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0B2545]" />
          <p className="text-xs text-slate-500 mt-2">Loading package configurations...</p>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center space-y-3">
          <PackageIcon className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-800">No packages found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {tableSearch || statusFilter !== "ALL"
              ? "Try adjusting your search terms or status filters."
              : "Get started by building your first package with configurable quotas and entitlements."}
          </p>
          <Button onClick={openCreate} className="bg-[#0B2545] text-xs h-9">
            <Plus className="w-3.5 h-3.5 mr-1" /> Create Package
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-5 py-3.5">Package Details</th>
                  <th className="px-5 py-3.5">Price (NPR)</th>
                  <th className="px-5 py-3.5">Validity &amp; Reset</th>
                  <th className="px-5 py-3.5">Configured Entitlements</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPlans.map((plan) => {
                  const quotas = plan.exam_quotas || {};
                  return (
                    <tr key={plan.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4 min-w-[260px]">
                        <div className="flex items-start gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{plan.name}</span>
                              {plan.badge !== "NONE" && (
                                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 font-semibold">
                                  {plan.badge.replace("_", " ")}
                                </Badge>
                              )}
                              {plan.is_featured && (
                                <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold">
                                  Featured
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{plan.description || "No description configured."}</p>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                {plan.package_type.replace("_", " ")}
                              </span>
                              {plan.slug && <span className="text-slate-400">slug: {plan.slug}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-base font-bold text-[#0B2545]">Rs. {plan.price}</div>
                        {plan.original_price && (
                          <div className="text-xs text-slate-400 line-through">Rs. {plan.original_price}</div>
                        )}
                        {parseFloat(plan.discount || "0") > 0 && (
                          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                            {plan.discount}% off
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-xs">
                        {plan.has_expiry ? (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{plan.duration} {plan.duration_unit?.toLowerCase()}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded w-fit border border-emerald-200">
                            <InfinityIcon className="w-3.5 h-3.5" /> Quota / Lifetime
                          </div>
                        )}
                        <div className="text-[11px] text-slate-400 mt-1">
                          Reset: <span className="text-slate-600 font-medium">{plan.reset_frequency || "NEVER"}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {/* Exam limits badges */}
                          {quotas.model && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">
                              Model: {quotas.model.attempts === -1 ? "Unlimited" : quotas.model.attempts}
                            </span>
                          )}
                          {quotas.past_year && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px]">
                              Past Year: {quotas.past_year.attempts === -1 ? "Unlimited" : quotas.past_year.attempts}
                            </span>
                          )}
                          {quotas.topicwise && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px]">
                              Topicwise: {quotas.topicwise.attempts === -1 ? "Unlimited" : quotas.topicwise.attempts}
                            </span>
                          )}
                          {/* Free Mock attempts */}
                          {plan.free_mock_attempts !== undefined && plan.free_mock_attempts > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                              Free Mocks: {plan.free_mock_attempts}
                            </span>
                          )}
                          {/* AI credits */}
                          {plan.ai_tutor_enabled && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                              AI: {plan.ai_credits === -1 ? "Unlimited" : `${plan.ai_credits} cr`}
                            </span>
                          )}
                          {/* Notes */}
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                            Notes: {plan.notes_access_type}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <Badge
                          className={
                            plan.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800 border-none font-medium hover:bg-emerald-200"
                              : plan.status === "ARCHIVED"
                              ? "bg-slate-200 text-slate-600 border-none font-medium"
                              : "bg-slate-100 text-slate-500 border-none font-medium"
                          }
                        >
                          {plan.status === "ACTIVE" ? "Published" : plan.status === "ARCHIVED" ? "Archived" : "Draft"}
                        </Badge>
                      </td>

                      <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewSubscribers(plan)}
                          title="View Subscribers"
                          className="h-8 text-xs text-slate-600 hover:text-slate-900"
                        >
                          <Users className="w-3.5 h-3.5 mr-1" /> Subscribers
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewUsageStats(plan)}
                          title="View Usage Stats"
                          className="h-8 text-xs text-slate-600 hover:text-slate-900"
                        >
                          <BarChart3 className="w-3.5 h-3.5 mr-1" /> Stats
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => duplicatePlan(plan)}
                          disabled={duplicatingId === plan.id}
                          title="Duplicate package"
                          className="h-8 text-xs border-slate-200 text-slate-600 hover:text-slate-900"
                        >
                          {duplicatingId === plan.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePublish(plan)}
                          disabled={togglingPlanId === plan.id}
                          className="h-8 text-xs border-slate-200"
                        >
                          {togglingPlanId === plan.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : plan.status === "ACTIVE" ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 mr-1 text-slate-500" /> Unpublish
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Publish
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(plan)}
                          className="h-8 text-xs border-slate-300 hover:border-slate-400"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPlanPendingDelete(plan)}
                          disabled={deletingPlanId === plan.id}
                          className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Package Builder Dialog (Modal) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl w-full max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white text-slate-900 shadow-2xl rounded-xl border border-slate-200">
          <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 shrink-0 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <PackageIcon className="w-5 h-5 text-[#0B2545]" />
                {editingId ? "Edit Subscription Package" : "Create Subscription Package"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Build configurable packages: set pricing, duration, courses, mock quotas, notes access, and AI tutor credits.
              </DialogDescription>
            </div>

            {/* Quick Templates Buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Presets:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("FREE")}
                className="h-7 text-[11px] px-2 py-0 border-slate-300 hover:bg-slate-100"
              >
                Free Tier
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("PREMIUM")}
                className="h-7 text-[11px] px-2 py-0 border-amber-300 text-amber-800 hover:bg-amber-50"
              >
                Premium
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("PRO")}
                className="h-7 text-[11px] px-2 py-0 border-indigo-300 text-indigo-800 hover:bg-indigo-50"
              >
                Pro All-Access
              </Button>
            </div>
          </DialogHeader>

          {/* Builder Navigation Tabs */}
          <div className="flex border-b border-slate-200 px-6 bg-slate-50/40 text-xs font-semibold">
            {[
              { id: "basic", label: "Basic Info & Pricing" },
              { id: "validity", label: "Validity & Resets" },
              { id: "courses", label: "Course Access" },
              { id: "exams", label: "Exam Quotas & Mocks" },
              { id: "notes_ai", label: "Notes & AI Tutor" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                className={`py-2.5 px-3 border-b-2 font-medium transition-colors ${
                  activeTab === t.id
                    ? "border-[#0B2545] text-[#0B2545] font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Builder Body Content */}
          <div className="overflow-y-auto px-6 py-5 space-y-6 flex-1">
            {/* TAB 1: BASIC INFO & PRICING */}
            {activeTab === "basic" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Package Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Civil Sub-Engineer Ultimate Preparation"
                      className="font-medium h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Slug / Internal Code (Optional)
                    </Label>
                    <Input
                      value={form.slug || ""}
                      onChange={(e) => setForm({ ...form, slug: e.target.value || null })}
                      placeholder="e.g. civil-sub-eng-pro"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Comprehensive access including video lectures, mock test attempts, and AI Tutor coaching."
                    rows={2}
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Price in NPR <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="e.g. 1999"
                      className="h-9 text-xs font-bold text-slate-900"
                    />
                    <span className="text-[10px] text-slate-400">Set 0 for free package.</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Original / Strike-through Price
                    </Label>
                    <Input
                      type="number"
                      value={form.original_price ?? ""}
                      onChange={(e) => setForm({ ...form, original_price: e.target.value || null })}
                      placeholder="e.g. 2999"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Discount %</Label>
                    <Input
                      type="number"
                      value={form.discount}
                      onChange={(e) => setForm({ ...form, discount: e.target.value })}
                      placeholder="e.g. 30"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Visual Badge</Label>
                    <Select
                      value={form.badge}
                      onValueChange={(val: any) => setForm({ ...form, badge: val })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Badge" />
                      </SelectTrigger>
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
                    <Label className="text-xs font-semibold text-slate-700">Custom Badge Text</Label>
                    <Input
                      value={form.display_badge || ""}
                      onChange={(e) => setForm({ ...form, display_badge: e.target.value })}
                      placeholder="e.g. Early Bird"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Display Order</Label>
                    <Input
                      type="number"
                      value={form.display_order}
                      onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.status === "ACTIVE"}
                      onChange={(e) => setForm({ ...form, status: e.target.checked ? "ACTIVE" : "INACTIVE" })}
                      className="rounded border-slate-300 text-[#0B2545] focus:ring-[#0B2545]"
                    />
                    <span>Active (Available for student purchase)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_featured ?? false}
                      onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                      className="rounded border-slate-300 text-[#0B2545] focus:ring-[#0B2545]"
                    />
                    <span>Mark as Featured Package</span>
                  </label>
                </div>
              </div>
            )}

            {/* TAB 2: VALIDITY & RESET POLICIES */}
            {activeTab === "validity" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#0B2545]" /> Package Expiry Policy
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Choose whether this package expires after a fixed duration or remains active on a quota/lifetime basis.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.has_expiry}
                        onChange={(e) => setForm({ ...form, has_expiry: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-[#0B2545]"></div>
                    </label>
                  </div>

                  {form.has_expiry ? (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Duration Count</Label>
                        <Input
                          type="number"
                          value={form.duration ?? 30}
                          onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 1 })}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Duration Unit</Label>
                        <Select
                          value={form.duration_unit || "DAYS"}
                          onValueChange={(val: any) => setForm({ ...form, duration_unit: val })}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DAYS">Days</SelectItem>
                            <SelectItem value="WEEKS">Weeks</SelectItem>
                            <SelectItem value="MONTHS">Months</SelectItem>
                            <SelectItem value="YEAR">Years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                      <InfinityIcon className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>
                        <strong>Quota-Only / Lifetime Access:</strong> Student access is determined entirely by remaining quotas and entitlements. No forced day-based expiry.
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-semibold text-xs text-slate-800">Quota Reset Frequency</h4>
                  <p className="text-[11px] text-slate-500">
                    For resettable quotas, choose how often allowances refresh. Lifetime quotas never reset automatically.
                  </p>
                  <Select
                    value={form.reset_frequency || "NEVER"}
                    onValueChange={(val: any) => setForm({ ...form, reset_frequency: val })}
                  >
                    <SelectTrigger className="h-9 text-xs max-w-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEVER">Never (Lifetime Allowance)</SelectItem>
                      <SelectItem value="DAILY">Daily Reset</SelectItem>
                      <SelectItem value="WEEKLY">Weekly Reset</SelectItem>
                      <SelectItem value="MONTHLY">Monthly Reset</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Terms &amp; Restrictions</Label>
                  <Textarea
                    value={form.terms || ""}
                    onChange={(e) => setForm({ ...form, terms: e.target.value })}
                    placeholder="e.g. Quotas are personal and non-transferable. Attempt limits apply to the current examination calendar."
                    rows={2}
                    className="text-xs"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: COURSE ACCESS */}
            {activeTab === "courses" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Package Preparation Type</Label>
                  <Select
                    value={form.package_type}
                    onValueChange={(val: any) => setForm({ ...form, package_type: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE">Single Preparation (grants 1 course)</SelectItem>
                      <SelectItem value="MULTI">Multi Preparation (student selects up to N preparations)</SelectItem>
                      <SelectItem value="BUNDLE">Curated Course Bundle (grants all selected courses)</SelectItem>
                      <SelectItem value="ALL_ACCESS">All Access (grants all platform preparations)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.package_type === "MULTI" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Allowed Preparation Choices Count
                    </Label>
                    <Input
                      type="number"
                      value={form.allowed_preparation_count}
                      onChange={(e) => setForm({ ...form, allowed_preparation_count: parseInt(e.target.value) || 1 })}
                      className="h-9 text-xs max-w-xs"
                      min={1}
                    />
                  </div>
                )}

                {form.package_type !== "ALL_ACCESS" && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700">
                        {form.package_type === "SINGLE" ? "Select Associated Course:" : "Eligible Preparation Courses:"}
                      </Label>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Selected: {form.eligible_courses.length}
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1.5 bg-slate-50/30">
                      {courses.map((c) => {
                        const isSelected = form.eligible_courses.includes(c.id) || form.course === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              if (form.package_type === "SINGLE") {
                                setForm({ ...form, course: c.id, eligible_courses: [c.id] });
                              } else {
                                const next = isSelected
                                  ? form.eligible_courses.filter((id) => id !== c.id)
                                  : [...form.eligible_courses, c.id];
                                setForm({ ...form, eligible_courses: next });
                              }
                            }}
                            className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors text-xs ${
                              isSelected
                                ? "bg-[#0B2545]/10 border border-[#0B2545]/30 text-[#0B2545] font-semibold"
                                : "hover:bg-slate-100 border border-transparent text-slate-700"
                            }`}
                          >
                            <span>{c.title}</span>
                            {isSelected && <Check className="w-4 h-4 text-[#0B2545]" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: EXAM QUOTAS & MOCKS */}
            {activeTab === "exams" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Configure attempt allowances per examination category. Enter <strong>-1</strong> for Unlimited attempts.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: "model", label: "Model Mock Exams" },
                    { key: "past_year", label: "Past Year Question Exams" },
                    { key: "live", label: "Live Scheduled Exams" },
                    { key: "topicwise", label: "Topicwise Tests" },
                  ].map((cat) => {
                    const quota = form.exam_quotas?.[cat.key] || { enabled: true, attempts: 5 };
                    return (
                      <div key={cat.key} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-slate-800">{cat.label}</Label>
                          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={quota.enabled ?? true}
                              onChange={(e) => {
                                const nextQuotas = { ...form.exam_quotas };
                                nextQuotas[cat.key] = { ...quota, enabled: e.target.checked };
                                setForm({ ...form, exam_quotas: nextQuotas });
                              }}
                              className="rounded border-slate-300 text-[#0B2545]"
                            />
                            <span>Enabled</span>
                          </label>
                        </div>

                        {quota.enabled && (
                          <div className="flex items-center gap-2 pt-1">
                            <Input
                              type="number"
                              value={quota.attempts}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                const nextQuotas = { ...form.exam_quotas };
                                nextQuotas[cat.key] = { ...quota, attempts: isNaN(val) ? 0 : val };
                                setForm({ ...form, exam_quotas: nextQuotas });
                              }}
                              className="h-8 text-xs font-semibold max-w-[120px]"
                            />
                            <span className="text-[11px] text-slate-400">
                              {quota.attempts === -1 ? "(Unlimited)" : "attempts"}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const nextQuotas = { ...form.exam_quotas };
                                nextQuotas[cat.key] = { ...quota, attempts: -1 };
                                setForm({ ...form, exam_quotas: nextQuotas });
                              }}
                              className="h-8 text-[11px] px-2 ml-auto"
                            >
                              Set Unlimited
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Free Mock Tests Included */}
                <div className="p-4 rounded-xl border border-slate-200 bg-amber-50/30 space-y-2">
                  <h4 className="font-semibold text-xs text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" /> Free Mock Exam Allowance
                  </h4>
                  <p className="text-[11px] text-amber-800/80">
                    Number of included mock exams that can be taken free of charge under this package (-1 for unlimited).
                  </p>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      value={form.free_mock_attempts || 0}
                      onChange={(e) => setForm({ ...form, free_mock_attempts: parseInt(e.target.value) || 0 })}
                      className="h-8 text-xs max-w-[140px]"
                    />
                    <span className="text-xs text-slate-500">free attempts included</span>
                  </div>
                </div>

                {/* Practice Questions Limit */}
                <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-[#0B2545]" /> Practice Questions Engine
                    </h4>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.practice_enabled ?? true}
                        onChange={(e) => setForm({ ...form, practice_enabled: e.target.checked })}
                        className="rounded border-slate-300 text-[#0B2545]"
                      />
                      <span>Enable Practice</span>
                    </label>
                  </div>
                  {form.practice_enabled && (
                    <div className="flex items-center gap-3 pt-1">
                      <Input
                        type="number"
                        value={form.practice_question_limit ?? -1}
                        onChange={(e) => setForm({ ...form, practice_question_limit: parseInt(e.target.value) || 0 })}
                        className="h-8 text-xs max-w-[140px]"
                      />
                      <span className="text-xs text-slate-500">
                        {form.practice_question_limit === -1 ? "(Unlimited Questions)" : "questions quota"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: NOTES & AI TUTOR */}
            {activeTab === "notes_ai" && (
              <div className="space-y-4">
                {/* Notes & Study Materials */}
                <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#0B2545]" /> Notes &amp; Study Materials Access
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Notes Scope</Label>
                      <Select
                        value={form.notes_access_type || "COURSE_NOTES"}
                        onValueChange={(val: any) => setForm({ ...form, notes_access_type: val })}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">No Notes Access</SelectItem>
                          <SelectItem value="COURSE_NOTES">Included Course Notes</SelectItem>
                          <SelectItem value="ALL">All Eligible Notes (Platform-wide)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center pt-6">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.can_download_notes ?? false}
                          onChange={(e) => setForm({ ...form, can_download_notes: e.target.checked })}
                          className="rounded border-slate-300 text-[#0B2545]"
                        />
                        <span>Allow Notes PDF Download</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* AI Tutor Credits */}
                <div className="p-4 rounded-xl border border-slate-200 space-y-3 bg-emerald-50/20">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-xs text-emerald-950 flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-emerald-700" /> AI Tutor Credits &amp; Token Allowance
                    </h4>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.ai_tutor_enabled ?? true}
                        onChange={(e) => setForm({ ...form, ai_tutor_enabled: e.target.checked })}
                        className="rounded border-slate-300 text-[#0B2545]"
                      />
                      <span>AI Tutor Enabled</span>
                    </label>
                  </div>

                  {form.ai_tutor_enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Total Credits Allowance</Label>
                        <Input
                          type="number"
                          value={form.ai_credits ?? 5000}
                          onChange={(e) => setForm({ ...form, ai_credits: parseInt(e.target.value) || 0 })}
                          className="h-8 text-xs font-semibold"
                        />
                        <span className="text-[10px] text-slate-400">-1 for Unlimited</span>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Daily Message Limit</Label>
                        <Input
                          type="number"
                          value={form.ai_daily_limit ?? 20}
                          onChange={(e) => setForm({ ...form, ai_daily_limit: parseInt(e.target.value) || 0 })}
                          className="h-8 text-xs"
                        />
                        <span className="text-[10px] text-slate-400">0 for default setting</span>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Monthly Limit</Label>
                        <Input
                          type="number"
                          value={form.ai_monthly_limit ?? 0}
                          onChange={(e) => setForm({ ...form, ai_monthly_limit: parseInt(e.target.value) || 0 })}
                          className="h-8 text-xs"
                        />
                        <span className="text-[10px] text-slate-400">0 for unlimited</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <DialogFooter className="px-6 py-3 border-t border-slate-200 bg-slate-50/70 shrink-0 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white text-xs gap-1.5 font-bold px-5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {editingId ? "Save Package Changes" : "Create Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Package Subscribers Modal */}
      <Dialog open={subscribersDialogOpen} onOpenChange={setSubscribersDialogOpen}>
        <DialogContent className="max-w-3xl w-full max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white text-slate-900 shadow-2xl rounded-xl border border-slate-200">
          <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-slate-50/70">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-[#0B2545]" /> Subscribers — {selectedPlanForSubs?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              List of all active and historical student subscriptions attached to this package.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto px-6 py-4 flex-1">
            {loadingSubs ? (
              <div className="py-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0B2545]" />
                <p className="text-xs text-slate-500 mt-2">Loading subscribers...</p>
              </div>
            ) : subscribers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No subscribers found for this package.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Source</th>
                      <th className="py-2.5 px-3">Start Date</th>
                      <th className="py-2.5 px-3">Expiry Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subscribers.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{s.student_name}</div>
                          <div className="text-[11px] text-slate-400">{s.student_email}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className={`text-[10px] ${s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100'}`}>
                            {s.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {s.source === "ADMIN_GRANT" ? "Admin Granted" : "Customer Payment"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {s.start_date ? new Date(s.start_date).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {s.expiry_date ? new Date(s.expiry_date).toLocaleDateString() : <span className="text-emerald-700 font-semibold">Lifetime</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-3 border-t border-slate-200 bg-slate-50/50">
            <Button size="sm" variant="outline" onClick={() => setSubscribersDialogOpen(false)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Package Usage Stats Modal */}
      <Dialog open={usageStatsDialogOpen} onOpenChange={setUsageStatsDialogOpen}>
        <DialogContent className="max-w-md w-full p-6 bg-white text-slate-900 shadow-2xl rounded-xl border border-slate-200">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#0B2545]" /> Usage Stats — {selectedPlanForUsage?.name}
            </DialogTitle>
          </DialogHeader>

          {loadingUsage ? (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0B2545]" />
            </div>
          ) : usageStats ? (
            <div className="space-y-3 py-2 text-xs">
              <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Active Subscribers:</span>
                <span className="font-bold text-slate-900">{usageStats.active_subscribers}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Approved Purchases:</span>
                <span className="font-bold text-emerald-700">{usageStats.total_approved_purchases}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Pending Purchases:</span>
                <span className="font-bold text-amber-700">{usageStats.pending_purchases}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Exam Attempts Consumed:</span>
                <span className="font-bold text-blue-700">{usageStats.total_exam_attempts_consumed}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-600">AI Credits Consumed:</span>
                <span className="font-bold text-purple-700">{usageStats.total_ai_credits_consumed}</span>
              </div>
            </div>
          ) : null}

          <DialogFooter className="pt-2">
            <Button size="sm" variant="outline" onClick={() => setUsageStatsDialogOpen(false)} className="text-xs w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete / Archive Confirmation Dialog */}
      <Dialog open={!!planPendingDelete} onOpenChange={() => setPlanPendingDelete(null)}>
        <DialogContent className="max-w-md p-6 bg-white text-slate-900 rounded-xl border border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2 text-rose-700">
              <AlertCircle className="w-5 h-5 text-rose-600" /> Archive / Delete Package
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 mt-2">
              Are you sure you want to delete <strong>{planPendingDelete?.name}</strong>?
              If this package has historical student purchases, it will be safely archived to preserve student subscriptions and audit ledgers.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPlanPendingDelete(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={deletePlan}
              disabled={deletingPlanId !== null}
              className="text-xs bg-rose-600 hover:bg-rose-700"
            >
              {deletingPlanId ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Confirm Safe Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
