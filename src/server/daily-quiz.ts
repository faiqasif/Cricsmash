import { deleteDocument, getDocument, listDocuments, queryDocuments, setDocument } from "@/lib/firebase";
import type { DailyQuiz, DailyQuizAnswer, DailyQuizItem, DailyQuizListResponse, DailyQuizPlayer, DailyQuizStatus } from "@/lib/daily-quiz";
import { allQuestions, clearQuestionsUsed, getCategory, markQuestionsUsed } from "@/server/catalog";
import { CatalogInputError, CatalogNotFoundError } from "@/server/catalog";
import type { Player } from "@/lib/players";
import { getPlayer, listActivePlayers } from "@/server/players";
import { buildStatQuestion } from "@/server/quiz-pick";
import { correctPlayerIndexes } from "@/server/quiz-metrics";

const COLLECTION = "dailyQuizzes";
const STATUSES = ["pending", "active", "past"] as const;

type StoredItem = DailyQuizItem & { question_id: string };

type StoredQuiz = {
  quiz_date: string;
  status: DailyQuizStatus;
  times_played: number;
  items: StoredItem[];
  created_at: string;
  updated_at: string;
};

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function defaultStatus(quizDate: string, today = todayUTC()): DailyQuizStatus {
  if (quizDate > today) return "pending";
  if (quizDate < today) return "past";
  return "active";
}

function dateKey(value: string) {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) throw new CatalogInputError("Choose a valid date");
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed) {
    throw new CatalogInputError("Choose a valid date");
  }
  return trimmed;
}

function asRecord(value: unknown, message: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CatalogInputError(message);
  return value as Record<string, unknown>;
}

function readOptions(value: unknown): DailyQuizPlayer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    return [
      {
        player_id: typeof row.player_id === "string" ? row.player_id : "",
        name: typeof row.name === "string" ? row.name : "",
        country: typeof row.country === "string" ? row.country : "",
        photo_url: typeof row.photo_url === "string" ? row.photo_url : null,
        value: typeof row.value === "string" ? row.value : undefined,
        correct: row.correct === true,
        option: typeof row.option === "number" ? row.option : undefined,
      },
    ];
  });
}

function readItem(value: unknown): StoredItem | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id : "";
  if (!id) return null;
  const kind = row.kind === "general" || row.kind === "tournament" || row.kind === "player_stat" ? row.kind : undefined;
  return {
    id,
    question_id: typeof row.question_id === "string" ? row.question_id : "",
    title: typeof row.title === "string" ? row.title : "",
    format: typeof row.format === "string" ? row.format : "",
    metric: typeof row.metric === "string" ? row.metric : undefined,
    kind,
    category_name: typeof row.category_name === "string" ? row.category_name : undefined,
    country: typeof row.country === "string" ? row.country : "",
    options: readOptions(row.options),
  };
}

function readQuiz(id: string, data: Record<string, unknown>): StoredQuiz & { id: string } {
  const status = STATUSES.includes(data.status as DailyQuizStatus) ? (data.status as DailyQuizStatus) : "pending";
  const items = Array.isArray(data.items) ? data.items.flatMap((item) => {
    const parsed = readItem(item);
    return parsed ? [parsed] : [];
  }) : [];
  return {
    id,
    quiz_date: typeof data.quiz_date === "string" ? data.quiz_date : "",
    status,
    times_played: typeof data.times_played === "number" ? data.times_played : 0,
    items,
    created_at: typeof data.created_at === "string" ? data.created_at : "",
    updated_at: typeof data.updated_at === "string" ? data.updated_at : "",
  };
}

function toQuiz(quiz: StoredQuiz & { id: string }): DailyQuiz {
  return {
    id: quiz.id,
    quiz_date: quiz.quiz_date,
    status: quiz.status,
    times_played: quiz.times_played,
    items: quiz.items.map(({ question_id: _questionId, ...item }) => item),
  };
}

function storedBody(quiz: StoredQuiz & { id: string }): StoredQuiz {
  const { id: _id, ...data } = quiz;
  return data;
}

async function allQuizzes() {
  const docs = await listDocuments(COLLECTION);
  return docs.map((item) => readQuiz(item.id, item.data));
}

async function refreshPast(quiz: StoredQuiz & { id: string }) {
  const desired = defaultStatus(quiz.quiz_date);
  if (quiz.status === "active" && desired === "past") {
    quiz.status = "past";
    quiz.updated_at = new Date().toISOString();
    await setDocument(COLLECTION, quiz.id, storedBody(quiz));
  }
  return quiz;
}

export async function listDailyQuizzes(input: {
  status: string;
  from: string;
  to: string;
  page: number;
  pageSize: number;
}): Promise<DailyQuizListResponse> {
  if (input.status && !STATUSES.includes(input.status as DailyQuizStatus)) throw new CatalogInputError("Invalid status");
  const page = Number.isFinite(input.page) && input.page > 0 ? Math.floor(input.page) : 1;
  const pageSize = Number.isFinite(input.pageSize) && input.pageSize > 0 ? Math.min(Math.floor(input.pageSize), 50) : 10;
  const from = input.from ? dateKey(input.from) : "";
  const to = input.to ? dateKey(input.to) : "";
  const quizzes = await Promise.all(
    (
      await queryDocuments(COLLECTION, {
        where: input.status ? [{ field: "status", value: input.status }] : [],
        orderBy: { field: "quiz_date", direction: "DESCENDING" },
      })
    )
      .map((item) => readQuiz(item.id, item.data))
      .map((quiz) => refreshPast(quiz)),
  );
  const filtered = quizzes.filter((quiz) => {
    if (input.status && quiz.status !== input.status) return false;
    if (from && quiz.quiz_date < from) return false;
    if (to && quiz.quiz_date > to) return false;
    return true;
  });
  filtered.sort((a, b) => (a.quiz_date < b.quiz_date ? 1 : a.quiz_date > b.quiz_date ? -1 : 0));
  const total = filtered.length;
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize).map((quiz) => ({
      id: quiz.id,
      quiz_date: quiz.quiz_date,
      status: quiz.status,
      times_played: quiz.times_played,
      question_count: quiz.items.length,
    })),
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages,
  };
}

export async function getDailyQuiz(id: string) {
  const snap = await getDocument(COLLECTION, id);
  if (!snap) throw new CatalogNotFoundError("Daily quiz not found.");
  return toQuiz(await refreshPast(readQuiz(snap.id, snap.data)));
}

export async function getTodayDailyQuiz() {
  const today = todayUTC();
  const quiz = (await allQuizzes()).find((item) => item.quiz_date === today);
  if (!quiz) throw new CatalogNotFoundError("No daily quiz for today.");
  return toQuiz(await refreshPast(quiz));
}

function shuffle<T>(values: T[]) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function textOptions(question: { option_1: string | null; option_2: string | null; option_3: string | null; option_4: string | null; correct_option: number | null }): DailyQuizPlayer[] {
  const values = [question.option_1, question.option_2, question.option_3, question.option_4];
  return values.map((value, index) => ({
    player_id: "",
    name: value ?? "",
    country: "",
    photo_url: null,
    correct: question.correct_option === index + 1,
    option: index + 1,
  }));
}

export async function generateDailyQuiz(value: unknown) {
  const body = asRecord(value, "Quiz body is invalid");
  const rawDate = typeof body.quiz_date === "string" && body.quiz_date.trim() ? body.quiz_date : todayUTC();
  const quizDate = dateKey(rawDate);
  if (quizDate < todayUTC()) throw new CatalogInputError("Quiz date cannot be in the past");
  if (!Array.isArray(body.categories) || body.categories.length === 0) {
    throw new CatalogInputError("Select at least one category");
  }
  const seen = new Set<string>();
  const allocations: { category_id: string; count: number; name: string }[] = [];
  let total = 0;
  for (const entry of body.categories) {
    const row = asRecord(entry, "Category is required");
    const categoryId = typeof row.category_id === "string" ? row.category_id.trim() : "";
    const count = typeof row.count === "number" ? row.count : Number.NaN;
    if (!categoryId) throw new CatalogInputError("Category is required");
    if (seen.has(categoryId)) throw new CatalogInputError("Each category can only be selected once");
    seen.add(categoryId);
    if (!Number.isInteger(count) || count < 1 || count > 50) {
      throw new CatalogInputError("Number of questions must be between 1 and 50");
    }
    const category = await getCategory(categoryId);
    if (category.status !== "active") throw new CatalogInputError("Category is not active");
    seen.add(categoryId);
    total += count;
    allocations.push({ category_id: categoryId, count, name: category.name });
  }
  if (total > 50) throw new CatalogInputError("Total number of questions cannot exceed 50");

  const questions = await allQuestions();
  const players = await listActivePlayers();
  const items: StoredItem[] = [];
  const usedSubjects = new Set<string>();
  for (const allocation of allocations) {
    const pool = shuffle(
      questions.filter((question) => question.category_id === allocation.category_id && question.status === "active"),
    );
    const unused = pool.filter((question) => !question.used);
    const ordered = [...unused, ...pool.filter((question) => question.used)];
    if (ordered.length === 0) throw new CatalogInputError(`${allocation.name} has no question templates`);
    let made = 0;
    const pickedIds = new Set<string>();
    for (const question of ordered) {
      if (made >= allocation.count) break;
      if (pickedIds.has(question.id)) continue;
      const hasText = Boolean(question.option_1 && question.option_2 && question.option_3 && question.option_4 && question.correct_option);
      if (hasText && (question.type === "general" || question.type === "tournament")) {
        pickedIds.add(question.id);
        items.push({
          id: crypto.randomUUID(),
          question_id: question.id,
          title: question.title,
          format: "",
          metric: question.type,
          kind: question.type,
          category_name: allocation.name,
          country: "",
          options: textOptions(question),
        });
        made += 1;
        continue;
      }
      const built = buildStatQuestion(question.title, question.metric ?? "", players, usedSubjects);
      if (!built) continue;
      pickedIds.add(question.id);
      const kind = question.type === "general" ? "general" : question.type === "tournament" ? "tournament" : "player_stat";
      items.push({
        id: crypto.randomUUID(),
        question_id: question.id,
        title: built.title,
        format: built.format,
        metric: built.metric,
        kind,
        category_name: allocation.name,
        country: built.country,
        options: built.options,
      });
      made += 1;
    }
    if (made < allocation.count) {
      throw new CatalogInputError(`${allocation.name} does not have enough questions whose stats can make a fair set of options`);
    }
  }

  const existing = (await allQuizzes()).find((quiz) => quiz.quiz_date === quizDate);
  const previousIds = existing?.items.map((item) => item.question_id).filter(Boolean) ?? [];
  const nextIds = items.map((item) => item.question_id);
  await clearQuestionsUsed(previousIds.filter((id) => !nextIds.includes(id)));
  await markQuestionsUsed(nextIds, quizDate);

  const now = new Date().toISOString();
  if (existing) {
    const stored: StoredQuiz = {
      ...storedBody(existing),
      status: defaultStatus(quizDate),
      items,
      updated_at: now,
    };
    await setDocument(COLLECTION, existing.id, stored);
    return toQuiz({ ...stored, id: existing.id });
  }
  const id = crypto.randomUUID();
  const stored: StoredQuiz = {
    quiz_date: quizDate,
    status: defaultStatus(quizDate),
    times_played: 0,
    items,
    created_at: now,
    updated_at: now,
  };
  await setDocument(COLLECTION, id, stored);
  return toQuiz({ ...stored, id });
}

export async function updateDailyQuizStatus(id: string, value: unknown) {
  const body = asRecord(value, "Status body is invalid");
  const status = typeof body.status === "string" ? body.status.trim() : "";
  if (!STATUSES.includes(status as DailyQuizStatus)) throw new CatalogInputError("Invalid status");
  const snap = await getDocument(COLLECTION, id);
  if (!snap) throw new CatalogNotFoundError("Daily quiz not found.");
  const existing = readQuiz(snap.id, snap.data);
  const stored: StoredQuiz = { ...storedBody(existing), status: status as DailyQuizStatus, updated_at: new Date().toISOString() };
  await setDocument(COLLECTION, id, stored);
  return toQuiz({ ...stored, id });
}

export async function deleteDailyQuiz(id: string) {
  const snap = await getDocument(COLLECTION, id);
  if (!snap) throw new CatalogNotFoundError("Daily quiz not found.");
  const quiz = readQuiz(snap.id, snap.data);
  await clearQuestionsUsed(quiz.items.map((item) => item.question_id).filter(Boolean));
  await deleteDocument(COLLECTION, id);
}

export async function answerDailyQuizItem(itemId: string, value: unknown): Promise<DailyQuizAnswer> {
  const body = asRecord(value, "Answer body is invalid");
  const playerId = typeof body.player_id === "string" ? body.player_id : "";
  const option = typeof body.option === "number" ? body.option : undefined;
  const quizzes = await allQuizzes();
  for (const quiz of quizzes) {
    const item = quiz.items.find((entry) => entry.id === itemId);
    if (!item) continue;
    const playerOptions = item.options.filter((entry) => entry.player_id);
    if (playerOptions.length >= 4 && item.metric && item.metric !== "general" && item.metric !== "tournament") {
      const players: Player[] = [];
      for (const option of item.options) {
        if (!option.player_id) continue;
        players.push(await getPlayer(option.player_id));
      }
      const best = correctPlayerIndexes(players, item.format, item.country ?? "", item.metric, item.title);
      if (best.length === 0) throw new CatalogInputError("Could not score this question from current player stats");
      const correctIds = best.map((index) => players[index]?.id).filter(Boolean);
      const selected = item.options.find((entry) => (playerId && entry.player_id === playerId) || (option != null && entry.option === option));
      return {
        correct: Boolean(selected?.player_id && correctIds.includes(selected.player_id)),
        selected_player_id: playerId || selected?.player_id || undefined,
        correct_player_ids: correctIds,
        selected_option: selected?.option,
        correct_option: item.options.find((entry) => entry.player_id && correctIds.includes(entry.player_id))?.option,
      };
    }
    const correct = item.options.find((entry) => entry.correct);
    const selected = item.options.find((entry) => (playerId && entry.player_id === playerId) || (option != null && entry.option === option));
    return {
      correct: Boolean(selected?.correct),
      selected_player_id: playerId || undefined,
      correct_player_ids: correct?.player_id ? [correct.player_id] : undefined,
      selected_option: selected?.option,
      correct_option: correct?.option,
    };
  }
  throw new CatalogNotFoundError("Quiz question not found.");
}
