"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Store, ExternalLink, ShieldCheck, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockMarketplaceSettings } from "@/lib/mock/admin-settings";
import { UnsavedChangesBanner } from "../_components/UnsavedChangesBanner";

export default function MarketplaceSettingsPage() {
  const [settings, setSettings] = useState(mockMarketplaceSettings);
  const [initialSettings, setInitialSettings] = useState(mockMarketplaceSettings);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const handleChange = (key: keyof typeof mockMarketplaceSettings, value: any) => {
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
            <Store className="w-6 h-6 text-[#D4A72C]" />
            Marketplace Settings
          </h1>
          <p className="text-slate-500 text-sm mt-1">Configure global store behavior, checkout flows, and payment rules.</p>
        </div>
        <Link href="/admin-dashboard/marketplace">
          <Button variant="outline" className="gap-2 bg-white text-[#0B2545]">
            <ExternalLink className="w-4 h-4" /> Marketplace Management
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Marketplace Rules */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2">Store Configuration</h2>
          
          <div className="space-y-4">
            <label className="flex items-start justify-between cursor-pointer group">
              <div>
                <p className="text-sm font-semibold text-slate-700">Marketplace Enabled</p>
                <p className="text-xs text-slate-500 mt-0.5">Toggle the visibility of the marketplace for students.</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={settings.enabled} onChange={(e) => handleChange("enabled", e.target.checked)} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>

            <label className="flex items-start justify-between cursor-pointer group pt-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-700">Allow Purchases</p>
                <p className="text-xs text-slate-500 mt-0.5">Allow students to checkout. If disabled, store acts as a catalog.</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.allowPurchases ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={settings.allowPurchases} onChange={(e) => handleChange("allowPurchases", e.target.checked)} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.allowPurchases ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>
            
            <label className="flex items-start justify-between cursor-pointer group pt-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-700">Allow Global Discounts</p>
                <p className="text-xs text-slate-500 mt-0.5">Enable sale pricing display on products.</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.allowDiscounts ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={settings.allowDiscounts} onChange={(e) => handleChange("allowDiscounts", e.target.checked)} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.allowDiscounts ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>

            <label className="flex items-start justify-between cursor-pointer group pt-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-700">Allow Coupon Codes</p>
                <p className="text-xs text-slate-500 mt-0.5">Display the coupon code input during checkout.</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.allowCoupons ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={settings.allowCoupons} onChange={(e) => handleChange("allowCoupons", e.target.checked)} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.allowCoupons ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>

            <label className="flex items-start justify-between cursor-pointer group pt-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-700">Allow Refund Requests</p>
                <p className="text-xs text-slate-500 mt-0.5">Students can request refunds via the support ticket system.</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.allowRefunds ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={settings.allowRefunds} onChange={(e) => handleChange("allowRefunds", e.target.checked)} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.allowRefunds ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>
          </div>
        </div>

        {/* Payment & Verification */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" /> Payment & Verification
            </h2>
            
            <div className="space-y-4">
              <label className="flex items-start justify-between cursor-pointer group">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Require Payment Verification</p>
                  <p className="text-xs text-slate-500 mt-0.5">Enforce manual or automated validation of transaction codes.</p>
                </div>
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.requirePaymentVerification ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <input type="checkbox" className="sr-only" checked={settings.requirePaymentVerification} onChange={(e) => handleChange("requirePaymentVerification", e.target.checked)} />
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.requirePaymentVerification ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>

              <label className="flex items-start justify-between cursor-pointer group pt-3 border-t border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Auto-Grant Access</p>
                  <p className="text-xs text-slate-500 mt-0.5">Automatically unlock content upon purchase without admin approval.</p>
                </div>
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autoGrantAccess ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <input type="checkbox" className="sr-only" checked={settings.autoGrantAccess} onChange={(e) => handleChange("autoGrantAccess", e.target.checked)} />
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.autoGrantAccess ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>

              {!settings.autoGrantAccess && (
                <div className="p-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-sm mt-2 animate-in fade-in">
                  <ShieldCheck className="w-4 h-4 inline mr-1 -mt-0.5" />
                  <strong>Payment approval is required before access is granted.</strong> Students will see an "Awaiting Verification" status after checkout.
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h2 className="text-lg font-bold text-[#0B2545] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-500" /> Payment Methods
              </h2>
              <Link href="/admin-dashboard/marketplace/payment-methods">
                <Button variant="ghost" size="sm" className="text-blue-600">Manage Methods</Button>
              </Link>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded flex items-center justify-center text-white font-bold text-xs">eSewa</div>
                  <div>
                    <p className="font-semibold text-sm text-[#0B2545]">eSewa Digital Wallet</p>
                    <p className="text-xs text-slate-500">Live API Integrated</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Active</span>
              </div>
              
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-600 rounded flex items-center justify-center text-white font-bold text-xs">Khalti</div>
                  <div>
                    <p className="font-semibold text-sm text-[#0B2545]">Khalti Digital Wallet</p>
                    <p className="text-xs text-slate-500">Live API Integrated</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Active</span>
              </div>
              
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center text-white font-bold text-xs">Bank</div>
                  <div>
                    <p className="font-semibold text-sm text-[#0B2545]">Direct Bank Transfer</p>
                    <p className="text-xs text-slate-500">Requires manual screenshot verification</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Active</span>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-100">
              <span className="font-bold text-[#0B2545] block mb-1">Secret Credentials</span>
              Live payment provider API secrets and merchant IDs are configured securely in the environment backend and cannot be exposed here.
            </p>
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
