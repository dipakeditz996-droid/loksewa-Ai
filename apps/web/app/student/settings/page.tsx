"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  User, Shield, Bell, Palette, BookOpen, Eye, Trash2,
} from "lucide-react";
import { ProfileSection } from "@/components/student/settings/ProfileSection";
import { SecuritySection } from "@/components/student/settings/SecuritySection";
import { NotificationsSection } from "@/components/student/settings/NotificationsSection";
import { AppearanceSection } from "@/components/student/settings/AppearanceSection";
import { StudyPreferencesSection } from "@/components/student/settings/StudyPreferencesSection";
import { PrivacySection } from "@/components/student/settings/PrivacySection";
import { AccountManagementSection } from "@/components/student/settings/AccountManagementSection";

const SETTINGS_TABS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "security", label: "Account & Security", icon: Shield },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "appearance", label: "Appearance", icon: Palette },
  { key: "study", label: "Study Preferences", icon: BookOpen },
  { key: "privacy", label: "Privacy", icon: Eye },
  { key: "account", label: "Account Management", icon: Trash2 },
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number]["key"];

export default function StudentSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary dark:text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account, preferences, and privacy.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation — Desktop */}
        <aside className="hidden lg:block w-64 shrink-0">
          <nav className="bg-card rounded-2xl border border-border/80 shadow-sm overflow-hidden sticky top-24">
            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-3 w-full px-5 py-3.5 text-left text-[13px] font-medium transition-all border-l-[3px]",
                    isActive
                      ? "bg-primary text-primary-foreground/5 text-primary dark:text-foreground border-l-[#D4A72C]"
                      : "text-muted-foreground border-l-transparent hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-[#D4A72C]" : "text-muted-foreground")} strokeWidth={1.5} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Tab Navigation */}
        <div className="lg:hidden">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as SettingsTab)}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-[14px] font-medium text-primary dark:text-foreground focus:ring-2 focus:ring-[#D4A72C]/30 focus:border-[#D4A72C]"
          >
            {SETTINGS_TABS.map((tab) => (
              <option key={tab.key} value={tab.key}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {activeTab === "profile" && <ProfileSection />}
          {activeTab === "security" && <SecuritySection />}
          {activeTab === "notifications" && <NotificationsSection />}
          {activeTab === "appearance" && <AppearanceSection />}
          {activeTab === "study" && <StudyPreferencesSection />}
          {activeTab === "privacy" && <PrivacySection />}
          {activeTab === "account" && <AccountManagementSection />}
        </div>
      </div>
    </div>
  );
}
