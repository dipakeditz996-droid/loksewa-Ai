"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, Mail, User as UserIcon } from "lucide-react";

export function TeacherAccountSection() {
  const { user } = useAuth();

  if (!user) return null;

  const joinedDate = (user as any).date_joined 
    ? new Date((user as any).date_joined).toLocaleDateString("en-US", { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : "Unknown";

  return (
    <div className="space-y-6">
      <Card className="bg-card border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg font-bold text-primary">Account Information</CardTitle>
          <CardDescription>View your core account details and status.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</p>
                <p className="text-sm font-medium text-primary mt-1">{user.email}</p>
                <p className="text-xs text-slate-500 mt-1">Managed by administrator.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <UserIcon className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</p>
                <p className="text-sm font-medium text-primary mt-1">{user.username}</p>
                <p className="text-xs text-slate-500 mt-1">Unique identifier.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Role</p>
                <div className="mt-1">
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 capitalize shadow-none rounded-lg">
                    {user.role}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-2">Determines your permissions.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Status</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  <span className="text-sm font-medium text-primary">
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Joined {joinedDate}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-amber-800 mb-1">Need to change your email or username?</h3>
        <p className="text-sm text-amber-700/80">
          Core account identifiers are managed by LoksewaAI administrators to ensure security and prevent platform abuse. If you need to update these details, please contact support.
        </p>
      </div>
    </div>
  );
}
