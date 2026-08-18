"use client";

import React, { useState } from "react";
import { ShieldAlert, Key, Lock, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { mockSecuritySettings } from "@/lib/mock/admin-settings";
import { UnsavedChangesBanner } from "../_components/UnsavedChangesBanner";

export default function SecuritySettingsPage() {
  const [settings, setSettings] = useState(mockSecuritySettings);
  const [initialSettings, setInitialSettings] = useState(mockSecuritySettings);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const handleChange = (key: keyof typeof mockSecuritySettings, value: any) => {
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
      <div>
        <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-[#D4A72C]" />
          Security & Access Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">Configure password policies, session limits, and admin enforcement rules.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Session & Access Limits */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2 flex items-center gap-2">
            <Lock className="w-5 h-5 text-slate-500" /> Session & Access
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Session Timeout (Minutes)</label>
                <Input 
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => handleChange("sessionTimeout", parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Lockout Duration (Mins)</label>
                <Input 
                  type="number"
                  value={settings.lockoutDuration}
                  onChange={(e) => handleChange("lockoutDuration", parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Max Failed Login Attempts</label>
              <Input 
                type="number"
                className="max-w-[200px]"
                value={settings.maxLoginAttempts}
                onChange={(e) => handleChange("maxLoginAttempts", parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <label className="flex items-start justify-between cursor-pointer group">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Require Email Verification</p>
                  <p className="text-xs text-slate-500 mt-0.5">New users must verify their email before accessing courses.</p>
                </div>
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.requireEmailVerification ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <input type="checkbox" className="sr-only" checked={settings.requireEmailVerification} onChange={(e) => handleChange("requireEmailVerification", e.target.checked)} />
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.requireEmailVerification ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>

              <label className="flex items-start justify-between cursor-pointer group">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Allow Multiple Sessions</p>
                  <p className="text-xs text-slate-500 mt-0.5">Allow users to log in from multiple devices simultaneously.</p>
                </div>
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.allowMultipleSessions ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <input type="checkbox" className="sr-only" checked={settings.allowMultipleSessions} onChange={(e) => handleChange("allowMultipleSessions", e.target.checked)} />
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.allowMultipleSessions ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>

              <label className="flex items-start justify-between cursor-pointer group">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Force Logout on Password Change</p>
                  <p className="text-xs text-slate-500 mt-0.5">Revoke all active sessions when a user changes their password.</p>
                </div>
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.forceLogoutOnChange ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <input type="checkbox" className="sr-only" checked={settings.forceLogoutOnChange} onChange={(e) => handleChange("forceLogoutOnChange", e.target.checked)} />
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.forceLogoutOnChange ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Password Policy */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2 flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-500" /> Password Policy
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Min Length</label>
                <Input 
                  type="number"
                  value={settings.passwordMinLength}
                  onChange={(e) => handleChange("passwordMinLength", parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Expiration (Days)</label>
                <Input 
                  type="number"
                  placeholder="0 for never"
                  value={settings.passwordExpirationDays}
                  onChange={(e) => handleChange("passwordExpirationDays", parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 w-4 h-4 text-emerald-600 focus:ring-emerald-500" checked={settings.passwordRequireUppercase} onChange={(e) => handleChange("passwordRequireUppercase", e.target.checked)} />
                <span className="text-sm text-slate-700">Require at least one uppercase letter (A-Z)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 w-4 h-4 text-emerald-600 focus:ring-emerald-500" checked={settings.passwordRequireLowercase} onChange={(e) => handleChange("passwordRequireLowercase", e.target.checked)} />
                <span className="text-sm text-slate-700">Require at least one lowercase letter (a-z)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 w-4 h-4 text-emerald-600 focus:ring-emerald-500" checked={settings.passwordRequireNumber} onChange={(e) => handleChange("passwordRequireNumber", e.target.checked)} />
                <span className="text-sm text-slate-700">Require at least one number (0-9)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 w-4 h-4 text-emerald-600 focus:ring-emerald-500" checked={settings.passwordRequireSpecial} onChange={(e) => handleChange("passwordRequireSpecial", e.target.checked)} />
                <span className="text-sm text-slate-700">Require at least one special character (!@#$%)</span>
              </label>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg mt-4">
              <p className="text-xs font-semibold text-slate-600 mb-2">Password Strength Preview:</p>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-300 ${
                  settings.passwordMinLength >= 12 && settings.passwordRequireNumber && settings.passwordRequireSpecial ? 'w-full bg-emerald-500' :
                  settings.passwordMinLength >= 8 && settings.passwordRequireNumber ? 'w-2/3 bg-amber-500' :
                  'w-1/3 bg-red-500'
                }`} />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Backend enforcement will strictly validate against these rules.</p>
            </div>
          </div>
        </div>

        {/* Admin Security Rules */}
        <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-6 space-y-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-red-800 border-b border-red-200 pb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" /> Admin Security Enforcements
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="flex items-start justify-between cursor-pointer group">
                <div>
                  <p className="text-sm font-semibold text-red-900">Require 2FA for Admins</p>
                  <p className="text-xs text-red-700 mt-0.5">Force all admin accounts to configure two-factor authentication.</p>
                </div>
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.requireAdmin2fa ? 'bg-red-600' : 'bg-red-200'}`}>
                  <input type="checkbox" className="sr-only" checked={settings.requireAdmin2fa} onChange={(e) => handleChange("requireAdmin2fa", e.target.checked)} />
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.requireAdmin2fa ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>

              <label className="flex items-start justify-between cursor-pointer group">
                <div>
                  <p className="text-sm font-semibold text-red-900">Require Confirmation</p>
                  <p className="text-xs text-red-700 mt-0.5">Require explicit confirmation typed out for destructive actions.</p>
                </div>
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.requireConfirmDestructive ? 'bg-red-600' : 'bg-red-200'}`}>
                  <input type="checkbox" className="sr-only" checked={settings.requireConfirmDestructive} onChange={(e) => handleChange("requireConfirmDestructive", e.target.checked)} />
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.requireConfirmDestructive ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-start justify-between cursor-pointer group">
                <div>
                  <p className="text-sm font-semibold text-red-900">Enable Security Event Logging</p>
                  <p className="text-xs text-red-700 mt-0.5">Record all admin configuration changes and login events.</p>
                </div>
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.enableSecurityLogging ? 'bg-red-600' : 'bg-red-200'}`}>
                  <input type="checkbox" className="sr-only" checked={settings.enableSecurityLogging} onChange={(e) => handleChange("enableSecurityLogging", e.target.checked)} />
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.enableSecurityLogging ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>
              
              <div className="p-3 bg-red-100 rounded-lg text-sm text-red-800 flex items-start gap-2 border border-red-200">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <p><strong>Note:</strong> Security enforcement must be handled server-side. These frontend toggles control the strictness of backend policies.</p>
              </div>
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
