export type UserBadge = {
  letter: string;
  className: string;
};

export type GameStat = {
  id: string;
  name: string;
  lastPlayed: string;
  streakDays?: number;
  highScore: number;
  playCount: number;
  playLabel: "quizzes" | "games";
  image: string;
  imageAlt: string;
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  country: string;
  joinedAt: string;
  age: number;
  friends: number;
  badges: UserBadge[];
  gamesPlayed: number;
  gamesPlayedDelta: string;
  mostPlayedGame: string;
  mostPlayedShare: string;
  games: GameStat[];
};

const defaultGames: GameStat[] = [
  {
    id: "daily-quiz",
    name: "Daily Quiz",
    lastPlayed: "Last played 3 hours ago",
    streakDays: 18,
    highScore: 1500,
    playCount: 18,
    playLabel: "quizzes",
    image: "/games/quiz.jpg",
    imageAlt: "Quiz cards",
  },
  {
    id: "fake-or-real",
    name: "Fake or Real",
    lastPlayed: "Last played 3 hours ago",
    streakDays: 12,
    highScore: 1500,
    playCount: 14,
    playLabel: "games",
    image: "/games/fake-or-real.jpg",
    imageAlt: "Two portraits",
  },
  {
    id: "player-of-the-day",
    name: "Player of the day",
    lastPlayed: "Last played 3 hours ago",
    streakDays: 22,
    highScore: 1500,
    playCount: 14,
    playLabel: "games",
    image: "/games/batsman.jpg",
    imageAlt: "Cricket batsman",
  },
  {
    id: "team-of-the-day",
    name: "Team of the day",
    lastPlayed: "Last played 3 hours ago",
    streakDays: 7,
    highScore: 1500,
    playCount: 2,
    playLabel: "games",
    image: "/games/stadium.jpg",
    imageAlt: "Cricket stadium",
  },
  {
    id: "lower-or-higher",
    name: "Lower or Higher",
    lastPlayed: "Last played 3 hours ago",
    highScore: 1500,
    playCount: 11,
    playLabel: "games",
    image: "/games/action.jpg",
    imageAlt: "Cricket player batting",
  },
];

export const users: AppUser[] = [
  {
    id: "asim-raheem",
    name: "Asim Raheem",
    email: "asim.raheem@example.com",
    avatar: "/avatars/asim.jpg",
    country: "Pakistan",
    joinedAt: "24 March 2026",
    age: 22,
    friends: 150,
    badges: [
      { letter: "F", className: "bg-[#22c55e]" },
      { letter: "A", className: "bg-[#f97316]" },
    ],
    gamesPlayed: 324,
    gamesPlayedDelta: "+12% vs last week",
    mostPlayedGame: "Daily Quiz",
    mostPlayedShare: "+72% of all games",
    games: defaultGames,
  },
  {
    id: "sara-malik",
    name: "Sara Malik",
    email: "sara.malik@example.com",
    avatar: "/avatars/sara.jpg",
    country: "United Kingdom",
    joinedAt: "12 January 2026",
    age: 26,
    friends: 88,
    badges: [{ letter: "F", className: "bg-[#22c55e]" }],
    gamesPlayed: 141,
    gamesPlayedDelta: "+4% vs last week",
    mostPlayedGame: "Fake or Real",
    mostPlayedShare: "+51% of all games",
    games: defaultGames,
  },
  {
    id: "arjun-patel",
    name: "Arjun Patel",
    email: "arjun.patel@example.com",
    avatar: "/avatars/arjun.jpg",
    country: "India",
    joinedAt: "03 February 2026",
    age: 24,
    friends: 210,
    badges: [
      { letter: "F", className: "bg-[#22c55e]" },
      { letter: "A", className: "bg-[#f97316]" },
    ],
    gamesPlayed: 412,
    gamesPlayedDelta: "+19% vs last week",
    mostPlayedGame: "Player of the day",
    mostPlayedShare: "+44% of all games",
    games: defaultGames,
  },
];

export function getUserById(id: string) {
  return users.find((user) => user.id === id);
}
