"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api/client";

interface SubscriptionPlan {
  id: number;
  name: string;
  duration: number;
  duration_unit: string;
  price: string;
  original_price: string | null;
  status: string;
  badge: string;
}

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient<SubscriptionPlan[]>("/subscriptions/plans/");
      setPlans(data);
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0B2545]">Subscription Plans</h1>
          <p className="text-slate-500 mt-1">Manage all premium packages and subscription plans</p>
        </div>
        <Button className="bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create New Plan
        </Button>
      </div>

      <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-sm font-medium text-slate-500">
                <th className="px-6 py-4">Plan Name</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Badge</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Loading plans...
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No subscription plans found.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-[#0B2545]">{plan.name}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {plan.duration} {plan.duration_unit}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      Rs. {plan.price}
                      {plan.original_price && (
                        <span className="text-slate-400 line-through text-xs ml-2">Rs. {plan.original_price}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {plan.badge !== 'NONE' ? (
                        <Badge variant="outline" className="bg-[#D4A72C]/10 text-[#D4A72C] border-[#D4A72C]/30">
                          {plan.badge.replace('_', ' ')}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {plan.status === 'ACTIVE' ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium bg-emerald-50 w-max px-2 py-1 rounded-full">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Active
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium bg-slate-100 w-max px-2 py-1 rounded-full">
                          <XCircle className="h-3.5 w-3.5" />
                          Inactive
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
