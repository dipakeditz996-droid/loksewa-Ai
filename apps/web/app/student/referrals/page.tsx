"use client";

import React, { useEffect, useState } from "react";
import { gamificationService, ReferralProfile, ReferralStats, ReferralHistoryEntry } from "@/lib/api/gamification";
import { Copy, Share2, Users, Coins, TrendingUp, Trophy, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudentReferralsPage() {
  const [profile, setProfile] = useState<ReferralProfile | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [history, setHistory] = useState<ReferralHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [dashData, historyData] = await Promise.all([
          gamificationService.getStudentReferralDashboard(),
          gamificationService.getStudentReferralHistory()
        ]);
        
        // Ensure dashData and profile exist before destructuring
        if (dashData && dashData.profile && dashData.stats) {
          setProfile(dashData.profile);
          setStats(dashData.stats);
        } else {
           console.error("Dashboard data is missing profile or stats");
        }
        
        if (historyData) {
            setHistory(historyData);
        }

      } catch (e) {
        console.error("Failed to load referral data", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const referralLink = profile ? `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${profile.referral_code}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join me on LoksewaAI',
        text: `Join me on LoksewaAI and start preparing smarter! Use my referral code: ${profile?.referral_code}`,
        url: referralLink
      }).catch(console.error);
    } else {
      handleCopy();
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile || !stats) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <p className="text-slate-500">Failed to load referral data. Please try again later.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* Header Section */}
      <div className="bg-[#0B1A38] rounded-2xl p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Users className="w-64 h-64" />
        </div>
        
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
            Invite Friends & <span className="text-[#D4A72C]">Earn Rewards</span>
          </h1>
          <p className="text-lg text-slate-300 mb-8 leading-relaxed">
            Invite your friends to LoksewaAI and earn XP, coins, and special rewards when they sign up and start learning.
          </p>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 inline-block w-full md:w-auto">
            <p className="text-sm text-slate-300 font-medium uppercase tracking-wider mb-2">Your Unique Referral Code</p>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="bg-[#050B14] px-6 py-4 rounded-lg font-mono text-2xl font-bold tracking-widest text-[#4ade80] border border-white/5 w-full md:w-auto text-center">
                {profile.referral_code}
              </div>
              <div className="flex w-full md:w-auto gap-2">
                <Button 
                  onClick={handleCopy}
                  className={`flex-1 md:flex-none ${copied ? 'bg-green-600 hover:bg-green-700' : 'bg-white/20 hover:bg-white/30'} text-white border-0 h-14 px-6`}
                >
                  <Copy className="w-5 h-5 mr-2" />
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
                <Button 
                  onClick={handleShare}
                  className="flex-1 md:flex-none bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-white h-14 px-6"
                >
                  <Share2 className="w-5 h-5 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-slate-500">Total Referrals</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.total_referrals}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm font-medium text-slate-500">Successful</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.successful_referrals}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-sm font-medium text-slate-500">Pending</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.pending_referrals}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-sm font-medium text-slate-500">XP Earned</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.total_xp_earned}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Coins className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-sm font-medium text-slate-500">Coins</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.total_coins_earned}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* How it works */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden col-span-1">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              How it works
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  1
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="font-semibold text-slate-800">Share Link</div>
                  <div className="text-sm text-slate-500">Send your code to a friend</div>
                </div>
              </div>
              
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  2
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="font-semibold text-slate-800">Sign Up</div>
                  <div className="text-sm text-slate-500">Friend creates an account</div>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  3
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="font-semibold text-slate-800">Qualify</div>
                  <div className="text-sm text-slate-500">Friend completes requirement</div>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-[#0B2545] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-[#0B2545]/20 bg-[#0B2545]/5">
                  <div className="font-semibold text-[#0B2545]">Get Rewarded!</div>
                  <div className="text-sm text-slate-600">Both of you earn XP/Coins</div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden col-span-1 lg:col-span-2">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Referral History</h2>
            <div className="text-sm text-slate-500">
              {history.length} total
            </div>
          </div>
          
          {history.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-medium text-slate-700 mb-1">No referrals yet</h3>
              <p className="text-slate-500 max-w-sm">
                Share your link above to invite friends and start earning rewards.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase font-medium text-xs">
                  <tr>
                    <th className="px-6 py-4">Friend</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Reward</th>
                    <th className="px-6 py-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {item.referred_username}
                      </td>
                      <td className="px-6 py-4">
                        {item.status === 'rewarded' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Rewarded
                          </span>
                        )}
                        {item.status === 'qualified' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Qualified
                          </span>
                        )}
                        {item.status === 'pending' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            <Clock className="w-3.5 h-3.5 mr-1" /> Pending
                          </span>
                        )}
                        {item.status === 'rejected' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <AlertCircle className="w-3.5 h-3.5 mr-1" /> Rejected
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {item.reward_amount > 0 ? (
                          <span className="text-[#0B2545]">+{item.reward_amount} XP</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500">
                        {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
