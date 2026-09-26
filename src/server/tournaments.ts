import { deleteDocument, getDocument, listDocuments, setDocument } from "@/lib/firebase";
import type { Tournament, TournamentAnswer, TournamentListItem, TournamentListResponse } from "@/lib/tournaments";
import { allQuestions, createQuestion, deleteQuestion, getQuestion } from "@/server/catalog";
import { CatalogConflictError, CatalogInputError, CatalogNotFoundError } from "@/server/catalog";

const COLLECTION = "tournaments";

type StoredAnswer = {
  id: string;
  question_id: string;
  question_title: string;
  question_status: string;
  question_category_id: string;
  question_tournament_id: string | null;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  correct_option: number;
  used: boolean;
  last_used_on: string | null;
};

type StoredTournament = {
  name: string;
  answers: StoredAnswer[];
  created_at: string;
  updated_at: string;
};

function asRecord(value: unknown, message: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CatalogInputError(message);
  return value as Record<string, unknown>;
}

function readAnswer(value: unknown): StoredAnswer | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const questionId = typeof row.question_id === "string" ? row.question_id : "";
  if (!questionId) return null;
  return {
    id: typeof row.id === "string" ? row.id : crypto.randomUUID(),
    question_id: questionId,
    question_title: typeof row.question_title === "string" ? row.question_title : "",
    question_status: typeof row.question_status === "string" ? row.question_status : "active",
    question_category_id: typeof row.question_category_id === "string" ? row.question_category_id : "",
    question_tournament_id: typeof row.question_tournament_id === "string" ? row.question_tournament_id : null,
    option_1: typeof row.option_1 === "string" ? row.option_1 : "",
    option_2: typeof row.option_2 === "string" ? row.option_2 : "",
    option_3: typeof row.option_3 === "string" ? row.option_3 : "",
    option_4: typeof row.option_4 === "string" ? row.option_4 : "",
    correct_option: typeof row.correct_option === "number" ? row.correct_option : 0,
    used: row.used === true || (typeof row.last_used_on === "string" && row.last_used_on.length > 0),
    last_used_on: typeof row.last_used_on === "string" ? row.last_used_on : null,
  };
}

function readTournament(id: string, data: Record<string, unknown>): StoredTournament & { id: string } {
  const answers = Array.isArray(data.answers)
    ? data.answers.flatMap((item) => {
        const answer = readAnswer(item);
        return answer ? [answer] : [];
      })
    : [];
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    answers,
    created_at: typeof data.created_at === "string" ? data.created_at : "",
    updated_at: typeof data.updated_at === "string" ? data.updated_at : "",
  };
}

function counts(answers: StoredAnswer[]) {
  return {
    total_questions: answers.length,
    used: answers.filter((item) => item.used || Boolean(item.last_used_on)).length,
  };
}

function toListItem(tournament: StoredTournament & { id: string }): TournamentListItem {
  return {
    id: tournament.id,
    name: tournament.name,
    ...counts(tournament.answers),
    created_at: tournament.created_at,
    updated_at: tournament.updated_at,
  };
}

function toTournament(tournament: StoredTournament & { id: string }): Tournament {
  const answers: TournamentAnswer[] = tournament.answers.map((item) => ({ ...item }));
  return { ...toListItem(tournament), answers };
}

async function allTournaments() {
  const docs = await listDocuments(COLLECTION);
  return docs
    .map((item) => readTournament(item.id, item.data))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
}

function optionsFrom(row: Record<string, unknown>, index: number) {
  const values = [1, 2, 3, 4].map((number) => {
    const value = row[`option_${number}`];
    if (typeof value !== "string" || !value.trim()) {
      throw new CatalogInputError(`Question ${index} option ${number} is required`);
    }
    const trimmed = value.trim();
    if (trimmed.length > 200) throw new CatalogInputError(`Question ${index} option ${number} is too long`);
    return trimmed;
  });
  if (new Set(values.map((item) => item.toLowerCase())).size !== 4) {
    throw new CatalogInputError(`Question ${index} options must be different`);
  }
  const correct = typeof row.correct_option === "number" ? row.correct_option : Number.NaN;
  if (![1, 2, 3, 4].includes(correct)) {
    throw new CatalogInputError(`Question ${index} correct option must be 1, 2, 3, or 4`);
  }
  return { option_1: values[0], option_2: values[1], option_3: values[2], option_4: values[3], correct_option: correct };
}

async function buildAnswers(tournamentId: string, value: unknown, previous: StoredAnswer[]) {
  const body = asRecord(value, "Tournament body is invalid");
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 200) throw new CatalogInputError("Tournament name must be between 2 and 200 characters");
  const rawAnswers = Array.isArray(body.answers) ? body.answers : [];
  const rawNew = Array.isArray(body.new_questions) ? body.new_questions : [];
  const previousByQuestion = new Map(previous.map((item) => [item.question_id, item]));
  const answers: StoredAnswer[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < rawAnswers.length; index += 1) {
    const row = asRecord(rawAnswers[index], "Tournament answer is invalid");
    const questionId = typeof row.question_id === "string" ? row.question_id.trim() : "";
    if (!questionId) throw new CatalogInputError(`Question ${index + 1} is missing a template`);
    if (seen.has(questionId)) throw new CatalogInputError("Duplicate question template in answers");
    seen.add(questionId);
    const question = await getQuestion(questionId).catch((err: unknown) => {
      if (err instanceof CatalogNotFoundError) throw new CatalogInputError(`Question template ${index + 1} was not found`);
      throw err;
    });
    if (question.type !== "tournament") throw new CatalogInputError(`Question ${index + 1} is not a tournament template`);
    if (question.tournament_id && question.tournament_id !== tournamentId) {
      throw new CatalogInputError(`Question ${index + 1} belongs to another tournament`);
    }
    const options = optionsFrom(row, index + 1);
    const prior = previousByQuestion.get(questionId);
    answers.push({
      id: prior?.id ?? crypto.randomUUID(),
      question_id: question.id,
      question_title: question.title,
      question_status: question.status,
      question_category_id: question.category_id,
      question_tournament_id: question.tournament_id ?? null,
      ...options,
      used: prior?.used ?? false,
      last_used_on: prior?.last_used_on ?? null,
    });
  }

  for (let index = 0; index < rawNew.length; index += 1) {
    const row = asRecord(rawNew[index], "New question is invalid");
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (title.length < 8 || title.length > 500) {
      throw new CatalogInputError(`New question ${index + 1} title must be between 8 and 500 characters`);
    }
    const categoryId = typeof row.category_id === "string" ? row.category_id.trim() : "";
    if (!categoryId) throw new CatalogInputError(`New question ${index + 1} category is required`);
    const status = row.status === "inactive" ? "inactive" : "active";
    const created = await createQuestion({
      type: "tournament",
      title,
      category_id: categoryId,
      status,
      tournament_id: tournamentId,
    });
    const blank = [row.option_1, row.option_2, row.option_3, row.option_4].every(
      (item) => typeof item !== "string" || !item.trim(),
    ) && (row.correct_option == null || row.correct_option === 0);
    if (blank) continue;
    const options = optionsFrom(row, index + 1);
    answers.push({
      id: crypto.randomUUID(),
      question_id: created.id,
      question_title: created.title,
      question_status: created.status,
      question_category_id: created.category_id,
      question_tournament_id: tournamentId,
      ...options,
      used: false,
      last_used_on: null,
    });
  }

  return { name, answers };
}

export async function listTournaments(input: { q: string; used: string; page: number; pageSize: number }): Promise<TournamentListResponse> {
  const used = input.used.trim().toLowerCase();
  if (used && used !== "yes" && used !== "no") throw new CatalogInputError("Used must be yes or no");
  const page = Number.isFinite(input.page) && input.page > 0 ? Math.floor(input.page) : 1;
  const pageSize = Number.isFinite(input.pageSize) && input.pageSize > 0 ? Math.min(Math.floor(input.pageSize), 50) : 5;
  const q = input.q.trim().toLowerCase();
  const filtered = (await allTournaments()).filter((item) => {
    if (q && !item.name.toLowerCase().includes(q)) return false;
    const usedCount = counts(item.answers).used;
    if (used === "yes" && usedCount === 0) return false;
    if (used === "no" && usedCount > 0) return false;
    return true;
  });
  const total = filtered.length;
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize).map(toListItem),
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages,
  };
}

export async function getTournament(id: string) {
  const snap = await getDocument(COLLECTION, id);
  if (!snap) throw new CatalogNotFoundError("Tournament not found.");
  return toTournament(readTournament(snap.id, snap.data));
}

export async function createTournament(value: unknown) {
  const id = crypto.randomUUID();
  const built = await buildAnswers(id, value, []);
  const existing = await allTournaments();
  if (existing.some((item) => item.name.toLowerCase() === built.name.toLowerCase())) {
    throw new CatalogConflictError("A tournament with this name already exists");
  }
  const now = new Date().toISOString();
  const stored: StoredTournament = { name: built.name, answers: built.answers, created_at: now, updated_at: now };
  await setDocument(COLLECTION, id, stored);
  return toTournament({ ...stored, id });
}

export async function updateTournament(id: string, value: unknown) {
  const snap = await getDocument(COLLECTION, id);
  if (!snap) throw new CatalogNotFoundError("Tournament not found.");
  const current = readTournament(snap.id, snap.data);
  const built = await buildAnswers(id, value, current.answers);
  const existing = await allTournaments();
  if (existing.some((item) => item.id !== id && item.name.toLowerCase() === built.name.toLowerCase())) {
    throw new CatalogConflictError("A tournament with this name already exists");
  }
  const stored: StoredTournament = {
    name: built.name,
    answers: built.answers,
    created_at: current.created_at,
    updated_at: new Date().toISOString(),
  };
  await setDocument(COLLECTION, id, stored);
  return toTournament({ ...stored, id });
}

export async function deleteTournament(id: string) {
  const snap = await getDocument(COLLECTION, id);
  if (!snap) throw new CatalogNotFoundError("Tournament not found.");
  const questions = await allQuestions();
  for (const question of questions) {
    if (question.tournament_id === id) await deleteQuestion(question.id);
  }
  await deleteDocument(COLLECTION, id);
}

export async function resetTournamentUsed() {
  const tournaments = await allTournaments();
  for (const tournament of tournaments) {
    if (!tournament.answers.some((item) => item.used || item.last_used_on)) continue;
    const answers = tournament.answers.map((item) => ({ ...item, used: false, last_used_on: null }));
    const { id, ...data } = tournament;
    await setDocument(COLLECTION, id, { ...data, answers, updated_at: new Date().toISOString() });
  }
  return { reset: true };
}
