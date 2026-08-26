"use client";

import React, { useState, useEffect } from "react";
import { Shield, Loader2, Check, X } from "lucide-react";
import { adminApi, PermissionsResponse, RolePermissions, Permission } from "@/lib/api/admin";

export default function PermissionsMatrixPage() {
  const [data, setData] = useState<PermissionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRoleId, setActiveRoleId] = useState<string>("super-admin");

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getPermissions();
        setData(response);
        if (response.roles.length > 0) {
          setActiveRoleId(response.roles[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch permissions");
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  const activeRole = data?.roles.find(r => r.id === activeRoleId);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
              <Shield className="w-6 h-6 text-[#D4A72C]" />
              Permissions Management
            </h1>
            <p className="text-slate-500 text-sm mt-1">Granular access control and permission assignments for roles.</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-4" />
          <p className="text-slate-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
              <Shield className="w-6 h-6 text-[#D4A72C]" />
              Permissions Management
            </h1>
            <p className="text-slate-500 text-sm mt-1">Granular access control and permission assignments for roles.</p>
          </div>
        </div>

        <div className="bg-white border border-red-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
          <div className="bg-red-50 p-4 rounded-full mb-4">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-[#0B2545] mb-2">Error Loading Permissions</h2>
          <p className="text-slate-500 max-w-md">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#D4A72C]" />
            Permissions Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">Granular access control and permission assignments for {data.totalRoles} roles.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-600 text-sm font-medium">Total Roles</p>
          <p className="text-3xl font-bold text-[#0B2545] mt-2">{data.totalRoles}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-600 text-sm font-medium">Total Permissions</p>
          <p className="text-3xl font-bold text-[#0B2545] mt-2">{data.totalPermissions}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-600 text-sm font-medium">Permission Categories</p>
          <p className="text-3xl font-bold text-[#0B2545] mt-2">{data.categories.length}</p>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex flex-wrap border-b border-slate-200">
          {data.roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setActiveRoleId(role.id)}
              className={`flex-1 px-6 py-4 font-medium text-sm transition-colors border-b-2 ${
                activeRoleId === role.id
                  ? 'border-b-[#D4A72C] text-[#0B2545] bg-slate-50'
                  : 'border-b-transparent text-slate-600 hover:text-[#0B2545] hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>{role.name}</span>
                <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded">
                  {role.permissionCount}
                </span>
              </div>
            </button>
          ))}
        </div>

        {activeRole && (
          <div className="p-6 space-y-6">
            {/* Role Info */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0B2545]">{activeRole.name}</h2>
                <p className="text-slate-600 text-sm mt-1">{activeRole.description}</p>
              </div>
              <div className="text-right">
                <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {activeRole.isCustom ? 'Custom' : 'System'}
                </div>
              </div>
            </div>

            {/* Permissions by Category */}
            <div className="space-y-6">
              {data.categories.map((category) => {
                const categoryPermissions = activeRole.permissions.filter(
                  p => p.category === category
                );

                if (categoryPermissions.length === 0) return null;

                return (
                  <div key={category} className="border border-slate-200 rounded-lg p-4">
                    <h3 className="font-semibold text-[#0B2545] mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-[#D4A72C] rounded-full" />
                      {category}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryPermissions.map((permission) => (
                        <div
                          key={permission.id}
                          className="border border-slate-200 rounded-lg p-4 hover:border-[#D4A72C] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-[#0B2545] text-sm">
                                {permission.name}
                              </h4>
                              <p className="text-slate-600 text-xs mt-1">
                                {permission.description}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              <div className="w-5 h-5 rounded border border-green-400 bg-green-50 flex items-center justify-center">
                                <Check className="w-3 h-3 text-green-600" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Info Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
              <p className="font-medium">System Roles</p>
              <p className="mt-1 text-blue-600">
                System roles have fixed permissions and cannot be modified. Custom roles can be created and their permissions adjusted as needed.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
