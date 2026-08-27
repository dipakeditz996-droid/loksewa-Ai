"use client";

import React, { useState, useEffect } from "react";
import {
  Settings, Server, Mail, Bell, Shield, Zap, Loader2, Check, X,
  Clock, Lock, AlertCircle, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi, AdminSettingsData } from "@/lib/api/admin";

type TabType = "platform" | "email" | "notifications" | "security" | "features";

interface FormData {
  platform: AdminSettingsData["platform"];
  email: AdminSettingsData["email"];
  notifications: AdminSettingsData["notifications"];
  security: AdminSettingsData["security"];
  features: AdminSettingsData["features"];
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("platform");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    platform: {
      name: "",
      logoUrl: null,
      description: "",
      timezone: "UTC",
      language: "en",
    },
    email: {
      smtpHost: "",
      smtpPort: 587,
      smtpUser: "",
      fromAddress: "",
      fromName: "",
    },
    notifications: {
      enabled: true,
      enableEmail: true,
      enableInApp: true,
      enablePush: false,
    },
    security: {
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireNumbers: true,
      passwordRequireSpecialChars: true,
      sessionTimeoutMinutes: 60,
      enableTwoFactorAuth: false,
      maxLoginAttempts: 5,
    },
    features: {
      enableAiTutor: true,
      enableMarketplace: true,
      enableGamification: true,
      enableStudyPlans: true,
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getSettings();
      setFormData(response.settings);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      setSaveMessage({ type: "error", text: "Failed to load settings" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const dataToSend: any = {};

      if (activeTab === "platform") {
        dataToSend.platform = formData.platform;
      } else if (activeTab === "email") {
        dataToSend.email = formData.email;
      } else if (activeTab === "notifications") {
        dataToSend.notifications = formData.notifications;
      } else if (activeTab === "security") {
        dataToSend.security = formData.security;
      } else if (activeTab === "features") {
        dataToSend.features = formData.features;
      }

      await adminApi.updateSettings(dataToSend);
      setSaveMessage({ type: "success", text: "Settings saved successfully!" });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setIsSaving(false);
    }
  };

  const updateFormData = (category: TabType, key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: "platform", label: "Platform", icon: <Server className="w-4 h-4" /> },
    { id: "email", label: "Email", icon: <Mail className="w-4 h-4" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
    { id: "security", label: "Security", icon: <Shield className="w-4 h-4" /> },
    { id: "features", label: "Features", icon: <Zap className="w-4 h-4" /> },
  ];

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-center items-center h-96">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-amber-500" />
          Platform Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">Configure global platform behavior and system preferences.</p>
      </div>

      {/* Message */}
      {saveMessage && (
        <div className={`p-4 rounded-lg border flex items-center gap-3 ${
          saveMessage.type === "success"
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {saveMessage.type === "success" ? (
            <Check className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{saveMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Sidebar Tabs */}
        <div className="flex flex-col lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium border-b border-slate-200 last:border-b-0 transition ${
                  activeTab === tab.id
                    ? "bg-blue-50 text-blue-600 border-l-4 border-l-blue-600"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            {/* Platform Settings */}
            {activeTab === "platform" && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-500" />
                  Platform Settings
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Platform Name
                    </label>
                    <Input
                      value={formData.platform.name}
                      onChange={(e) => updateFormData("platform", "name", e.target.value)}
                      placeholder="e.g., Loksewa"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Language
                    </label>
                    <select
                      value={formData.platform.language}
                      onChange={(e) => updateFormData("platform", "language", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    >
                      <option value="en">English</option>
                      <option value="ne">Nepali</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Platform Description
                  </label>
                  <textarea
                    value={formData.platform.description}
                    onChange={(e) => updateFormData("platform", "description", e.target.value)}
                    placeholder="Describe your platform..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Platform Logo URL
                  </label>
                  <Input
                    type="url"
                    value={formData.platform.logoUrl || ""}
                    onChange={(e) => updateFormData("platform", "logoUrl", e.target.value || null)}
                    placeholder="https://example.com/logo.png"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Timezone
                  </label>
                  <select
                    value={formData.platform.timezone}
                    onChange={(e) => updateFormData("platform", "timezone", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  >
                    <option value="UTC">UTC</option>
                    <option value="Asia/Kathmandu">Asia/Kathmandu (Nepal)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (India)</option>
                    <option value="Asia/Bangkok">Asia/Bangkok (Thailand)</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Europe/London">Europe/London</option>
                  </select>
                </div>
              </div>
            )}

            {/* Email Settings */}
            {activeTab === "email" && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-500" />
                  Email Settings
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      SMTP Host
                    </label>
                    <Input
                      value={formData.email.smtpHost}
                      onChange={(e) => updateFormData("email", "smtpHost", e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      SMTP Port
                    </label>
                    <Input
                      type="number"
                      value={formData.email.smtpPort || ""}
                      onChange={(e) => updateFormData("email", "smtpPort", parseInt(e.target.value))}
                      placeholder="587"
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    SMTP Username/Email
                  </label>
                  <Input
                    value={formData.email.smtpUser}
                    onChange={(e) => updateFormData("email", "smtpUser", e.target.value)}
                    placeholder="your-email@gmail.com"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    From Address
                  </label>
                  <Input
                    type="email"
                    value={formData.email.fromAddress}
                    onChange={(e) => updateFormData("email", "fromAddress", e.target.value)}
                    placeholder="noreply@loksewa.com"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    From Name
                  </label>
                  <Input
                    value={formData.email.fromName}
                    onChange={(e) => updateFormData("email", "fromName", e.target.value)}
                    placeholder="Loksewa Support"
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === "notifications" && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-500" />
                  Notification Settings
                </h2>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formData.notifications.enabled}
                      onChange={(e) => updateFormData("notifications", "enabled", e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <div>
                      <p className="font-medium text-slate-900">Enable Notifications</p>
                      <p className="text-xs text-slate-600">Allow the system to send notifications</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formData.notifications.enableEmail}
                      onChange={(e) => updateFormData("notifications", "enableEmail", e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <div>
                      <p className="font-medium text-slate-900">Email Notifications</p>
                      <p className="text-xs text-slate-600">Send notifications via email</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formData.notifications.enableInApp}
                      onChange={(e) => updateFormData("notifications", "enableInApp", e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <div>
                      <p className="font-medium text-slate-900">In-App Notifications</p>
                      <p className="text-xs text-slate-600">Show notifications within the app</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formData.notifications.enablePush}
                      onChange={(e) => updateFormData("notifications", "enablePush", e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <div>
                      <p className="font-medium text-slate-900">Push Notifications</p>
                      <p className="text-xs text-slate-600">Send push notifications to mobile devices</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === "security" && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  Security Settings
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Minimum Password Length
                    </label>
                    <Input
                      type="number"
                      value={formData.security.passwordMinLength}
                      onChange={(e) => updateFormData("security", "passwordMinLength", parseInt(e.target.value))}
                      min="6"
                      max="20"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Session Timeout (minutes)
                    </label>
                    <Input
                      type="number"
                      value={formData.security.sessionTimeoutMinutes}
                      onChange={(e) => updateFormData("security", "sessionTimeoutMinutes", parseInt(e.target.value))}
                      min="15"
                      max="480"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Max Login Attempts
                    </label>
                    <Input
                      type="number"
                      value={formData.security.maxLoginAttempts}
                      onChange={(e) => updateFormData("security", "maxLoginAttempts", parseInt(e.target.value))}
                      min="3"
                      max="20"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">Password Requirements</p>

                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formData.security.passwordRequireUppercase}
                      onChange={(e) => updateFormData("security", "passwordRequireUppercase", e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-slate-700">Require uppercase letters (A-Z)</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formData.security.passwordRequireNumbers}
                      onChange={(e) => updateFormData("security", "passwordRequireNumbers", e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-slate-700">Require numbers (0-9)</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formData.security.passwordRequireSpecialChars}
                      onChange={(e) => updateFormData("security", "passwordRequireSpecialChars", e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-slate-700">Require special characters (!@#$%^&*)</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formData.security.enableTwoFactorAuth}
                      onChange={(e) => updateFormData("security", "enableTwoFactorAuth", e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <div>
                      <p className="font-medium text-slate-900">Two-Factor Authentication</p>
                      <p className="text-xs text-slate-600">Require 2FA for admin accounts</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Feature Flags */}
            {activeTab === "features" && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-500" />
                  Feature Settings
                </h2>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formData.features.enableAiTutor}
                      onChange={(e) => updateFormData("features", "enableAiTutor", e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <div>
                      <p className="font-medium text-slate-900">AI Tutor</p>
                      <p className="text-xs text-slate-600">Enable AI-powered tutoring feature</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formData.features.enableMarketplace}
                      onChange={(e) => updateFormData("features", "enableMarketplace", e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <div>
                      <p className="font-medium text-slate-900">Marketplace</p>
                      <p className="text-xs text-slate-600">Enable student marketplace for study materials</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formData.features.enableGamification}
                      onChange={(e) => updateFormData("features", "enableGamification", e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <div>
                      <p className="font-medium text-slate-900">Gamification</p>
                      <p className="text-xs text-slate-600">Enable points, badges, and leaderboards</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formData.features.enableStudyPlans}
                      onChange={(e) => updateFormData("features", "enableStudyPlans", e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <div>
                      <p className="font-medium text-slate-900">Study Plans</p>
                      <p className="text-xs text-slate-600">Enable personalized study plan generation</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={fetchSettings}
              >
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
