"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Bell, ExternalLink, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockNotificationSettings } from "@/lib/mock/admin-settings";
import { UnsavedChangesBanner } from "../_components/UnsavedChangesBanner";

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState(mockNotificationSettings);
  const [initialSettings, setInitialSettings] = useState(mockNotificationSettings);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const handleChange = (key: keyof typeof mockNotificationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setInitialSettings(settings);
      setIsSaving(false);
    }, 800);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#D4A72C]" />
            Notification Settings
          </h1>
          <p className="text-slate-500 text-sm mt-1">Configure global notification channels, quiet hours, and retention policies.</p>
        </div>
        <Link href="/admin-dashboard/notifications">
          <Button variant="outline" className="gap-2 bg-white text-[#0B2545]">
            <ExternalLink className="w-4 h-4" /> Notification Management
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Global Channels */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2">Global Channels</h2>
          
          <div className="space-y-4">
            <label className="flex items-start justify-between cursor-pointer group">
              <div>
                <p className="text-sm font-semibold text-slate-700">In-App Notifications</p>
                <p className="text-xs text-slate-500 mt-0.5">Show notifications within the student dashboard.</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.inApp ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={settings.inApp} onChange={(e) => handleChange("inApp", e.target.checked)} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.inApp ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>

            <label className="flex items-start justify-between cursor-pointer group pt-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-700">Email Notifications</p>
                <p className="text-xs text-slate-500 mt-0.5">Send critical updates via email.</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.email ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={settings.email} onChange={(e) => handleChange("email", e.target.checked)} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.email ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>
            
            <label className="flex items-start justify-between cursor-pointer group pt-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-700">Push Notifications</p>
                <p className="text-xs text-slate-500 mt-0.5">Send web push notifications to devices.</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.push ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={settings.push} onChange={(e) => handleChange("push", e.target.checked)} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.push ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>
            
            <label className="flex items-start justify-between cursor-pointer group pt-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-700">SMS Notifications</p>
                <p className="text-xs text-slate-500 mt-0.5">Send SMS alerts for high-priority events (e.g., OTP).</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.sms ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={settings.sms} onChange={(e) => handleChange("sms", e.target.checked)} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.sms ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>
          </div>
        </div>

        {/* Quiet Hours & Retention */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2 flex items-center gap-2">
              <Moon className="w-5 h-5 text-indigo-500" /> Quiet Hours
            </h2>
            
            <div className="space-y-4">
              <label className="flex items-start justify-between cursor-pointer group">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Enable Quiet Hours</p>
                  <p className="text-xs text-slate-500 mt-0.5">Delay non-critical emails and push notifications during this time.</p>
                </div>
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.quietHoursEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                  <input type="checkbox" className="sr-only" checked={settings.quietHoursEnabled} onChange={(e) => handleChange("quietHoursEnabled", e.target.checked)} />
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.quietHoursEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>

              {settings.quietHoursEnabled && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Start Time</label>
                    <Input 
                      type="time"
                      value={settings.quietHoursStart}
                      onChange={(e) => handleChange("quietHoursStart", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">End Time</label>
                    <Input 
                      type="time"
                      value={settings.quietHoursEnd}
                      onChange={(e) => handleChange("quietHoursEnd", e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2">Data Retention</h2>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Notification History Retention (Days)</label>
              <Input 
                type="number"
                value={settings.retentionDays}
                onChange={(e) => handleChange("retentionDays", parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-slate-500 mt-1">Read notifications older than this will be permanently deleted.</p>
            </div>
          </div>
        </div>
        
      </div>

      <UnsavedChangesBanner 
        show={hasChanges} 
        onSave={handleSave} 
        onDiscard={() => setSettings(initialSettings)}
        isSaving={isSaving}
      />
    </div>
  );
}
