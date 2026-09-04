"use client";

import React, { useState, useEffect, use } from "react";
import {
  User as UserIcon, Mail, Phone, Shield, ShieldCheck, Calendar, Loader2,
  AlertCircle, GraduationCap, BookOpen, Target, Trophy, CreditCard,
  ShoppingBag, MapPin, Globe, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";

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
  subscription?: { planName: string; status: string; startDate: string; expiryDate: string; isActive: boolean } | null;
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

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      setError("");
      try {
        const data = await apiClient<UserDetail>(`/admin/users/${resolvedParams.id}/`);
        setUser(data);
      } catch (err: any) {
        setError(err.data?.error || err.message || "Failed to load user.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [resolvedParams.id]);

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

              {/* Subscription */}
              <SectionCard title="Subscription">
                {user.subscription ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                    <InfoRow icon={CreditCard} label="Plan" value={user.subscription.planName} />
                    <InfoRow icon={ShieldCheck} label="Status" value={user.subscription.isActive ? "Active" : user.subscription.status} />
                    <InfoRow icon={Calendar} label="Started" value={new Date(user.subscription.startDate).toLocaleDateString()} />
                    <InfoRow icon={Calendar} label="Expires" value={new Date(user.subscription.expiryDate).toLocaleDateString()} />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No active subscription.</p>
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
    </div>
  );
}
