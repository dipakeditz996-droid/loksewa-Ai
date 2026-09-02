import { apiClient } from "./client";
export interface PlayerStats {
  level: number;
  xp: number;
  nextLevelXp: number;
  coins: number;
  streak: number;
  streakDays: boolean[];
  rank: number;
  previousRank: number;
  gamesPlayed: number;
  gamesWon: number;
  questionsAnswered: number;
  accuracy: number;
  bestScore: number;
  studentName: string;
  studentAvatar?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  locked: boolean;
  progress: number;
  maxProgress: number;
}

export interface RecentActivity {
  id: string;
  title: string;
  description: string;
  xpGained: number;
  timestamp: string;
}

export interface GameLeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  avatar?: string;
}

export interface PerformanceDataPoint {
  date: string;
  xp: number;
  accuracy: number;
  score: number;
}

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
  study_current_streak: number;
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

export interface GamificationStats {
  rank: number;
  streak_days: boolean[];
  games_played: number;
  games_won: number;
  accuracy: number;
  best_score: number;
  questions_answered: number;
}

class GamificationService {
  /**
   * Fetch current player's overall statistics (Level, XP, Coins, etc.)
   */
  async getPlayerStats(): Promise<PlayerStats> {
    const res = await apiClient<{ profile: ReferralProfile, stats: GamificationStats }>('/gamification/referrals/me/');
    const profile = res.profile;
    const stats = res.stats;
    return {
      level: profile.level || 1,
      xp: profile.xp || 0,
      coins: profile.coins || 0,
      rank: stats?.rank || 0,
      nextLevelXp: (profile.level || 1) * 1000,
      streak: profile.study_current_streak || 0,
      streakDays: stats?.streak_days || [false, false, false, false, false, false, false],
      previousRank: stats?.rank || 0,
      gamesPlayed: stats?.games_played || 0,
      gamesWon: stats?.games_won || 0,
      questionsAnswered: stats?.questions_answered || 0,
      accuracy: stats?.accuracy || 0,
      bestScore: stats?.best_score || 0,
      studentName: profile.username || "Student",
      studentAvatar: undefined,
    };
  }

  /**
   * Fetch player's achievements
   */
  async getAchievements(): Promise<Achievement[]> {
    try {
      const res = await apiClient<Achievement[]>('/gamification/achievements/');
      return res || [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch player's recent gaming activity
   */
  async getRecentActivity(): Promise<RecentActivity[]> {
    try {
      const res = await apiClient<RecentActivity[]>('/gamification/activity/');
      return res || [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch the gaming leaderboard
   */
  async getLeaderboard(): Promise<GameLeaderboardEntry[]> {
    try {
      const res = await apiClient<any>('/gamification/leaderboard/');
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.results)) return res.results;
      return [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Fetch performance analytics data for the chart
   */
  async getPerformanceData(period: '7days' | '30days' | 'alltime' = '7days'): Promise<PerformanceDataPoint[]> {
    try {
      const res = await apiClient<PerformanceDataPoint[]>(`/gamification/performance/?period=${period}`);
      return res || [];
    } catch {
      return [];
    }
  }

  // --- Referral API Endpoints ---

  async getStudentReferralDashboard(): Promise<{ profile: ReferralProfile, stats: ReferralStats, settings?: ReferralSettings }> {
    return await apiClient<{ profile: ReferralProfile, stats: ReferralStats, settings: ReferralSettings }>('/gamification/referrals/me/');
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

  async getDailyMotivation(): Promise<{ id: number; message: string; language: string; category: string }> {
    return await apiClient<{ id: number; message: string; language: string; category: string }>('/gamification/daily-motivation/');
  }

  async getMotivations(params?: { language?: string; category?: string; is_active?: boolean }): Promise<any[]> {
    const query = new URLSearchParams(params as any).toString();
    return await apiClient<any[]>(`/gamification/admin/motivations/${query ? '?' + query : ''}`);
  }

  async createMotivation(data: { message: string; language: string; category: string; is_active?: boolean; priority?: number }): Promise<any> {
    return await apiClient<any>('/gamification/admin/motivations/', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateMotivation(id: number, data: Partial<{ message: string; language: string; category: string; is_active: boolean; priority: number }>): Promise<any> {
    return await apiClient<any>(`/gamification/admin/motivations/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async deleteMotivation(id: number): Promise<void> {
    await apiClient<void>(`/gamification/admin/motivations/${id}/`, { method: 'DELETE' });
  }
}

export const gamificationService = new GamificationService();

// Subscription Plans API
export const subscriptionPlansApi = {
  getPlans: (): Promise<any[]> => apiClient<any[]>('/subscriptions/plans/'),
  getMySubscriptions: (): Promise<any[]> => apiClient<any[]>('/subscriptions/subscriptions/'),
  getMyPayments: (): Promise<any[]> => apiClient<any[]>('/subscriptions/payments/'),
};
