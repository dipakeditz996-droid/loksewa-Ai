"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  ArrowLeft, Activity, User, Target, ShieldCheck, ShieldAlert,
  Clock, Server, MapPin, MonitorSmartphone, Code, CheckCircle2,
  XCircle, FileJson, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockAuditEvents, AuditEvent } from "@/lib/mock/admin-audit";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AuditEventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<AuditEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching specific event
    const timer = setTimeout(() => {
      const found = mockAuditEvents.find(e => e.id === eventId);
      setEvent(found || null);
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [eventId]);

  const copyJson = () => {
    if (!event) return;
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    alert("Raw event data copied to clipboard.");
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="h-8 bg-slate-200 rounded w-48 animate-pulse mb-6"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-slate-100 rounded-xl animate-pulse"></div>
            <div className="h-48 bg-slate-100 rounded-xl animate-pulse"></div>
          </div>
          <div className="space-y-6">
            <div className="h-40 bg-slate-100 rounded-xl animate-pulse"></div>
            <div className="h-40 bg-slate-100 rounded-xl animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-700">Audit Event Not Found</h2>
        <p className="text-slate-500">The requested event ID could not be located in the logs.</p>
        <Link href="/admin-dashboard/audit-logs">
          <Button variant="outline">Return to All Activity</Button>
        </Link>
      </div>
    );
  }

  // Related events mock logic
  const relatedEvents = event.relatedEvents 
    ? mockAuditEvents.filter(e => event.relatedEvents?.includes(e.id)) 
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin-dashboard/audit-logs">
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-[#0B2545] hover:bg-slate-200">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#0B2545]">{event.action}</h1>
              {event.status === "Success" && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none">Success</Badge>}
              {event.status === "Failed" && <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-none">Failed</Badge>}
              {event.status === "Blocked" && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none">Blocked</Badge>}
            </div>
            <p className="text-slate-500 text-sm mt-1 font-mono">Event ID: {event.id}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {event.reviewStatus === "Unreviewed" && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Mark as Reviewed</Button>
          )}
          {event.reviewStatus === "Reviewed" && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 py-1.5 px-3">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Reviewed by {event.reviewedBy}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Action Details */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-500" />
              <h2 className="font-bold text-[#0B2545]">Action Details</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-1">Description</p>
                <p className="text-slate-800">{event.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-1">Module</p>
                  <p className="text-[#0B2545] font-medium">{event.module}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-1">Severity</p>
                  <Badge variant="outline" className={
                    event.severity === 'Critical' ? "bg-red-50 text-red-700 border-red-200" :
                    event.severity === 'High' ? "bg-orange-50 text-orange-700 border-orange-200" :
                    event.severity === 'Medium' ? "bg-amber-50 text-amber-700 border-amber-200" :
                    event.severity === 'Low' ? "bg-slate-100 text-slate-700 border-slate-200" :
                    "bg-blue-50 text-blue-700 border-blue-200"
                  }>
                    {event.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-1">Timestamp</p>
                  <div className="flex items-center text-[#0B2545]">
                    <Clock className="w-4 h-4 mr-1.5 text-slate-400" />
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Change Diff (If Applicable) */}
          {event.changeDiff && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Code className="w-5 h-5 text-slate-500" />
                <h2 className="font-bold text-[#0B2545]">Change Comparison</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                <div className="p-4 bg-red-50/30">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-3">Before (Previous State)</p>
                  <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap">
                    {JSON.stringify(event.changeDiff.before, null, 2).replace(/"([^"]+)":/g, '$1:')}
                  </pre>
                </div>
                <div className="p-4 bg-emerald-50/30">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">After (New State)</p>
                  <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap">
                    {JSON.stringify(event.changeDiff.after, null, 2).replace(/"([^"]+)":/g, '$1:')}
                  </pre>
                </div>
              </div>
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 italic">
                Note: Passwords and sensitive keys are redacted from diff views automatically.
              </div>
            </div>
          )}

          {/* Related Events Timeline */}
          {relatedEvents.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Activity className="w-5 h-5 text-slate-500" />
                <h2 className="font-bold text-[#0B2545]">Related Workflow Events</h2>
              </div>
              <div className="p-6">
                <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                  
                  {/* Current Event in Timeline (Mock chronological visual) */}
                  <div className="relative pl-6">
                    <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1.5 ring-4 ring-white" />
                    <p className="text-sm font-bold text-[#0B2545]">{event.action}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{new Date(event.timestamp).toLocaleTimeString()}</p>
                    <p className="text-sm text-slate-600 mt-1">{event.description}</p>
                  </div>
                  
                  {relatedEvents.map(re => (
                    <div key={re.id} className="relative pl-6 opacity-60 hover:opacity-100 transition-opacity">
                      <div className="absolute w-3 h-3 bg-slate-300 rounded-full -left-[7px] top-1.5 ring-4 ring-white" />
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-700">{re.action}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{new Date(re.timestamp).toLocaleTimeString()}</p>
                        </div>
                        <Link href={`/admin-dashboard/audit-logs/${re.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">View</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Raw JSON View */}
          <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 overflow-hidden">
            <div className="p-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <FileJson className="w-4 h-4" />
                <h2 className="font-bold text-sm">Raw Event Payload</h2>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-slate-400 hover:text-white hover:bg-slate-800" onClick={copyJson}>
                <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
              </Button>
            </div>
            <ScrollArea className="h-64">
              <div className="p-4">
                <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
                  {JSON.stringify(event, null, 2)}
                </pre>
              </div>
            </ScrollArea>
          </div>

        </div>

        {/* Right Column / Metadata */}
        <div className="space-y-6">
          
          {/* Actor Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <User className="w-5 h-5 text-slate-500" />
              <h2 className="font-bold text-[#0B2545]">Actor Information</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0B2545] text-[#D4A72C] flex items-center justify-center font-bold">
                  {event.actor.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-[#0B2545] leading-tight">{event.actor.name}</p>
                  <p className="text-xs text-slate-500">{event.actor.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-slate-100">
                <div className="text-slate-500">Actor Type:</div>
                <div className="font-medium text-slate-800">{event.actor.type}</div>
                
                <div className="text-slate-500">Actor ID:</div>
                <div className="font-mono text-xs text-slate-600 break-all">{event.actor.id}</div>
                
                {event.actor.role && (
                  <>
                    <div className="text-slate-500">Role:</div>
                    <div className="font-medium text-slate-800">{event.actor.role}</div>
                  </>
                )}
              </div>

              {["Admin", "Super Admin"].includes(event.actor.type) && (
                <Link href={`/admin-dashboard/admins`}>
                  <Button variant="outline" className="w-full mt-2">View Admin Profile</Button>
                </Link>
              )}
            </div>
          </div>

          {/* Target Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Target className="w-5 h-5 text-slate-500" />
              <h2 className="font-bold text-[#0B2545]">Target Information</h2>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-slate-500 col-span-1">Target Type:</div>
                <div className="font-medium text-slate-800 col-span-2">{event.target.type}</div>
                
                <div className="text-slate-500 col-span-1">Target Name:</div>
                <div className="font-medium text-slate-800 col-span-2">{event.target.name}</div>
                
                <div className="text-slate-500 col-span-1">Target ID:</div>
                <div className="font-mono text-xs text-slate-600 col-span-2 break-all">{event.target.id}</div>
              </div>
            </div>
          </div>

          {/* Context Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Server className="w-5 h-5 text-slate-500" />
              <h2 className="font-bold text-[#0B2545]">Connection & Context</h2>
            </div>
            <div className="p-4 space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-slate-500 text-xs">IP Address</p>
                  <p className="font-mono text-slate-800">{event.ipAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MonitorSmartphone className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-slate-500 text-xs">Session Info (User Agent)</p>
                  <p className="text-slate-800">{event.sessionInfo}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
