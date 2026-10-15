import type { CustomFieldAppliesTo } from "@/data/cricket";
import { api } from "@/lib/api";

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
  fifties: number | null;
  highest_score: number | null;
  sixes: number | null;
  batting_position: number | null;
  wickets: number | null;
  bowling_average: number | null;
  bowling_strike_rate: number | null;
  bowling_economy: number | null;
  wicket_hauls: number | null;
  best_bowling_figures: string | null;
  man_of_the_match: number | null;
  catches: number | null;
  stumpings: number | null;
};

export type Player = {
  id: string;
  name: string;
  country: string;
  role: string;
  date_of_birth: string | null;
  playing_hand: string | null;
  photo_url: string | null;
  release_version: string | null;
  tournaments_won: number | null;
  captained_international: boolean | null;
  catches: number | null;
  most_dismissed_batter: string | null;
  most_dismissals_against_bowler: string;
  most_dismissals_against_bowler_count: number | null;
  batting_avg_home_test: number | null;
  batting_avg_away_test: number | null;
  batting_avg_in_india_test: number | null;
  batting_avg_in_australia_test: number | null;
  batting_avg_in_england_test: number | null;
  batting_avg_in_south_africa_test: number | null;
  batting_avg_vs_pakistan_test: number | null;
  batting_avg_vs_india_test: number | null;
  batting_avg_vs_australia_test: number | null;
  batting_avg_vs_england_test: number | null;
  batting_avg_vs_south_africa_test: number | null;
  batting_avg_vs_pakistan_odi: number | null;
  batting_avg_vs_india_odi: number | null;
  batting_avg_vs_australia_odi: number | null;
  batting_avg_vs_england_odi: number | null;
  batting_avg_vs_south_africa_odi: number | null;
  wickets_home_test: number | null;
  wickets_away_test: number | null;
  wickets_vs_india: number | null;
  wickets_vs_australia: number | null;
  wickets_vs_england: number | null;
  wickets_vs_south_africa: number | null;
  wickets_in_india: number | null;
  wickets_in_australia: number | null;
  wickets_in_england: number | null;
  wickets_in_south_africa: number | null;
  hundreds_vs_pakistan_test: number | null;
  hundreds_vs_india_test: number | null;
  hundreds_vs_australia_test: number | null;
  hundreds_vs_england_test: number | null;
  hundreds_vs_south_africa_test: number | null;
  hundreds_in_india_test: number | null;
  hundreds_in_australia_test: number | null;
  hundreds_in_england_test: number | null;
  hundreds_in_south_africa_test: number | null;
  hundreds_vs_pakistan_odi: number | null;
  hundreds_vs_india_odi: number | null;
  hundreds_vs_australia_odi: number | null;
  hundreds_vs_england_odi: number | null;
  hundreds_vs_south_africa_odi: number | null;
  balls_played_test: number | null;
  odi_wc_batting_average: number | null;
  odi_wc_strike_rate: number | null;
  odi_wc_hundreds: number | null;
  odi_wc_fifties: number | null;
  odi_wc_player_of_match: number | null;
  odi_wc_highest_score: number | null;
  odi_wc_final_batting_average: number | null;
  odi_wc_final_hundreds: number | null;
  odi_wc_final_fifties: number | null;
  odi_wc_final_highest_score: number | null;
  odi_wc_semi_batting_average: number | null;
  odi_wc_semi_hundreds: number | null;
  odi_wc_semi_fifties: number | null;
  odi_wc_semi_highest_score: number | null;
  odi_wc_wickets: number | null;
  odi_wc_bowling_strike_rate: number | null;
  t20_wc_batting_average: number | null;
  t20_wc_strike_rate: number | null;
  t20_wc_hundreds: number | null;
  t20_wc_fifties: number | null;
  t20_wc_player_of_match: number | null;
  t20_wc_highest_score: number | null;
  t20_wc_final_batting_average: number | null;
  t20_wc_final_strike_rate: number | null;
  t20_wc_final_fifties: number | null;
  t20_wc_final_highest_score: number | null;
  t20_wc_semi_batting_average: number | null;
  t20_wc_semi_strike_rate: number | null;
  t20_wc_semi_fifties: number | null;
  t20_wc_semi_highest_score: number | null;
  t20_wc_wickets: number | null;
  t20_wc_bowling_strike_rate: number | null;
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
  applies_to: CustomFieldAppliesTo;
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
  version: string | null;
};

export type PlayerListResponse = {
  items: PlayerListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  versions: string[];
};

const RELEASE_VERSION = /^(?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*)){0,3}$/;

export function isReleaseVersion(value: string) {
  return RELEASE_VERSION.test(value);
}

export function compareReleaseVersions(left: string, right: string) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

export type PlayerPayload = {
  name: string;
  country: string;
  role: string;
  date_of_birth?: string | null;
  playing_hand?: string | null;
  photo_url?: string | null;
  release_version?: string | null;
  tournaments_won?: number | null;
  captained_international?: boolean | null;
  catches?: number | null;
  most_dismissed_batter?: string | null;
  most_dismissals_against_bowler: string;
  most_dismissals_against_bowler_count?: number | null;
  batting_avg_home_test?: number | null;
  batting_avg_away_test?: number | null;
  batting_avg_in_india_test?: number | null;
  batting_avg_in_australia_test?: number | null;
  batting_avg_in_england_test?: number | null;
  batting_avg_in_south_africa_test?: number | null;
  batting_avg_vs_pakistan_test?: number | null;
  batting_avg_vs_india_test?: number | null;
  batting_avg_vs_australia_test?: number | null;
  batting_avg_vs_england_test?: number | null;
  batting_avg_vs_south_africa_test?: number | null;
  batting_avg_vs_pakistan_odi?: number | null;
  batting_avg_vs_india_odi?: number | null;
  batting_avg_vs_australia_odi?: number | null;
  batting_avg_vs_england_odi?: number | null;
  batting_avg_vs_south_africa_odi?: number | null;
  wickets_home_test?: number | null;
  wickets_away_test?: number | null;
  wickets_vs_india?: number | null;
  wickets_vs_australia?: number | null;
  wickets_vs_england?: number | null;
  wickets_vs_south_africa?: number | null;
  wickets_in_india?: number | null;
  wickets_in_australia?: number | null;
  wickets_in_england?: number | null;
  wickets_in_south_africa?: number | null;
  hundreds_vs_pakistan_test?: number | null;
  hundreds_vs_india_test?: number | null;
  hundreds_vs_australia_test?: number | null;
  hundreds_vs_england_test?: number | null;
  hundreds_vs_south_africa_test?: number | null;
  hundreds_in_india_test?: number | null;
  hundreds_in_australia_test?: number | null;
  hundreds_in_england_test?: number | null;
  hundreds_in_south_africa_test?: number | null;
  hundreds_vs_pakistan_odi?: number | null;
  hundreds_vs_india_odi?: number | null;
  hundreds_vs_australia_odi?: number | null;
  hundreds_vs_england_odi?: number | null;
  hundreds_vs_south_africa_odi?: number | null;
  balls_played_test?: number | null;
  odi_wc_batting_average?: number | null;
  odi_wc_strike_rate?: number | null;
  odi_wc_hundreds?: number | null;
  odi_wc_fifties?: number | null;
  odi_wc_player_of_match?: number | null;
  odi_wc_highest_score?: number | null;
  odi_wc_final_batting_average?: number | null;
  odi_wc_final_hundreds?: number | null;
  odi_wc_final_fifties?: number | null;
  odi_wc_final_highest_score?: number | null;
  odi_wc_semi_batting_average?: number | null;
  odi_wc_semi_hundreds?: number | null;
  odi_wc_semi_fifties?: number | null;
  odi_wc_semi_highest_score?: number | null;
  odi_wc_wickets?: number | null;
  odi_wc_bowling_strike_rate?: number | null;
  t20_wc_batting_average?: number | null;
  t20_wc_strike_rate?: number | null;
  t20_wc_hundreds?: number | null;
  t20_wc_fifties?: number | null;
  t20_wc_player_of_match?: number | null;
  t20_wc_highest_score?: number | null;
  t20_wc_final_batting_average?: number | null;
  t20_wc_final_strike_rate?: number | null;
  t20_wc_final_fifties?: number | null;
  t20_wc_final_highest_score?: number | null;
  t20_wc_semi_batting_average?: number | null;
  t20_wc_semi_strike_rate?: number | null;
  t20_wc_semi_fifties?: number | null;
  t20_wc_semi_highest_score?: number | null;
  t20_wc_wickets?: number | null;
  t20_wc_bowling_strike_rate?: number | null;
  status: "active" | "inactive";
  odi?: FormatStats;
  t20?: FormatStats;
  test?: FormatStats;
  custom_fields?: PlayerCustomFieldValue[];
};

export function suggestPlayers(params: {
  country: string;
  q?: string;
  exclude?: string[];
  limit?: number;
}) {
  const query = new URLSearchParams();
  query.set("country", params.country);
  if (params.q) query.set("q", params.q);
  if (params.exclude?.length) query.set("exclude", params.exclude.join(","));
  query.set("limit", String(params.limit ?? 12));
  return api<{ items: PlayerListItem[] }>(`/api/v1/players/suggest?${query.toString()}`);
}

export async function listAllPlayers() {
  const first = await api<PlayerListResponse>("/api/v1/players?page=1&page_size=100");
  const items = [...first.items];
  for (let page = 2; page <= first.total_pages; page += 1) {
    const next = await api<PlayerListResponse>(`/api/v1/players?page=${page}&page_size=100`);
    items.push(...next.items);
  }
  return items.sort((left, right) => left.name.localeCompare(right.name));
}
