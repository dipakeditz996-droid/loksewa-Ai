import { apiClient } from "./client";
import { 
  mockPlayerStats, 
  mockAchievements, 
  mockRecentActivity, 
  mockGameLeaderboard, 
  mockPerformanceData,
  PlayerStats,
  Achievement,
  RecentActivity,
  GameLeaderboardEntry,
  PerformanceDataPoint
} from "../mock/gamification-demo-data";

export interface ReferralStats {
  total_referrals: number;
  successful_referrals: number;
  pending_referrals: number;
  total_xp_earned: number;
  total_coins_earned: number;
  rank: number;
}

export interface ReferralProfile {
  referral_code: string;
  xp: number;
  coins: number;
  level: number;
  username: string;
}

export interface ReferralHistoryEntry {
  id: number;
  referred_username: string;
  status: 'pending' | 'qualified' | 'rewarded' | 'rejected';
  created_at: string;
  qualification_date: string | null;
  reward_amount: number;
}

export interface ReferralSettings {
  id: number;
  is_enabled: boolean;
  referrer_xp_reward: number;
  referred_xp_reward: number;
  referrer_coins_reward: number;
  referred_coins_reward: number;
  qualification_action: string;
  reward_processing: string;
  xp_per_level: number;
}

export interface ReferralAnalytics {
  total_referrals: number;
  successful_referrals: number;
  pending_referrals: number;
  conversion_rate: number;
  xp_distributed: number;
}

class GamificationService {
  /**
   * Fetch current player's overall statistics (Level, XP, Coins, etc.)
   */
  async getPlayerStats(): Promise<PlayerStats> {
    try {
      throw new Error("Backend not connected");
    } catch (error) {
      console.warn("Gamification API failed, falling back to mock data.", error);
      return new Promise(resolve => setTimeout(() => resolve(mockPlayerStats), 600));
    }
  }

  /**
   * Fetch player's achievements
   */
  async getAchievements(): Promise<Achievement[]> {
    try {
      throw new Error("Backend not connected");
    } catch (error) {
      return new Promise(resolve => setTimeout(() => resolve(mockAchievements), 600));
    }
  }

  /**
   * Fetch player's recent gaming activity
   */
  async getRecentActivity(): Promise<RecentActivity[]> {
    try {
      throw new Error("Backend not connected");
    } catch (error) {
      return new Promise(resolve => setTimeout(() => resolve(mockRecentActivity), 600));
    }
  }

  /**
   * Fetch the gaming leaderboard
   */
  async getLeaderboard(): Promise<GameLeaderboardEntry[]> {
    try {
      throw new Error("Backend not connected");
    } catch (error) {
      return new Promise(resolve => setTimeout(() => resolve(mockGameLeaderboard), 600));
    }
  }

  /**
   * Fetch performance analytics data for the chart
   */
  async getPerformanceData(period: '7days' | '30days' | 'alltime' = '7days'): Promise<PerformanceDataPoint[]> {
    try {
      throw new Error("Backend not connected");
    } catch (error) {
      return new Promise(resolve => setTimeout(() => resolve(mockPerformanceData), 600));
    }
  }

  // --- Referral API Endpoints ---

  async getStudentReferralDashboard(): Promise<{ profile: ReferralProfile, stats: ReferralStats, settings?: ReferralSettings }> {
    try {
      const res = await apiClient<{ profile: ReferralProfile, stats: ReferralStats, settings: ReferralSettings }>('/gamification/referrals/me/');
      return res;
    } catch (error) {
      // Fallback dummy data if backend not connected or token missing
      return {
        profile: { referral_code: "DIPAK7X2", xp: 1200, coins: 50, level: 2, username: "dipak" },
        stats: { total_referrals: 0, successful_referrals: 0, pending_referrals: 0, total_xp_earned: 0, total_coins_earned: 0, rank: 0 },
        settings: {
          id: 1, is_enabled: true, referrer_xp_reward: 100, referred_xp_reward: 50,
          referrer_coins_reward: 50, referred_coins_reward: 25, qualification_action: 'signup',
          reward_processing: 'automatic', xp_per_level: 1000
        }
      };
    }
  }

  async getStudentReferralHistory(): Promise<ReferralHistoryEntry[]> {
    try {
      const res = await apiClient<ReferralHistoryEntry[]>('/gamification/referrals/history/');
      return res;
    } catch (error) {
      return [];
    }
  }

  async getAdminReferralSettings(): Promise<ReferralSettings> {
    const res = await apiClient<ReferralSettings>('/gamification/settings/referrals/');
    return res;
  }

  async updateAdminReferralSettings(data: Partial<ReferralSettings>): Promise<ReferralSettings> {
    const res = await apiClient<ReferralSettings>('/gamification/settings/referrals/', {
      method: "PUT",
      body: JSON.stringify(data)
    });
    return res;
  }

  async getAdminReferralAnalytics(): Promise<ReferralAnalytics> {
    const res = await apiClient<ReferralAnalytics>('/gamification/analytics/referrals/');
    return res;
  }

  async getAdminReferralsList(): Promise<ReferralHistoryEntry[]> {
    const res = await apiClient<ReferralHistoryEntry[]>('/gamification/admin/referrals/');
    return res;
  }

  async approveReferral(id: number): Promise<void> {
    await apiClient<void>(`/gamification/admin/referrals/${id}/approve/`, {
      method: "POST"
    });
  }
}

export const gamificationService = new GamificationService();
