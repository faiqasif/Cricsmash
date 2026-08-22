import * as Yup from "yup";
import type { FormatStats, Player, PlayerPayload } from "@/lib/players";

export type FormFormat = Record<keyof FormatStats, string>;

export type PlayerFormValues = {
  name: string;
  country: string;
  role: string;
  tournaments_won: string;
  captain: string;
  catches: string;
  most_dismissed_batter: string;
  most_dismissals_against_bowler: string;
  status: "active" | "inactive";
  photo: File | null;
  odi: FormFormat;
  t20: FormFormat;
  test: FormFormat;
};

export function showsBatting(role: string) {
  const value = role.trim().toLowerCase();
  return value === "batsman" || value === "wicketkeeper" || value === "all-rounder";
}

export function showsBowling(role: string) {
  const value = role.trim().toLowerCase();
  return value === "bowler" || value === "all-rounder";
}

const BATTING_KEYS: (keyof FormatStats)[] = [
  "runs",
  "most_hundreds_against",
  "batting_average",
  "batting_strike_rate",
  "hundreds",
  "highest_score",
  "sixes",
];

const BOWLING_KEYS: (keyof FormatStats)[] = [
  "wickets",
  "bowling_average",
  "bowling_strike_rate",
  "wicket_hauls",
  "best_bowling_figures",
];

export const emptyFormat = (): FormFormat => ({
  debut_year: "",
  debut_team: "",
  last_match_year: "",
  last_match_team: "",
  matches: "",
  runs: "",
  most_hundreds_against: "",
  batting_average: "",
  batting_strike_rate: "",
  hundreds: "",
  highest_score: "",
  sixes: "",
  wickets: "",
  bowling_average: "",
  bowling_strike_rate: "",
  wicket_hauls: "",
  best_bowling_figures: "",
  man_of_the_match: "",
});

function formatFromPlayer(stats?: FormatStats | null): FormFormat {
  const base = emptyFormat();
  if (!stats) return base;
  (Object.keys(base) as (keyof FormatStats)[]).forEach((key) => {
    const value = stats[key];
    base[key] = value == null ? "" : String(value);
  });
  return base;
}

export function playerInitialValues(player?: Player): PlayerFormValues {
  return {
    name: player?.name ?? "",
    country: player?.country ?? "",
    role: player?.role ?? "",
    tournaments_won: player?.tournaments_won != null ? String(player.tournaments_won) : "",
    captain: player?.captained_international == null ? "" : player.captained_international ? "yes" : "no",
    catches: player?.catches != null ? String(player.catches) : "",
    most_dismissed_batter: player?.most_dismissed_batter ?? "",
    most_dismissals_against_bowler: player?.most_dismissals_against_bowler ?? "",
    status: player?.status ?? "active",
    photo: null,
    odi: formatFromPlayer(player?.odi),
    t20: formatFromPlayer(player?.t20),
    test: formatFromPlayer(player?.test),
  };
}

function optionalWholeNumber(message: string, min = 0, max = 100000) {
  return Yup.string()
    .trim()
    .test("whole", message, (value) => !value || /^-?\d+$/.test(value))
    .test("range", message, (value) => {
      if (!value) return true;
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) && parsed >= min && parsed <= max;
    });
}

function optionalDecimal(message: string, min = 0, max = 1000) {
  return Yup.string()
    .trim()
    .test("number", message, (value) => !value || Number.isFinite(Number(value)))
    .test("range", message, (value) => {
      if (!value) return true;
      const parsed = Number(value);
      return parsed >= min && parsed <= max;
    });
}

function optionalText(max = 150) {
  return Yup.string().trim().max(max, `Must be ${max} characters or fewer`);
}

const formatSchema = Yup.object({
  debut_year: optionalWholeNumber("Enter a valid debut year", 1850, 2100),
  debut_team: optionalText(80),
  last_match_year: optionalWholeNumber("Enter a valid last match year", 1850, 2100),
  last_match_team: optionalText(80),
  matches: optionalWholeNumber("Enter a valid match count"),
  runs: optionalWholeNumber("Enter a valid run count"),
  most_hundreds_against: optionalText(80),
  batting_average: optionalDecimal("Enter a valid batting average"),
  batting_strike_rate: optionalDecimal("Enter a valid batting strike rate", 0, 1000),
  hundreds: optionalWholeNumber("Enter a valid hundreds count"),
  highest_score: optionalWholeNumber("Enter a valid highest score"),
  sixes: optionalWholeNumber("Enter a valid sixes count"),
  wickets: optionalWholeNumber("Enter a valid wicket count"),
  bowling_average: optionalDecimal("Enter a valid bowling average"),
  bowling_strike_rate: optionalDecimal("Enter a valid bowling strike rate"),
  wicket_hauls: optionalWholeNumber("Enter a valid wicket hauls count"),
  best_bowling_figures: optionalText(20),
  man_of_the_match: optionalWholeNumber("Enter a valid awards count"),
}).test("year-order", function (value) {
  if (!value?.debut_year || !value?.last_match_year) return true;
  if (Number.parseInt(value.last_match_year, 10) >= Number.parseInt(value.debut_year, 10)) return true;
  return this.createError({
    path: `${this.path}.last_match_year`,
    message: "Last match year cannot be before debut year",
  });
});

const photoTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const playerSchema = Yup.object({
  name: Yup.string().trim().required("Player name is required").min(2, "Enter at least 2 characters").max(150, "Must be 150 characters or fewer"),
  country: Yup.string().trim().required("Select a player country").max(80, "Must be 80 characters or fewer"),
  role: Yup.string()
    .oneOf(["batsman", "bowler", "all-rounder", "wicketkeeper"], "Select a playing role")
    .required("Select a playing role"),
  tournaments_won: optionalWholeNumber("Enter a valid tournament count"),
  captain: Yup.string().oneOf(["", "yes", "no"]),
  catches: optionalWholeNumber("Enter a valid catch count"),
  most_dismissed_batter: Yup.string().when("role", {
    is: (role: string) => showsBowling(role ?? ""),
    then: (schema) => schema.trim().max(150, "Must be 150 characters or fewer"),
    otherwise: (schema) => schema.trim(),
  }),
  most_dismissals_against_bowler: Yup.string().when("role", {
    is: (role: string) => showsBatting(role ?? ""),
    then: (schema) =>
      schema
        .trim()
        .required("Most dismissals against which bowler is required")
        .min(2, "Enter at least 2 characters")
        .max(150, "Must be 150 characters or fewer"),
    otherwise: (schema) => schema.trim(),
  }),
  status: Yup.string().oneOf(["active", "inactive"], "Select a status").required("Select a status"),
  photo: Yup.mixed<File>()
    .nullable()
    .test("type", "Use a JPEG, PNG, WebP, or GIF image", (file) => !file || photoTypes.includes(file.type))
    .test("size", "Photo must be 5MB or smaller", (file) => !file || file.size <= 5 * 1024 * 1024),
  odi: formatSchema,
  t20: formatSchema,
  test: formatSchema,
});

function toNumber(value: string, kind: "int" | "float"): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = kind === "int" ? Number.parseInt(trimmed, 10) : Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

const FORMAT_KINDS: Record<keyof FormatStats, "int" | "float" | "text"> = {
  debut_year: "int",
  debut_team: "text",
  last_match_year: "int",
  last_match_team: "text",
  matches: "int",
  runs: "int",
  most_hundreds_against: "text",
  batting_average: "float",
  batting_strike_rate: "float",
  hundreds: "int",
  highest_score: "int",
  sixes: "int",
  wickets: "int",
  bowling_average: "float",
  bowling_strike_rate: "float",
  wicket_hauls: "int",
  best_bowling_figures: "text",
  man_of_the_match: "int",
};

function toFormatPayload(form: FormFormat, battingVisible: boolean, bowlingVisible: boolean): FormatStats {
  const out = {} as FormatStats;
  (Object.keys(form) as (keyof FormatStats)[]).forEach((key) => {
    const hidden =
      (BATTING_KEYS.includes(key) && !battingVisible) || (BOWLING_KEYS.includes(key) && !bowlingVisible);
    const kind = FORMAT_KINDS[key];
    if (hidden) {
      (out[key] as string | number | null) = null;
      return;
    }
    if (kind === "text") {
      (out[key] as string | null) = form[key].trim() || null;
      return;
    }
    (out[key] as number | null) = toNumber(form[key], kind);
  });
  return out;
}

export function playerPayloadFromValues(values: PlayerFormValues, photoUrl: string | null): PlayerPayload {
  const battingVisible = showsBatting(values.role);
  const bowlingVisible = showsBowling(values.role);
  return {
    name: values.name.trim(),
    country: values.country,
    role: values.role,
    photo_url: photoUrl,
    tournaments_won: toNumber(values.tournaments_won, "int"),
    captained_international: values.captain === "" ? null : values.captain === "yes",
    catches: toNumber(values.catches, "int"),
    most_dismissed_batter: bowlingVisible ? values.most_dismissed_batter.trim() || null : null,
    most_dismissals_against_bowler: battingVisible ? values.most_dismissals_against_bowler.trim() : "",
    status: values.status,
    odi: toFormatPayload(values.odi, battingVisible, bowlingVisible),
    t20: toFormatPayload(values.t20, battingVisible, bowlingVisible),
    test: toFormatPayload(values.test, battingVisible, bowlingVisible),
  };
}

