/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║         LEADERBOARD DEMO DATA — LoksewaAI                       ║
 * ║  Replace leaderboardService calls to switch to real API data.   ║
 * ║  This module must NEVER be imported in production API routes.   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ─── Types (mirrored in lib/api/leaderboard.ts) ──────────────────────────────

export interface LeaderboardStudent {
  /** Public display name only — never expose email/phone/internal ID */
  studentId: string;
  studentName: string;
  avatar: string | null;
  rank: number;
  previousRank: number;
  rankChange: number; // positive = improved, negative = dropped, 0 = same
  score: number;       // raw score e.g. 88
  maxScore: number;    // max possible e.g. 100
  percentage: number;
  examsAttempted: number;
  testsCleared: number;
  averageScore: number;
  bestScore: number;
  timeTaken: number;   // avg minutes per exam
  trend: "up" | "down" | "same";
  isCurrentUser?: boolean;
}

export interface LeaderboardStats {
  totalStudents: number;
  currentRank: number;
  score: number;
  maxScore: number;
  percentile: number;    // e.g. 18 means "Top 18%"
  rankChange: number;
  bestRank: number;
  averageScore: number;
  highestScore: number;
  testsTaken: number;
  testsCleared: number;
  passRate: number;       // percentage
}

export interface ScoreTrendPoint {
  label: string;
  score: number;
}

// ─── Raw student pool (sorted by score desc) ─────────────────────────────────

const RAW_STUDENTS: Omit<LeaderboardStudent, "rank" | "previousRank" | "rankChange" | "trend">[] = [
  { studentId: "s001", studentName: "Ramesh Thapa",       avatar: null, score: 96, maxScore: 100, percentage: 96.0, examsAttempted: 18, testsCleared: 16, averageScore: 93.2, bestScore: 96, timeTaken: 42 },
  { studentId: "s002", studentName: "Sita Sharma",        avatar: null, score: 94, maxScore: 100, percentage: 94.0, examsAttempted: 21, testsCleared: 19, averageScore: 91.5, bestScore: 94, timeTaken: 38 },
  { studentId: "s003", studentName: "Hari Poudel",        avatar: null, score: 91, maxScore: 100, percentage: 91.0, examsAttempted: 14, testsCleared: 13, averageScore: 88.4, bestScore: 91, timeTaken: 45 },
  { studentId: "s004", studentName: "Aashish Karki",      avatar: null, score: 89, maxScore: 100, percentage: 89.0, examsAttempted: 16, testsCleared: 14, averageScore: 86.1, bestScore: 89, timeTaken: 40 },
  { studentId: "s005", studentName: "Prakriti Lamichhane",avatar: null, score: 87, maxScore: 100, percentage: 87.0, examsAttempted: 20, testsCleared: 17, averageScore: 84.3, bestScore: 87, timeTaken: 37 },
  { studentId: "s006", studentName: "Bibek Adhikari",     avatar: null, score: 85, maxScore: 100, percentage: 85.0, examsAttempted: 12, testsCleared: 10, averageScore: 82.0, bestScore: 85, timeTaken: 50 },
  { studentId: "s007", studentName: "Aarav Gurung",       avatar: null, score: 82, maxScore: 100, percentage: 82.0, examsAttempted: 9,  testsCleared: 7,  averageScore: 78.5, bestScore: 82, timeTaken: 48, isCurrentUser: true },
  { studentId: "s008", studentName: "Kritika Shrestha",   avatar: null, score: 80, maxScore: 100, percentage: 80.0, examsAttempted: 15, testsCleared: 12, averageScore: 77.2, bestScore: 80, timeTaken: 43 },
  { studentId: "s009", studentName: "Sujan Poudel",       avatar: null, score: 78, maxScore: 100, percentage: 78.0, examsAttempted: 11, testsCleared: 9,  averageScore: 75.0, bestScore: 78, timeTaken: 55 },
  { studentId: "s010", studentName: "Anish Bhandari",     avatar: null, score: 77, maxScore: 100, percentage: 77.0, examsAttempted: 13, testsCleared: 10, averageScore: 73.8, bestScore: 77, timeTaken: 46 },
  { studentId: "s011", studentName: "Pooja Adhikari",     avatar: null, score: 75, maxScore: 100, percentage: 75.0, examsAttempted: 17, testsCleared: 13, averageScore: 72.1, bestScore: 75, timeTaken: 41 },
  { studentId: "s012", studentName: "Suman Thapa",        avatar: null, score: 73, maxScore: 100, percentage: 73.0, examsAttempted: 8,  testsCleared: 6,  averageScore: 70.5, bestScore: 73, timeTaken: 52 },
  { studentId: "s013", studentName: "Roshan Gurung",      avatar: null, score: 71, maxScore: 100, percentage: 71.0, examsAttempted: 10, testsCleared: 7,  averageScore: 68.9, bestScore: 71, timeTaken: 44 },
  { studentId: "s014", studentName: "Sandip Karki",       avatar: null, score: 70, maxScore: 100, percentage: 70.0, examsAttempted: 14, testsCleared: 10, averageScore: 67.2, bestScore: 70, timeTaken: 39 },
  { studentId: "s015", studentName: "Manish Gautam",      avatar: null, score: 68, maxScore: 100, percentage: 68.0, examsAttempted: 7,  testsCleared: 5,  averageScore: 65.0, bestScore: 68, timeTaken: 57 },
  { studentId: "s016", studentName: "Anusha Sharma",      avatar: null, score: 66, maxScore: 100, percentage: 66.0, examsAttempted: 12, testsCleared: 8,  averageScore: 63.4, bestScore: 66, timeTaken: 49 },
  { studentId: "s017", studentName: "Bikash Poudel",      avatar: null, score: 64, maxScore: 100, percentage: 64.0, examsAttempted: 9,  testsCleared: 6,  averageScore: 61.8, bestScore: 64, timeTaken: 53 },
  { studentId: "s018", studentName: "Nabin Chaudhary",    avatar: null, score: 63, maxScore: 100, percentage: 63.0, examsAttempted: 11, testsCleared: 7,  averageScore: 60.5, bestScore: 63, timeTaken: 47 },
  { studentId: "s019", studentName: "Sunita Rai",         avatar: null, score: 61, maxScore: 100, percentage: 61.0, examsAttempted: 6,  testsCleared: 4,  averageScore: 58.9, bestScore: 61, timeTaken: 60 },
  { studentId: "s020", studentName: "Dipesh Shrestha",    avatar: null, score: 59, maxScore: 100, percentage: 59.0, examsAttempted: 8,  testsCleared: 4,  averageScore: 56.2, bestScore: 59, timeTaken: 58 },
  { studentId: "s021", studentName: "Sabina Magar",       avatar: null, score: 58, maxScore: 100, percentage: 58.0, examsAttempted: 5,  testsCleared: 3,  averageScore: 55.1, bestScore: 58, timeTaken: 62 },
  { studentId: "s022", studentName: "Rajan Tamang",       avatar: null, score: 57, maxScore: 100, percentage: 57.0, examsAttempted: 7,  testsCleared: 3,  averageScore: 54.0, bestScore: 57, timeTaken: 56 },
  { studentId: "s023", studentName: "Puja Basnet",        avatar: null, score: 56, maxScore: 100, percentage: 56.0, examsAttempted: 4,  testsCleared: 2,  averageScore: 53.5, bestScore: 56, timeTaken: 65 },
  { studentId: "s024", studentName: "Kishor Bhandari",    avatar: null, score: 55, maxScore: 100, percentage: 55.5, examsAttempted: 6,  testsCleared: 3,  averageScore: 53.0, bestScore: 55, timeTaken: 61 },
  { studentId: "s025", studentName: "Mina Adhikari",      avatar: null, score: 55, maxScore: 100, percentage: 55.0, examsAttempted: 3,  testsCleared: 1,  averageScore: 52.0, bestScore: 55, timeTaken: 70 },
];

// Previous ranks (simulated — in production, derived from last week's data)
const PREVIOUS_RANKS: Record<string, number> = {
  s001: 1, s002: 2, s003: 4, s004: 3, s005: 6,
  s006: 5, s007: 10, s008: 8, s009: 9, s010: 11,
  s011: 12, s012: 13, s013: 14, s014: 15, s015: 16,
  s016: 17, s017: 18, s018: 19, s019: 20, s020: 21,
  s021: 22, s022: 23, s023: 24, s024: 25, s025: 24,
};

/**
 * Rank students by: score desc → percentage desc → examsAttempted desc
 * This mirrors the real ranking logic that will be applied in the backend.
 */
function rankStudents(students: typeof RAW_STUDENTS): LeaderboardStudent[] {
  const sorted = [...students].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    return b.examsAttempted - a.examsAttempted;
  });

  return sorted.map((s, i) => {
    const rank = i + 1;
    const prevRank = PREVIOUS_RANKS[s.studentId] ?? rank;
    const rankChange = prevRank - rank; // positive = improved
    return {
      ...s,
      rank,
      previousRank: prevRank,
      rankChange,
      trend: rankChange > 0 ? "up" : rankChange < 0 ? "down" : "same",
    };
  });
}

// ─── Demo dataset (pre-ranked) ────────────────────────────────────────────────

export const DEMO_LEADERBOARD: LeaderboardStudent[] = rankStudents(RAW_STUDENTS);

/** Total demo "pool" size — used for percentile calculations */
export const DEMO_TOTAL_STUDENTS = 1248;

/** The current user's entry in the demo dataset */
export const DEMO_CURRENT_USER: LeaderboardStudent =
  DEMO_LEADERBOARD.find((s) => s.isCurrentUser)!;

// ─── Score trend for the current user ────────────────────────────────────────

export const DEMO_SCORE_TREND: ScoreTrendPoint[] = [
  { label: "Week 1",     score: 62 },
  { label: "Week 2",     score: 70 },
  { label: "Week 3",     score: 67 },
  { label: "Week 4",     score: 76 },
  { label: "Week 5",     score: 79 },
  { label: "This Week",  score: 82 },
];

// ─── Computed demo stats ──────────────────────────────────────────────────────

export function getDemoStats(): LeaderboardStats {
  const me = DEMO_CURRENT_USER;
  const allScores = DEMO_LEADERBOARD.map((s) => s.percentage);
  const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;

  return {
    totalStudents: DEMO_TOTAL_STUDENTS,
    currentRank: me.rank,
    score: me.score,
    maxScore: me.maxScore,
    percentile: Math.round((1 - (me.rank - 1) / DEMO_TOTAL_STUDENTS) * 100),
    rankChange: me.rankChange,
    bestRank: 4,           // simulated historical best
    averageScore: Math.round(avg * 10) / 10,
    highestScore: DEMO_LEADERBOARD[0]?.percentage ?? 0,
    testsTaken: me.examsAttempted,
    testsCleared: me.testsCleared,
    passRate: Math.round((me.testsCleared / me.examsAttempted) * 100),
  };
}

// ─── Filter utilities ─────────────────────────────────────────────────────────

/**
 * Apply time filter to demo data.
 * In production this would be a backend query param.
 * Here we simulate by slightly varying scores.
 */
export function filterDemoByTime(
  students: LeaderboardStudent[],
  timeFilter: "week" | "month" | "all"
): LeaderboardStudent[] {
  if (timeFilter === "all") return students;

  // Simulate fewer exams for shorter time windows
  const multiplier = timeFilter === "week" ? 0.15 : 0.45;
  const filtered = students
    .map((s) => ({
      ...s,
      examsAttempted: Math.max(1, Math.floor(s.examsAttempted * multiplier)),
      testsCleared: Math.max(0, Math.floor(s.testsCleared * multiplier)),
    }))
    .filter((s) => s.examsAttempted >= 1);

  return rankStudents(filtered);
}

/**
 * Paginate the demo dataset.
 */
export function paginateDemoData(
  students: LeaderboardStudent[],
  page: number,
  pageSize: number
): { data: LeaderboardStudent[]; totalCount: number; totalPages: number } {
  const totalCount = DEMO_TOTAL_STUDENTS; // simulate large pool
  const totalPages = Math.ceil(totalCount / pageSize);
  // For pages beyond real data, repeat/cycle demo students
  const startIdx = ((page - 1) * pageSize) % students.length;
  const slice: LeaderboardStudent[] = [];
  for (let i = 0; i < pageSize; i++) {
    const idx = (startIdx + i) % students.length;
    const student = { ...students[idx]! };
    // Adjust ranks for simulated pagination
    student.rank = (page - 1) * pageSize + i + 1;
    slice.push(student);
  }
  return { data: slice, totalCount, totalPages };
}
