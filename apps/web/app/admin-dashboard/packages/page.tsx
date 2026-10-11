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
import { adminExamApi } from "@/lib/api/admin-exams";

export interface PlatformFeatureItem {
  key: string;
  category: "objective_exams" | "subjective_exams" | "games" | "practice" | "notes" | "ai" | "modules";
  categoryLabel: string;
  title: string;
  description: string;
  defaultQuota: number;
  unit: string;
  supportsUnlimited: boolean;
  allowedResetPolicies: string[];
}

export const PLATFORM_FEATURES: PlatformFeatureItem[] = [
  // Objective Exams
  { key: "exam:objective:total", category: "objective_exams", categoryLabel: "Objective Examinations", title: "Total Objective Exam Attempts", description: "Overall combined attempts across all objective exam categories (-1 = unlimited)", defaultQuota: -1, unit: "attempts", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "MONTHLY", "DAILY"] },
  { key: "exam:objective:past_year", category: "objective_exams", categoryLabel: "Objective Examinations", title: "Past Year Objective Exams", description: "Attempts for official Loksewa past year question papers", defaultQuota: 10, unit: "attempts", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "MONTHLY", "DAILY"] },
  { key: "exam:objective:model", category: "objective_exams", categoryLabel: "Objective Examinations", title: "Objective Model Exams", description: "Standard Loksewa objective model exams prepared by experts", defaultQuota: 5, unit: "attempts", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "MONTHLY", "DAILY"] },
  { key: "exam:objective:mock", category: "objective_exams", categoryLabel: "Objective Examinations", title: "Objective Mock Exams", description: "Full-length timed simulated mock exams", defaultQuota: 5, unit: "attempts", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "MONTHLY", "DAILY"] },
  { key: "exam:objective:live", category: "objective_exams", categoryLabel: "Objective Examinations", title: "Objective Live Scheduled Exams", description: "Scheduled live rank exams with real-time ranking and percentiles", defaultQuota: 2, unit: "attempts", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "MONTHLY", "DAILY"] },
  { key: "exam:objective:topicwise", category: "objective_exams", categoryLabel: "Objective Examinations", title: "Objective Topicwise Tests", description: "Targeted tests focused on specific syllabus topics/chapters", defaultQuota: -1, unit: "attempts", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "MONTHLY", "DAILY"] },

  // Subjective Exams
  { key: "exam:subjective:total", category: "subjective_exams", categoryLabel: "Subjective Examinations", title: "Total Subjective Exam Attempts", description: "Overall combined attempts across all subjective exam papers (-1 = unlimited)", defaultQuota: -1, unit: "attempts", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "MONTHLY", "DAILY"] },
  { key: "exam:subjective:past_year", category: "subjective_exams", categoryLabel: "Subjective Examinations", title: "Past Year Subjective Papers", description: "Authentic subjective papers from previous years", defaultQuota: 5, unit: "attempts", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "MONTHLY", "DAILY"] },
  { key: "exam:subjective:model", category: "subjective_exams", categoryLabel: "Subjective Examinations", title: "Subjective Model Exams", description: "Comprehensive subjective model exams with solution guides", defaultQuota: 5, unit: "attempts", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "MONTHLY", "DAILY"] },
  { key: "exam:subjective:mock", category: "subjective_exams", categoryLabel: "Subjective Examinations", title: "Subjective Mock Exams", description: "Full-length timed subjective mock examinations", defaultQuota: 5, unit: "attempts", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "MONTHLY", "DAILY"] },
  { key: "exam:subjective:live", category: "subjective_exams", categoryLabel: "Subjective Examinations", title: "Subjective Live Scheduled Exams", description: "Time-bound live subjective tests", defaultQuota: 2, unit: "attempts", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "MONTHLY", "DAILY"] },
  { key: "exam:subjective:topicwise", category: "subjective_exams", categoryLabel: "Subjective Examinations", title: "Subjective Topicwise Tests", description: "Subjective chapter and section drills", defaultQuota: -1, unit: "attempts", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "MONTHLY", "DAILY"] },
  { key: "evaluation:subjective", category: "subjective_exams", categoryLabel: "Subjective Examinations", title: "Manual Subjective Checking / Evaluation", description: "Teacher / expert manual review and grading of student answer PDFs", defaultQuota: 3, unit: "requests", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "MONTHLY"] },

  // Games Limits
  { key: "game:1v1", category: "games", categoryLabel: "Gamification & Quiz Battles", title: "1v1 Multiplayer Battles", description: "Real-time 1v1 battle matches against peers or bots", defaultQuota: 10, unit: "matches", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "DAILY", "WEEKLY", "MONTHLY"] },
  { key: "game:survival", category: "games", categoryLabel: "Gamification & Quiz Battles", title: "Solo Survival Game", description: "Survival runs with streak multiplier and sudden death", defaultQuota: 10, unit: "runs", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "DAILY", "WEEKLY", "MONTHLY"] },
  { key: "game:weekly_quiz", category: "games", categoryLabel: "Gamification & Quiz Battles", title: "Weekly Grand Quiz", description: "Competitive weekly leaderboard quiz", defaultQuota: 2, unit: "attempts", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "WEEKLY", "MONTHLY"] },
  { key: "game:daily_drill", category: "games", categoryLabel: "Gamification & Quiz Battles", title: "Daily Drill Challenge", description: "Daily curated 10-question drill for syllabus weak areas", defaultQuota: 30, unit: "drills", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "DAILY", "MONTHLY"] },

  // Practice Limits
  { key: "practice_questions", category: "practice", categoryLabel: "Question Practice Engine", title: "Practice Questions Allowance", description: "Total individual questions answered in Random & Topicwise practice", defaultQuota: -1, unit: "questions", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "DAILY", "MONTHLY"] },
  { key: "practice:sessions", category: "practice", categoryLabel: "Question Practice Engine", title: "Practice Sessions Allowance", description: "Number of practice sessions student can initiate", defaultQuota: -1, unit: "sessions", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "DAILY", "MONTHLY"] },

  // Notes & Downloads
  { key: "notes:downloads", category: "notes", categoryLabel: "Notes & Course Materials", title: "Notes PDF Downloads Allowance", description: "Maximum PDF downloads of study materials (-1 = unlimited)", defaultQuota: -1, unit: "downloads", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "MONTHLY"] },

  // AI Features
  { key: "ai_credits", category: "ai", categoryLabel: "AI Tutor & Smart Learning", title: "AI Tutor Credits / Tokens", description: "Internal tokens consumed for chat explanations and question hints", defaultQuota: 5000, unit: "credits", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "MONTHLY"] },
  { key: "ai:study_plan", category: "ai", categoryLabel: "AI Tutor & Smart Learning", title: "AI Study Plan Generator Allowance", description: "AI-assisted personalized study plan schedule generation", defaultQuota: 2, unit: "plans", supportsUnlimited: true, allowedResetPolicies: ["NEVER", "MONTHLY"] },

  // Platform Modules
  { key: "module:study_plans", category: "modules", categoryLabel: "Platform Modules & Features", title: "Study Plans Module Access", description: "Access to interactive study timetable and daily syllabus planner", defaultQuota: 1, unit: "access", supportsUnlimited: false, allowedResetPolicies: ["NEVER"] },
  { key: "module:analytics", category: "modules", categoryLabel: "Platform Modules & Features", title: "Advanced Analytics Module", description: "Access to performance analytics, mastery radar, and weak-topic diagnostics", defaultQuota: 1, unit: "access", supportsUnlimited: false, allowedResetPolicies: ["NEVER"] },
];

export const DEFAULT_FEATURE_LIMITS: Record<string, { enabled: boolean; quota: number; unit: string; reset_policy: string; title: string }> = Object.fromEntries(
  PLATFORM_FEATURES.map((f) => [
    f.key,
    {
      enabled: true,
      quota: f.defaultQuota,
      unit: f.unit,
      reset_policy: "NEVER",
      title: f.title,
    },
  ])
);

const EMPTY_FORM: SubscriptionPlanInput = {
  name: "",
  slug: "",
  description: "",
  is_default_free: false,
  has_expiry: true,
  duration: 30,
  duration_unit: "DAYS",
  price: "0",
  original_price: null,
  discount: "0",
  badge: "NONE",
  display_badge: "",
  features: [],
  feature_limits: DEFAULT_FEATURE_LIMITS,
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
  const [activeTab, setActiveTab] = useState<"basic" | "validity" | "courses" | "exams" | "notes_ai" | "platform_limits">("basic");
  const [limitCategoryFilter, setLimitCategoryFilter] = useState<string>("all");
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

  // Default free & preview states
  const [settingDefaultFreeId, setSettingDefaultFreeId] = useState<number | null>(null);
  const [previewPlan, setPreviewPlan] = useState<SubscriptionPlan | null>(null);
  const [availableExams, setAvailableExams] = useState<any[]>([]);

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
      adminExamApi.getExams().catch(() => ({ results: [] })),
    ])
      .then(([planData, coursesData, categoriesData, examsData, allExamsData]) => {
        setPlans([...planData].sort((a, b) => a.display_order - b.display_order));
        if (coursesData) setCourses(coursesData);
        setAcademicExams(examsData);
        if (allExamsData && allExamsData.results) {
          setAvailableExams(allExamsData.results);
        }
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

  const handleSetDefaultFree = async (plan: SubscriptionPlan) => {
    setSettingDefaultFreeId(plan.id);
    try {
      await subscriptionsApi.setDefaultFreePlan(plan.id);
      toast.success(`"${plan.name}" is now designated as the Default Free Plan!`);
      load();
    } catch (err: any) {
      toast.error(err.detail || err.error || "Failed to set default free plan.");
    } finally {
      setSettingDefaultFreeId(null);
    }
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
      is_default_free: plan.is_default_free || false,
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
      feature_limits: plan.feature_limits && Object.keys(plan.feature_limits).length > 0
        ? { ...DEFAULT_FEATURE_LIMITS, ...plan.feature_limits }
        : DEFAULT_FEATURE_LIMITS,
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
        is_default_free: true,
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
        feature_limits: {
          ...DEFAULT_FEATURE_LIMITS,
          "exam:objective:total": { enabled: true, quota: 10, unit: "attempts", reset_policy: "NEVER", title: "Total Objective Exam Attempts" },
          "exam:objective:past_year": { enabled: false, quota: 0, unit: "attempts", reset_policy: "NEVER", title: "Past Year Objective Exams" },
          "exam:objective:model": { enabled: false, quota: 0, unit: "attempts", reset_policy: "NEVER", title: "Objective Model Exams" },
          "exam:objective:mock": { enabled: false, quota: 0, unit: "attempts", reset_policy: "NEVER", title: "Objective Mock Exams" },
          "exam:objective:live": { enabled: false, quota: 0, unit: "attempts", reset_policy: "NEVER", title: "Objective Live Scheduled Exams" },
          "exam:objective:topicwise": { enabled: true, quota: 3, unit: "attempts", reset_policy: "NEVER", title: "Objective Topicwise Tests" },
          "exam:subjective:total": { enabled: false, quota: 0, unit: "attempts", reset_policy: "NEVER", title: "Total Subjective Exam Attempts" },
          "evaluation:subjective": { enabled: false, quota: 0, unit: "requests", reset_policy: "NEVER", title: "Subjective Checking Requests" },
          "game:1v1": { enabled: true, quota: 3, unit: "matches", reset_policy: "NEVER", title: "1v1 Multiplayer Battles" },
          "game:survival": { enabled: true, quota: 3, unit: "runs", reset_policy: "NEVER", title: "Solo Survival Game" },
          "game:weekly_quiz": { enabled: true, quota: 1, unit: "attempts", reset_policy: "NEVER", title: "Weekly Grand Quiz" },
          "game:daily_drill": { enabled: true, quota: 5, unit: "drills", reset_policy: "NEVER", title: "Daily Drill Challenge" },
          "practice_questions": { enabled: true, quota: 50, unit: "questions", reset_policy: "NEVER", title: "Practice Questions Allowance" },
          "practice:sessions": { enabled: true, quota: 5, unit: "sessions", reset_policy: "NEVER", title: "Practice Sessions Allowance" },
          "notes:downloads": { enabled: false, quota: 0, unit: "downloads", reset_policy: "NEVER", title: "Notes PDF Downloads" },
          "ai_credits": { enabled: true, quota: 200, unit: "credits", reset_policy: "NEVER", title: "AI Tutor Credits" },
          "ai:study_plan": { enabled: true, quota: 1, unit: "plans", reset_policy: "NEVER", title: "AI Study Plan Generator" },
          "module:study_plans": { enabled: true, quota: 1, unit: "access", reset_policy: "NEVER", title: "Study Plans Module" },
          "module:analytics": { enabled: false, quota: 0, unit: "access", reset_policy: "NEVER", title: "Advanced Analytics Module" },
        },
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
        feature_limits: {
          ...DEFAULT_FEATURE_LIMITS,
          "exam:objective:total": { enabled: true, quota: 50, unit: "attempts", reset_policy: "NEVER", title: "Total Objective Exam Attempts" },
          "exam:objective:past_year": { enabled: true, quota: 15, unit: "attempts", reset_policy: "NEVER", title: "Past Year Objective Exams" },
          "exam:objective:model": { enabled: true, quota: 10, unit: "attempts", reset_policy: "NEVER", title: "Objective Model Exams" },
          "exam:objective:mock": { enabled: true, quota: 10, unit: "attempts", reset_policy: "NEVER", title: "Objective Mock Exams" },
          "exam:objective:live": { enabled: true, quota: 5, unit: "attempts", reset_policy: "NEVER", title: "Objective Live Scheduled Exams" },
          "exam:objective:topicwise": { enabled: true, quota: -1, unit: "attempts", reset_policy: "NEVER", title: "Objective Topicwise Tests" },
          "exam:subjective:total": { enabled: true, quota: 20, unit: "attempts", reset_policy: "NEVER", title: "Total Subjective Exam Attempts" },
          "exam:subjective:past_year": { enabled: true, quota: 10, unit: "attempts", reset_policy: "NEVER", title: "Past Year Subjective Papers" },
          "exam:subjective:model": { enabled: true, quota: 10, unit: "attempts", reset_policy: "NEVER", title: "Subjective Model Exams" },
          "exam:subjective:mock": { enabled: true, quota: 5, unit: "attempts", reset_policy: "NEVER", title: "Subjective Mock Exams" },
          "exam:subjective:live": { enabled: true, quota: 5, unit: "attempts", reset_policy: "NEVER", title: "Subjective Live Scheduled Exams" },
          "exam:subjective:topicwise": { enabled: true, quota: -1, unit: "attempts", reset_policy: "NEVER", title: "Subjective Topicwise Tests" },
          "evaluation:subjective": { enabled: true, quota: 5, unit: "requests", reset_policy: "NEVER", title: "Subjective Checking Requests" },
          "game:1v1": { enabled: true, quota: 25, unit: "matches", reset_policy: "NEVER", title: "1v1 Multiplayer Battles" },
          "game:survival": { enabled: true, quota: 25, unit: "runs", reset_policy: "NEVER", title: "Solo Survival Game" },
          "game:weekly_quiz": { enabled: true, quota: 5, unit: "attempts", reset_policy: "NEVER", title: "Weekly Grand Quiz" },
          "game:daily_drill": { enabled: true, quota: 60, unit: "drills", reset_policy: "NEVER", title: "Daily Drill Challenge" },
          "practice_questions": { enabled: true, quota: -1, unit: "questions", reset_policy: "NEVER", title: "Practice Questions Allowance" },
          "practice:sessions": { enabled: true, quota: -1, unit: "sessions", reset_policy: "NEVER", title: "Practice Sessions Allowance" },
          "notes:downloads": { enabled: true, quota: 10, unit: "downloads", reset_policy: "NEVER", title: "Notes PDF Downloads" },
          "ai_credits": { enabled: true, quota: 5000, unit: "credits", reset_policy: "NEVER", title: "AI Tutor Credits" },
          "ai:study_plan": { enabled: true, quota: 5, unit: "plans", reset_policy: "NEVER", title: "AI Study Plan Generator" },
          "module:study_plans": { enabled: true, quota: 1, unit: "access", reset_policy: "NEVER", title: "Study Plans Module" },
          "module:analytics": { enabled: true, quota: 1, unit: "access", reset_policy: "NEVER", title: "Advanced Analytics Module" },
        },
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
        feature_limits: Object.fromEntries(
          PLATFORM_FEATURES.map((f) => [
            f.key,
            {
              enabled: true,
              quota: -1,
              unit: f.unit,
              reset_policy: "NEVER",
              title: f.title,
            },
          ])
        ),
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm">{plan.name}</span>
                              {plan.is_default_free && (
                                <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300 font-bold">
                                  ★ Default Free Plan
                                </Badge>
                              )}
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
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewPlan(plan)}
                          title="Preview as Student"
                          className="h-8 text-xs text-slate-600 hover:text-slate-900"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 text-[#0B2545]" /> Preview
                        </Button>

                        {!plan.is_default_free && (Number(plan.price) === 0 || plan.is_free) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefaultFree(plan)}
                            disabled={settingDefaultFreeId === plan.id}
                            title="Make Default Free Plan"
                            className="h-8 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold"
                          >
                            {settingDefaultFreeId === plan.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Set Default Free
                              </>
                            )}
                          </Button>
                        )}

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
              { id: "platform_limits", label: "Feature Limits & Access" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                className={`py-2.5 px-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
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
                {/* Default Free Plan Toggle Banner */}
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-900">
                        Designate as Default Free Plan
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      When enabled, newly registered students automatically receive this plan without payment, checkout, or admin review.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={form.is_default_free || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm({
                          ...form,
                          is_default_free: checked,
                          price: checked ? "0" : (form.price === "0" ? "999" : form.price),
                          has_expiry: checked ? false : form.has_expiry,
                        });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

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
                      disabled={form.is_default_free}
                      value={form.is_default_free ? "0" : form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="e.g. 1999"
                      className="h-9 text-xs font-bold text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
                    />
                    {form.is_default_free ? (
                      <span className="text-[10px] text-emerald-600 font-bold">Locked at Rs. 0 (Free Plan)</span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Set 0 for free package.</span>
                    )}
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
                <div className="p-4 rounded-xl border border-slate-200 bg-amber-50/30 space-y-3">
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

                  {/* Selective Free Mock Tests Picker */}
                  <div className="pt-2 border-t border-amber-200/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-amber-950">
                        Designated Free Mock Tests (Optional):
                      </Label>
                      <span className="text-[10px] text-amber-800 font-medium">
                        {(form.free_mock_exams?.length || 0) === 0 ? "All mock tests eligible" : `${form.free_mock_exams?.length} specific tests selected`}
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-700">
                      Leave empty to allow students to take any published Mock Exam up to the quota limit. Or select specific Mock Exams to restrict free attempts.
                    </p>
                    <div className="max-h-36 overflow-y-auto border border-amber-200 rounded-lg p-2 space-y-1 bg-white">
                      {availableExams.length === 0 ? (
                        <span className="text-xs text-slate-400 p-1 block">No examinations found.</span>
                      ) : (
                        availableExams.map((exam: any) => {
                          const isSelected = form.free_mock_exams?.includes(exam.id);
                          return (
                            <div
                              key={exam.id}
                              onClick={() => {
                                const cur = form.free_mock_exams || [];
                                const next = isSelected ? cur.filter((id: number) => id !== exam.id) : [...cur, exam.id];
                                setForm({ ...form, free_mock_exams: next });
                              }}
                              className={`flex items-center justify-between p-2 rounded cursor-pointer text-xs transition-colors ${
                                isSelected
                                  ? "bg-amber-100 text-amber-950 font-semibold border border-amber-300"
                                  : "hover:bg-slate-50 border border-transparent text-slate-700"
                              }`}
                            >
                              <span className="truncate pr-2">{exam.title}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-amber-700 shrink-0" />}
                            </div>
                          );
                        })
                      )}
                    </div>
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

            {/* TAB 6: COMPLETE PLATFORM-WIDE FEATURE LIMITS & ACCESS */}
            {activeTab === "platform_limits" && (
              <div className="space-y-5">
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex items-start gap-3">
                  <Layers className="w-5 h-5 text-[#0B2545] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-[#0B2545]">Platform-Wide Feature Limits & Entitlements</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Configure granular allowances for all student-facing features across LoksewaAI. An unset quota must never automatically mean Unlimited. Click <strong>Set Unlimited</strong> (-1) only when unlimited access is explicitly desired.
                    </p>
                  </div>
                </div>

                {/* Filter Categories Pills */}
                <div className="flex items-center gap-1.5 flex-wrap pb-1 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Filter:</span>
                  {[
                    { id: "all", label: "All Features" },
                    { id: "objective_exams", label: "Objective Exams" },
                    { id: "subjective_exams", label: "Subjective Exams" },
                    { id: "games", label: "Games & Battles" },
                    { id: "practice", label: "Practice Engine" },
                    { id: "notes", label: "Notes & Downloads" },
                    { id: "ai", label: "AI Tutor & Tools" },
                    { id: "modules", label: "Platform Modules" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setLimitCategoryFilter(cat.id)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                        limitCategoryFilter === cat.id
                          ? "bg-[#0B2545] text-white font-bold"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Grid of configurable features */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {PLATFORM_FEATURES
                    .filter((feat) => limitCategoryFilter === "all" || feat.category === limitCategoryFilter)
                    .map((feat) => {
                      const currentLimit = form.feature_limits?.[feat.key] || {
                        enabled: true,
                        quota: feat.defaultQuota,
                        unit: feat.unit,
                        reset_policy: "NEVER",
                        title: feat.title,
                      };

                      const isEnabled = currentLimit.enabled ?? true;
                      const quotaVal = currentLimit.quota ?? feat.defaultQuota;
                      const resetPolicyVal = currentLimit.reset_policy || "NEVER";

                      return (
                        <div
                          key={feat.key}
                          className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                            isEnabled
                              ? "border-slate-200 bg-white shadow-sm"
                              : "border-slate-200/60 bg-slate-50/50 opacity-60"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-900">{feat.title}</span>
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-slate-500 bg-slate-50">
                                  {feat.categoryLabel}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{feat.description}</p>
                            </div>

                            {/* Enabled Toggle */}
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer shrink-0">
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={(e) => {
                                  const updated = {
                                    ...form.feature_limits,
                                    [feat.key]: {
                                      ...currentLimit,
                                      enabled: e.target.checked,
                                    },
                                  };
                                  setForm({ ...form, feature_limits: updated });
                                }}
                                className="rounded border-slate-300 text-[#0B2545] focus:ring-[#0B2545]"
                              />
                              <span className={isEnabled ? "text-emerald-700 font-bold" : "text-slate-400"}>
                                {isEnabled ? "Enabled" : "Disabled"}
                              </span>
                            </label>
                          </div>

                          {isEnabled ? (
                            <div className="pt-2 border-t border-slate-100 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1">
                                  <Label className="text-[11px] font-semibold text-slate-600 shrink-0">
                                    Included Quota:
                                  </Label>
                                  <Input
                                    type="number"
                                    value={quotaVal}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      const updated = {
                                        ...form.feature_limits,
                                        [feat.key]: {
                                          ...currentLimit,
                                          quota: isNaN(val) ? 0 : val,
                                        },
                                      };
                                      setForm({ ...form, feature_limits: updated });
                                    }}
                                    className="h-8 text-xs font-bold max-w-[100px]"
                                  />
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    {quotaVal === -1 ? "(Unlimited)" : feat.unit}
                                  </span>
                                </div>

                                {feat.supportsUnlimited && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const updated = {
                                        ...form.feature_limits,
                                        [feat.key]: {
                                          ...currentLimit,
                                          quota: -1,
                                        },
                                      };
                                      setForm({ ...form, feature_limits: updated });
                                    }}
                                    className={`h-7 text-[11px] px-2 ${
                                      quotaVal === -1 ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" : ""
                                    }`}
                                  >
                                    Set Unlimited (-1)
                                  </Button>
                                )}
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                                <span className="text-slate-500 font-medium">Reset Policy:</span>
                                <Select
                                  value={resetPolicyVal}
                                  onValueChange={(val) => {
                                    const updated = {
                                      ...form.feature_limits,
                                      [feat.key]: {
                                        ...currentLimit,
                                        reset_policy: val,
                                      },
                                    };
                                    setForm({ ...form, feature_limits: updated });
                                  }}
                                >
                                  <SelectTrigger className="h-7 text-[11px] w-36">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="NEVER">Never (Lifetime)</SelectItem>
                                    <SelectItem value="DAILY">Daily Reset</SelectItem>
                                    <SelectItem value="WEEKLY">Weekly Reset</SelectItem>
                                    <SelectItem value="MONTHLY">Monthly Reset</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic">
                              This feature is excluded from this package. Students attempting access will receive an upgrade prompt.
                            </div>
                          )}
                        </div>
                      );
                    })}
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

      {/* Student Package Preview Modal */}
      <Dialog open={Boolean(previewPlan)} onOpenChange={(open) => !open && setPreviewPlan(null)}>
        <DialogContent className="max-w-md p-6 rounded-[24px] border border-border shadow-2xl bg-card">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#D4A72C]" /> Student Package Preview
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Live representation of how this package appears to students on the pricing &amp; plans page.
            </DialogDescription>
          </DialogHeader>

          {previewPlan && (
            <div className="bg-[#0F1822] text-white rounded-[22px] p-6 border-2 border-[#D4A72C] shadow-xl space-y-5 my-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-[#D4A72C]/20 text-[#D4A72C] text-[10px] font-bold uppercase tracking-wider">
                  {previewPlan.package_type} PACKAGE
                </Badge>
                <span className="text-xs text-white/70">
                  {previewPlan.has_expiry !== false && previewPlan.duration ? `${previewPlan.duration} ${previewPlan.duration_unit}` : "Lifetime Quota"}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{previewPlan.name}</h3>
                <p className="text-xs text-white/70 mt-1 line-clamp-2">
                  {previewPlan.description || "Comprehensive Loksewa preparation with dedicated study features."}
                </p>
              </div>
              <div className="py-2 border-y border-white/10 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">Rs. {previewPlan.price}</span>
                {previewPlan.is_default_free && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                    Default Free Plan
                  </span>
                )}
              </div>
              <div className="space-y-2 text-xs text-white/90">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#D4A72C]" />
                  <span>Model Mock Exams: <strong>{previewPlan.exam_quotas?.model?.attempts === -1 ? "Unlimited" : previewPlan.exam_quotas?.model?.attempts ?? 0} attempts</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Free Mock Tests: <strong>{previewPlan.free_mock_attempts ?? 0} free attempts</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400" />
                  <span>AI Tutor: <strong>{previewPlan.ai_tutor_enabled ? `${previewPlan.ai_credits ?? 0} credits` : "Disabled"}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-400" />
                  <span>Study Notes: <strong>{previewPlan.notes_access_type}</strong></span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewPlan(null)}
              className="w-full text-xs rounded-xl h-10"
            >
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
