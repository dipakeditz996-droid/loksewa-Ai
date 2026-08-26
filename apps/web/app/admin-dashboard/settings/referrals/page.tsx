"use client";

import React, { useEffect, useState } from "react";
import { gamificationService, ReferralSettings } from "@/lib/api/gamification";
import { Button } from "@/components/ui/button";
import { Save, RefreshCcw, Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminReferralSettingsPage() {
  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const data = await gamificationService.getAdminReferralSettings();
      setSettings(data);
    } catch (e: any) {
      setError(e.message || "Failed to load referral settings from the backend.");
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (field: keyof ReferralSettings, value: any) => {
    if (settings) {
      setSettings({ ...settings, [field]: value });
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await gamificationService.updateAdminReferralSettings(settings);
      toast.success("Referral settings saved successfully.");
    } catch (e: any) {
      toast.error(e.message || "Failed to save settings. Ensure the backend is running.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Referral &amp; Gamification Settings</h1>
          <p className="text-slate-500 mt-1">Configure XP rewards, level thresholds, and referral conditions.</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-4">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <div>
            <h3 className="font-bold text-red-700 text-lg">Failed to Load Settings</h3>
            <p className="text-red-600 text-sm mt-1 max-w-md">{error}</p>
          </div>
          <Button variant="outline" onClick={loadSettings} className="border-red-300 text-red-700 hover:bg-red-100">
            <RefreshCcw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Referral &amp; Gamification Settings</h1>
          <p className="text-slate-500 mt-1">Configure XP rewards, level thresholds, and referral conditions.</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={loadSettings} disabled={saving}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
          <Button className="bg-[#0B2545] hover:bg-[#0B2545]/90" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Settings
          </Button>
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800">System Status</h2>
          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={settings.is_enabled}
                onChange={(e) => handleChange('is_enabled', e.target.checked)}
              />
              <div className={`block w-14 h-8 rounded-full transition-colors ${settings.is_enabled ? 'bg-green-500' : 'bg-slate-300'}`}></div>
              <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${settings.is_enabled ? 'transform translate-x-6' : ''}`}></div>
            </div>
            <div className="ml-3 text-sm font-medium text-slate-700">
              {settings.is_enabled ? 'Enabled' : 'Disabled'}
            </div>
          </label>
        </div>
      </div>

      {/* Rewards Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Reward Amounts</h2>
          <p className="text-sm text-slate-500">Configure what students earn for successful referrals.</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

          <div className="space-y-6">
            <h3 className="font-semibold text-slate-700 border-b pb-2">Referrer (Student who invites)</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">XP Reward</label>
              <div className="relative">
                <input
                  type="number"
                  value={settings.referrer_xp_reward}
                  onChange={(e) => handleChange('referrer_xp_reward', parseInt(e.target.value) || 0)}
                  className="w-full pl-4 pr-12 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B2545] outline-none"
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 text-sm font-bold">XP</div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Coins Reward</label>
              <div className="relative">
                <input
                  type="number"
                  value={settings.referrer_coins_reward}
                  onChange={(e) => handleChange('referrer_coins_reward', parseInt(e.target.value) || 0)}
                  className="w-full pl-4 pr-16 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B2545] outline-none"
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 text-sm font-bold">Coins</div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="font-semibold text-slate-700 border-b pb-2">Referred Student (New User)</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">XP Reward</label>
              <div className="relative">
                <input
                  type="number"
                  value={settings.referred_xp_reward}
                  onChange={(e) => handleChange('referred_xp_reward', parseInt(e.target.value) || 0)}
                  className="w-full pl-4 pr-12 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B2545] outline-none"
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 text-sm font-bold">XP</div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Coins Reward</label>
              <div className="relative">
                <input
                  type="number"
                  value={settings.referred_coins_reward}
                  onChange={(e) => handleChange('referred_coins_reward', parseInt(e.target.value) || 0)}
                  className="w-full pl-4 pr-16 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B2545] outline-none"
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 text-sm font-bold">Coins</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Rules & Qualifications */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Qualification Rules</h2>
          <p className="text-sm text-slate-500">Define what action the new user must take to unlock the reward.</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Required Action</label>
            <select
              value={settings.qualification_action}
              onChange={(e) => handleChange('qualification_action', e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B2545] outline-none bg-white"
            >
              <option value="signup">Just Account Registration (Immediate)</option>
              <option value="verified">Account Verification (Email/Phone)</option>
              <option value="first_exam">Completion of First Exam</option>
              <option value="first_game">Completion of First Game</option>
            </select>
            <p className="text-xs text-slate-500 mt-2">
              If set to anything other than registration, the referral will remain &quot;Pending&quot; until the action is completed.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Reward Processing</label>
            <select
              value={settings.reward_processing}
              onChange={(e) => handleChange('reward_processing', e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B2545] outline-none bg-white"
            >
              <option value="automatic">Automatic (Instant Payout)</option>
              <option value="manual">Manual Approval (Admin must review)</option>
            </select>
            <p className="text-xs text-slate-500 mt-2">
              Manual approval requires admins to manually verify and click &quot;Approve&quot; in the referrals table.
            </p>
          </div>

        </div>
      </div>

      {/* Level System */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Level &amp; Progression System</h2>
          <p className="text-sm text-slate-500">Configure how XP translates into Student Levels.</p>
        </div>
        <div className="p-6">
          <div className="max-w-md">
            <label className="block text-sm font-medium text-slate-700 mb-1">XP Required Per Level (Fixed)</label>
            <div className="relative">
              <input
                type="number"
                value={settings.xp_per_level}
                onChange={(e) => handleChange('xp_per_level', parseInt(e.target.value) || 1000)}
                className="w-full pl-4 pr-12 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B2545] outline-none"
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 text-sm font-bold">XP</div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Example: If 1,000 XP, then Level 2 requires 1,000 XP, Level 3 requires 2,000 XP, etc.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
