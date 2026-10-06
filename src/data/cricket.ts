export const COUNTRIES = [
  { name: "Afghanistan", code: "af" },
  { name: "Australia", code: "au" },
  { name: "Bangladesh", code: "bd" },
  { name: "England", code: "gb-eng" },
  { name: "India", code: "in" },
  { name: "Ireland", code: "ie" },
  { name: "New Zealand", code: "nz" },
  { name: "Pakistan", code: "pk" },
  { name: "South Africa", code: "za" },
  { name: "Sri Lanka", code: "lk" },
  { name: "West Indies", code: "jm" },
  { name: "Zimbabwe", code: "zw" },
] as const;

export const CUSTOM_FIELD_ROLES = [
  { value: "batter", label: "Batter" },
  { value: "bowler", label: "Bowler" },
  { value: "all-rounder", label: "All-rounder" },
  { value: "wicketkeeper", label: "Wicketkeeper" },
] as const;

export type CustomFieldAppliesTo = (typeof CUSTOM_FIELD_ROLES)[number]["value"];

export const ROLES = [
  { value: "batsman", label: "Batter" },
  { value: "bowler", label: "Bowler" },
  { value: "all-rounder", label: "All-rounder" },
  { value: "wicketkeeper", label: "Wicketkeeper" },
] as const;

export const PLAYING_HANDS = [
  { value: "righty", label: "Righty" },
  { value: "lefty", label: "Lefty" },
] as const;

export const FORMATS = ["odi", "t20", "test"] as const;

export const FORMAT_LABELS = {
  odi: "ODI",
  t20: "T20",
  test: "Test",
} as const;

export const TEST_COUNTRIES = ["India", "Australia", "England", "South Africa"] as const;
export const OPPONENT_COUNTRIES = ["Pakistan", "India", "Australia", "England", "South Africa"] as const;

export function countryCode(name: string) {
  return COUNTRIES.find((c) => c.name === name)?.code ?? "un";
}

export function flagUrl(name: string) {
  return `https://flagcdn.com/w40/${countryCode(name)}.png`;
}

export function customFieldRoleLabel(value: string) {
  return CUSTOM_FIELD_ROLES.find((item) => item.value === value)?.label ?? value;
}

export function customAppliesToForRole(role: string): CustomFieldAppliesTo | null {
  switch (role.trim().toLowerCase()) {
    case "batsman":
      return "batter";
    case "bowler":
      return "bowler";
    case "all-rounder":
      return "all-rounder";
    case "wicketkeeper":
      return "wicketkeeper";
    default:
      return null;
  }
}

export function roleLabel(role: string) {
  return ROLES.find((item) => item.value === role)?.label ?? role;
}

export function countryFromTeamTitle(title: string) {
  const raw = title.trim();
  if (!raw) return null;
  const head = raw.split(/\s*[-–—|/]\s*/)[0]?.trim() ?? raw;
  const lower = raw.toLowerCase();
  let best: { name: string; score: number } | null = null;
  for (const country of COUNTRIES) {
    const name = country.name.toLowerCase();
    let score = 0;
    if (lower.includes(name)) score = 0.99;
    if (head.toLowerCase() === name) score = 1;
    const fuzzy = nameSimilarity(head, country.name);
    if (fuzzy > score) score = fuzzy;
    if (!best || score > best.score) best = { name: country.name, score };
  }
  if (best && best.score >= 0.55) return best.name;
  return null;
}

function nameSimilarity(query: string, candidate: string) {
  const a = query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const b = candidate.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (b.startsWith(a) || a.startsWith(b)) return 0.9;
  const max = Math.max(a.length, b.length);
  const distance = levenshtein(a, b);
  return 1 - distance / max;
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i += 1) {
    const curr = [i + 1];
    for (let j = 0; j < b.length; j += 1) {
      const cost = a[i] === b[j] ? 0 : 1;
      curr.push(Math.min(curr[j] + 1, prev[j + 1] + 1, prev[j] + cost));
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j] ?? 0;
  }
  return prev[b.length] ?? b.length;
}
