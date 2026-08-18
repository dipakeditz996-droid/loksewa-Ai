"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  MessageSquare, Users, Activity, Clock, Server, 
  Settings2, FileCode2, BookOpen, BarChart3, ShieldAlert,
  CheckCircle2, AlertTriangle, Play, Square, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockAIUsageAnalytics, mockAIConfiguration } from "@/lib/mock/admin-ai-tutor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import toast from "react-hot-toast";

export default function AITutorOverviewPage() {
  const [status, setStatus] = useState(mockAIConfiguration.status);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");

  const statCards = [
    { label: "Total Conversations", value: mockAIUsageAnalytics.totalConversations.toLocaleString(), icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Active Students", value: mockAIUsageAnalytics.uniqueStudents.toLocaleString(), icon: Users, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Total Questions", value: mockAIUsageAnalytics.totalMessages.toLocaleString(), icon: Activity, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Avg. Response Time", value: `${(mockAIUsageAnalytics.averageResponseTimeMs / 1000).toFixed(1)}s`, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
  ];

  const quickActions = [
    { name: "AI Configuration", icon: Settings2, href: "/admin-dashboard/ai-tutor/configuration", desc: "Change provider, model, limits" },
    { name: "Manage Prompts", icon: FileCode2, href: "/admin-dashboard/ai-tutor/prompts", desc: "Edit system and behavior prompts" },
    { name: "Knowledge Sources", icon: BookOpen, href: "/admin-dashboard/ai-tutor/knowledge", desc: "Upload and manage RAG documents" },
    { name: "Usage Analytics", icon: BarChart3, href: "/admin-dashboard/ai-tutor/usage", desc: "View detailed token and cost metrics" },
    { name: "Safety Settings", icon: ShieldAlert, href: "/admin-dashboard/ai-tutor/safety", desc: "Manage moderation and safety logs" },
  ];

  const handleStatusChange = (newStatus: string) => {
    setPendingStatus(newStatus);
    setShowStatusModal(true);
  };

  const confirmStatusChange = () => {
    setStatus(pendingStatus as any);
    setShowStatusModal(false);
    toast.success(`AI Tutor is now ${pendingStatus}.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Section - Status & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#0B2545]">System Status</h2>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              status === "Operational" ? "bg-emerald-100 text-emerald-700" :
              status === "Maintenance" ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-700"
            }`}>
              {status === "Operational" && <CheckCircle2 className="w-3.5 h-3.5" />}
              {status === "Maintenance" && <Settings className="w-3.5 h-3.5" />}
              {status === "Disabled" && <AlertTriangle className="w-3.5 h-3.5" />}
              {status}
            </div>
          </div>
          
          <div className="flex items-center gap-4 mb-8">
            <div className={`p-4 rounded-xl ${
              status === "Operational" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
            }`}>
              <Server className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Provider API</p>
              <p className="text-lg font-bold text-slate-800">{mockAIConfiguration.aiProvider}</p>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            {status !== "Operational" ? (
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                onClick={() => handleStatusChange("Operational")}
              >
                <Play className="w-4 h-4 mr-2" /> Enable AI Tutor
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="w-full text-amber-600 border-amber-200 hover:bg-amber-50"
                  onClick={() => handleStatusChange("Maintenance")}
                >
                  <Settings className="w-4 h-4 mr-2" /> Maintenance
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleStatusChange("Disabled")}
                >
                  <Square className="w-4 h-4 mr-2" /> Disable
                </Button>
              </div>
            )}
            <p className="text-xs text-center text-slate-400">
              Disabling will prevent students from sending new messages.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {statCards.map((stat, index) => (
            <div key={index} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
              <div className="flex justify-between items-start mb-3">
                <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#0B2545]">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-bold text-[#0B2545] mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {quickActions.map((action, idx) => (
            <Link key={idx} href={action.href}>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-[#D4A72C]/50 hover:shadow-md transition-all group h-full flex flex-col">
                <div className="p-3 bg-slate-50 rounded-lg w-fit mb-4 group-hover:bg-[#0B2545]/5 transition-colors">
                  <action.icon className="w-6 h-6 text-[#0B2545]" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-1">{action.name}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change AI Tutor Status</DialogTitle>
            <DialogDescription>
              You are about to change the AI Tutor status to <strong>{pendingStatus}</strong>.
              {pendingStatus !== "Operational" && " Students will temporarily lose access to AI tutoring features."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowStatusModal(false)}>Cancel</Button>
            <Button 
              className={pendingStatus === "Operational" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
              onClick={confirmStatusChange}
            >
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
