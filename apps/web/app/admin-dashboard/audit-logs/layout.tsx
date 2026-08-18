"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  ClipboardList, Users, ShieldAlert, Download, Settings as SettingsIcon, Menu, X, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const AUDIT_NAV = [
  { title: "All Activity", href: "/admin-dashboard/audit-logs", icon: ClipboardList, exact: true },
  { title: "Admin Activity", href: "/admin-dashboard/audit-logs/admin-activity", icon: Users },
  { title: "Security Events", href: "/admin-dashboard/audit-logs/security", icon: ShieldAlert },
];

export default function AuditLogsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [retentionModalOpen, setRetentionModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] relative bg-slate-50">
      
      {/* Top Header Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 md:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto">
          
          {/* Title & Tabs */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
            <div>
              <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-[#D4A72C]" />
                Audit Logs
              </h1>
              <p className="text-slate-500 text-sm mt-1">Monitor system activity and security events.</p>
            </div>

            <div className="hidden md:flex bg-slate-100 p-1 rounded-lg">
              {AUDIT_NAV.map(item => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                      active ? "bg-white text-[#0B2545] shadow-sm" : "text-slate-600 hover:text-[#0B2545]"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4", active ? "text-[#D4A72C]" : "text-slate-400")} />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setRetentionModalOpen(true)}>
              <SettingsIcon className="w-4 h-4 mr-2" /> Retention
            </Button>
            <Button size="sm" className="bg-[#0B2545] text-white hover:bg-[#163E6C]" onClick={() => setExportModalOpen(true)}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            
            {/* Mobile Nav Toggle */}
            <Button 
              variant="outline" 
              size="sm" 
              className="md:hidden ml-auto"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-4 pb-2 border-t border-slate-100 mt-4 space-y-1">
            {AUDIT_NAV.map(item => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    active ? "bg-slate-100 text-[#0B2545]" : "text-slate-600"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", active ? "text-[#D4A72C]" : "text-slate-400")} />
                  {item.title}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 pb-24">
        {children}
      </main>

      {/* Retention Settings Modal */}
      <Dialog open={retentionModalOpen} onOpenChange={setRetentionModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#D4A72C]" /> Audit Retention Policy
            </DialogTitle>
            <DialogDescription>
              Configure how long audit logs are kept before being permanently deleted.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Retention Period</label>
              <select className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white">
                <option>30 Days</option>
                <option>90 Days</option>
                <option>180 Days</option>
                <option>1 Year</option>
                <option>Custom</option>
              </select>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-sm flex items-start gap-2">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
              <p>Warning: Changing the retention policy may result in the immediate deletion of historical audit records. This action cannot be undone.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRetentionModalOpen(false)}>Cancel</Button>
            <Button className="bg-[#0B2545] hover:bg-[#163E6C] text-white" onClick={() => setRetentionModalOpen(false)}>Save Policy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Modal */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-500" /> Export Audit Logs
            </DialogTitle>
            <DialogDescription>
              Export the current filtered view or a specific date range.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Export Scope</label>
              <select className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white">
                <option>Current Filtered Results</option>
                <option>Selected Events Only</option>
                <option>Full Date Range</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Format</label>
              <select className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white">
                <option>CSV (.csv)</option>
                <option>Excel (.xlsx)</option>
                <option>PDF Report (.pdf)</option>
                <option>Raw JSON (.json)</option>
              </select>
            </div>

            <p className="text-xs text-slate-500 italic pt-2">
              Note: Sensitive credentials, API keys, and session tokens are automatically redacted from all exports.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setExportModalOpen(false)}>
              <Download className="w-4 h-4 mr-2" /> Generate Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
