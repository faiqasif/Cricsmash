export type FormatKey = "odi" | "t20" | "test";

export type FormatStats = {
  debut_year: number | null;
  debut_team: string | null;
  last_match_year: number | null;
  last_match_team: string | null;
  matches: number | null;
  runs: number | null;
  most_hundreds_against: string | null;
  batting_average: number | null;
  batting_strike_rate: number | null;
  hundreds: number | null;
  highest_score: number | null;
  sixes: number | null;
  wickets: number | null;
  bowling_average: number | null;
  bowling_strike_rate: number | null;
  wicket_hauls: number | null;
  best_bowling_figures: string | null;
  man_of_the_match: number | null;
};

export type Player = {
  id: string;
  name: string;
  country: string;
  role: string;
  photo_url: string | null;
  tournaments_won: number | null;
  captained_international: boolean | null;
  catches: number | null;
  most_dismissed_batter: string | null;
  most_dismissals_against_bowler: string;
  status: "active" | "inactive";
  odi: FormatStats;
  t20: FormatStats;
  test: FormatStats;
  custom_fields: PlayerCustomFieldValue[];
  created_at: string;
  updated_at: string;
};

export type PlayerCustomField = {
  id: string;
  name: string;
  applies_to: "batter" | "bowler";
};

export type PlayerCustomFieldValue = {
  field_id: string;
  odi: string | null;
  t20: string | null;
  test: string | null;
};

export type PlayerListItem = {
  id: string;
  name: string;
  photo_url: string | null;
  country: string;
  role: string;
  debut_year: number | null;
  status: "active" | "inactive";
};

export type PlayerListResponse = {
  items: PlayerListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type PlayerPayload = {
  name: string;
  country: string;
  role: string;
  photo_url?: string | null;
  tournaments_won?: number | null;
  captained_international?: boolean | null;
  catches?: number | null;
  most_dismissed_batter?: string | null;
  most_dismissals_against_bowler: string;
  status: "active" | "inactive";
  odi?: FormatStats;
  t20?: FormatStats;
  test?: FormatStats;
  custom_fields?: PlayerCustomFieldValue[];
};
