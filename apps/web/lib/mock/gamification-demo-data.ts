export interface PlayerStats {
  level: number;
  xp: number;
  nextLevelXp: number;
  coins: number;
  streak: number;
  streakDays: boolean[]; // 7 days (Mon-Sun), true = completed
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
  icon: string; // Emoji
  locked: boolean;
  progress: number;
  maxProgress: number;
}

export interface RecentActivity {
  id: string;
  title: string;
  description: string;
  xpGained: number;
  timestamp: string; // ISO string
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

export const mockPlayerStats: PlayerStats = {
  level: 12,
  xp: 1240,
  nextLevelXp: 1500,
  coins: 2450,
  streak: 7,
  streakDays: [true, true, true, true, true, true, false],
  rank: 27,
  previousRank: 30,
  gamesPlayed: 128,
  gamesWon: 87,
  questionsAnswered: 2840,
  accuracy: 82,
  bestScore: 98,
  studentName: "Diwas",
};

export const mockAchievements: Achievement[] = [
  { id: "1", title: "First Victory", description: "Win your first game", icon: "🏆", locked: false, progress: 1, maxProgress: 1 },
  { id: "2", title: "7 Day Streak", description: "Maintain a 7-day streak", icon: "🔥", locked: false, progress: 7, maxProgress: 7 },
  { id: "3", title: "Perfect Score", description: "Get 100% in any game", icon: "🎯", locked: false, progress: 1, maxProgress: 1 },
  { id: "4", title: "Speed Master", description: "Answer 10 questions in 30s", icon: "⚡", locked: false, progress: 1, maxProgress: 1 },
  { id: "5", title: "Knowledge Seeker", description: "Answer 100 questions", icon: "📚", locked: false, progress: 100, maxProgress: 100 },
  { id: "6", title: "Top 10", description: "Reach top 10 on the leaderboard", icon: "👑", locked: true, progress: 27, maxProgress: 10 },
  { id: "7", title: "50 Game Wins", description: "Win 50 games", icon: "💯", locked: false, progress: 87, maxProgress: 50 },
  { id: "8", title: "Accuracy King", description: "Maintain 90% accuracy over 10 games", icon: "🎯", locked: true, progress: 6, maxProgress: 10 },
  { id: "9", title: "Subject Master", description: "Complete all subject challenges", icon: "🧠", locked: true, progress: 3, maxProgress: 8 },
];

export const mockRecentActivity: RecentActivity[] = [
  { id: "1", title: "Won Quiz Battle", description: "Defeated opponent in 1v1", xpGained: 100, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: "2", title: "Perfect Score", description: "Daily Challenge perfection", xpGained: 200, timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  { id: "3", title: "Streak Extended", description: "Day 7 reached", xpGained: 50, timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
  { id: "4", title: "Completed Daily Challenge", description: "General Knowledge set", xpGained: 150, timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
];

export const mockGameLeaderboard: GameLeaderboardEntry[] = [
  { rank: 1, name: "Ramesh Thapa", xp: 9850 },
  { rank: 2, name: "Sita Sharma", xp: 9420 },
  { rank: 3, name: "Hari Poudel", xp: 8970 },
  { rank: 4, name: "Aashish Karki", xp: 8650 },
  { rank: 5, name: "Bibek Adhikari", xp: 8410 },
];

export const mockPerformanceData: PerformanceDataPoint[] = [
  { date: "Mon", xp: 120, accuracy: 78, score: 75 },
  { date: "Tue", xp: 250, accuracy: 82, score: 80 },
  { date: "Wed", xp: 180, accuracy: 75, score: 72 },
  { date: "Thu", xp: 300, accuracy: 88, score: 85 },
  { date: "Fri", xp: 150, accuracy: 80, score: 78 },
  { date: "Sat", xp: 400, accuracy: 92, score: 90 },
  { date: "Sun", xp: 350, accuracy: 85, score: 88 },
];
