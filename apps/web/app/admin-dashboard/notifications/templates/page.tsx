"use client";

import React, { useState } from "react";
import { 
  FileText, Search, Plus, Filter, MoreHorizontal,
  Edit, Copy, Archive, Trash2, Mail, BellRing, Smartphone, CheckCircle2, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { mockNotificationTemplates, mockNotificationPreferences } from "@/lib/mock/admin-notifications";

export default function NotificationTemplatesPage() {
  const [search, setSearch] = useState("");
  const [prefs, setPrefs] = useState(mockNotificationPreferences);

  const filteredTemplates = mockNotificationTemplates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.type.toLowerCase().includes(search.toLowerCase())
  );

  const getChannelIcon = (channel: string) => {
    switch(channel) {
      case "In-App": return <span title="In-App"><BellRing className="w-3.5 h-3.5 text-blue-500" /></span>;
      case "Email": return <span title="Email"><Mail className="w-3.5 h-3.5 text-emerald-500" /></span>;
      case "Push": return <span title="Push"><Smartphone className="w-3.5 h-3.5 text-purple-500" /></span>;
      case "SMS": return <span title="SMS"><Smartphone className="w-3.5 h-3.5 text-amber-500" /></span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B2545]">Notification Templates</h2>
          <p className="text-sm text-slate-500">Manage reusable message formats and system presets.</p>
        </div>
        <Button className="w-full sm:w-auto bg-[#D4A72C] hover:bg-[#b08b25] text-[#0B2545] font-semibold gap-2">
          <Plus className="w-4 h-4" />
          Create Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
            <Button variant="outline" className="w-full sm:w-auto gap-2 bg-white">
              <Filter className="w-4 h-4" /> Filter
            </Button>
          </div>

          <div className="overflow-x-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead>Template Name</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Variables</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p>No templates found.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map((tpl) => (
                    <TableRow key={tpl.id} className="hover:bg-slate-50/80">
                      <TableCell className="max-w-xs">
                        <div className="font-semibold text-[#0B2545] truncate">{tpl.name}</div>
                        <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded w-fit mt-1">
                          {tpl.type}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          {tpl.defaultChannels.map(c => (
                            <div key={c} className="p-1 bg-slate-100 rounded border border-slate-200">
                              {getChannelIcon(c)}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {tpl.variables.slice(0,2).map(v => (
                            <span key={v} className="text-[10px] font-mono bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">
                              {v}
                            </span>
                          ))}
                          {tpl.variables.length > 2 && (
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              +{tpl.variables.length - 2}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 text-xs">
                            Use
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-[#0B2545]">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Preferences Panel */}
        <div className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-6 space-y-6 h-fit">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
            <Settings className="w-5 h-5 text-slate-600" />
            <h3 className="font-bold text-[#0B2545]">Global Preferences</h3>
          </div>

          <div className="space-y-5">
            <div className="space-y-3 bg-white p-4 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold text-slate-800">Quiet Hours</Label>
                  <p className="text-xs text-slate-500">Delay non-urgent alerts.</p>
                </div>
                <Switch 
                  checked={prefs.quietHoursEnabled} 
                  onCheckedChange={(c) => setPrefs({...prefs, quietHoursEnabled: c})} 
                />
              </div>
              
              {prefs.quietHoursEnabled && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Start Time</Label>
                    <Input type="time" value={prefs.quietHoursStart} onChange={(e) => setPrefs({...prefs, quietHoursStart: e.target.value})} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">End Time</Label>
                    <Input type="time" value={prefs.quietHoursEnd} onChange={(e) => setPrefs({...prefs, quietHoursEnd: e.target.value})} className="h-8 text-xs" />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-800">Max Daily Notifications</Label>
              <p className="text-xs text-slate-500 mb-2">Limit marketing/reminder emails per user.</p>
              <Input 
                type="number" 
                value={prefs.maxDailyNotifications} 
                onChange={(e) => setPrefs({...prefs, maxDailyNotifications: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
