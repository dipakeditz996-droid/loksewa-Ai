"use client";

import React, { useState } from "react";
import { HardDrive, Cloud, FileText, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { mockStorageSettings } from "@/lib/mock/admin-settings";
import { UnsavedChangesBanner } from "../_components/UnsavedChangesBanner";
import { Badge } from "@/components/ui/badge";

export default function StorageSettingsPage() {
  const [settings, setSettings] = useState(mockStorageSettings);
  const [initialSettings, setInitialSettings] = useState(mockStorageSettings);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const handleChange = (key: keyof typeof mockStorageSettings, value: any) => {
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
          <HardDrive className="w-6 h-6 text-[#D4A72C]" />
          Storage & Upload Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">Manage file upload limits, allowed extensions, and storage providers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Provider Configuration */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-500" /> Storage Provider
          </h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Active Storage Provider</label>
              <select 
                className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                value={settings.provider}
                onChange={(e) => handleChange("provider", e.target.value)}
              >
                <option>Local Filesystem</option>
                <option>AWS S3</option>
                <option>Google Cloud Storage</option>
                <option>DigitalOcean Spaces</option>
              </select>
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-100">
                <span className="font-bold text-[#0B2545] block mb-1">Secure Credentials</span>
                Storage bucket names, regions, and secret access keys are securely configured in the environment variables and are not exposed here.
              </p>
            </div>
          </div>
        </div>

        {/* Global Upload Limits */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-slate-500" /> Global Upload Limits
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Max Image Size (MB)</label>
                <Input 
                  type="number"
                  value={settings.maxImageSize}
                  onChange={(e) => handleChange("maxImageSize", parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Max Document Size (MB)</label>
                <Input 
                  type="number"
                  value={settings.maxDocSize}
                  onChange={(e) => handleChange("maxDocSize", parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Max Uploads Per Request</label>
              <Input 
                type="number"
                className="max-w-[200px]"
                value={settings.maxUploadsPerRequest}
                onChange={(e) => handleChange("maxUploadsPerRequest", parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-slate-500">Limits bulk uploads (e.g., Question image galleries) in a single request.</p>
            </div>
          </div>
        </div>
        
        {/* Allowed File Types */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2">Allowed Extensions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-slate-700">Images</h3>
              </div>
              <p className="text-xs text-slate-500">Profile pictures, payment screenshots, and exam diagrams.</p>
              
              <div className="flex flex-wrap gap-2">
                {['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].map(ext => (
                  <Badge 
                    key={ext}
                    variant="outline" 
                    className={`cursor-pointer transition-colors ${settings.allowedImageTypes.includes(ext) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                    onClick={() => {
                      const newTypes = settings.allowedImageTypes.includes(ext)
                        ? settings.allowedImageTypes.filter(t => t !== ext)
                        : [...settings.allowedImageTypes, ext];
                      handleChange("allowedImageTypes", newTypes);
                    }}
                  >
                    .{ext}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-slate-700">Documents</h3>
              </div>
              <p className="text-xs text-slate-500">Study materials, syllabus uploads, and bulk question imports.</p>
              
              <div className="flex flex-wrap gap-2">
                {['pdf', 'doc', 'docx', 'csv', 'xlsx', 'txt', 'zip'].map(ext => (
                  <Badge 
                    key={ext}
                    variant="outline" 
                    className={`cursor-pointer transition-colors ${settings.allowedDocTypes.includes(ext) ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                    onClick={() => {
                      const newTypes = settings.allowedDocTypes.includes(ext)
                        ? settings.allowedDocTypes.filter(t => t !== ext)
                        : [...settings.allowedDocTypes, ext];
                      handleChange("allowedDocTypes", newTypes);
                    }}
                  >
                    .{ext}
                  </Badge>
                ))}
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
