"use client";

import React, { useState, useEffect, use } from "react";
import {
  User as UserIcon, Mail, Phone, Shield, ShieldCheck, Calendar, Loader2,
  AlertCircle, GraduationCap, BookOpen, Target, Trophy, CreditCard,
  ShoppingBag, MapPin, Globe, Clock, X, PlusCircle, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";
import { subscriptionsApi, EffectiveEntitlements } from "@/lib/api/subscriptions";

interface UserDetail {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  isStaff: boolean;
  is2FAEnabled: boolean;
  avatar: string | null;
  dateJoined: string;
  lastLogin: string | null;
  studentProfile?: {
    phone: string;
    bio: string;
    targetCategory: string | null;
    targetPosition: string | null;
    permanentDistrict: string;
    permanentLocalLevel: string;
    isVerified: boolean;
    preferredStudyTime: string;
    dailyStudyGoalMinutes: number;
    difficultyPreference: string;
    studyMode: string;
    language: string;
  } | null;
  enrollments?: { courseTitle: string; status: string; enrolledAt: string; expiresAt: string | null }[];
  subscriptions?: {
    id?: number;
    planId?: number;
    planName: string;
    packageType?: string;
    status: string;
    source?: string;
    accessSource?: string;
    adminGrantReason?: string;
    grantedBy?: string | null;
    startDate: string;
    expiryDate: string | null;
    isActive: boolean;
  }[];
  subscription?: {
    id?: number;
    planId?: number;
    planName: string;
    packageType?: string;
    status: string;
    source?: string;
    accessSource?: string;
    adminGrantReason?: string;
    grantedBy?: string | null;
    startDate: string;
    expiryDate: string | null;
    isActive: boolean;
  } | null;
  examStats?: { totalAttempts: number; averagePercentage: number | null; passedCount: number };
  practiceStats?: { totalSessions: number; averageAccuracy: number | null };
  purchaseCount?: number;
  teacherProfile?: {
    bio: string;
    specialization: string | null;
    designation: string | null;
    experienceYears: number;
    phoneNumber: string | null;
    preferredDifficulty: string;
    preferredQuestionType: string;
  } | null;
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-[#0B2545]">{value ?? "—"}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-[#0B2545] mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [studentEntitlements, setStudentEntitlements] = useState<EffectiveEntitlements | null>(null);
  const [entitlementsLoading, setEntitlementsLoading] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustFeature, setAdjustFeature] = useState("MODEL");
  const [adjustAmount, setAdjustAmount] = useState("5");
  const [adjustReason, setAdjustReason] = useState("");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  const fetchEntitlements = async () => {
    setEntitlementsLoading(true);
    try {
      const res = await subscriptionsApi.getAdminStudentUsage(Number(resolvedParams.id));
      setStudentEntitlements(res);
    } catch (err) {
      console.error("Failed to load student entitlements:", err);
    } finally {
      setEntitlementsLoading(false);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      setError("");
      try {
        const data = await apiClient<UserDetail>(`/admin/users/${resolvedParams.id}/`);
        setUser(data);
        if (data.role === "student") {
          fetchEntitlements();
        }
      } catch (err: any) {
        setError(err.data?.error || err.message || "Failed to load user.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [resolvedParams.id]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustReason.trim()) {
      alert("Please provide an audit reason for this quota adjustment.");
      return;
    }
    const amt = parseInt(adjustAmount);
    if (isNaN(amt) || amt === 0) {
      alert("Please provide a non-zero adjustment amount.");
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      await subscriptionsApi.adminAdjustQuota(
        Number(resolvedParams.id),
        adjustFeature,
        amt,
        adjustReason.trim()
      );
      setIsAdjustModalOpen(false);
      setAdjustReason("");
      fetchEntitlements();
    } catch (err: any) {
      alert(err.message || "Failed to adjust quota.");
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-2">
        <Link href="/admin-dashboard/users">
          <Button variant="outline">&larr; Back to Users</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
          <div className="bg-red-50 p-4 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-[#0B2545] mb-2">Couldn't load this user</h2>
          <p className="text-slate-500 max-w-md">{error}</p>
        </div>
      ) : user ? (
        <div className="space-y-6">
          {/* Header card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#0B2545] text-white flex items-center justify-center text-xl font-bold shrink-0 overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-[#0B2545]">{user.name}</h1>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  user.role === 'teacher' ? 'bg-purple-100 text-purple-700' :
                  user.role === 'admin' || user.role === 'super-admin' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {user.role}
                </span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
                {user.is2FAEnabled && (
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-700 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> 2FA
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">@{user.username}</p>
            </div>
          </div>

          {/* Account info */}
          <SectionCard title="Account Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoRow icon={Mail} label="Email" value={user.email} />
              <InfoRow icon={UserIcon} label="Full Name" value={`${user.firstName || ""} ${user.lastName || ""}`.trim() || "—"} />
              <InfoRow icon={Calendar} label="Joined" value={new Date(user.dateJoined).toLocaleString()} />
              <InfoRow icon={Clock} label="Last Login" value={user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"} />
              <InfoRow icon={Shield} label="Staff Access" value={user.isStaff ? "Yes" : "No"} />
            </div>
          </SectionCard>

          {/* Student-specific */}
          {user.role === 'student' && (
            <>
              {user.studentProfile ? (
                <SectionCard title="Student Profile">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                    <InfoRow icon={Phone} label="Phone" value={user.studentProfile.phone} />
                    <InfoRow icon={Target} label="Target Exam" value={user.studentProfile.targetPosition || user.studentProfile.targetCategory} />
                    <InfoRow icon={MapPin} label="Address" value={[user.studentProfile.permanentLocalLevel, user.studentProfile.permanentDistrict].filter(Boolean).join(", ")} />
                    <InfoRow icon={Globe} label="Language" value={user.studentProfile.language === 'ne' ? 'Nepali' : 'English'} />
                    <InfoRow icon={Clock} label="Preferred Study Time" value={user.studentProfile.preferredStudyTime} />
                    <InfoRow icon={BookOpen} label="Daily Study Goal" value={`${user.studentProfile.dailyStudyGoalMinutes} minutes`} />
                    <InfoRow icon={ShieldCheck} label="Email Verified" value={user.studentProfile.isVerified ? "Yes" : "No"} />
                  </div>
                  {user.studentProfile.bio && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-500 mb-1">Bio</p>
                      <p className="text-sm text-slate-700">{user.studentProfile.bio}</p>
                    </div>
                  )}
                </SectionCard>
              ) : (
                <SectionCard title="Student Profile">
                  <p className="text-sm text-slate-500">No student profile found for this account.</p>
                </SectionCard>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-slate-500 text-xs font-medium mb-1 flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> Exam Attempts</p>
                  <p className="text-xl font-bold text-[#0B2545]">{user.examStats?.totalAttempts ?? 0}</p>
                  <p className="text-xs text-slate-400">{user.examStats?.passedCount ?? 0} passed</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-slate-500 text-xs font-medium mb-1">Avg. Exam Score</p>
                  <p className="text-xl font-bold text-[#0B2545]">{user.examStats?.averagePercentage != null ? `${user.examStats.averagePercentage}%` : "—"}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-slate-500 text-xs font-medium mb-1">Practice Sessions</p>
                  <p className="text-xl font-bold text-[#0B2545]">{user.practiceStats?.totalSessions ?? 0}</p>
                  <p className="text-xs text-slate-400">{user.practiceStats?.averageAccuracy != null ? `${user.practiceStats.averageAccuracy}% accuracy` : "—"}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-slate-500 text-xs font-medium mb-1 flex items-center gap-1"><ShoppingBag className="w-3.5 h-3.5" /> Purchases</p>
                  <p className="text-xl font-bold text-[#0B2545]">{user.purchaseCount ?? 0}</p>
                </div>
              </div>

              {/* Authoritative Package & Entitlements Management */}
              <SectionCard title="Active Package, Entitlements & Live Quotas">
                {entitlementsLoading ? (
                  <div className="py-6 flex justify-center items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading live entitlements & quotas...
                  </div>
                ) : studentEntitlements?.has_active_package ? (
                  <div className="space-y-5">
                    {/* Package Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[#0B2545] text-base">
                            {studentEntitlements.plan?.name}
                          </span>
                          {studentEntitlements.plan?.badge && studentEntitlements.plan.badge !== "NONE" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4A72C]/20 text-[#D4A72C]">
                              {studentEntitlements.plan.badge.replace("_", " ")}
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                            {studentEntitlements.subscription?.status || "Active"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                          <span>
                            Validity: {studentEntitlements.subscription?.has_expiry 
                              ? `Expires ${studentEntitlements.subscription.expiry_date ? new Date(studentEntitlements.subscription.expiry_date).toLocaleDateString() : '—'}` 
                              : "Lifetime Quota (No Expiry)"}
                          </span>
                          {studentEntitlements.subscription?.reset_frequency && studentEntitlements.subscription.reset_frequency !== "NEVER" && (
                            <span>Resets: {studentEntitlements.subscription.reset_frequency.toLowerCase()}</span>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => setIsAdjustModalOpen(true)}
                        className="bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] font-bold text-xs shadow-sm h-9"
                      >
                        Adjust Quota / Grant Attempts
                      </Button>
                    </div>

                    {/* Quota Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Model Mock Exams */}
                      <div className="p-3 rounded-lg bg-white border border-slate-200">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Model Exams</span>
                        <div className="mt-1">
                          {studentEntitlements.exams?.MODEL?.is_unlimited ? (
                            <span className="text-sm font-bold text-emerald-600">Unlimited</span>
                          ) : (
                            <div className="flex items-baseline gap-1">
                              <span className="text-base font-extrabold text-[#0B2545]">
                                {studentEntitlements.exams?.MODEL?.remaining ?? 0}
                              </span>
                              <span className="text-xs text-slate-400">
                                / {studentEntitlements.exams?.MODEL?.total_allowed ?? 0}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Topicwise Tests */}
                      <div className="p-3 rounded-lg bg-white border border-slate-200">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Topicwise Tests</span>
                        <div className="mt-1">
                          {studentEntitlements.exams?.TOPICWISE?.is_unlimited ? (
                            <span className="text-sm font-bold text-emerald-600">Unlimited</span>
                          ) : (
                            <div className="flex items-baseline gap-1">
                              <span className="text-base font-extrabold text-[#0B2545]">
                                {studentEntitlements.exams?.TOPICWISE?.remaining ?? 0}
                              </span>
                              <span className="text-xs text-slate-400">
                                / {studentEntitlements.exams?.TOPICWISE?.total_allowed ?? 0}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* AI Tutor Credits */}
                      <div className="p-3 rounded-lg bg-white border border-slate-200">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">AI Credits</span>
                        <div className="mt-1">
                          {studentEntitlements.ai_tutor?.is_unlimited ? (
                            <span className="text-sm font-bold text-purple-600">Unlimited</span>
                          ) : (
                            <div className="flex items-baseline gap-1">
                              <span className="text-base font-extrabold text-[#0B2545]">
                                {(studentEntitlements.ai_tutor?.remaining_credits ?? 0).toLocaleString()}
                              </span>
                              <span className="text-xs text-slate-400">
                                / {(studentEntitlements.ai_tutor?.total_credits ?? 0).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Practice Questions */}
                      <div className="p-3 rounded-lg bg-white border border-slate-200">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Practice Bank</span>
                        <div className="mt-1">
                          {studentEntitlements.practice?.is_unlimited ? (
                            <span className="text-sm font-bold text-emerald-600">Unlimited</span>
                          ) : (
                            <div className="flex items-baseline gap-1">
                              <span className="text-base font-extrabold text-[#0B2545]">
                                {studentEntitlements.practice?.remaining ?? 0}
                              </span>
                              <span className="text-xs text-slate-400">
                                / {studentEntitlements.practice?.total_allowed ?? 0}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Recent Quota Ledger */}
                    <div className="pt-2">
                      <h4 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider mb-2">
                        Audit & Quota Usage Ledger
                      </h4>
                      {studentEntitlements.usage_history && studentEntitlements.usage_history.length > 0 ? (
                        <div className="border border-slate-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                              <tr>
                                <th className="p-2.5">Action</th>
                                <th className="p-2.5">Feature</th>
                                <th className="p-2.5 text-right">Amount</th>
                                <th className="p-2.5">Reason / Admin</th>
                                <th className="p-2.5 text-right">Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {studentEntitlements.usage_history.map((entry: any) => (
                                <tr key={entry.id} className="hover:bg-slate-50/50">
                                  <td className="p-2.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      entry.event_type === "GRANT" || entry.event_type === "ADMIN_ADJUST" ? "bg-emerald-100 text-emerald-800" :
                                      entry.event_type === "CONSUME" ? "bg-amber-100 text-amber-800" :
                                      "bg-slate-100 text-slate-700"
                                    }`}>
                                      {entry.event_type}
                                    </span>
                                  </td>
                                  <td className="p-2.5 font-medium">{entry.feature}</td>
                                  <td className={`p-2.5 text-right font-bold ${entry.amount > 0 ? "text-emerald-600" : "text-slate-800"}`}>
                                    {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                                  </td>
                                  <td className="p-2.5 text-slate-600 max-w-xs truncate">{entry.reason || "—"}</td>
                                  <td className="p-2.5 text-right text-slate-400">
                                    {new Date(entry.created_at).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No usage ledger entries recorded yet.</p>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">
                      Student does not currently have an active entitlement package.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setIsAdjustModalOpen(true)}
                      className="bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] font-bold text-xs shadow-sm h-8"
                    >
                      Grant Quota / Attempts
                    </Button>
                  </div>
                )}
              </SectionCard>

              {/* Enrollments */}
              <SectionCard title="Course Enrollments">
                {user.enrollments && user.enrollments.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {user.enrollments.map((e, i) => (
                      <div key={i} className="py-2 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-[#0B2545]">{e.courseTitle}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            e.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {e.status}
                          </span>
                          <span className="text-xs text-slate-400">{new Date(e.enrolledAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Not enrolled in any courses.</p>
                )}
              </SectionCard>
            </>
          )}

          {/* Teacher-specific */}
          {user.role === 'teacher' && (
            <SectionCard title="Teacher Profile">
              {user.teacherProfile ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                    <InfoRow icon={Phone} label="Phone" value={user.teacherProfile.phoneNumber} />
                    <InfoRow icon={GraduationCap} label="Designation" value={user.teacherProfile.designation} />
                    <InfoRow icon={BookOpen} label="Specialization" value={user.teacherProfile.specialization} />
                    <InfoRow icon={Trophy} label="Experience" value={`${user.teacherProfile.experienceYears} years`} />
                  </div>
                  {user.teacherProfile.bio && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-500 mb-1">Bio</p>
                      <p className="text-sm text-slate-700">{user.teacherProfile.bio}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500">No teacher profile found for this account.</p>
              )}
            </SectionCard>
          )}
        </div>
      ) : null}

      {/* Quota Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0B2545]">Adjust Student Quota</h3>
                <p className="text-xs text-slate-500">Grant or modify attempts with auditable reason</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Entitlement / Feature
                </label>
                <select
                  value={adjustFeature}
                  onChange={(e) => setAdjustFeature(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A72C]"
                >
                  <option value="MODEL">Model Mock Exam Attempts</option>
                  <option value="TOPICWISE">Topicwise Test Attempts</option>
                  <option value="PAST_QUESTION">Past Question Paper Attempts</option>
                  <option value="LIVE">Live Exam Attempts</option>
                  <option value="AI_TUTOR">AI Tutor Credits</option>
                  <option value="PRACTICE">Practice Question Allowance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Adjustment Amount (+ to add, - to deduct)
                </label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="e.g. 5 or 1000"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A72C]"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Positive values grant additional quota. Negative values deduct quota.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Audit Reason (Required)
                </label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Granted bonus mock attempts per academic support ticket #412"
                  rows={3}
                  className="w-full p-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A72C]"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAdjustModalOpen(false)}
                  disabled={isSubmittingAdjust}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className="bg-[#D4A72C] text-[#0A1118] hover:bg-[#D4A72C]/90 font-bold"
                >
                  {isSubmittingAdjust ? "Applying..." : "Save Adjustment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
