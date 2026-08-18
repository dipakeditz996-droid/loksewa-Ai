import { 
  mockGameModes, 
  mockFeaturedGame, 
  mockRecommendedGames,
  GameMode,
  FeaturedGame
} from "../mock/games-demo-data";

class GamesService {
  /**
   * Fetch all available game modes.
   */
  async getGameModes(): Promise<GameMode[]> {
    try {
      // In the future: const res = await api.get('/student/games/modes'); return res.data;
      throw new Error("Backend not connected");
    } catch (error) {
      console.warn("Games API failed, falling back to mock data.", error);
      return new Promise(resolve => setTimeout(() => resolve(mockGameModes), 500));
    }
  }

  /**
   * Fetch the featured game of the day.
   */
  async getFeaturedGame(): Promise<FeaturedGame> {
    try {
      throw new Error("Backend not connected");
    } catch (error) {
      return new Promise(resolve => setTimeout(() => resolve(mockFeaturedGame), 500));
    }
  }

  /**
   * Fetch personalized recommended games for the student.
   */
  async getRecommendedGames(): Promise<GameMode[]> {
    try {
      throw new Error("Backend not connected");
    } catch (error) {
      return new Promise(resolve => setTimeout(() => resolve(mockRecommendedGames), 500));
    }
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

export const gamesApi = {
  // Duel API
  getMatchState: async (matchId: number): Promise<GameMatch> => {
    return {
      id: matchId,
      status: 'SEARCHING',
      player1_name: "You",
      player2_name: "Opponent",
      player1_score: 0,
      player2_score: 0,
      current_question_index: 0,
      has_answered: false,
      created_at: new Date().toISOString()
    };
  },
  submitAnswer: async (matchId: number, option: string): Promise<any> => {
    return { success: true };
  },
  randomMatch: async (): Promise<{id: number}> => {
    return { id: 1 };
  },
  createInvite: async (): Promise<{id: number, invite_code: string}> => {
    return { id: 1, invite_code: "XYZ123" };
  },
  joinInvite: async (code: string): Promise<{id: number}> => {
    return { id: 1 };
  },
  
  // Survival API
  startSurvival: async (): Promise<ActiveSurvivalGame> => {
    return {
      id: 1,
      status: 'IN_PROGRESS',
      score: 0,
      lives_remaining: 3,
      questions_survived: 0,
      highest_streak: 0,
      current_streak: 0,
      question_id: 1,
      question_text: "Demo Question",
      option_a: "A",
      option_b: "B",
      option_c: "C",
      option_d: "D",
      question_deadline: new Date(Date.now() + 15000).toISOString(),
      created_at: new Date().toISOString()
    };
  },
  submitSurvivalAnswer: async (gameId: number, option: string): Promise<{status: 'CONTINUE' | 'GAME_OVER', is_correct: boolean, game: ActiveSurvivalGame | SurvivalGame}> => {
    return {
      status: 'GAME_OVER',
      is_correct: false,
      game: {
        id: gameId,
        status: 'COMPLETED',
        score: 0,
        lives_remaining: 0,
        questions_survived: 0,
        highest_streak: 0,
        current_streak: 0,
        created_at: new Date().toISOString()
      }
    };
  },

  // History & Leaderboard
  getHistory: async (): Promise<{matches: GameMatch[], survivals: SurvivalGame[]}> => {
    return { matches: [], survivals: [] };
  },
  getLeaderboard: async (): Promise<{top_1v1: GameProfile[], top_survival: GameProfile[]}> => {
    return { top_1v1: [], top_survival: [] };
  }
};
