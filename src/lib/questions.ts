import { api } from "@/lib/api";

export type QuestionType = "player" | "general" | "tournament" | "image";
export type QuestionStatus = "active" | "inactive";

export type Category = {
  id: string;
  name: string;
  status: QuestionStatus;
  daily_question_limit: number;
};

export type CategoryListResponse = {
  items: Category[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type CategoryPayload = {
  name: string;
  daily_question_limit: number;
};

export const GENERAL_CATEGORY_NAME = "General Questions";

export function isQuizTournamentCategory(name: string) {
  const value = name.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return value.startsWith("quiz_tournament") || value.startsWith("quiz_tournmant");
}

export function tournamentQuestionCategories(categories: Category[]) {
  return categories.filter((item) => isQuizTournamentCategory(item.name));
}

export const TOURNAMENT_NAME_TOKEN = "{tournament}";
export const FORMAT_NAME_TOKEN = "{format}";
export const COUNTRY_NAME_TOKEN = "{country}";
export const PLAYER_NAME_TOKEN = "{player_name}";

export const FORMAT_QUESTION_PHRASES = {
  odi: "ODIs",
  t20: "T20 Internationals",
  test: "Test cricket",
} as const;

export const PLAYER_QUESTION_FORMATS = ["odi", "t20", "test"] as const;
export type PlayerQuestionFormat = (typeof PLAYER_QUESTION_FORMATS)[number];

export function insertTitleToken(title: string, token: string) {
  if (title.includes(token)) return title;
  const trimmed = title.trim();
  if (!trimmed) return token;
  if (trimmed.endsWith("?")) {
    return `${trimmed.slice(0, -1).trimEnd()} ${token}?`;
  }
  return `${trimmed} ${token}`;
}

export function fillTournamentTitle(title: string, tournamentName: string) {
  const name = tournamentName.trim() || "this tournament";
  return title.split(TOURNAMENT_NAME_TOKEN).join(name);
}

export function insertTournamentNameToken(title: string) {
  return insertTitleToken(title, TOURNAMENT_NAME_TOKEN);
}

export function fillPlayerQuestionTitle(
  title: string,
  options?: { format?: PlayerQuestionFormat | string; country?: string; playerName?: string },
) {
  let out = title;
  const format = options?.format;
  if (format) {
    const phrase =
      format in FORMAT_QUESTION_PHRASES
        ? FORMAT_QUESTION_PHRASES[format as PlayerQuestionFormat]
        : format;
    out = out.split(FORMAT_NAME_TOKEN).join(phrase);
  }
  const country = options?.country?.trim();
  if (country) {
    out = out.split(COUNTRY_NAME_TOKEN).join(country);
    out = out.split("{country_name}").join(country);
  }
  const playerName = options?.playerName?.trim();
  if (playerName) {
    out = out.split(PLAYER_NAME_TOKEN).join(playerName);
  }
  return out;
}

export function insertFormatToken(title: string) {
  return insertTitleToken(title, FORMAT_NAME_TOKEN);
}

export function insertCountryToken(title: string) {
  return insertTitleToken(title, COUNTRY_NAME_TOKEN);
}

export function insertPlayerNameToken(title: string) {
  return insertTitleToken(title, PLAYER_NAME_TOKEN);
}

export async function fetchAllQuestions(params: {
  type: QuestionType;
  status?: QuestionStatus;
  tournamentId?: string;
}): Promise<Question[]> {
  const pageSize = 50;
  const search = new URLSearchParams({
    type: params.type,
    page: "1",
    page_size: String(pageSize),
  });
  if (params.status) search.set("status", params.status);
  if (params.tournamentId) search.set("tournament_id", params.tournamentId);
  const first = await api<QuestionListResponse>(`/api/v1/questions?${search.toString()}`);
  const items = [...first.items];
  for (let page = 2; page <= first.total_pages; page += 1) {
    search.set("page", String(page));
    const next = await api<QuestionListResponse>(`/api/v1/questions?${search.toString()}`);
    items.push(...next.items);
  }
  return items;
}

export async function fetchAllCategories(): Promise<Category[]> {
  const pageSize = 50;
  const first = await api<CategoryListResponse>(`/api/v1/categories?page=1&page_size=${pageSize}`);
  const items = [...first.items];
  for (let page = 2; page <= first.total_pages; page += 1) {
    const next = await api<CategoryListResponse>(`/api/v1/categories?page=${page}&page_size=${pageSize}`);
    items.push(...next.items);
  }
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export type Question = {
  id: string;
  type: QuestionType;
  title: string;
  category_id: string;
  category_name: string;
  status: QuestionStatus;
  tournament_id?: string | null;
  image_url: string | null;
  option_1: string | null;
  option_2: string | null;
  option_3: string | null;
  option_4: string | null;
  correct_option: number | null;
  used: boolean;
  last_used_on: string | null;
  created_at: string;
  updated_at: string;
};

export type QuestionListResponse = {
  items: Question[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type QuestionPayload = {
  type: QuestionType;
  title: string;
  category_id: string;
  status: QuestionStatus;
  image_url?: string | null;
  option_1?: string;
  option_2?: string;
  option_3?: string;
  option_4?: string;
  correct_option?: number;
};
