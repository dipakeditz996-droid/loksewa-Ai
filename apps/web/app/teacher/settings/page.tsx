// @ts-nocheck
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { User, Shield, Bell, Settings2, Moon, CreditCard, LogOut } from "lucide-react";
import { TeacherProfileSection } from "@/components/teacher/settings/TeacherProfileSection";
import { TeacherSecuritySection } from "@/components/teacher/settings/TeacherSecuritySection";
import { TeacherNotificationPreferences } from "@/components/teacher/settings/TeacherNotificationPreferences";
import { TeacherAccountSection } from "@/components/teacher/settings/TeacherAccountSection";
import { TeacherTeachingPreferences } from "@/components/teacher/settings/TeacherTeachingPreferences";
import { TeacherAppearanceSection } from "@/components/teacher/settings/TeacherAppearanceSection";

const SETTINGS_TABS = [
  { key: "profile", label: "Profile", icon: User, desc: "Personal information" },
  { key: "account", label: "Account", icon: CreditCard, desc: "Status and role" },
  { key: "security", label: "Security", icon: Shield, desc: "Password and sessions" },
  { key: "notifications", label: "Notifications", icon: Bell, desc: "Communication preferences" },
  { key: "appearance", label: "Appearance", icon: Moon, desc: "Theme and visuals" },
  { key: "preferences", label: "Preferences", icon: Settings2, desc: "Teaching defaults" },
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number]["key"];

export default function TeacherSettingsPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as SettingsTab) || "profile";
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Settings</h1>
        <p className="text-slate-500 mt-2">Manage your teacher account, preferences, and platform experience.</p>
        <div className="mt-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-sm font-medium text-slate-700">Account active</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation — Desktop */}
        <aside className="hidden lg:block w-72 shrink-0">
          <nav className="bg-card rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-24 pb-2">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Settings</h2>
            </div>
            <div className="p-2 space-y-1">
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex items-center gap-4 w-full p-3 rounded-xl text-left transition-all",
                      isActive
                        ? "bg-[#0B2545]/5 text-primary"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg shrink-0", isActive ? "bg-card shadow-sm border border-[#0B2545]/10" : "bg-slate-100")}>
                      <Icon className={cn("h-4 w-4", isActive ? "text-[#D4A72C]" : "text-slate-500")} strokeWidth={isActive ? 2 : 1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-semibold truncate", isActive ? "text-primary" : "text-slate-700")}>{tab.label}</p>
                      <p className="text-xs text-slate-500 truncate">{tab.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="p-4 mt-2 border-t border-slate-100">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Danger Zone</h2>
              <button
                onClick={logout}
                className="flex items-center gap-3 w-full p-3 rounded-xl text-left text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 bg-rose-100/50 text-rose-600">
                  <LogOut className="h-4 w-4" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Sign Out</p>
                </div>
              </button>
            </div>
          </nav>
        </aside>

        {/* Mobile Tab Navigation */}
        <div className="lg:hidden">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as SettingsTab)}
            className="w-full bg-card border border-slate-200 rounded-xl px-4 py-3 text-[14px] font-medium text-primary focus:ring-2 focus:ring-[#D4A72C]/30 focus:border-[#D4A72C] shadow-sm"
          >
            {SETTINGS_TABS.map((tab) => (
               <option key={tab.key} value={tab.key}>
                 {tab.label}
               </option>
            ))}
          </select>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <button
                onClick={logout}
                className="flex items-center gap-2 w-full px-4 py-3 bg-card border border-rose-200 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 shadow-sm transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 max-w-4xl">
          {activeTab === "profile" && <TeacherProfileSection />}
          {activeTab === "account" && <TeacherAccountSection />}
          {activeTab === "security" && <TeacherSecuritySection />}
          {activeTab === "notifications" && <TeacherNotificationPreferences />}
          {activeTab === "appearance" && <TeacherAppearanceSection />}
          {activeTab === "preferences" && <TeacherTeachingPreferences />}
        </div>
      </div>
    </div>
  );
}
