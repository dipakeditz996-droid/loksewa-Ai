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

import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function StudentSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="p-6 md:p-12 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 text-[#D4A72C] animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Loading settings...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 md:p-12 max-w-md mx-auto text-center space-y-5 my-12 bg-card border border-border rounded-3xl shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-[#D4A72C]/10 text-[#D4A72C] flex items-center justify-center mx-auto">
          <User className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Sign In Required</h2>
          <p className="text-sm text-muted-foreground">
            Please sign in with your student account to access and customize your profile and settings.
          </p>
        </div>
        <Button asChild className="w-full bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] font-bold h-11">
          <Link href="/login">
            <LogIn className="w-4 h-4 mr-2" /> Sign In to Continue
          </Link>
        </Button>
      </div>
    );
  }

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
                      ? "bg-[#D4A72C]/10 text-[#D4A72C] font-semibold border-l-[#D4A72C] dark:bg-[#D4A72C]/15"
                      : "text-muted-foreground border-l-transparent hover:bg-muted/60 hover:text-foreground"
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
