"use client";

import React, { useState } from "react";
import { Wrench, AlertTriangle, Eye, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { mockMaintenanceSettings } from "@/lib/mock/admin-settings";
import { UnsavedChangesBanner } from "../_components/UnsavedChangesBanner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MaintenanceSettingsPage() {
  const [settings, setSettings] = useState(mockMaintenanceSettings);
  const [initialSettings, setInitialSettings] = useState(mockMaintenanceSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const handleChange = (key: keyof typeof mockMaintenanceSettings, value: any) => {
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
          <Wrench className="w-6 h-6 text-[#D4A72C]" />
          Maintenance Mode
        </h1>
        <p className="text-slate-500 text-sm mt-1">Temporarily disable student access for updates or emergency fixes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Maintenance Toggle */}
        <div className={`rounded-xl shadow-sm border p-6 space-y-6 transition-colors ${settings.enabled ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-start">
            <h2 className={`text-lg font-bold flex items-center gap-2 ${settings.enabled ? 'text-amber-800' : 'text-[#0B2545]'}`}>
              {settings.enabled ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <Wrench className="w-5 h-5 text-slate-500" />}
              Status: {settings.enabled ? "Active" : "Disabled"}
            </h2>
            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${settings.enabled ? 'bg-amber-500' : 'bg-slate-300'}`} onClick={() => handleChange("enabled", !settings.enabled)}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
          </div>
          
          {settings.enabled && (
            <div className="p-4 bg-amber-100 rounded-lg text-amber-900 text-sm border border-amber-200 animate-in fade-in">
              <ShieldAlert className="w-5 h-5 inline mr-2 -mt-0.5" />
              <strong>Platform maintenance mode is active.</strong> Students will see the maintenance page. Admins can still access the dashboard.
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className={`text-sm font-semibold ${settings.enabled ? 'text-amber-900' : 'text-slate-700'}`}>Maintenance Message</label>
              <textarea 
                className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white min-h-[100px]"
                value={settings.message}
                onChange={(e) => handleChange("message", e.target.value)}
                placeholder="We are currently performing scheduled maintenance. Please check back soon."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`text-sm font-semibold ${settings.enabled ? 'text-amber-900' : 'text-slate-700'}`}>Start Time (Optional)</label>
                <Input 
                  type="datetime-local"
                  value={settings.startTime}
                  onChange={(e) => handleChange("startTime", e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className={`text-sm font-semibold ${settings.enabled ? 'text-amber-900' : 'text-slate-700'}`}>Expected End Time</label>
                <Input 
                  type="datetime-local"
                  value={settings.expectedEndTime}
                  onChange={(e) => handleChange("expectedEndTime", e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2 flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" /> Student Preview
          </h2>
          
          <p className="text-sm text-slate-600 mb-4">
            Preview how the maintenance page will appear to students attempting to access the platform.
          </p>
          
          <Button variant="outline" className="w-full" onClick={() => setPreviewOpen(true)}>
            <Eye className="w-4 h-4 mr-2" /> Open Preview
          </Button>
          
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Bypass IPs (Whitelist)</h3>
            <textarea 
              className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-slate-50 min-h-[80px] font-mono text-xs"
              placeholder="192.168.1.1&#10;10.0.0.1"
              readOnly
            />
            <p className="text-xs text-slate-500 mt-1">Configure in backend to bypass maintenance mode.</p>
          </div>
        </div>

      </div>

      {/* Maintenance Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Maintenance Preview</DialogTitle>
          </DialogHeader>
          <div className="py-8 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-[#0B2545] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">L<span className="text-[#D4A72C]">AI</span></span>
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800">Under Maintenance</h2>
            
            <p className="text-slate-600 px-4">
              {settings.message || "We are currently performing scheduled maintenance. Please check back soon."}
            </p>
            
            {settings.expectedEndTime && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg font-medium text-sm">
                Expected Return: {new Date(settings.expectedEndTime).toLocaleString()}
              </div>
            )}
            
            <p className="text-xs text-slate-500">support@loksewaai.com</p>
          </div>
        </DialogContent>
      </Dialog>

      <UnsavedChangesBanner 
        show={hasChanges} 
        onSave={handleSave} 
        onDiscard={() => setSettings(initialSettings)}
        isSaving={isSaving}
      />
    </div>
  );
}
