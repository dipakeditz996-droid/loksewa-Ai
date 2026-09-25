import { apiClient } from "./client";

export interface GameMode {
  id: string;
  title: string;
  description: string;
  icon: string;
  players: string;
  timeLimit: string;
  xpReward: string;
  color: string;
  badge?: string;
  path: string;
  isComingSoon?: boolean;
}

export interface WeeklyQuiz {
  id: number;
  title: string;
  description: string;
  week_number: number;
  year: number;
  start_date: string | null;
  end_date: string | null;
  duration_minutes: number;
  xp_reward: number;
  is_active: boolean;
  questions_count: number;
  has_attempted: boolean;
  has_in_progress: boolean;
  in_progress_attempt_id?: number | null;
  latest_attempt?: WeeklyQuizAttempt | null;
}

export interface WeeklyQuizAttempt {
  id: number;
  quiz_id: number;
  quiz_title: string;
  student_name: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  score: number;
  correct_answers: number;
  total_questions: number;
  duration_minutes: number;
  time_taken_seconds: number;
  xp_awarded: number;
  started_at: string;
  completed_at?: string | null;
}

export interface WeeklyQuizQuestionItem {
  id: number;
  order: number;
  question_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

export interface WeeklyQuizStartResponse {
  attempt_id: number;
  quiz: WeeklyQuiz;
  questions: WeeklyQuizQuestionItem[];
  duration_minutes: number;
  started_at: string;
}

export interface WeeklyQuizReviewItem {
  question_id: number;
  order: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  selected_option: string | null;
  correct_option: string;
  is_correct: boolean;
  explanation: string;
}

export interface WeeklyQuizSubmitResponse {
  attempt_id: number;
  quiz_id: number;
  quiz_title: string;
  status: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  percentage: number;
  xp_awarded: number;
  time_taken_seconds: number;
  completed_at: string;
  review: WeeklyQuizReviewItem[];
}

export interface DailyDrillQuestionItem {
  id: number;
  order: number;
  question_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  hint?: string | null;
  selected_option?: string | null;
  is_answered: boolean;
  is_correct?: boolean | null;
  correct_option?: string | null;
  explanation?: string | null;
  answered_at?: string | null;
}

export interface DailyDrillSession {
  id: number;
  student_name: string;
  date: string;
  exam_id?: number | null;
  course_title: string;
  focus_type: 'weak_areas' | 'revision' | 'course_mixed';
  focus_label: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED';
  duration_seconds: number;
  remaining_seconds: number;
  score: number;
  correct_answers: number;
  total_questions: number;
  answered_count: number;
  accuracy: number;
  time_taken_seconds: number;
  xp_awarded: number;
  started_at: string;
  completed_at?: string | null;
  questions: DailyDrillQuestionItem[];
}

export interface DailyDrillTodayResponse {
  exists: boolean;
  session: DailyDrillSession | null;
  course_title?: string;
  exam_id?: number | null;
}

export interface DailyDrillAnswerResponse {
  question_id: number;
  selected_option: string;
  is_correct: boolean;
  correct_option: string;
  explanation?: string;
  hint?: string;
  current_score: number;
  correct_answers: number;
  answered_count: number;
  total_questions: number;
}

export interface DailyDrillReviewItem {
  id: number;
  order: number;
  question_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  selected_option?: string | null;
  correct_option: string;
  is_correct: boolean;
  explanation?: string;
  hint?: string;
  answered_at?: string | null;
}

export interface DailyDrillCompleteResponse {
  session_id: number;
  status: 'COMPLETED';
  score: number;
  correct_answers: number;
  total_questions: number;
  accuracy: number;
  time_taken_seconds: number;
  xp_awarded: number;
  current_streak: number;
  completed_at: string;
  review: DailyDrillReviewItem[];
}

const CANONICAL_GAME_MODES: GameMode[] = [
  {
    id: "weekly-quiz",
    title: "Weekly Grand Quiz",
    description: "Curated 15-question weekly challenge from the Master Question Bank. Earn XP and test readiness.",
    icon: "Crown",
    players: "Single Player",
    timeLimit: "20 mins",
    xpReward: "Up to 100 XP",
    color: "from-amber-500 to-yellow-600",
    badge: "Featured",
    path: "/student/games/weekly-quiz"
  },
  {
    id: "1v1-duel",
    title: "1v1 Duel Challenge",
    description: "Battle live against another aspirant in real-time. Highest score claims the Victory Bonus.",
    icon: "Swords",
    players: "2 Players",
    timeLimit: "15s / question",
    xpReward: "Score + 50 XP Victory Bonus",
    color: "from-blue-500 to-indigo-600",
    badge: "Live Battle",
    path: "/student/games/duel"
  },
  {
    id: "survival",
    title: "Solo Survival Mode",
    description: "Answer correctly to stay alive with 3 lives. Difficulty escalates with each question survived.",
    icon: "Shield",
    players: "Single Player",
    timeLimit: "8s - 15s / question",
    xpReward: "10 - 50 XP / q",
    color: "from-rose-500 to-red-600",
    badge: "High Stakes",
    path: "/student/games/survival"
  },
  {
    id: "daily-challenge",
    title: "Daily Drill",
    description: "Daily 5-minute question set tailored to your preparation course. Reinforce concepts, earn XP, and protect your study streak.",
    icon: "Target",
    players: "Single Player",
    timeLimit: "5 mins",
    xpReward: "Up to 45 XP + Streak",
    color: "from-emerald-500 to-teal-600",
    badge: "Daily 5 Min",
    path: "/student/games/daily-drill"
  }
];

class GamesService {
  async getGameModes(): Promise<GameMode[]> {
    return CANONICAL_GAME_MODES;
  }
}

export const gamesService = new GamesService();



// ============================================================================
// Legacy Games API Support (For Duel / Survival / History pages)
// ============================================================================

export interface GameQuestion {
  id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  deadline?: string;
}

export interface GameMatch {
  id: number;
  status: 'SEARCHING' | 'MATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  is_bot_match?: boolean;
  bot_difficulty?: string;
  opponent_type?: 'BOT' | 'HUMAN';
  time_remaining_matchmaking?: number;
  bot_answered?: boolean;
  player1_name: string;
  player2_name: string;
  player1_score: number;
  player2_score: number;
  current_question_index: number;
  current_question?: GameQuestion;
  has_answered: boolean;
  winner_name?: string;
  is_draw?: boolean;
  created_at: string;
}

export interface SurvivalGame {
  id: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  score: number;
  lives_remaining: number;
  questions_survived: number;
  highest_streak: number;
  current_streak: number;
  created_at: string;
}

export interface ActiveSurvivalGame extends SurvivalGame {
  question_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  question_deadline: string;
}

export interface GameProfile {
  id: number;
  username?: string;
  student_name: string;
  total_xp: number;
  level: number;
  rank_title: string;
  duel_wins: number;
  duel_losses: number;
  total_1v1_wins?: number;
  survival_high_score: number;
  best_survival_score?: number;
  best_survival_streak?: number;
  total_questions_answered: number;
  accuracy: number;
}

export interface AdminMatchesResponse {
  results: AdminGameMatch[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface AdminGameMatch {
  id: number;
  status: string;
  is_invite_only: boolean;
  player1_id: number;
  player1_username: string;
  player2_id: number | null;
  player2_username: string | null;
  player1_score: number;
  player2_score: number;
  winner_id: number | null;
  winner_username: string | null;
  is_draw: boolean;
  question_count: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface AdminSurvivalGamesResponse {
  results: AdminSurvivalGame[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface AdminSurvivalGame {
  id: number;
  player_id: number;
  player_username: string;
  score: number;
  questions_survived: number;
  highest_streak: number;
  status: string;
  correct_answers: number;
  duration_seconds: number | null;
  created_at: string;
  ended_at: string | null;
}

export interface AdminGameActivityEntry {
  type: "duel" | "survival";
  id: number;
  description: string;
  status: string;
  timestamp: string;
  playerId: number;
  opponentId: number | null;
}

export interface AdminGameStats {
  totalPlayers: number;
  activePlayers: number;
  activeWindowDays: number;
  totalGamesPlayed: number;
  totalDuels: number;
  totalSurvivalRuns: number;
  completedGames: number;
  completedDuels: number;
  completedSurvivalRuns: number;
  averageDuelScore: number | null;
  averageSurvivalScore: number | null;
  recentActivity: AdminGameActivityEntry[];
}

export interface AdminPlayerGameActivity {
  player: { id: number; username: string; name: string };
  summary: {
    duelsPlayed: number;
    duelsWon: number;
    duelsLost: number;
    duelsDrawn: number;
    duelAccuracy: number | null;
    survivalRuns: number;
    bestSurvivalScore: number | null;
    survivalAccuracy: number | null;
  };
  recentMatches: AdminGameMatch[];
  recentSurvivalRuns: AdminSurvivalGame[];
}

export interface AdminGameListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  player_id?: number;
  date_from?: string;
  date_to?: string;
  order_by?: string;
}

export const gamesApi = {
  // Duel API
  getMatchState: async (matchId: number): Promise<GameMatch> => {
    return apiClient<GameMatch>(`/games/matches/${matchId}/state/`);
  },
  submitAnswer: async (matchId: number, option: string): Promise<any> => {
    return apiClient<any>(`/games/matches/${matchId}/answer/`, {
      method: "POST",
      body: JSON.stringify({ selected_option: option, option })
    });
  },
  randomMatch: async (): Promise<{id: number}> => {
    return apiClient<{id: number}>('/games/matchmaking/random/', { method: "POST" });
  },
  createInvite: async (): Promise<{id: number, invite_code: string}> => {
    return apiClient<{id: number, invite_code: string}>('/games/matchmaking/invite/', { method: "POST" });
  },
  joinInvite: async (code: string): Promise<{id: number}> => {
    return apiClient<{id: number}>('/games/matchmaking/join/', {
      method: "POST",
      body: JSON.stringify({ invite_code: code })
    });
  },
  cancelMatch: async (matchId?: number): Promise<{ status: string; match_id?: number }> => {
    const url = matchId ? `/games/matches/${matchId}/cancel/` : '/games/matchmaking/cancel/';
    return apiClient<{ status: string; match_id?: number }>(url, { method: "POST" });
  },

  // Survival API
  startSurvival: async (): Promise<ActiveSurvivalGame> => {
    return apiClient<ActiveSurvivalGame>('/games/survival/start/', { method: "POST" });
  },
  getActiveSurvival: async (): Promise<{ active: boolean; game: ActiveSurvivalGame | null }> => {
    return apiClient<{ active: boolean; game: ActiveSurvivalGame | null }>('/games/survival/active/');
  },
  submitSurvivalAnswer: async (gameId: number, option: string): Promise<{status: 'CONTINUE' | 'GAME_OVER', is_correct: boolean, game: ActiveSurvivalGame | SurvivalGame}> => {
    return apiClient<any>(`/games/survival/${gameId}/answer/`, {
      method: "POST",
      body: JSON.stringify({ selected_option: option, option })
    });
  },

  // Weekly Quiz API
  getCurrentWeeklyQuiz: async (): Promise<WeeklyQuiz> => {
    return apiClient<WeeklyQuiz>('/games/weekly-quiz/current/');
  },
  startWeeklyQuiz: async (): Promise<WeeklyQuizStartResponse> => {
    return apiClient<WeeklyQuizStartResponse>('/games/weekly-quiz/start/', { method: "POST" });
  },
  submitWeeklyQuiz: async (attemptId: number, answers: Record<string, string>, timeTakenSeconds: number): Promise<WeeklyQuizSubmitResponse> => {
    return apiClient<WeeklyQuizSubmitResponse>('/games/weekly-quiz/submit/', {
      method: "POST",
      body: JSON.stringify({
        attempt_id: attemptId,
        answers,
        time_taken_seconds: timeTakenSeconds,
      })
    });
  },
  getWeeklyQuizAttempt: async (attemptId: number): Promise<WeeklyQuizSubmitResponse> => {
    return apiClient<WeeklyQuizSubmitResponse>(`/games/weekly-quiz/attempts/${attemptId}/`);
  },

  // Daily Drill
  getDailyDrillToday: async (): Promise<DailyDrillTodayResponse> => {
    return apiClient<DailyDrillTodayResponse>('/games/daily-drill/today/');
  },
  startDailyDrill: async (): Promise<DailyDrillSession> => {
    return apiClient<DailyDrillSession>('/games/daily-drill/start/', { method: "POST" });
  },
  getDailyDrillDetail: async (sessionId: number): Promise<DailyDrillSession> => {
    return apiClient<DailyDrillSession>(`/games/daily-drill/${sessionId}/`);
  },
  submitDailyDrillAnswer: async (sessionId: number, questionId: number, selectedOption: string): Promise<DailyDrillAnswerResponse> => {
    return apiClient<DailyDrillAnswerResponse>(`/games/daily-drill/${sessionId}/answer/`, {
      method: "POST",
      body: JSON.stringify({ question_id: questionId, selected_option: selectedOption })
    });
  },
  completeDailyDrill: async (sessionId: number): Promise<DailyDrillCompleteResponse> => {
    return apiClient<DailyDrillCompleteResponse>(`/games/daily-drill/${sessionId}/complete/`, { method: "POST" });
  },

  // History & Leaderboard
  getHistory: async (): Promise<{matches: GameMatch[], survivals: SurvivalGame[], weekly_quizzes?: WeeklyQuizAttempt[]}> => {
    return apiClient<any>('/games/history/');
  },
  getLeaderboard: async (): Promise<{top_1v1: GameProfile[], top_survival: GameProfile[]}> => {
    return apiClient<any>('/games/leaderboard/');
  },

  // Admin API
  getAdminStats: async (): Promise<AdminGameStats> => {
    return apiClient<AdminGameStats>('/games/admin/stats/');
  },
  getAdminMatches: async (params?: AdminGameListParams): Promise<AdminMatchesResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.page_size) query.set('page_size', String(params.page_size));
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.player_id) query.set('player_id', String(params.player_id));
    if (params?.date_from) query.set('date_from', params.date_from);
    if (params?.date_to) query.set('date_to', params.date_to);
    if (params?.order_by) query.set('order_by', params.order_by);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient<AdminMatchesResponse>(`/games/admin/matches/${qs}`);
  },
  getAdminSurvivalGames: async (params?: AdminGameListParams): Promise<AdminSurvivalGamesResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.page_size) query.set('page_size', String(params.page_size));
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.player_id) query.set('player_id', String(params.player_id));
    if (params?.date_from) query.set('date_from', params.date_from);
    if (params?.date_to) query.set('date_to', params.date_to);
    if (params?.order_by) query.set('order_by', params.order_by);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient<AdminSurvivalGamesResponse>(`/games/admin/survival-games/${qs}`);
  },
  getAdminPlayerActivity: async (playerId: number): Promise<AdminPlayerGameActivity> => {
    return apiClient<AdminPlayerGameActivity>(`/games/admin/players/${playerId}/activity/`);
  },
};
