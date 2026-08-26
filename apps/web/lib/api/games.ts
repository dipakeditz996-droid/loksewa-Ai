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
}

export interface FeaturedGame {
  id: string;
  title: string;
  type: string;
  description: string;
  participants: number;
  prizePool: string;
  endTime: string;
  image: string;
  icon: string;
  difficulty: string;
  questionsCount: number;
  timeLimitMins: number;
  buttonText: string;
  route: string;
  xpReward: number;
  coinReward: number;
}

const STATIC_GAME_MODES: GameMode[] = [
  {
    id: "1",
    title: "1v1 Duel",
    description: "Challenge a random opponent in a fast-paced 5-question match.",
    icon: "swords",
    players: "2 Players",
    timeLimit: "30s / question",
    xpReward: "50 XP",
    color: "from-blue-500 to-indigo-600",
    path: "/student/games/duel"
  },
  {
    id: "2",
    title: "Survival Mode",
    description: "Answer correctly to stay alive. How long can you survive?",
    icon: "shield",
    players: "Single Player",
    timeLimit: "15s / question",
    xpReward: "10 XP / q",
    color: "from-rose-500 to-red-600",
    badge: "Popular",
    path: "/student/games/survival"
  },
  {
    id: "3",
    title: "Daily Challenge",
    description: "Complete the daily 10-question set for bonus rewards.",
    icon: "target",
    players: "Global",
    timeLimit: "10 mins",
    xpReward: "100 XP",
    color: "from-amber-500 to-orange-600",
    path: "/student/games/daily"
  }
];

const STATIC_FEATURED_GAME: FeaturedGame = {
  id: "fg-1",
  title: "Weekly Grand Loksewa Quiz",
  type: "Tournament",
  description: "Join 5,000+ aspirants in the ultimate weekly showdown. Top 100 win exclusive study materials.",
  participants: 5240,
  prizePool: "10,000 XP + Premium Notes",
  endTime: "2024-05-15T18:00:00Z",
  image: "/media/course.jpg",
  icon: "Crown",
  difficulty: "Hard",
  questionsCount: 50,
  timeLimitMins: 45,
  buttonText: "Play Now",
  route: "/student/games/weekly-quiz",
  xpReward: 500,
  coinReward: 200
};

class GamesService {
  /**
   * Fetch all available game modes. (Static UI Configuration)
   */
  async getGameModes(): Promise<GameMode[]> {
    return STATIC_GAME_MODES;
  }

  /**
   * Fetch the featured game of the day. (Static UI Configuration)
   */
  async getFeaturedGame(): Promise<FeaturedGame | null> {
    return STATIC_FEATURED_GAME;
  }

  /**
   * Fetch personalized recommended games for the student.
   */
  async getRecommendedGames(): Promise<GameMode[]> {
    return STATIC_GAME_MODES.slice(0, 2);
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
  player1_username: string;
  player2_username: string | null;
  player1_score: number;
  player2_score: number;
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

export const gamesApi = {
  // Duel API
  getMatchState: async (matchId: number): Promise<GameMatch> => {
    return apiClient<GameMatch>(`/games/matches/${matchId}/state/`);
  },
  submitAnswer: async (matchId: number, option: string): Promise<any> => {
    return apiClient<any>(`/games/matches/${matchId}/answer/`, {
      method: "POST",
      body: JSON.stringify({ selected_option: option })
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

  // Survival API
  startSurvival: async (): Promise<ActiveSurvivalGame> => {
    return apiClient<ActiveSurvivalGame>('/games/survival/start/', { method: "POST" });
  },
  submitSurvivalAnswer: async (gameId: number, option: string): Promise<{status: 'CONTINUE' | 'GAME_OVER', is_correct: boolean, game: ActiveSurvivalGame | SurvivalGame}> => {
    return apiClient<any>(`/games/survival/${gameId}/answer/`, {
      method: "POST",
      body: JSON.stringify({ selected_option: option })
    });
  },

  // History & Leaderboard
  getHistory: async (): Promise<{matches: GameMatch[], survivals: SurvivalGame[]}> => {
    return apiClient<any>('/games/history/');
  },
  getLeaderboard: async (): Promise<{top_1v1: GameProfile[], top_survival: GameProfile[]}> => {
    return apiClient<any>('/games/leaderboard/');
  },

  // Admin API
  getAdminMatches: async (params?: {page?: number, page_size?: number, search?: string, status?: string, order_by?: string}): Promise<AdminMatchesResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.page_size) query.set('page_size', String(params.page_size));
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.order_by) query.set('order_by', params.order_by);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient<AdminMatchesResponse>(`/games/admin/matches/${qs}`);
  },
  getAdminSurvivalGames: async (params?: {page?: number, page_size?: number, search?: string, status?: string, order_by?: string}): Promise<AdminSurvivalGamesResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.page_size) query.set('page_size', String(params.page_size));
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.order_by) query.set('order_by', params.order_by);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient<AdminSurvivalGamesResponse>(`/games/admin/survival-games/${qs}`);
  }
};
