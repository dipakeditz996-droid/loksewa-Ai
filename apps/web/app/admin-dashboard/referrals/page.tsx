"use client";

import React, { useEffect, useState } from "react";
import { gamificationService, ReferralAnalytics, ReferralHistoryEntry } from "@/lib/api/gamification";
import { Users, CheckCircle2, Clock, TrendingUp, Trophy, AlertCircle, Eye, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminReferralManagementPage() {
  const [analytics, setAnalytics] = useState<ReferralAnalytics | null>(null);
  const [referrals, setReferrals] = useState<ReferralHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [analyticsData, referralsData] = await Promise.all([
        gamificationService.getAdminReferralAnalytics(),
        gamificationService.getAdminReferralsList()
      ]);
      setAnalytics(analyticsData);
      setReferrals(referralsData);
    } catch (e) {
      console.error(e);
      // Demo data
      setAnalytics({
        total_referrals: 0,
        successful_referrals: 0,
        pending_referrals: 0,
        conversion_rate: 0,
        xp_distributed: 0
      });
      setReferrals([]);
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (id: number) => {
    try {
      await gamificationService.approveReferral(id);
      loadData(); // refresh
    } catch (e) {
      alert("Failed to approve referral");
    }
  };

  if (loading || !analytics) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Referral Analytics & Management</h1>
        <p className="text-slate-500 mt-1">Monitor the growth loop, analyze conversion rates, and manually approve rewards.</p>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-slate-500">Total Referred</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{analytics.total_referrals}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm font-medium text-slate-500">Successful</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{analytics.successful_referrals}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-sm font-medium text-slate-500">Pending Review</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{analytics.pending_referrals}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-sm font-medium text-slate-500">Conversion</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{analytics.conversion_rate.toFixed(1)}%</p>
        </div>

        <div className="bg-[#0B2545] p-6 rounded-xl border border-[#0B2545] shadow-sm text-white col-span-2 md:col-span-4 lg:col-span-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-sm font-medium text-slate-300">XP Distributed</p>
          </div>
          <p className="text-3xl font-bold text-white">{analytics.xp_distributed}</p>
        </div>
      </div>

      {/* Referrals Management Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">All Referrals</h2>
          <Button variant="outline" size="sm" onClick={loadData}>Refresh Data</Button>
        </div>
        
        {referrals.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No referrals found in the system yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-white text-slate-500 uppercase font-medium text-xs border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Referred User</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date Created</th>
                  <th className="px-6 py-4">Reward Amount</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {referrals.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {item.referred_username}
                    </td>
                    <td className="px-6 py-4">
                      {item.status === 'rewarded' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Rewarded
                        </span>
                      )}
                      {item.status === 'qualified' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          Qualified (Needs Approval)
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          Pending Action
                        </span>
                      )}
                      {item.status === 'rejected' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      {item.reward_amount > 0 ? `+${item.reward_amount} XP` : '—'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 flex justify-end">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="View Details">
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      {item.status === 'qualified' && (
                        <Button 
                          size="sm" 
                          className="h-8 bg-green-600 hover:bg-green-700 text-white" 
                          onClick={() => handleApprove(item.id)}
                          title="Manually Approve Reward"
                        >
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
