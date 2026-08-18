"use client";

import React, { useState } from "react";
import { Palette, Sun, Moon, Monitor } from "lucide-react";
import { mockAppearanceSettings } from "@/lib/mock/admin-settings";
import { UnsavedChangesBanner } from "../_components/UnsavedChangesBanner";
import { Input } from "@/components/ui/input";

export default function AppearanceSettingsPage() {
  const [settings, setSettings] = useState(mockAppearanceSettings);
  const [initialSettings, setInitialSettings] = useState(mockAppearanceSettings);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const handleChange = (key: keyof typeof mockAppearanceSettings, value: any) => {
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
          <Palette className="w-6 h-6 text-[#D4A72C]" />
          Appearance Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">Configure themes, brand colors, and layout preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Global Theme */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2">Default Theme</h2>
          
          <div className="grid grid-cols-3 gap-4">
            <div 
              className={`border-2 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all ${settings.primaryTheme === 'light' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}
              onClick={() => handleChange('primaryTheme', 'light')}
            >
              <Sun className={`w-8 h-8 ${settings.primaryTheme === 'light' ? 'text-blue-500' : 'text-slate-400'}`} />
              <span className={`text-sm font-semibold ${settings.primaryTheme === 'light' ? 'text-blue-700' : 'text-slate-500'}`}>Light</span>
            </div>
            
            <div 
              className={`border-2 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all ${settings.primaryTheme === 'dark' ? 'border-indigo-500 bg-indigo-950' : 'border-slate-200 hover:border-indigo-300'}`}
              onClick={() => handleChange('primaryTheme', 'dark')}
            >
              <Moon className={`w-8 h-8 ${settings.primaryTheme === 'dark' ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span className={`text-sm font-semibold ${settings.primaryTheme === 'dark' ? 'text-indigo-300' : 'text-slate-500'}`}>Dark</span>
            </div>
            
            <div 
              className={`border-2 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all ${settings.primaryTheme === 'system' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`}
              onClick={() => handleChange('primaryTheme', 'system')}
            >
              <Monitor className={`w-8 h-8 ${settings.primaryTheme === 'system' ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span className={`text-sm font-semibold ${settings.primaryTheme === 'system' ? 'text-emerald-700' : 'text-slate-500'}`}>System</span>
            </div>
          </div>
        </div>

        {/* Layout & UI */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2">Layout & UI</h2>
          
          <div className="space-y-4">
            <label className="flex items-start justify-between cursor-pointer group">
              <div>
                <p className="text-sm font-semibold text-slate-700">Compact Admin Sidebar</p>
                <p className="text-xs text-slate-500 mt-0.5">Default to the collapsed, icon-only sidebar view.</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.compactSidebar ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={settings.compactSidebar} onChange={(e) => handleChange("compactSidebar", e.target.checked)} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.compactSidebar ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>

            <label className="flex items-start justify-between cursor-pointer group pt-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-700">Show Breadcrumbs</p>
                <p className="text-xs text-slate-500 mt-0.5">Display navigation breadcrumbs across the platform.</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.showBreadcrumbs ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={settings.showBreadcrumbs} onChange={(e) => handleChange("showBreadcrumbs", e.target.checked)} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showBreadcrumbs ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>
            
            <label className="flex items-start justify-between cursor-pointer group pt-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-700">Enable UI Animations</p>
                <p className="text-xs text-slate-500 mt-0.5">Show page transitions and micro-interactions.</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.enableAnimations ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={settings.enableAnimations} onChange={(e) => handleChange("enableAnimations", e.target.checked)} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.enableAnimations ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>
          </div>
        </div>

        {/* Brand Colors */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-100 pb-2">Brand Colors</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Primary Color</label>
              <div className="flex gap-3 items-center">
                <input 
                  type="color" 
                  className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                  value={settings.primaryColor}
                  onChange={(e) => handleChange("primaryColor", e.target.value)}
                />
                <Input 
                  value={settings.primaryColor}
                  onChange={(e) => handleChange("primaryColor", e.target.value)}
                  className="uppercase font-mono text-sm"
                />
              </div>
              <p className="text-xs text-slate-500">Main backgrounds, primary buttons, and headers.</p>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Secondary Color</label>
              <div className="flex gap-3 items-center">
                <input 
                  type="color" 
                  className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                  value={settings.secondaryColor}
                  onChange={(e) => handleChange("secondaryColor", e.target.value)}
                />
                <Input 
                  value={settings.secondaryColor}
                  onChange={(e) => handleChange("secondaryColor", e.target.value)}
                  className="uppercase font-mono text-sm"
                />
              </div>
              <p className="text-xs text-slate-500">Accents, highlights, and secondary buttons.</p>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Action/Link Color</label>
              <div className="flex gap-3 items-center">
                <input 
                  type="color" 
                  className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                  value={settings.accentColor}
                  onChange={(e) => handleChange("accentColor", e.target.value)}
                />
                <Input 
                  value={settings.accentColor}
                  onChange={(e) => handleChange("accentColor", e.target.value)}
                  className="uppercase font-mono text-sm"
                />
              </div>
              <p className="text-xs text-slate-500">Links, active states, and focus rings.</p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">A page refresh is required to preview color changes fully.</p>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: settings.primaryColor }}></div>
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: settings.secondaryColor }}></div>
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: settings.accentColor }}></div>
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
