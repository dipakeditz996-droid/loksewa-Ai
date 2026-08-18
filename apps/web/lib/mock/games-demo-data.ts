export interface GameMode {
  id: string;
  title: string;
  description: string;
  icon: string; // Emoji or identifier for Lucide icon
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  questionsCount: number | "Endless";
  timeLimitMins: number | "Endless";
  xpReward: number;
  coinReward: number;
  category: "Daily" | "Speed" | "Subject" | "Battle" | "Practice" | "Special Events";
  status: "Available now" | "Completed today" | "Locked";
  lockedReason?: string;
  buttonText: string;
  route: string;
}

export interface FeaturedGame extends GameMode {
  isFeatured: true;
}

export const mockGameModes: GameMode[] = [
  {
    id: "g1",
    title: "Daily Challenge",
    description: "Your daily dose of Loksewa prep. Fresh questions every 24 hours.",
    icon: "Calendar",
    difficulty: "Medium",
    questionsCount: 10,
    timeLimitMins: 5,
    xpReward: 150,
    coinReward: 50,
    category: "Daily",
    status: "Available now",
    buttonText: "Start Challenge",
    route: "/student/games/daily",
  },
  {
    id: "g2",
    title: "Quiz Battle",
    description: "Test your knowledge against the clock. Answer faster to win.",
    icon: "Swords",
    difficulty: "Medium",
    questionsCount: 20,
    timeLimitMins: 10,
    xpReward: 200,
    coinReward: 100,
    category: "Battle",
    status: "Available now",
    buttonText: "Play Now",
    route: "/student/games/duel",
  },
  {
    id: "g3",
    title: "Speed Challenge",
    description: "Answer as many questions as possible before time runs out.",
    icon: "Zap",
    difficulty: "Hard",
    questionsCount: "Endless",
    timeLimitMins: 1, // 60 seconds
    xpReward: 300,
    coinReward: 150,
    category: "Speed",
    status: "Available now",
    buttonText: "Start Speed Run",
    route: "/student/games/survival",
  },
  {
    id: "g4",
    title: "Subject Challenge",
    description: "Focus on a specific subject to master it.",
    icon: "BookOpen",
    difficulty: "Easy",
    questionsCount: 15,
    timeLimitMins: 8,
    xpReward: 100,
    coinReward: 25,
    category: "Subject",
    status: "Available now",
    buttonText: "Choose Subject",
    route: "/student/games/subject",
  },
  {
    id: "g5",
    title: "Expert Arena",
    description: "High difficulty questions for top players. High risk, high reward.",
    icon: "Crown",
    difficulty: "Expert",
    questionsCount: 30,
    timeLimitMins: 15,
    xpReward: 500,
    coinReward: 250,
    category: "Special Events",
    status: "Locked",
    lockedReason: "Unlock at Level 15",
    buttonText: "Locked",
    route: "#",
  }
];

export const mockFeaturedGame: FeaturedGame = {
  id: "fg1",
  title: "Constitution Master",
  description: "Can you answer 15 questions in 3 minutes? Prove your mastery of the Constitution.",
  icon: "Award",
  difficulty: "Hard",
  questionsCount: 15,
  timeLimitMins: 3,
  xpReward: 300,
  coinReward: 100,
  category: "Special Events",
  status: "Available now",
  buttonText: "Start Challenge",
  route: "/student/games/featured",
  isFeatured: true,
};

export const mockRecommendedGames: GameMode[] = [
  {
    id: "r1",
    title: "Improve Constitution",
    description: "Practice your weakest subject.",
    icon: "TrendingUp",
    difficulty: "Medium",
    questionsCount: 15,
    timeLimitMins: 10,
    xpReward: 120,
    coinReward: 30,
    category: "Practice",
    status: "Available now",
    buttonText: "Practice Now",
    route: "/student/games/practice/constitution",
  },
  {
    id: "r2",
    title: "Current Affairs Challenge",
    description: "Stay updated with the latest events.",
    icon: "Globe",
    difficulty: "Hard",
    questionsCount: 20,
    timeLimitMins: 10,
    xpReward: 180,
    coinReward: 60,
    category: "Practice",
    status: "Available now",
    buttonText: "Play",
    route: "/student/games/practice/current-affairs",
  }
];
