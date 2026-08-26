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

export async function fetchAllQuestions(params: {
  type: QuestionType;
  status?: QuestionStatus;
}): Promise<Question[]> {
  const pageSize = 50;
  const search = new URLSearchParams({
    type: params.type,
    page: "1",
    page_size: String(pageSize),
  });
  if (params.status) search.set("status", params.status);
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
