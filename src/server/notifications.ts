import { GAME_CARDS } from "@/data/games";
import { listDocuments, setDocument } from "@/lib/firebase";
import { findDailyQuizByDate } from "@/server/daily-quiz";
import { gameMessageFits, notificationTopic, sendGameNotification } from "@/server/fcm";
import { findPlayerDayByDate } from "@/server/player-of-the-day";
import { findTeamByDate } from "@/server/team-of-the-day";

const COLLECTION = "notifications";

export class NotificationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationInputError";
  }
}

export type GameNotification = {
  id: string;
  title: string;
  body: string;
  game: string;
  game_title: string;
  play_date: string;
  game_option: string;
  topic: string;
  status: "sent" | "failed";
  message_id?: string;
  error?: string;
  created_at: string;
};

function gameBySlug(slug: string) {
  return GAME_CARDS.find((game) => game.slug === slug);
}

function isDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

type StoredQuiz = NonNullable<Awaited<ReturnType<typeof findDailyQuizByDate>>>;

function quizForNotification(quiz: StoredQuiz, includePlayerId: boolean, includeItemId: boolean) {
  return {
    id: quiz.id,
    quiz_date: quiz.quiz_date,
    items: quiz.items.map((item) => {
      const row: Record<string, unknown> = {
        title: item.title,
        options: item.options.map((option) => {
          const choice: Record<string, unknown> = {
            name: option.name,
            option: option.option ?? 0,
          };
          if (option.correct === true) choice.correct = true;
          if (includePlayerId && option.player_id) choice.player_id = option.player_id;
          return choice;
        }),
      };
      if (includeItemId) row.id = item.id;
      return row;
    }),
  };
}

function quizThatFits(
  quiz: StoredQuiz,
  envelope: { title: string; body: string; game: string; gameTitle: string; playDate: string; gameOption: string },
) {
  const candidates = [
    quizForNotification(quiz, true, true),
    quizForNotification(quiz, false, true),
    quizForNotification(quiz, false, false),
  ];
  return candidates.find((data) => gameMessageFits({ ...envelope, gameData: data })) ?? candidates[candidates.length - 1];
}

async function scheduledGame(
  game: string,
  playDate: string,
  gameTitle: string,
  title: string,
  body: string,
) {
  if (game === "daily-quiz") {
    const match = await findDailyQuizByDate(playDate);
    if (!match) throw new NotificationInputError(`No Daily Quiz is scheduled for ${playDate}.`);
    const count = match.items.length;
    const option = `${count} question${count === 1 ? "" : "s"}`;
    return {
      option,
      data: quizThatFits(match, { title, body, game, gameTitle, playDate, gameOption: option }),
    };
  }
  if (game === "player-of-the-day") {
    const match = await findPlayerDayByDate(playDate);
    if (!match) throw new NotificationInputError(`No Player of the day is scheduled for ${playDate}.`);
    return {
      option: `${match.name} · ${match.country}`,
      data: {
        id: match.id,
        play_date: match.play_date,
        player_id: match.player_id,
        name: match.name,
        country: match.country,
        photo_url: match.photo_url ?? "",
        role: match.role,
        debut_format: match.debut_format,
        wickets_format: match.wickets_format,
        matches_format: match.matches_format,
        hundreds_format: match.hundreds_format,
        status: match.status,
      },
    };
  }
  if (game === "team-of-the-day") {
    const match = await findTeamByDate(playDate);
    if (!match) throw new NotificationInputError(`No Team of the day is scheduled for ${playDate}.`);
    return {
      option: `${match.title} · ${match.country}`,
      data: {
        id: match.id,
        play_date: match.play_date,
        title: match.title,
        country: match.country,
        team_type: match.team_type,
        status: match.status,
        players: match.players ?? [],
      },
    };
  }
  return { option: gameTitle, data: { slug: game, play_date: playDate } };
}

export async function parseNotificationPayload(value: unknown) {
  const body = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const message = typeof body.body === "string" ? body.body.trim() : "";
  const game = typeof body.game === "string" ? body.game.trim() : "";
  const playDate = typeof body.play_date === "string" ? body.play_date.trim() : "";
  const match = gameBySlug(game);
  if (!match) throw new NotificationInputError("Select a game.");
  if (!isDateKey(playDate)) throw new NotificationInputError("Choose a game date.");
  if (title.length < 1 || title.length > 120) throw new NotificationInputError("Title must be between 1 and 120 characters.");
  if (message.length < 1 || message.length > 500) throw new NotificationInputError("Message must be between 1 and 500 characters.");
  const scheduled = await scheduledGame(match.slug, playDate, match.title, title, message);
  return {
    title,
    body: message,
    game: match.slug,
    gameTitle: match.title,
    playDate,
    gameOption: scheduled.option,
    gameData: scheduled.data,
  };
}

function readNotification(id: string, data: Record<string, unknown>): GameNotification {
  return {
    id,
    title: typeof data.title === "string" ? data.title : "",
    body: typeof data.body === "string" ? data.body : "",
    game: typeof data.game === "string" ? data.game : "",
    game_title: typeof data.game_title === "string" ? data.game_title : "",
    play_date: typeof data.play_date === "string" ? data.play_date : "",
    game_option: typeof data.game_option === "string" ? data.game_option : "",
    topic: typeof data.topic === "string" ? data.topic : notificationTopic(),
    status: data.status === "failed" ? "failed" : "sent",
    message_id: typeof data.message_id === "string" ? data.message_id : undefined,
    error: typeof data.error === "string" ? data.error : undefined,
    created_at: typeof data.created_at === "string" ? data.created_at : "",
  };
}

export async function listNotifications() {
  const docs = await listDocuments(COLLECTION);
  return docs
    .map((item) => readNotification(item.id, item.data))
    .sort((left, right) => (left.created_at < right.created_at ? 1 : left.created_at > right.created_at ? -1 : 0))
    .slice(0, 30);
}

export async function createNotification(value: unknown) {
  const input = await parseNotificationPayload(value);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  let messageId = "";
  let error = "";
  try {
    messageId = await sendGameNotification(input);
  } catch (err) {
    error = err instanceof Error ? err.message : "Firebase could not send the notification.";
  }
  const stored: Record<string, unknown> = {
    title: input.title,
    body: input.body,
    game: input.game,
    game_title: input.gameTitle,
    play_date: input.playDate,
    game_option: input.gameOption,
    topic: notificationTopic(),
    status: messageId ? "sent" : "failed",
    created_at: createdAt,
  };
  if (messageId) stored.message_id = messageId;
  if (error) stored.error = error.slice(0, 500);
  await setDocument(COLLECTION, id, stored);
  if (error) throw new NotificationInputError(error);
  return readNotification(id, stored);
}
