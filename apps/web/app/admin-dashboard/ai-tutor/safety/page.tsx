"use client";

import React, { useState } from "react";
import { 
  ShieldAlert, ShieldCheck, Filter, Search, MoreHorizontal,
  Eye, Flag, Ban, CheckCircle2, AlertTriangle, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { mockSafetyEvents } from "@/lib/mock/admin-ai-tutor";

export default function AITutorSafetyPage() {
  const [search, setSearch] = useState("");
  const [safetySettings, setSafetySettings] = useState({
    enableModeration: true,
    blockUnsafeRequests: true,
    preventPromptInjection: true,
    limitSensitiveData: true,
    enableResponseFiltering: true,
    logSafetyEvents: true
  });

  const filteredEvents = mockSafetyEvents.filter(e => 
    e.studentName.toLowerCase().includes(search.toLowerCase()) || 
    e.requestType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B2545]">Safety & Moderation</h2>
          <p className="text-sm text-slate-500">Configure content filters and monitor flagged AI interactions.</p>
        </div>
      </div>

      {/* Safety Settings Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-slate-800">Automated Protection Controls</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-slate-50/50">
            <div>
              <Label className="text-sm font-semibold text-slate-800">Content Moderation</Label>
              <p className="text-xs text-slate-500 mt-1">Scan messages for inappropriate content.</p>
            </div>
            <Switch 
              checked={safetySettings.enableModeration} 
              onCheckedChange={(c) => setSafetySettings({...safetySettings, enableModeration: c})} 
            />
          </div>
          
          <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-slate-50/50">
            <div>
              <Label className="text-sm font-semibold text-slate-800">Block Unsafe Requests</Label>
              <p className="text-xs text-slate-500 mt-1">Automatically drop high-severity requests.</p>
            </div>
            <Switch 
              checked={safetySettings.blockUnsafeRequests} 
              onCheckedChange={(c) => setSafetySettings({...safetySettings, blockUnsafeRequests: c})} 
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-slate-50/50">
            <div>
              <Label className="text-sm font-semibold text-slate-800">Prevent Prompt Injection</Label>
              <p className="text-xs text-slate-500 mt-1">Guard against "jailbreak" attempts.</p>
            </div>
            <Switch 
              checked={safetySettings.preventPromptInjection} 
              onCheckedChange={(c) => setSafetySettings({...safetySettings, preventPromptInjection: c})} 
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-slate-50/50">
            <div>
              <Label className="text-sm font-semibold text-slate-800">Limit Sensitive Data</Label>
              <p className="text-xs text-slate-500 mt-1">Mask PII before sending to AI provider.</p>
            </div>
            <Switch 
              checked={safetySettings.limitSensitiveData} 
              onCheckedChange={(c) => setSafetySettings({...safetySettings, limitSensitiveData: c})} 
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-slate-50/50">
            <div>
              <Label className="text-sm font-semibold text-slate-800">Response Filtering</Label>
              <p className="text-xs text-slate-500 mt-1">Filter AI responses before showing to student.</p>
            </div>
            <Switch 
              checked={safetySettings.enableResponseFiltering} 
              onCheckedChange={(c) => setSafetySettings({...safetySettings, enableResponseFiltering: c})} 
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-slate-50/50">
            <div>
              <Label className="text-sm font-semibold text-slate-800">Log Safety Events</Label>
              <p className="text-xs text-slate-500 mt-1">Record flagged incidents below.</p>
            </div>
            <Switch 
              checked={safetySettings.logSafetyEvents} 
              onCheckedChange={(c) => setSafetySettings({...safetySettings, logSafetyEvents: c})} 
            />
          </div>
        </div>
      </div>

      {/* Safety Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-slate-800">Incident Logs</h3>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white h-9 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" className="bg-white gap-2 h-9">
              <Filter className="w-4 h-4" /> Filter
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead>Time</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Request Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Automated Action</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Shield className="w-8 h-8 text-slate-300 mb-2" />
                      <p>No safety events found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event) => (
                  <TableRow key={event.id} className="hover:bg-slate-50/80">
                    <TableCell>
                      <div className="text-xs text-slate-600">
                        {new Date(event.timestamp).toLocaleDateString()}<br/>
                        <span className="text-slate-400 font-mono">{new Date(event.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-[#0B2545]">{event.studentName}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-700">{event.requestType}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                        event.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                        event.severity === 'High' ? 'bg-amber-100 text-amber-700' :
                        event.severity === 'Medium' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {event.severity === 'Critical' && <AlertTriangle className="w-3 h-3" />}
                        {event.severity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                        event.status === 'Blocked' ? 'text-red-600' :
                        event.status === 'Flagged' ? 'text-amber-600' :
                        event.status === 'Allowed' ? 'text-emerald-600' :
                        'text-blue-600'
                      }`}>
                        {event.status === 'Blocked' && <Ban className="w-3.5 h-3.5" />}
                        {event.status === 'Flagged' && <Flag className="w-3.5 h-3.5" />}
                        {event.status === 'Allowed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {event.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-500 truncate block max-w-[200px]" title={event.action}>
                        {event.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                        <Eye className="w-4 h-4 mr-1" /> View Context
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
