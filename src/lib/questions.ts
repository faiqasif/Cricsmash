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

export type Question = {
  id: string;
  type: QuestionType;
  title: string;
  category_id: string;
  category_name: string;
  status: QuestionStatus;
  image_url: string | null;
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
};
