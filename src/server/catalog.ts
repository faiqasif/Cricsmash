import { deleteDocument, getDocument, listDocuments, queryDocuments, setDocument } from "@/lib/firebase";
import type { Category, CategoryListResponse, Question, QuestionListResponse, QuestionStatus, QuestionType } from "@/lib/questions";
import { resolvePlayerMetric, slotFormats } from "@/server/quiz-metrics";

const CATEGORIES = "categories";
const QUESTIONS = "questions";
const TYPES = ["player", "general", "tournament", "image"] as const;
const GENERAL_NAME = "General Questions";

export class CatalogInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogInputError";
  }
}

export class CatalogNotFoundError extends Error {
  constructor(message = "Not found.") {
    super(message);
    this.name = "CatalogNotFoundError";
  }
}

export class CatalogConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogConflictError";
  }
}

type StoredCategory = {
  name: string;
  status: QuestionStatus;
  daily_question_limit: number;
  created_at: string;
  updated_at: string;
};

type StoredQuestion = {
  type: QuestionType;
  title: string;
  category_id: string;
  category_name: string;
  status: QuestionStatus;
  tournament_id: string | null;
  image_url: string | null;
  option_1: string | null;
  option_2: string | null;
  option_3: string | null;
  option_4: string | null;
  correct_option: number | null;
  used: boolean;
  last_used_on: string | null;
  used_formats: string[];
  metric: string;
  created_at: string;
  updated_at: string;
};

function asRecord(value: unknown, message: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CatalogInputError(message);
  return value as Record<string, unknown>;
}

function text(value: unknown, min: number, max: number, label: string) {
  if (typeof value !== "string") throw new CatalogInputError(`${label} is required`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new CatalogInputError(`${label} must be between ${min} and ${max} characters`);
  }
  return trimmed;
}

async function allCategories() {
  const docs = await listDocuments(CATEGORIES);
  return docs
    .map((item) => readCategory(item.id, item.data))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function readCategory(id: string, data: Record<string, unknown>): Category {
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    status: data.status === "inactive" ? "inactive" : "active",
    daily_question_limit: typeof data.daily_question_limit === "number" ? data.daily_question_limit : 1,
  };
}

export async function listCategories(input: { q: string; page: number; pageSize: number }): Promise<CategoryListResponse> {
  const page = Number.isFinite(input.page) && input.page > 0 ? Math.floor(input.page) : 1;
  const pageSize = Number.isFinite(input.pageSize) && input.pageSize > 0 ? Math.min(Math.floor(input.pageSize), 50) : 5;
  const q = input.q.trim().toLowerCase();
  const filtered = (await allCategories()).filter((item) => !q || item.name.toLowerCase().includes(q));
  const total = filtered.length;
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize),
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages,
  };
}

export async function getCategory(id: string) {
  const snap = await getDocument(CATEGORIES, id);
  if (!snap) throw new CatalogNotFoundError("Category not found.");
  return readCategory(snap.id, snap.data);
}

function categoryPayload(value: unknown) {
  const body = asRecord(value, "Category body is invalid");
  const name = text(body.name, 2, 120, "Category name");
  const limit = body.daily_question_limit;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new CatalogInputError("Number of questions must be a whole number between 1 and 50");
  }
  return { name, daily_question_limit: limit };
}

export async function createCategory(value: unknown) {
  const input = categoryPayload(value);
  const existing = await allCategories();
  if (existing.some((item) => item.name.toLowerCase() === input.name.toLowerCase())) {
    throw new CatalogConflictError("A category with this name already exists");
  }
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const stored: StoredCategory = {
    name: input.name,
    status: "active",
    daily_question_limit: input.daily_question_limit,
    created_at: now,
    updated_at: now,
  };
  await setDocument(CATEGORIES, id, stored);
  return readCategory(id, stored);
}

export async function updateCategory(id: string, value: unknown) {
  const snap = await getDocument(CATEGORIES, id);
  if (!snap) throw new CatalogNotFoundError("Category not found.");
  const current = readCategory(snap.id, snap.data);
  const input = categoryPayload(value);
  const existing = await allCategories();
  if (existing.some((item) => item.id !== id && item.name.toLowerCase() === input.name.toLowerCase())) {
    throw new CatalogConflictError("A category with this name already exists");
  }
  const createdAt = typeof snap.data.created_at === "string" ? snap.data.created_at : new Date().toISOString();
  const stored: StoredCategory = {
    name: input.name,
    status: current.status,
    daily_question_limit: input.daily_question_limit,
    created_at: createdAt,
    updated_at: new Date().toISOString(),
  };
  await setDocument(CATEGORIES, id, stored);
  return readCategory(id, stored);
}

export async function deleteCategory(id: string) {
  const snap = await getDocument(CATEGORIES, id);
  if (!snap) throw new CatalogNotFoundError("Category not found.");
  const questions = await allQuestions();
  if (questions.some((item) => item.category_id === id)) {
    throw new CatalogConflictError("Remove the questions in this category before deleting it");
  }
  await deleteDocument(CATEGORIES, id);
}

async function ensureGeneralCategory() {
  const existing = (await allCategories()).find((item) => item.name.toLowerCase() === GENERAL_NAME.toLowerCase());
  if (existing) return existing;
  return createCategory({ name: GENERAL_NAME, daily_question_limit: 10 });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readFormats(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

function readQuestion(id: string, data: Record<string, unknown>): Question {
  const type = TYPES.includes(data.type as QuestionType) ? (data.type as QuestionType) : "player";
  const usedFormats = readFormats(data.used_formats);
  const lastUsedOn = typeof data.last_used_on === "string" ? data.last_used_on : null;
  let used = data.used === true;
  if (type === "general") used = lastUsedOn === todayKey();
  else if (type === "player" && usedFormats) used = usedFormats.length > 0;
  return {
    id,
    type,
    title: typeof data.title === "string" ? data.title : "",
    category_id: typeof data.category_id === "string" ? data.category_id : "",
    category_name: typeof data.category_name === "string" ? data.category_name : "",
    status: data.status === "inactive" ? "inactive" : "active",
    tournament_id: typeof data.tournament_id === "string" ? data.tournament_id : null,
    image_url: typeof data.image_url === "string" ? data.image_url : null,
    option_1: typeof data.option_1 === "string" ? data.option_1 : null,
    option_2: typeof data.option_2 === "string" ? data.option_2 : null,
    option_3: typeof data.option_3 === "string" ? data.option_3 : null,
    option_4: typeof data.option_4 === "string" ? data.option_4 : null,
    correct_option: typeof data.correct_option === "number" ? data.correct_option : null,
    used,
    last_used_on: lastUsedOn,
    used_formats: usedFormats,
    metric: typeof data.metric === "string" ? data.metric : "",
    created_at: typeof data.created_at === "string" ? data.created_at : "",
    updated_at: typeof data.updated_at === "string" ? data.updated_at : "",
  };
}

export async function allQuestions() {
  const docs = await listDocuments(QUESTIONS);
  return docs
    .map((item) => readQuestion(item.id, item.data))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
}

export async function listQuestions(input: {
  type: string;
  q: string;
  status: string;
  used: string;
  categoryId: string;
  tournamentId: string;
  page: number;
  pageSize: number;
}): Promise<QuestionListResponse> {
  if (input.type && !TYPES.includes(input.type as QuestionType)) throw new CatalogInputError("Invalid question type");
  const used = input.used.trim().toLowerCase();
  if (used && used !== "yes" && used !== "no") throw new CatalogInputError("Used must be yes or no");
  if (input.status && input.status !== "active" && input.status !== "inactive") {
    throw new CatalogInputError("Invalid status");
  }
  const page = Number.isFinite(input.page) && input.page > 0 ? Math.floor(input.page) : 1;
  const pageSize = Number.isFinite(input.pageSize) && input.pageSize > 0 ? Math.min(Math.floor(input.pageSize), 50) : 5;
  const q = input.q.trim().toLowerCase();
  const where = [];
  if (input.type) {
    where.push({ field: "type", value: input.type });
    if (input.status) where.push({ field: "status", value: input.status });
    if (input.categoryId) where.push({ field: "category_id", value: input.categoryId });
  } else if (input.tournamentId) {
    where.push({ field: "tournament_id", value: input.tournamentId });
  }
  const docs = await queryDocuments(QUESTIONS, {
    where,
    orderBy: { field: "created_at", direction: "DESCENDING" },
    select: [
      "type",
      "title",
      "category_id",
      "category_name",
      "status",
      "tournament_id",
      "used",
      "last_used_on",
      "created_at",
      "updated_at",
      "option_1",
      "option_2",
      "option_3",
      "option_4",
      "correct_option",
    ],
  });
  const filtered = docs
    .map((item) => readQuestion(item.id, item.data))
    .filter((item) => {
    if (input.type && item.type !== input.type) return false;
    if (q && !item.title.toLowerCase().includes(q)) return false;
    if (input.status && item.status !== input.status) return false;
    if (used === "yes" && !item.used) return false;
    if (used === "no" && item.used) return false;
    if (input.categoryId && item.category_id !== input.categoryId) return false;
    if (input.tournamentId && item.tournament_id !== input.tournamentId) return false;
    return true;
  });
  const total = filtered.length;
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize),
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages,
  };
}

export async function getQuestion(id: string) {
  const snap = await getDocument(QUESTIONS, id);
  if (!snap) throw new CatalogNotFoundError("Question not found.");
  return readQuestion(snap.id, snap.data);
}

function optionText(value: unknown, index: number) {
  if (typeof value !== "string" || !value.trim()) throw new CatalogInputError(`Option ${index} is required`);
  const trimmed = value.trim();
  if (trimmed.length > 200) throw new CatalogInputError(`Option ${index} is too long`);
  return trimmed;
}

async function buildQuestion(value: unknown, existing?: Question): Promise<StoredQuestion> {
  const body = asRecord(value, "Question body is invalid");
  const type = typeof body.type === "string" ? body.type.trim().toLowerCase() : "";
  if (!TYPES.includes(type as QuestionType)) throw new CatalogInputError("Invalid question type");
  const title = text(body.title, 8, 500, "Question title");
  const status = typeof body.status === "string" && body.status.trim() ? body.status.trim().toLowerCase() : "active";
  if (status !== "active" && status !== "inactive") throw new CatalogInputError("Invalid status");
  let categoryId = typeof body.category_id === "string" ? body.category_id.trim() : "";
  if (type === "general" && !categoryId) {
    categoryId = (await ensureGeneralCategory()).id;
  } else if (!categoryId) {
    throw new CatalogInputError("Category is required");
  }
  const category = await getCategory(categoryId).catch((err: unknown) => {
    if (err instanceof CatalogNotFoundError) throw new CatalogInputError("Category not found");
    throw err;
  });
  let option1: string | null = null;
  let option2: string | null = null;
  let option3: string | null = null;
  let option4: string | null = null;
  let correct: number | null = null;
  if (type === "general") {
    option1 = optionText(body.option_1, 1);
    option2 = optionText(body.option_2, 2);
    option3 = optionText(body.option_3, 3);
    option4 = optionText(body.option_4, 4);
    const keys = [option1, option2, option3, option4].map((item) => item.toLowerCase());
    if (new Set(keys).size !== 4) throw new CatalogInputError("Each option must be different");
    correct = typeof body.correct_option === "number" ? body.correct_option : Number.NaN;
    if (![1, 2, 3, 4].includes(correct)) throw new CatalogInputError("Correct option is required");
  }
  const now = new Date().toISOString();
  return {
    type: type as QuestionType,
    title,
    category_id: category.id,
    category_name: category.name,
    status,
    tournament_id: typeof body.tournament_id === "string" && body.tournament_id.trim() ? body.tournament_id.trim() : existing?.tournament_id ?? null,
    image_url: type === "image" && typeof body.image_url === "string" && body.image_url.trim() ? body.image_url.trim() : null,
    option_1: option1,
    option_2: option2,
    option_3: option3,
    option_4: option4,
    correct_option: correct,
    used: existing?.used ?? false,
    last_used_on: existing?.last_used_on ?? null,
    used_formats: existing?.used_formats ?? [],
    metric: existing?.metric ?? "",
    created_at: existing?.created_at || now,
    updated_at: now,
  };
}

export async function createQuestion(value: unknown) {
  const stored = await buildQuestion(value);
  if (stored.type === "image" && !stored.image_url) throw new CatalogInputError("Image is required for image questions");
  const id = crypto.randomUUID();
  await setDocument(QUESTIONS, id, stored);
  return readQuestion(id, stored);
}

export async function importGeneralQuestions(value: unknown) {
  const body = asRecord(value, "Import body is invalid");
  if (!Array.isArray(body.questions) || body.questions.length === 0) {
    throw new CatalogInputError("Add at least one question");
  }
  if (body.questions.length > 200) throw new CatalogInputError("Import up to 200 questions at a time");
  const categories = await allCategories();
  const saved: { row: number; id: string; title: string }[] = [];
  const failed: { row: number; message: string }[] = [];
  for (const entry of body.questions) {
    const record = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : null;
    const row = record && typeof record.row === "number" ? record.row : 0;
    try {
      if (!record) throw new CatalogInputError("Question is invalid");
      const categoryName = typeof record.category === "string" ? record.category.trim() : "";
      let categoryId = "";
      if (categoryName) {
        const match = categories.find((item) => item.name.toLowerCase() === categoryName.toLowerCase());
        if (!match) throw new CatalogInputError(`Category “${categoryName}” was not found`);
        categoryId = match.id;
      }
      const created = await createQuestion({
        type: "general",
        title: record.title,
        category_id: categoryId,
        status: "active",
        option_1: record.option_1,
        option_2: record.option_2,
        option_3: record.option_3,
        option_4: record.option_4,
        correct_option: record.correct_option,
      });
      if (record.used === true) await setQuestionUsed(created.id, { used: true });
      saved.push({ row, id: created.id, title: created.title });
    } catch (err) {
      failed.push({
        row,
        message: err instanceof CatalogInputError ? err.message : "This row could not be saved",
      });
    }
  }
  return { saved, failed };
}

export async function updateQuestion(id: string, value: unknown) {
  const existing = await getQuestion(id);
  const stored = await buildQuestion(value, existing);
  if (stored.type === "image" && !stored.image_url) throw new CatalogInputError("Image is required for image questions");
  await setDocument(QUESTIONS, id, stored);
  return readQuestion(id, stored);
}

export async function setQuestionUsed(id: string, value: unknown) {
  const body = asRecord(value, "Used body is invalid");
  if (typeof body.used !== "boolean") throw new CatalogInputError("Used must be true or false");
  const snap = await getDocument(QUESTIONS, id);
  if (!snap) throw new CatalogNotFoundError("Question not found.");
  const existing = readQuestion(snap.id, snap.data);
  const formats = existing.type === "player"
    ? body.used
      ? slotFormats(existing.title, resolvePlayerMetric(existing.title, existing.metric ?? ""))
      : []
    : existing.used_formats ?? [];
  const stored: StoredQuestion = {
    ...questionToStored(existing),
    used: body.used,
    used_formats: formats,
    last_used_on: body.used ? todayKey() : null,
    updated_at: new Date().toISOString(),
  };
  await setDocument(QUESTIONS, id, stored);
  return readQuestion(id, stored);
}

export async function saveQuestionUsage(question: Question, usage: { used: boolean; lastUsedOn: string | null; usedFormats: string[] }) {
  const stored: StoredQuestion = {
    ...questionToStored(question),
    used: usage.used,
    last_used_on: usage.lastUsedOn,
    used_formats: usage.usedFormats,
    updated_at: new Date().toISOString(),
  };
  await setDocument(QUESTIONS, question.id, stored);
}

function questionToStored(question: Question): StoredQuestion {
  return {
    type: question.type,
    title: question.title,
    category_id: question.category_id,
    category_name: question.category_name,
    status: question.status,
    tournament_id: question.tournament_id ?? null,
    image_url: question.image_url,
    option_1: question.option_1,
    option_2: question.option_2,
    option_3: question.option_3,
    option_4: question.option_4,
    correct_option: question.correct_option,
    used: question.used,
    last_used_on: question.last_used_on,
    used_formats: question.used_formats ?? [],
    metric: question.metric ?? "",
    created_at: question.created_at,
    updated_at: question.updated_at,
  };
}

export async function deleteQuestion(id: string) {
  const snap = await getDocument(QUESTIONS, id);
  if (!snap) throw new CatalogNotFoundError("Question not found.");
  await deleteDocument(QUESTIONS, id);
}
