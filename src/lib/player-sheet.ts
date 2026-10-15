import { COUNTRIES } from "@/data/cricket";
import { isReleaseVersion, type FormatStats, type PlayerCustomField, type PlayerPayload } from "@/lib/players";

export type SheetKind = "text" | "number" | "date" | "bool" | "role" | "status" | "hand" | "country" | "custom";

export type SheetColumn = {
  key: string;
  label: string;
  group: string;
  required: boolean;
  hint: string;
  example: string;
  kind: SheetKind;
  format?: "odi" | "t20" | "test";
  stat?: keyof FormatStats;
  fieldId?: string;
  fieldName?: string;
  career?: keyof PlayerPayload;
};

const FORMAT_STATS: { stat: keyof FormatStats; label: string; kind: "text" | "number"; example: string }[] = [
  { stat: "debut_year", label: "Debut year", kind: "number", example: "2008" },
  { stat: "debut_team", label: "Debut team", kind: "text", example: "India" },
  { stat: "last_match_year", label: "Final match year", kind: "number", example: "2024" },
  { stat: "last_match_team", label: "Final match team", kind: "text", example: "Australia" },
  { stat: "matches", label: "Matches", kind: "number", example: "292" },
  { stat: "runs", label: "Runs", kind: "number", example: "13848" },
  { stat: "most_hundreds_against", label: "Most hundreds against", kind: "text", example: "Australia" },
  { stat: "batting_average", label: "Batting average", kind: "number", example: "48.96" },
  { stat: "batting_strike_rate", label: "Batting strike rate", kind: "number", example: "93.17" },
  { stat: "hundreds", label: "Hundreds", kind: "number", example: "50" },
  { stat: "fifties", label: "Fifties", kind: "number", example: "72" },
  { stat: "highest_score", label: "Highest score", kind: "number", example: "183" },
  { stat: "sixes", label: "Sixes", kind: "number", example: "125" },
  { stat: "batting_position", label: "Batting position", kind: "number", example: "3" },
  { stat: "wickets", label: "Wickets", kind: "number", example: "4" },
  { stat: "bowling_average", label: "Bowling average", kind: "number", example: "52.31" },
  { stat: "bowling_strike_rate", label: "Bowling strike rate", kind: "number", example: "92.4" },
  { stat: "bowling_economy", label: "Bowling economy", kind: "number", example: "3.39" },
  { stat: "wicket_hauls", label: "Five-wicket hauls", kind: "number", example: "0" },
  { stat: "best_bowling_figures", label: "Best bowling figures", kind: "text", example: "1/13" },
  { stat: "man_of_the_match", label: "Man of the match", kind: "number", example: "11" },
  { stat: "catches", label: "Catches", kind: "number", example: "148" },
  { stat: "stumpings", label: "Stumpings", kind: "number", example: "0" },
];

const FORMATS = [
  { key: "odi", label: "ODI" },
  { key: "t20", label: "T20" },
  { key: "test", label: "Test" },
] as const;

function career(
  key: keyof PlayerPayload,
  label: string,
  kind: SheetKind,
  hint: string,
  example: string,
  required = false,
): SheetColumn {
  return { key, label, group: "Profile", required, hint, example, kind, career: key };
}

export function playerColumns(customFields: Pick<PlayerCustomField, "id" | "name">[] = []): SheetColumn[] {
  const profile: SheetColumn[] = [
    career("name", "Player name", "text", "At least 2 characters.", "Virat Kohli", true),
    career("country", "Country", "country", "Pick a country from the list.", "India", true),
    career("role", "Role", "role", "batsman, bowler, all-rounder, or wicketkeeper. Batter is accepted as batsman.", "batsman", true),
    career("status", "Status", "status", "active or inactive. Leave blank for active.", "active"),
    career("release_version", "Version", "text", "Shared version such as 1.1. Many players can use the same value.", "1.1"),
    career("date_of_birth", "Date of birth", "date", "YYYY-MM-DD.", "1988-11-05"),
    career("playing_hand", "Playing hand", "hand", "righty or lefty.", "righty"),
    career("photo_url", "Photo URL", "text", "Optional image link.", ""),
    career("tournaments_won", "Tournament titles", "number", "Whole number.", "2"),
    career("captained_international", "Captained internationally", "bool", "yes or no.", "yes"),
    career("catches", "International catches", "number", "Career catches, not a format total.", "148"),
    career("most_dismissed_batter", "Most dismissed batter", "text", "Batter this bowler has dismissed most often.", ""),
    career("most_dismissals_against_bowler", "Most dismissals against bowler", "text", "Bowler who has dismissed this batter most often.", ""),
    career("most_dismissals_against_bowler_count", "Dismissals against that bowler", "number", "How many times that bowler dismissed them.", "8"),
    career("batting_avg_home_test", "Test batting average at home", "number", "Number.", "55.2"),
    career("batting_avg_away_test", "Test batting average away", "number", "Number.", "42.1"),
    career("batting_avg_in_india_test", "Test batting average in India", "number", "Number.", "60"),
    career("batting_avg_in_australia_test", "Test batting average in Australia", "number", "Number.", "38.4"),
    career("batting_avg_in_england_test", "Test batting average in England", "number", "Number.", "36.2"),
    career("batting_avg_in_south_africa_test", "Test batting average in South Africa", "number", "Number.", "40"),
    career("batting_avg_vs_pakistan_test", "Test batting average vs Pakistan", "number", "Number.", "42"),
    career("batting_avg_vs_india_test", "Test batting average vs India", "number", "Number.", "44"),
    career("batting_avg_vs_australia_test", "Test batting average vs Australia", "number", "Number.", "41"),
    career("batting_avg_vs_england_test", "Test batting average vs England", "number", "Number.", "47"),
    career("batting_avg_vs_south_africa_test", "Test batting average vs South Africa", "number", "Number.", "39"),
    career("batting_avg_vs_pakistan_odi", "ODI batting average vs Pakistan", "number", "Number.", "48"),
    career("batting_avg_vs_india_odi", "ODI batting average vs India", "number", "Number.", "52"),
    career("batting_avg_vs_australia_odi", "ODI batting average vs Australia", "number", "Number.", "46"),
    career("batting_avg_vs_england_odi", "ODI batting average vs England", "number", "Number.", "44"),
    career("batting_avg_vs_south_africa_odi", "ODI batting average vs South Africa", "number", "Number.", "41"),
    career("wickets_home_test", "Test wickets at home", "number", "Whole number.", "80"),
    career("wickets_away_test", "Test wickets away", "number", "Whole number.", "60"),
    career("wickets_vs_india", "Wickets vs India", "number", "Whole number.", "20"),
    career("wickets_vs_australia", "Wickets vs Australia", "number", "Whole number.", "18"),
    career("wickets_vs_england", "Wickets vs England", "number", "Whole number.", "15"),
    career("wickets_vs_south_africa", "Wickets vs South Africa", "number", "Whole number.", "12"),
    career("wickets_in_india", "Wickets in India", "number", "Whole number.", "22"),
    career("wickets_in_australia", "Wickets in Australia", "number", "Whole number.", "14"),
    career("wickets_in_england", "Wickets in England", "number", "Whole number.", "11"),
    career("wickets_in_south_africa", "Wickets in South Africa", "number", "Whole number.", "9"),
    career("hundreds_vs_pakistan_test", "Test hundreds vs Pakistan", "number", "Whole number.", "2"),
    career("hundreds_vs_india_test", "Test hundreds vs India", "number", "Whole number.", "2"),
    career("hundreds_vs_australia_test", "Test hundreds vs Australia", "number", "Whole number.", "3"),
    career("hundreds_vs_england_test", "Test hundreds vs England", "number", "Whole number.", "1"),
    career("hundreds_vs_south_africa_test", "Test hundreds vs South Africa", "number", "Whole number.", "1"),
    career("hundreds_in_india_test", "Test hundreds in India", "number", "Whole number.", "4"),
    career("hundreds_in_australia_test", "Test hundreds in Australia", "number", "Whole number.", "2"),
    career("hundreds_in_england_test", "Test hundreds in England", "number", "Whole number.", "1"),
    career("hundreds_in_south_africa_test", "Test hundreds in South Africa", "number", "Whole number.", "1"),
    career("hundreds_vs_pakistan_odi", "ODI hundreds vs Pakistan", "number", "Whole number.", "3"),
    career("hundreds_vs_india_odi", "ODI hundreds vs India", "number", "Whole number.", "3"),
    career("hundreds_vs_australia_odi", "ODI hundreds vs Australia", "number", "Whole number.", "5"),
    career("hundreds_vs_england_odi", "ODI hundreds vs England", "number", "Whole number.", "2"),
    career("hundreds_vs_south_africa_odi", "ODI hundreds vs South Africa", "number", "Whole number.", "2"),
    career("balls_played_test", "Balls played in Tests", "number", "Whole number.", "18000"),
    career("odi_wc_batting_average", "ODI World Cup batting average", "number", "Number.", "58.4"),
    career("odi_wc_strike_rate", "ODI World Cup strike rate", "number", "Number.", "87.2"),
    career("odi_wc_hundreds", "ODI World Cup hundreds", "number", "Whole number.", "2"),
    career("odi_wc_fifties", "ODI World Cup fifties", "number", "Whole number.", "4"),
    career("odi_wc_player_of_match", "ODI World Cup player of the match", "number", "Whole number.", "3"),
    career("odi_wc_highest_score", "ODI World Cup highest score", "number", "Whole number.", "183"),
    career("odi_wc_final_batting_average", "ODI World Cup final batting average", "number", "Number.", "62.5"),
    career("odi_wc_final_hundreds", "ODI World Cup final hundreds", "number", "Whole number.", "1"),
    career("odi_wc_final_fifties", "ODI World Cup final fifties", "number", "Whole number.", "1"),
    career("odi_wc_final_highest_score", "ODI World Cup final highest score", "number", "Whole number.", "140"),
    career("odi_wc_semi_batting_average", "ODI World Cup semifinal batting average", "number", "Number.", "55"),
    career("odi_wc_semi_hundreds", "ODI World Cup semifinal hundreds", "number", "Whole number.", "1"),
    career("odi_wc_semi_fifties", "ODI World Cup semifinal fifties", "number", "Whole number.", "1"),
    career("odi_wc_semi_highest_score", "ODI World Cup semifinal highest score", "number", "Whole number.", "113"),
    career("odi_wc_wickets", "ODI World Cup wickets", "number", "Whole number.", "8"),
    career("odi_wc_bowling_strike_rate", "ODI World Cup bowling strike rate", "number", "Number.", "32.5"),
    career("t20_wc_batting_average", "T20 World Cup batting average", "number", "Number.", "41.2"),
    career("t20_wc_strike_rate", "T20 World Cup strike rate", "number", "Number.", "131.4"),
    career("t20_wc_hundreds", "T20 World Cup hundreds", "number", "Whole number.", "0"),
    career("t20_wc_fifties", "T20 World Cup fifties", "number", "Whole number.", "2"),
    career("t20_wc_player_of_match", "T20 World Cup player of the match", "number", "Whole number.", "1"),
    career("t20_wc_highest_score", "T20 World Cup highest score", "number", "Whole number.", "82"),
    career("t20_wc_final_batting_average", "T20 World Cup final batting average", "number", "Number.", "48"),
    career("t20_wc_final_strike_rate", "T20 World Cup final strike rate", "number", "Number.", "150"),
    career("t20_wc_final_fifties", "T20 World Cup final fifties", "number", "Whole number.", "1"),
    career("t20_wc_final_highest_score", "T20 World Cup final highest score", "number", "Whole number.", "89"),
    career("t20_wc_semi_batting_average", "T20 World Cup semifinal batting average", "number", "Number.", "36"),
    career("t20_wc_semi_strike_rate", "T20 World Cup semifinal strike rate", "number", "Number.", "142"),
    career("t20_wc_semi_fifties", "T20 World Cup semifinal fifties", "number", "Whole number.", "1"),
    career("t20_wc_semi_highest_score", "T20 World Cup semifinal highest score", "number", "Whole number.", "74"),
    career("t20_wc_wickets", "T20 World Cup wickets", "number", "Whole number.", "4"),
    career("t20_wc_bowling_strike_rate", "T20 World Cup bowling strike rate", "number", "Number.", "18.2"),
  ];

  const formats = FORMATS.flatMap((format) =>
    FORMAT_STATS.map((stat) => ({
      key: `${format.key}_${stat.stat}`,
      label: `${format.label} ${stat.label}`,
      group: format.label,
      required: false,
      hint: stat.kind === "text" ? "Text. Leave blank if unknown." : "Number. Leave blank if unknown.",
      example: stat.example,
      kind: stat.kind,
      format: format.key,
      stat: stat.stat,
    })),
  );

  const custom = customFields.flatMap((field) =>
    FORMATS.map((format) => ({
      key: `cf:${field.name}:${format.key}`,
      label: `${field.name} (${format.label})`,
      group: "Custom fields",
      required: false,
      hint: `Custom field “${field.name}” for ${format.label}.`,
      example: "",
      kind: "custom" as const,
      format: format.key,
      fieldId: field.id,
      fieldName: field.name,
    })),
  );

  return [...profile, ...formats, ...custom];
}

export type ParsedPlayerRow = {
  row: number;
  name: string;
  country: string;
  role: string;
  status: string;
  payload: PlayerPayload | null;
  error: string;
};

const ROLE_ALIASES: Record<string, PlayerPayload["role"]> = {
  batsman: "batsman",
  batter: "batsman",
  bowler: "bowler",
  "all-rounder": "all-rounder",
  "all rounder": "all-rounder",
  allrounder: "all-rounder",
  wicketkeeper: "wicketkeeper",
  "wicket-keeper": "wicketkeeper",
  "wicket keeper": "wicketkeeper",
  keeper: "wicketkeeper",
  wk: "wicketkeeper",
};

function headerKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function blank(value: unknown) {
  return value == null || (typeof value === "string" && value.trim() === "");
}

function excelSerialDate(value: number) {
  if (!Number.isFinite(value)) return "";
  const serial = Math.round(value);
  if (serial < 1 || serial > 80000) return "";
  const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function asText(value: unknown) {
  if (blank(value)) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${day}`;
  }
  if (typeof value === "object") {
    const record = value as { text?: unknown; result?: unknown; richText?: { text?: string }[] };
    if (Array.isArray(record.richText)) return record.richText.map((part) => part.text ?? "").join("").trim();
    if (typeof record.text === "string") return record.text.trim();
    if ("result" in record) return asText(record.result);
  }
  return String(value).trim();
}

function asNumber(value: unknown, label: string, errors: string[]) {
  if (blank(value)) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = asText(value).replace(/,/g, "").replace(/\*$/, "").trim();
  if (!text || text === "-" || text === "—" || text.toLowerCase() === "n/a" || text.toLowerCase() === "dnb") return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) {
    errors.push(`${label} must be a number`);
    return null;
  }
  return parsed;
}

function asBool(value: unknown, label: string, errors: string[]) {
  if (blank(value)) return null;
  if (typeof value === "boolean") return value;
  const text = asText(value).toLowerCase();
  if (["yes", "y", "true", "1"].includes(text)) return true;
  if (["no", "n", "false", "0"].includes(text)) return false;
  errors.push(`${label} must be yes or no`);
  return null;
}

function emptyStats(): FormatStats {
  return {
    debut_year: null,
    debut_team: null,
    last_match_year: null,
    last_match_team: null,
    matches: null,
    runs: null,
    most_hundreds_against: null,
    batting_average: null,
    batting_strike_rate: null,
    hundreds: null,
    fifties: null,
    highest_score: null,
    sixes: null,
    batting_position: null,
    wickets: null,
    bowling_average: null,
    bowling_strike_rate: null,
    bowling_economy: null,
    wicket_hauls: null,
    best_bowling_figures: null,
    man_of_the_match: null,
    catches: null,
    stumpings: null,
  };
}

export function parsePlayerRows(
  table: { row: number; cells: Record<string, unknown> }[],
  customFields: Pick<PlayerCustomField, "id" | "name">[] = [],
): { rows: ParsedPlayerRow[]; ignoredColumns: string[] } {
  const columns = playerColumns(customFields);
  const byHeader = new Map<string, SheetColumn>();
  for (const column of columns) {
    byHeader.set(headerKey(column.key), column);
    byHeader.set(headerKey(column.label), column);
  }
  const ignored = new Set<string>();
  const rows: ParsedPlayerRow[] = [];
  const seen = new Map<string, number>();

  for (const entry of table) {
    const errors: string[] = [];
    const mapped = new Map<string, { column: SheetColumn; value: unknown }>();
    for (const [header, value] of Object.entries(entry.cells)) {
      const column = byHeader.get(headerKey(header));
      if (!column) {
        if (!blank(value)) ignored.add(header.trim());
        continue;
      }
      if (!blank(value)) mapped.set(column.key, { column, value });
    }
    if (mapped.size === 0) continue;

    const payload = {
      most_dismissals_against_bowler: "",
      status: "active",
      odi: emptyStats(),
      t20: emptyStats(),
      test: emptyStats(),
      custom_fields: [] as PlayerPayload["custom_fields"],
    } as PlayerPayload;

    const custom = new Map<string, { field_id: string; odi: string | null; t20: string | null; test: string | null }>();
    let name = "";
    let country = "";
    let role = "";
    let status = "active";

    for (const column of columns) {
      const cell = mapped.get(column.key);
      if (!cell) {
        if (column.required) errors.push(`${column.label} is required`);
        continue;
      }
      if (column.kind === "custom" && column.fieldId && column.format) {
        const text = asText(cell.value);
        const current = custom.get(column.fieldId) ?? { field_id: column.fieldId, odi: null, t20: null, test: null };
        current[column.format] = text || null;
        custom.set(column.fieldId, current);
        continue;
      }
      if (column.format && column.stat) {
        const stats = payload[column.format];
        if (!stats) continue;
        if (column.kind === "text") {
          const text = asText(cell.value);
          (stats[column.stat] as string | null) = text || null;
        } else {
          (stats[column.stat] as number | null) = asNumber(cell.value, column.label, errors);
        }
        continue;
      }
      if (column.kind === "number" && column.career) {
        (payload[column.career] as number | null) = asNumber(cell.value, column.label, errors);
        continue;
      }
      if (column.kind === "bool" && column.career === "captained_international") {
        payload.captained_international = asBool(cell.value, column.label, errors);
        continue;
      }
      if (column.kind === "role") {
        const text = asText(cell.value).toLowerCase();
        const next = ROLE_ALIASES[text];
        if (!next) errors.push("Role must be batsman, bowler, all-rounder, or wicketkeeper");
        else role = next;
        continue;
      }
      if (column.kind === "status") {
        const text = asText(cell.value).toLowerCase();
        if (!text) status = "active";
        else if (text === "active" || text === "inactive") status = text;
        else errors.push("Status must be active or inactive");
        continue;
      }
      if (column.kind === "hand") {
        const text = asText(cell.value).toLowerCase();
        if (!text) payload.playing_hand = null;
        else if (text === "righty" || text === "right" || text === "right-hand") payload.playing_hand = "righty";
        else if (text === "lefty" || text === "left" || text === "left-hand") payload.playing_hand = "lefty";
        else errors.push("Playing hand must be righty or lefty");
        continue;
      }
      if (column.kind === "date") {
        const fromSerial = typeof cell.value === "number" ? excelSerialDate(cell.value) : "";
        const text = fromSerial || asText(cell.value);
        if (!text) payload.date_of_birth = null;
        else if (/^\d{4}-\d{2}-\d{2}$/.test(text)) payload.date_of_birth = text;
        else errors.push("Date of birth must be YYYY-MM-DD");
        continue;
      }
      if (column.kind === "country") {
        const text = asText(cell.value);
        const match = COUNTRIES.find((item) => item.name.toLowerCase() === text.toLowerCase());
        if (!match) errors.push("Country must match a name in the template list");
        else country = match.name;
        continue;
      }
      const text = asText(cell.value);
      if (column.career === "name") name = text;
      else if (column.career === "most_dismissals_against_bowler") payload.most_dismissals_against_bowler = text;
      else if (column.career === "most_dismissed_batter") payload.most_dismissed_batter = text || null;
      else if (column.career === "photo_url") payload.photo_url = text || null;
      else if (column.career === "release_version") {
        if (!text) payload.release_version = null;
        else if (isReleaseVersion(text)) payload.release_version = text;
        else errors.push("Version must look like 1.1");
      }
    }

    if (name && name.length < 2) errors.push("Player name must be at least 2 characters");
    if (name.length > 150) errors.push("Player name is too long");
    payload.name = name;
    payload.country = country;
    payload.role = role;
    payload.status = status as PlayerPayload["status"];
    payload.custom_fields = [...custom.values()].filter((item) => item.odi || item.t20 || item.test);

    const identity = `${name.toLowerCase()}|${country.toLowerCase()}`;
    if (name && country) {
      const previous = seen.get(identity);
      if (previous) errors.push(`Same name and country as row ${previous}`);
      else seen.set(identity, entry.row);
    }

    rows.push({
      row: entry.row,
      name,
      country,
      role,
      status,
      payload: errors.length ? null : payload,
      error: errors.join(". "),
    });
  }

  return { rows, ignoredColumns: [...ignored] };
}
