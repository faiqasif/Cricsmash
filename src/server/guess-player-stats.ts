import { commitWrites, deleteWrite, getDocument, listDocuments, replaceWrite } from "@/lib/firebase";

const COLLECTION = "guessPlayerStats";
const PENDING = "guessPlayerStatsPending";

export class GuessStatInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuessStatInputError";
  }
}

export class GuessStatNotFoundError extends Error {
  constructor(message = "Question not found.") {
    super(message);
    this.name = "GuessStatNotFoundError";
  }
}

export type GuessPlayerStat = {
  id: string;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
};

export type PendingStatQuestion = {
  id: string;
  question_id: string;
  op: "upsert" | "delete";
  question: string;
  answer: string;
  created: boolean;
};

function asRecord(value: unknown, message: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new GuessStatInputError(message);
  return value as Record<string, unknown>;
}

function text(value: unknown, min: number, max: number, label: string) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (trimmed.length < min || trimmed.length > max) {
    throw new GuessStatInputError(`${label} must be between ${min} and ${max} characters.`);
  }
  return trimmed;
}

function toResponse(id: string, data: Record<string, unknown>): GuessPlayerStat {
  return {
    id,
    question: typeof data.question === "string" ? data.question : "",
    answer: typeof data.answer === "string" ? data.answer : "",
    created_at: typeof data.created_at === "string" ? data.created_at : "",
    updated_at: typeof data.updated_at === "string" ? data.updated_at : "",
  };
}

function readPending(id: string, data: Record<string, unknown>): PendingStatQuestion | null {
  if (data.op !== "upsert" && data.op !== "delete") return null;
  return {
    id,
    question_id: typeof data.question_id === "string" ? data.question_id : id,
    op: data.op,
    question: typeof data.question === "string" ? data.question : "",
    answer: typeof data.answer === "string" ? data.answer : "",
    created: data.created === true,
  };
}

export async function listPendingStatQuestions() {
  const docs = await listDocuments(PENDING);
  return docs.flatMap((item) => {
    const pending = readPending(item.id, item.data);
    return pending ? [pending] : [];
  });
}

export async function pendingStatQuestionCount() {
  return (await listPendingStatQuestions()).length;
}

export async function listGuessPlayerStats(params: { q?: string; page?: number; pageSize?: number }) {
  const q = params.q?.trim().toLowerCase() ?? "";
  const pageSize = Math.min(Math.max(params.pageSize ?? 10, 1), 50);
  const docs = await listDocuments(COLLECTION);
  const filtered = docs
    .map((item) => toResponse(item.id, item.data))
    .filter((item) => !q || item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q))
    .sort((left, right) => (left.updated_at < right.updated_at ? 1 : left.updated_at > right.updated_at ? -1 : 0));
  const total = filtered.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const page = Math.min(Math.max(params.page ?? 1, 1), Math.max(totalPages, 1));
  const start = (page - 1) * pageSize;
  return { items: filtered.slice(start, start + pageSize), total, page, page_size: pageSize, total_pages: totalPages };
}

export async function getGuessPlayerStat(id: string) {
  const snap = await getDocument(COLLECTION, id);
  if (!snap) throw new GuessStatNotFoundError();
  return toResponse(snap.id, snap.data);
}

export async function createGuessPlayerStat(value: unknown) {
  const body = asRecord(value, "Question body is invalid.");
  const question = text(body.question, 4, 500, "Question");
  const answer = text(body.answer, 1, 120, "Correct answer");
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await commitWrites([
    replaceWrite(COLLECTION, id, { question, answer, created_at: now, updated_at: now }),
    replaceWrite(PENDING, id, {
      question_id: id,
      op: "upsert",
      question,
      answer,
      created: true,
      updated_at: now,
    }),
  ]);
  return toResponse(id, { question, answer, created_at: now, updated_at: now });
}

export async function updateGuessPlayerStat(id: string, value: unknown) {
  const existing = await getDocument(COLLECTION, id);
  if (!existing) throw new GuessStatNotFoundError();
  const body = asRecord(value, "Question body is invalid.");
  const question = text(body.question, 4, 500, "Question");
  const answer = text(body.answer, 1, 120, "Correct answer");
  const createdAt = typeof existing.data.created_at === "string" ? existing.data.created_at : new Date().toISOString();
  const now = new Date().toISOString();
  const currentQuestion = typeof existing.data.question === "string" ? existing.data.question : "";
  const currentAnswer = typeof existing.data.answer === "string" ? existing.data.answer : "";
  if (question === currentQuestion && answer === currentAnswer) return toResponse(id, existing.data);
  const pending = await getDocument(PENDING, id);
  const created = pending?.data.created === true;
  await commitWrites([
    replaceWrite(COLLECTION, id, { question, answer, created_at: createdAt, updated_at: now }),
    replaceWrite(PENDING, id, {
      question_id: id,
      op: "upsert",
      question,
      answer,
      created,
      updated_at: now,
    }),
  ]);
  return toResponse(id, { question, answer, created_at: createdAt, updated_at: now });
}

export async function deleteGuessPlayerStat(id: string) {
  const existing = await getDocument(COLLECTION, id);
  if (!existing) throw new GuessStatNotFoundError();
  const pending = await getDocument(PENDING, id);
  const now = new Date().toISOString();
  if (pending?.data.created === true) {
    await commitWrites([deleteWrite(COLLECTION, id), deleteWrite(PENDING, id)]);
    return;
  }
  await commitWrites([
    deleteWrite(COLLECTION, id),
    replaceWrite(PENDING, id, {
      question_id: id,
      op: "delete",
      question: "",
      answer: "",
      created: false,
      updated_at: now,
    }),
  ]);
}
