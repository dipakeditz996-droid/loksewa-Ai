"use client";

import React, { useState, useEffect } from "react";
import { Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminApi, AdminRole } from "@/lib/api/admin";

export default function RolesManagementPage() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getRoles();
      setRoles(data.roles);
      setTotalUsers(data.totalUsers);
    } catch (error) {
      console.error("Failed to fetch roles", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const getRoleColor = (color: string) => {
    const colors: Record<string, string> = {
      red: "bg-red-100 text-red-700 border-red-200",
      blue: "bg-blue-100 text-blue-700 border-blue-200",
      purple: "bg-purple-100 text-purple-700 border-purple-200",
      green: "bg-green-100 text-green-700 border-green-200",
    };
    return colors[color] || "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
            <Database className="w-6 h-6 text-[#D4A72C]" />
            Roles Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">Define custom roles and assign them to administrators.</p>
        </div>
        <div className="flex gap-2">
          <Button disabled className="gap-2 bg-slate-400 text-white cursor-not-allowed">
            Create Role
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-600 text-sm font-medium mb-1">Total Roles</p>
            <p className="text-2xl font-bold text-[#0B2545]">{roles.length}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-600 text-sm font-medium mb-1">Total Users</p>
            <p className="text-2xl font-bold text-[#0B2545]">{totalUsers}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-600 text-sm font-medium mb-1">System Roles</p>
            <p className="text-2xl font-bold text-[#0B2545]">{roles.filter(r => r.type === 'system').length}</p>
          </div>
        </div>
      )}

      {/* Roles Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#0B2545]">System Roles</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((role) => (
              <div key={role.id} className={`p-5 rounded-xl border ${getRoleColor(role.color)} shadow-sm`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{role.name}</h3>
                    <p className="text-sm opacity-90">{role.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-3 border-t border-current border-opacity-20">
                  <div>
                    <p className="text-xs opacity-75">Users with this role</p>
                    <p className="text-2xl font-bold">{role.users}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-75">Percentage</p>
                    <p className="text-2xl font-bold">
                      {totalUsers > 0 ? Math.round((role.users / totalUsers) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-semibold mb-2">About Roles Management</p>
        <p className="text-blue-600">
          The system currently supports 4 built-in roles: Super Administrator, Administrator, Teacher, and Student.
          Custom role creation and RBAC management features will be available in future updates.
        </p>
      </div>
    </div>
  );
}
