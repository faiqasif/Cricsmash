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

export const ROLES = [
  { value: "batsman", label: "Batsman" },
  { value: "bowler", label: "Bowler" },
  { value: "all-rounder", label: "All-rounder" },
  { value: "wicketkeeper", label: "Wicketkeeper" },
] as const;

export const FORMATS = ["odi", "t20", "test"] as const;

export const FORMAT_LABELS = {
  odi: "ODI",
  t20: "T20",
  test: "Test",
} as const;

export function countryCode(name: string) {
  return COUNTRIES.find((c) => c.name === name)?.code ?? "un";
}

export function flagUrl(name: string) {
  return `https://flagcdn.com/w40/${countryCode(name)}.png`;
}

export function roleLabel(role: string) {
  return ROLES.find((item) => item.value === role)?.label ?? role;
}
