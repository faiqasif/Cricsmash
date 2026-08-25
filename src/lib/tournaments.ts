export type TournamentAnswer = {
  id: string;
  question_id: string;
  question_title: string;
  question_status: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  correct_option: number;
  used: boolean;
  last_used_on: string | null;
};

export type TournamentListItem = {
  id: string;
  name: string;
  total_questions: number;
  used: number;
  created_at: string;
  updated_at: string;
};

export type Tournament = TournamentListItem & {
  answers: TournamentAnswer[];
};

export type TournamentListResponse = {
  items: TournamentListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type TournamentPayload = {
  name: string;
  answers: {
    question_id: string;
    option_1: string;
    option_2: string;
    option_3: string;
    option_4: string;
    correct_option: number;
  }[];
};
