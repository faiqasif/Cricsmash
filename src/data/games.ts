export type GameCard = {
  slug: string;
  title: string;
  description: string;
  href?: string;
  image: string;
  scheduled?: boolean;
};

export const GAME_CARDS: GameCard[] = [
  {
    slug: "daily-quiz",
    title: "Daily Quiz",
    description: "Create dated cricket quizzes for the app.",
    href: "/games/daily-quiz",
    image: "/games/daily-quiz.png",
    scheduled: true,
  },
  {
    slug: "player-of-the-day",
    title: "Player of the day",
    description: "Select a player for each day.",
    href: "/games/player-of-the-day",
    image: "/games/player-of-the-day.png",
    scheduled: true,
  },
  {
    slug: "higher-or-lower",
    title: "Higher or lower",
    description: "Predict which player has the higher stat.",
    image: "/games/higher-or-lower.png",
  },
  {
    slug: "fake-or-real",
    title: "Fake or Real?",
    description: "Spot the fake cricket facts.",
    image: "/games/fake-or-real.png",
  },
  {
    slug: "team-of-the-day",
    title: "Team of the day",
    description: "Build the team and prove you know your cricket.",
    href: "/games/team-of-the-day",
    image: "/games/team-of-the-day.png",
    scheduled: true,
  },
];
