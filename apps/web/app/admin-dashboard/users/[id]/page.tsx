"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, User, ShieldAlert, LogOut, Key, MonitorSmartphone,
  Activity, GraduationCap, Store, LifeBuoy, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { mockUsers, mockUserActivity, User as UserType } from "@/lib/mock/admin-users";

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const user = mockUsers.find(u => u.id === params.id) || mockUsers[0]!;
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const handleForceLogout = () => {
    console.log("Forcing logout for:", user.id);
    setLogoutModalOpen(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin-dashboard/users">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-3">
            User Profile
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
              user.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
              user.status === 'Inactive' ? 'bg-slate-100 text-slate-600' :
              user.status === 'Suspended' ? 'bg-red-100 text-red-700' :
              'bg-amber-100 text-amber-700'
            }`}>
              {user.status}
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">ID: {user.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-1">
          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0B2545] to-[#163E6C] h-24"></div>
            <div className="px-6 pb-6 pt-0 flex flex-col items-center -mt-12">
              <Avatar className="h-24 w-24 border-4 border-white shadow-sm mb-4 bg-white">
                <AvatarFallback className="bg-slate-100 text-[#0B2545] text-2xl font-bold">
                  {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold text-[#0B2545] text-center">{user.name}</h2>
              <p className="text-slate-500 text-sm mb-1">{user.email}</p>
              <p className="text-slate-400 text-xs mb-4">@{user.username}</p>
              <div className="w-full space-y-3 mt-2 pt-4 border-t border-slate-100">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Role</span>
                  <span className="font-semibold text-slate-700">{user.role}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Phone</span>
                  <span className="font-semibold text-slate-700">{user.phone || "-"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Joined</span>
                  <span className="font-semibold text-slate-700">{user.joinedDate}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Target Position</span>
                  <span className="font-semibold text-slate-700">{user.targetPosition || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Access */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-[#0B2545] mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Security & Access
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Email Verification
                </span>
                <span className="font-semibold text-emerald-600">Verified</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 flex items-center gap-2">
                  <Key className="w-4 h-4 text-slate-400" /> Two-Factor Auth
                </span>
                <span className="font-semibold text-slate-400">Disabled</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 flex items-center gap-2">
                  <MonitorSmartphone className="w-4 h-4 text-slate-400" /> Last Login
                </span>
                <span className="font-semibold text-slate-700">{user.lastActive}</span>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <Button variant="outline" className="w-full justify-start text-slate-700 bg-white" onClick={() => setLogoutModalOpen(true)}>
                <LogOut className="w-4 h-4 mr-2 text-slate-400" /> Force Logout
              </Button>
              <Button variant="outline" className="w-full justify-start text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:text-amber-700">
                <Key className="w-4 h-4 mr-2" /> Require Password Reset
              </Button>
              {user.status === "Active" ? (
                <Button variant="outline" className="w-full justify-start text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700">
                  <ShieldAlert className="w-4 h-4 mr-2" /> Suspend Account
                </Button>
              ) : (
                <Button variant="outline" className="w-full justify-start text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Activate Account
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Links / Student Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href={`/admin-dashboard/analytics/students`} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors text-center">
              <GraduationCap className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Exams</p>
              <p className="font-bold text-[#0B2545]">12 Attempts</p>
            </Link>
            <Link href={`/admin-dashboard/analytics/study-plans`} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-colors text-center">
              <Activity className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Study Plans</p>
              <p className="font-bold text-[#0B2545]">2 Active</p>
            </Link>
            <Link href={`/admin-dashboard/marketplace/orders`} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-purple-300 transition-colors text-center">
              <Store className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Purchases</p>
              <p className="font-bold text-[#0B2545]">4 Orders</p>
            </Link>
            <Link href={`/admin-dashboard/support`} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-amber-300 transition-colors text-center">
              <LifeBuoy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Support</p>
              <p className="font-bold text-[#0B2545]">1 Ticket</p>
            </Link>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-[#0B2545] flex items-center gap-2">
                <Activity className="w-5 h-5 text-slate-400" />
                Recent Activity
              </h3>
              <Button variant="ghost" size="sm" className="text-blue-600">View All</Button>
            </div>
            
            <div className="space-y-6">
              {mockUserActivity.map((act, idx) => (
                <div key={act.id} className="relative pl-6 border-l-2 border-slate-100 last:border-transparent pb-1">
                  <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-slate-300 border-2 border-white" />
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-semibold text-[#0B2545] text-sm">{act.action}</p>
                    <span className="text-xs text-slate-400 whitespace-nowrap ml-4">{act.timestamp}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-slate-500">
                    <span className="bg-slate-100 px-2 py-0.5 rounded">{act.module}</span>
                    {act.device && <span>Device: {act.device}</span>}
                    {act.ip && <span>IP: {act.ip}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>

      {/* Force Logout Modal */}
      <Dialog open={logoutModalOpen} onOpenChange={setLogoutModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <LogOut className="w-5 h-5" /> Force Logout User
            </DialogTitle>
            <DialogDescription>
              This will revoke all active sessions for this user. They will be required to log in again immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setLogoutModalOpen(false)}>Cancel</Button>
            <Button className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white" onClick={handleForceLogout}>Revoke Sessions</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
