"use client";

import React, { useState } from "react";
import { Globe, Image as ImageIcon, Phone, Mail, Building, Clock, MapPin, Undo2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { mockGeneralSettings } from "@/lib/mock/admin-settings";
import { UnsavedChangesBanner } from "../_components/UnsavedChangesBanner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState(mockGeneralSettings);
  const [initialSettings, setInitialSettings] = useState(mockGeneralSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const handleChange = (key: keyof typeof mockGeneralSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setInitialSettings(settings);
      setIsSaving(false);
    }, 800);
  };

  const handleDiscard = () => {
    setSettings(initialSettings);
  };

  const handleReset = () => {
    setSettings(mockGeneralSettings);
    setInitialSettings(mockGeneralSettings);
    setResetModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#D4A72C]" />
            General Settings
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage core platform identity, branding, and contact details.</p>
        </div>
        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setResetModalOpen(true)}>
          <Undo2 className="w-4 h-4 mr-2" /> Reset to Default
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* General Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2">Platform Details</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Platform Name *</label>
                  <Input 
                    value={settings.platformName} 
                    onChange={(e) => handleChange("platformName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Website URL</label>
                  <Input 
                    value={settings.websiteUrl} 
                    onChange={(e) => handleChange("websiteUrl", e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Platform Description</label>
                <textarea 
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm min-h-[80px]"
                  value={settings.platformDescription}
                  onChange={(e) => handleChange("platformDescription", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Timezone</label>
                  <select 
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                    value={settings.timezone}
                    onChange={(e) => handleChange("timezone", e.target.value)}
                  >
                    <option>Asia/Kathmandu</option>
                    <option>Asia/Kolkata</option>
                    <option>UTC</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Currency</label>
                  <select 
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                    value={settings.currency}
                    onChange={(e) => handleChange("currency", e.target.value)}
                  >
                    <option>NPR</option>
                    <option>INR</option>
                    <option>USD</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Default Language</label>
                  <select 
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                    value={settings.defaultLanguage}
                    onChange={(e) => handleChange("defaultLanguage", e.target.value)}
                  >
                    <option>en-US</option>
                    <option>ne-NP</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2">Contact Information</h2>
            <p className="text-sm text-slate-500 mb-4">This information will be displayed publicly on the footer and help pages.</p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" /> Support Email
                  </label>
                  <Input 
                    type="email"
                    value={settings.supportEmail} 
                    onChange={(e) => handleChange("supportEmail", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" /> Support Phone
                  </label>
                  <Input 
                    value={settings.supportPhone} 
                    onChange={(e) => handleChange("supportPhone", e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" /> Office Address
                  </label>
                  <Input 
                    value={settings.officeAddress} 
                    onChange={(e) => handleChange("officeAddress", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" /> Business Hours
                  </label>
                  <Input 
                    value={settings.businessHours} 
                    onChange={(e) => handleChange("businessHours", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2">Platform Branding</h2>
            
            <div className="space-y-4">
              <div className="p-4 border border-slate-200 border-dashed rounded-lg bg-slate-50 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#0B2545] rounded-lg flex items-center justify-center mb-3">
                  <span className="text-white font-bold text-xl">L<span className="text-[#D4A72C]">AI</span></span>
                </div>
                <p className="font-semibold text-sm text-[#0B2545] mb-1">Primary Logo</p>
                <p className="text-xs text-slate-500 mb-3">Recommended: 400x100px PNG</p>
                <Button variant="outline" size="sm" className="bg-white">Upload New</Button>
              </div>

              <div className="p-4 border border-slate-200 border-dashed rounded-lg bg-slate-50 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-white border border-slate-200 rounded-lg flex items-center justify-center mb-3 shadow-sm">
                  <span className="text-[#0B2545] font-bold">L</span>
                </div>
                <p className="font-semibold text-sm text-[#0B2545] mb-1">Favicon</p>
                <p className="text-xs text-slate-500 mb-3">Recommended: 32x32px ICO/PNG</p>
                <Button variant="outline" size="sm" className="bg-white">Upload New</Button>
              </div>
            </div>
          </div>
        </div>
        
      </div>

      <UnsavedChangesBanner 
        show={hasChanges} 
        onSave={handleSave} 
        onDiscard={handleDiscard}
        isSaving={isSaving}
      />

      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Undo2 className="w-5 h-5" /> Reset General Settings
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to reset all General Settings to their system defaults? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setResetModalOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleReset}>Reset to Default</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
