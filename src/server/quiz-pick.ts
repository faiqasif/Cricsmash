import type { DailyQuizPlayer } from "@/lib/daily-quiz";
import type { Player } from "@/lib/players";
import { fillPlayerQuestionTitle } from "@/lib/questions";
import {
  METRIC,
  correctPlayerIndexes,
  formatOptionStat,
  formatQuizNumber,
  metricIsTextStat,
  metricRoleOk,
  playerDebutYear,
  playerEraYear,
  playerStatText,
  playerStatValue,
  questionHasCountryToken,
  questionHasNumberToken,
  questionHasPlayerNameToken,
  questionHasYearToken,
  debutTargetYear,
  resolvePlayerMetric,
  slotFormats,
  subjectDebutRelation,
  formatPlayerStatAnswer,
} from "@/server/quiz-metrics";

const INTERNATIONAL_TEAMS = [
  "India",
  "Australia",
  "England",
  "South Africa",
  "Pakistan",
  "New Zealand",
  "Sri Lanka",
  "West Indies",
  "Bangladesh",
  "Afghanistan",
  "Zimbabwe",
  "Ireland",
];

const COUNTRY_OPTIONS = ["India", "Australia", "England", "South Africa"];
const OPPONENT_OPTIONS = ["Pakistan", ...COUNTRY_OPTIONS];

export type BuiltQuizQuestion = {
  title: string;
  format: string;
  metric: string;
  country: string;
  options: DailyQuizPlayer[];
};

type Candidate = { player: Player; value: number; debut: number; hasDebut: boolean };

function shuffle<T>(values: T[]) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function hasUniqueCorrect(players: Player[], format: string, country: string, metric: string, title: string) {
  return correctPlayerIndexes(players, format, country, metric, title).length === 1;
}

function playerChoices(players: Player[], format: string, country: string, metric: string, title: string): DailyQuizPlayer[] {
  const correct = new Set(correctPlayerIndexes(players, format, country, metric, title));
  const unique = correct.size === 1;
  return players.map((player, index) => ({
    player_id: player.id,
    name: player.name,
    country: player.country,
    photo_url: player.photo_url,
    value: formatOptionStat(metric, playerStatValue(player, format, country, metric)) || undefined,
    correct: unique && correct.has(index),
    option: index + 1,
  }));
}

function textChoices(labels: string[], correctAt: number): DailyQuizPlayer[] {
  return labels.map((name, index) => ({
    player_id: "",
    name,
    country: "",
    photo_url: null,
    correct: index + 1 === correctAt,
    option: index + 1,
  }));
}

function metricNeedsPositiveValue(metric: string) {
  return [
    METRIC.matches,
    METRIC.fifties,
    METRIC.hundreds,
    METRIC.sixes,
    METRIC.wickets,
    METRIC.highestScore,
    METRIC.wicketHauls,
    METRIC.runs,
  ].some((value) => value === metric);
}

function distinctCountries(items: { player: Player }[]) {
  return new Set(items.map((item) => item.player.country)).size;
}

function statSpanLimit(metric: string, minValue: number) {
  if (metric === METRIC.debutMin || metric === METRIC.debutMax) return 8;
  if (
    [
      METRIC.battingAvgMax,
      METRIC.battingAvgMin,
      METRIC.battingAvgClosest50,
      METRIC.battingAvgAway,
      METRIC.battingAvgInCountry,
      METRIC.battingAvgVsCountryTest,
      METRIC.battingAvgVsCountryOdi,
      METRIC.battingAvgHomeTest,
      METRIC.odiWcBattingAverage,
      METRIC.odiWcFinalBattingAverage,
      METRIC.odiWcSemiBattingAverage,
      METRIC.t20WcBattingAverage,
      METRIC.t20WcFinalBattingAverage,
      METRIC.t20WcSemiBattingAverage,
    ].some((value) => value === metric)
  ) {
    return 6;
  }
  if (metric === METRIC.bowlingAverage || metric === METRIC.bowlingEconomy) return 4;
  if (
    [
      METRIC.bowlingStrikeRate,
      METRIC.battingSrMax,
      METRIC.battingSrMin,
      METRIC.odiWcStrikeRate,
      METRIC.t20WcStrikeRate,
      METRIC.t20WcFinalStrikeRate,
      METRIC.t20WcSemiStrikeRate,
      METRIC.odiWcBowlingSr,
      METRIC.t20WcBowlingSr,
    ].some((value) => value === metric)
  ) {
    return 10;
  }
  if (metric === METRIC.wicketsClosest300) return 40;
  const base = Math.max(1, Math.abs(minValue));
  return Math.max(4, base * 0.45);
}

function quartetStatOk(items: Candidate[], metric: string, loose: boolean) {
  if (items.length < 2) return true;
  const values = items.map((item) => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const limit = statSpanLimit(metric, minValue) * (loose ? 1.6 : 1);
  return maxValue - minValue <= limit;
}

function quartetEraOk(items: Candidate[], maxSpan: number) {
  const years = items.filter((item) => item.hasDebut).map((item) => item.debut);
  if (years.length < 3) return true;
  return Math.max(...years) - Math.min(...years) <= maxSpan;
}

function quartetEase(items: Candidate[], format: string, country: string, metric: string) {
  const values = items.map((item) => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const median = values.reduce((sum, value) => sum + value, 0) / values.length || 1;
  const statEase = (maxValue - minValue) / Math.abs(median < 1 ? 1 : median);
  const years = items.filter((item) => item.hasDebut).map((item) => item.debut);
  const eraEase = years.length >= 2 ? (Math.max(...years) - Math.min(...years)) / 10 : 0;
  let eraWeight = 1;
  if (metric === METRIC.debutMin || metric === METRIC.debutMax) eraWeight = 1.6;
  if (
    [
      METRIC.battingAvgMax,
      METRIC.battingAvgMin,
      METRIC.battingSrMax,
      METRIC.battingSrMin,
      METRIC.bowlingAverage,
      METRIC.bowlingStrikeRate,
      METRIC.bowlingEconomy,
      METRIC.battingAvgClosest50,
      METRIC.battingAvgAway,
      METRIC.battingAvgInCountry,
      METRIC.battingAvgVsCountryTest,
      METRIC.battingAvgVsCountryOdi,
    ].some((value) => value === metric)
  ) {
    eraWeight = 0.5;
  }
  const countries = distinctCountries(items);
  const countryPenalty = countries < 4 ? (4 - countries) * 0.2 : 0;
  const tiePenalty = correctPlayerIndexes(items.map((item) => item.player), format, country, metric, "").length === 1 ? 0 : 0.15;
  return statEase + eraWeight * eraEase + countryPenalty + tiePenalty;
}

function sampleQuartet(window: Candidate[], distinct: boolean) {
  if (window.length < 4) return null;
  const byCountry = new Map<string, Candidate[]>();
  for (const item of window) {
    const group = byCountry.get(item.player.country) ?? [];
    group.push(item);
    byCountry.set(item.player.country, group);
  }
  const names = shuffle([...byCountry.keys()]);
  const out: Candidate[] = [];
  const used = new Set<string>();
  for (const name of names) {
    if (out.length === 4) break;
    const group = byCountry.get(name) ?? [];
    const pick = group[Math.floor(Math.random() * group.length)];
    if (!pick) continue;
    out.push(pick);
    used.add(pick.player.id);
  }
  if (distinct) return distinctCountries(out) === 4 ? out : null;
  for (const item of shuffle(window)) {
    if (out.length === 4) break;
    if (used.has(item.player.id)) continue;
    out.push(item);
    used.add(item.player.id);
  }
  return out.length === 4 ? out : null;
}

function findHardQuartet(pool: Candidate[], format: string, country: string, metric: string, attempt: { distinctCountries: boolean; maxEraSpan: number; looseStat: boolean }) {
  if (attempt.distinctCountries && distinctCountries(pool) < 4) return null;
  const sorted = [...pool].sort((left, right) => left.value - right.value);
  let bestEase = Number.POSITIVE_INFINITY;
  const chosen: { items: Candidate[] | null } = { items: null };
  const record = (quartet: Candidate[]) => {
    if (!quartetStatOk(quartet, metric, attempt.looseStat) || !quartetEraOk(quartet, attempt.maxEraSpan)) return;
    if (attempt.distinctCountries && distinctCountries(quartet) < 4) return;
    const players = quartet.map((item) => item.player);
    if (!hasUniqueCorrect(players, format, country, metric, "")) return;
    const ease = quartetEase(quartet, format, country, metric);
    if (ease < bestEase) {
      bestEase = ease;
      chosen.items = quartet;
    }
  };
  for (let start = 0; start < sorted.length; start += 1) {
    for (let end = start + 3; end < sorted.length && end <= start + 24; end += 1) {
      const window = sorted.slice(start, end + 1);
      if (!quartetStatOk(window, metric, true)) break;
      for (let attemptIndex = 0; attemptIndex < 24; attemptIndex += 1) {
        const quartet = sampleQuartet(window, attempt.distinctCountries);
        if (!quartet) break;
        record(quartet);
      }
    }
  }
  if (attempt.distinctCountries) {
    const byCountry = new Map<string, Candidate[]>();
    for (const item of pool) {
      const group = byCountry.get(item.player.country) ?? [];
      group.push(item);
      byCountry.set(item.player.country, group);
    }
    const names = [...byCountry.keys()];
    for (let attemptIndex = 0; attemptIndex < 220 && names.length >= 4; attemptIndex += 1) {
      const picked = shuffle(names).slice(0, 4);
      const quartet = picked.flatMap((name) => {
        const group = byCountry.get(name) ?? [];
        const item = group[Math.floor(Math.random() * group.length)];
        return item ? [item] : [];
      });
      if (quartet.length === 4) record(quartet);
    }
  }
  return chosen.items?.map((item) => item.player) ?? null;
}

function pickFourPlayers(players: Player[], format: string, country: string, metric: string) {
  const pool: Candidate[] = [];
  for (const player of players) {
    if (!metricRoleOk(player.role, metric)) continue;
    const value = playerStatValue(player, format, country, metric);
    if (value == null || (metricNeedsPositiveValue(metric) && value <= 0)) continue;
    const debut = playerEraYear(player, format);
    pool.push({ player, value, debut: debut ?? 0, hasDebut: debut != null });
  }
  if (pool.length < 4) return null;
  const attempts = [
    { distinctCountries: true, maxEraSpan: 8, looseStat: false },
    { distinctCountries: true, maxEraSpan: 10, looseStat: false },
    { distinctCountries: true, maxEraSpan: 12, looseStat: true },
    { distinctCountries: true, maxEraSpan: 16, looseStat: true },
    { distinctCountries: true, maxEraSpan: 24, looseStat: true },
  ];
  if (distinctCountries(pool) < 4) {
    attempts.push(
      { distinctCountries: false, maxEraSpan: 12, looseStat: true },
      { distinctCountries: false, maxEraSpan: 24, looseStat: true },
    );
  }
  for (const attempt of attempts) {
    const quartet = findHardQuartet(pool, format, country, metric, attempt);
    if (quartet && hasUniqueCorrect(quartet, format, country, metric, "")) return shuffle(quartet);
  }
  return null;
}

function pickCountryAndPlayers(title: string, players: Player[], format: string, metric: string) {
  const year = debutTargetYear(title);
  if (year != null) {
    return { country: "", players: pickExactDebutYear(players, format, year) };
  }
  if (!questionHasCountryToken(title)) return { country: "", players: pickFourPlayers(players, format, "", metric) };
  const countries = [
    METRIC.battingAvgVsCountryTest,
    METRIC.battingAvgVsCountryOdi,
    METRIC.hundredsVsCountryTest,
    METRIC.hundredsVsCountryOdi,
  ].some((value) => value === metric)
    ? OPPONENT_OPTIONS
    : COUNTRY_OPTIONS;
  for (const country of shuffle(countries)) {
    const picked = pickFourPlayers(players, format, country, metric);
    if (picked) return { country, players: picked };
  }
  return { country: "", players: null };
}

function takeSpread(players: Player[], count: number, blockedCountries: Set<string>) {
  const picked: Player[] = [];
  const countries = new Set(blockedCountries);
  const used = new Set<string>();
  for (const player of players) {
    if (picked.length === count) break;
    if (countries.has(player.country)) continue;
    picked.push(player);
    used.add(player.id);
    countries.add(player.country);
  }
  for (const player of players) {
    if (picked.length === count) break;
    if (used.has(player.id)) continue;
    picked.push(player);
    used.add(player.id);
  }
  return picked.length === count ? picked : null;
}

function pickNearDebutYear(candidates: Player[], format: string, year: number, count: number, blockedCountries = new Set<string>()) {
  const items = candidates.flatMap((player) => {
    const debut = playerDebutYear(player, format);
    return debut == null ? [] : [{ player, dist: Math.abs(debut - year) }];
  }).sort((left, right) => left.dist - right.dist);
  for (const limit of [5, 8, 10, 12, 16, 24]) {
    const near = items.filter((item) => item.dist <= limit).map((item) => item.player);
    const spread = takeSpread(near, count, blockedCountries);
    if (spread) return spread;
  }
  return takeSpread(items.map((item) => item.player), count, blockedCountries);
}

function pickExactDebutYear(players: Player[], format: string, year: number) {
  const matches: Player[] = [];
  const others: Player[] = [];
  for (const player of players) {
    const debut = playerDebutYear(player, format);
    if (debut == null) continue;
    if (debut === year) matches.push(player);
    else others.push(player);
  }
  if (matches.length < 1 || others.length < 3) return null;
  const correct = pickNearDebutYear(matches, format, year, 1);
  const wrong = correct?.[0] ? pickNearDebutYear(others, format, year, 3, new Set([correct[0].country])) : null;
  if (!correct?.[0] || !wrong) return null;
  const options = [correct[0], wrong[0], wrong[1], wrong[2]].filter((player): player is Player => Boolean(player));
  if (new Set(options.map((player) => player.country)).size < 4) return null;
  return shuffle(options);
}

function pickDynamicDebutYear(players: Player[], format: string) {
  const years = shuffle([...new Set(players.flatMap((player) => {
    const year = playerDebutYear(player, format);
    return year == null ? [] : [year];
  }))]);
  for (const year of years) {
    const options = pickExactDebutYear(players, format, year);
    if (options) return { year, players: options };
  }
  return null;
}

function eraSpan(players: Player[], format: string) {
  const years = players.flatMap((player) => {
    const year = playerEraYear(player, format);
    return year == null ? [] : [year];
  });
  if (years.length < 3) return 0;
  return Math.max(...years) - Math.min(...years);
}

function pickClosestAverageBelow(players: Player[], format: string) {
  const key = format || "odi";
  for (const target of [50, 45, 40, 55, 35, 60, 48, 52]) {
    const rows = players.flatMap((player) => {
      if (!metricRoleOk(player.role, METRIC.battingAvgClosest50)) return [];
      const value = playerStatValue(player, key, "", METRIC.battingAvgClosest50);
      if (value == null || value <= 0 || value >= target) return [];
      return [{ player, dist: target - value }];
    }).sort((left, right) => left.dist - right.dist);
    if (rows.length < 4) continue;
    const title = `batting average closest to ${formatQuizNumber(target)}`;
    const tryWindow = (needCountries: boolean, maxEra: number) => {
      for (let start = 0; start + 4 <= rows.length; start += 1) {
        const out = rows.slice(start, start + 4).map((row) => row.player);
        if (needCountries && new Set(out.map((player) => player.country)).size < 4) continue;
        if (eraSpan(out, key) > maxEra) continue;
        if (!hasUniqueCorrect(out, key, "", METRIC.battingAvgClosest50, title)) continue;
        return shuffle(out);
      }
      return null;
    };
    const picked = tryWindow(true, 12) ?? tryWindow(true, 16) ?? tryWindow(true, 24);
    if (picked) return { target, players: picked };
  }
  return null;
}

function pickDebutRelation(players: Player[], subject: Player, format: string, relation: string, year: number) {
  const matches: Player[] = [];
  const others: Player[] = [];
  for (const player of players) {
    if (player.id === subject.id) continue;
    const debut = playerDebutYear(player, format);
    if (debut == null) continue;
    const match = relation === "before" ? debut < year : relation === "after" ? debut > year : debut === year;
    if (match) matches.push(player);
    else others.push(player);
  }
  if (matches.length < 1 || others.length < 3) return null;
  const correct = pickNearDebutYear(matches, format, year, 1);
  const wrong = correct?.[0] ? pickNearDebutYear(others, format, year, 3, new Set([correct[0].country])) : null;
  if (!correct?.[0] || !wrong) return null;
  const options = [correct[0], wrong[0], wrong[1], wrong[2]].filter((player): player is Player => Boolean(player));
  if (new Set(options.map((player) => player.country)).size < 4) return null;
  return shuffle(options);
}

function stableChoice(id: string, extra: string, options: string[]) {
  if (!options.length) return "";
  const sum = [...`${id}${extra}`].reduce((total, char) => total + char.charCodeAt(0), 0);
  return options[sum % options.length] ?? "";
}

function syntheticTextStat(metric: string, format: string, player: Player, players: Player[]) {
  if (metric === METRIC.mostHundredsAgainst) {
    const hundreds = playerStatValue(player, format, "", METRIC.hundreds);
    if (hundreds == null || hundreds < 1) return "";
    const home = player.country.trim().toLowerCase();
    return stableChoice(player.id, format, INTERNATIONAL_TEAMS.filter((team) => team.toLowerCase() !== home));
  }
  if (metric === METRIC.mostDismissedBatter) {
    const names = players.filter((other) => other.id !== player.id && ["batsman", "wicketkeeper", "all-rounder"].includes(other.role)).map((other) => other.name.trim()).filter(Boolean);
    return stableChoice(player.id, "batter", names);
  }
  if (metric === METRIC.mostDismissalsBowler) {
    const names = players.filter((other) => other.id !== player.id && ["bowler", "all-rounder"].includes(other.role)).map((other) => other.name.trim()).filter(Boolean);
    return stableChoice(player.id, "bowler", names);
  }
  if (metric === METRIC.battingPosition) {
    const positions = player.role === "wicketkeeper" ? ["6", "7", "8"] : ["1", "2", "3", "4", "5", "6", "7"];
    return stableChoice(player.id, `${format}pos`, positions);
  }
  return "";
}

function textDistractors(players: Player[], subject: Player, format: string, metric: string, correct: string) {
  const seen = new Set([correct.trim().toLowerCase()]);
  const out: string[] = [];
  const add = (value: string) => {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) return;
    seen.add(key);
    out.push(trimmed);
  };
  for (const player of players) {
    if (player.id === subject.id) continue;
    add(playerStatText(player, format, metric));
    if (metric === METRIC.mostDismissalsBowler && ["bowler", "all-rounder"].includes(player.role)) add(player.name);
    if (metric === METRIC.mostDismissedBatter && ["batsman", "wicketkeeper", "all-rounder"].includes(player.role)) add(player.name);
  }
  if ([METRIC.mostHundredsAgainst, METRIC.debutTeam, METRIC.lastMatchTeam].some((value) => value === metric)) {
    INTERNATIONAL_TEAMS.forEach(add);
  }
  if (metric === METRIC.battingPosition) {
    for (let position = 1; position <= 11; position += 1) add(String(position));
  }
  return shuffle(out).slice(0, 3);
}

function integerStat(metric: string) {
  return [
    METRIC.hundreds,
    METRIC.highestScore,
    METRIC.wickets,
    METRIC.wicketsHomeTest,
    METRIC.wicketsAwayTest,
    METRIC.wicketHauls,
    METRIC.manOfTheMatch,
    METRIC.tournamentsWon,
    METRIC.battingPosition,
    METRIC.matches,
    METRIC.runs,
    METRIC.fifties,
    METRIC.sixes,
    METRIC.debutMin,
    METRIC.debutMax,
    METRIC.lastMatchYear,
  ].some((value) => value === metric);
}

function numericDeltas(metric: string, correct: number) {
  if ([METRIC.hundreds, METRIC.wicketHauls, METRIC.tournamentsWon, METRIC.battingPosition].some((value) => value === metric)) {
    return [1, 2, 3, 4, 5, -1, -2, -3];
  }
  if ([METRIC.debutMin, METRIC.debutMax, METRIC.lastMatchYear].some((value) => value === metric)) {
    return [1, 2, 3, 4, 5, 6, -1, -2, -3, -4];
  }
  if (metric === METRIC.highestScore) return [8, 12, 16, 21, 27, -8, -12, -17, -23];
  if ([METRIC.wickets, METRIC.wicketsHomeTest, METRIC.wicketsAwayTest].some((value) => value === metric)) {
    if (correct >= 200) return [15, 28, 42, 55, 70, -15, -28, -40, -58];
    if (correct >= 50) return [5, 9, 14, 21, -5, -9, -14, -20];
    return [2, 3, 5, 7, -2, -3, -4];
  }
  if (metric === METRIC.manOfTheMatch) return [2, 3, 5, 7, -2, -3, -4];
  if ([METRIC.battingAvgMax, METRIC.battingAvgMin, METRIC.bowlingAverage].some((value) => value === metric)) {
    return [2.4, 3.9, 5.6, 7.8, -2.2, -3.7, -5.4, -7.1];
  }
  if ([METRIC.battingSrMax, METRIC.battingSrMin, METRIC.bowlingStrikeRate].some((value) => value === metric)) {
    return [4.5, 8.2, 12.1, 16.4, -4.2, -7.8, -11.5, -15.2];
  }
  return [1, 2, 3, 5, 8, -1, -2, -3, -5];
}

function yearMetric(metric: string) {
  return metric === METRIC.debutMin || metric === METRIC.debutMax || metric === METRIC.lastMatchYear;
}

function numericDistractors(metric: string, correct: number, correctLabel: string) {
  const seen = new Set([correctLabel]);
  const out: string[] = [];
  const latestYear = new Date().getUTCFullYear();
  const add = (value: number) => {
    if (value <= 0) return;
    const rounded = integerStat(metric) ? Math.round(value) : Math.round(value * 100) / 100;
    if (rounded <= 0) return;
    if (yearMetric(metric) && rounded > latestYear) return;
    const label = formatPlayerStatAnswer(metric, rounded);
    if (seen.has(label)) return;
    seen.add(label);
    out.push(label);
  };
  for (const delta of shuffle(numericDeltas(metric, correct))) {
    if (out.length >= 3) break;
    add(correct + delta);
  }
  const step = integerStat(metric) ? 1 : 1.25;
  for (let stepIndex = 1; out.length < 3 && stepIndex < 40; stepIndex += 1) {
    add(correct + stepIndex * step);
    if (out.length >= 3) break;
    add(correct - stepIndex * step);
  }
  return out;
}

function metricAllowsZero(metric: string) {
  return [
    METRIC.hundreds,
    METRIC.fifties,
    METRIC.sixes,
    METRIC.wickets,
    METRIC.wicketHauls,
    METRIC.manOfTheMatch,
    METRIC.tournamentsWon,
    METRIC.matches,
    METRIC.runs,
    METRIC.wicketsHomeTest,
    METRIC.wicketsAwayTest,
  ].some((value) => value === metric);
}

function usableStat(metric: string, value: number | null) {
  if (value == null) return false;
  return value > 0 || (value === 0 && metricAllowsZero(metric));
}

function namedStatItem(title: string, format: string, metric: string, player: Player, players: Player[]): BuiltQuizQuestion | null {
  if (!metricRoleOk(player.role, metric)) return null;
  const country = questionHasCountryToken(title) ? player.country.trim() : "";
  if (questionHasCountryToken(title) && !country) return null;
  let labels: string[] = [];
  let correctAt = 0;
  if (metricIsTextStat(metric)) {
    const answer = playerStatText(player, format, metric) || syntheticTextStat(metric, format, player, players);
    const distractors = answer ? textDistractors(players, player, format, metric, answer) : [];
    if (!answer || distractors.length < 3) return null;
    labels = shuffle([answer, distractors[0], distractors[1], distractors[2]]);
    correctAt = labels.indexOf(answer) + 1;
  } else {
    let value = playerStatValue(player, format, country, metric);
    if (!usableStat(metric, value) || value == null) return null;
    if (yearMetric(metric) && value > new Date().getUTCFullYear()) return null;
    const answer = formatPlayerStatAnswer(metric, value);
    const distractors = numericDistractors(metric, value, answer);
    if (distractors.length < 3) return null;
    labels = shuffle([answer, distractors[0], distractors[1], distractors[2]]);
    correctAt = labels.indexOf(answer) + 1;
  }
  if (correctAt < 1) return null;
  return {
    title: fillPlayerQuestionTitle(title, { format, country, playerName: player.name }),
    format,
    metric,
    country,
    options: textChoices(labels, correctAt),
  };
}

export function buildStatQuestion(title: string, storedMetric: string, players: Player[], usedSubjects: Set<string>, lockedFormat?: string): BuiltQuizQuestion | null {
  const metric = resolvePlayerMetric(title, storedMetric);
  if (!metric) return null;
  const available = slotFormats(title, metric);
  const formats = lockedFormat == null ? shuffle(available) : available.includes(lockedFormat) ? [lockedFormat] : [];
  if (!formats.length) return null;
  const relation = subjectDebutRelation(title);
  if (relation) {
    for (const format of formats) {
      for (const preferUnused of [true, false]) {
        for (const subject of shuffle(players)) {
          if (preferUnused && usedSubjects.has(subject.id)) continue;
          const year = playerDebutYear(subject, format);
          if (year == null) continue;
          const options = pickDebutRelation(players, subject, format, relation, year);
          const scoringMetric = relation === "after" ? METRIC.debutMax : METRIC.debutMin;
          const filled = fillPlayerQuestionTitle(title, { format, playerName: subject.name, year });
          if (!options || !hasUniqueCorrect(options, format, "", scoringMetric, filled)) continue;
          usedSubjects.add(subject.id);
          return { title: filled, format, metric: scoringMetric, country: "", options: playerChoices(options, format, "", scoringMetric, filled) };
        }
      }
    }
    return null;
  }
  if (questionHasPlayerNameToken(title)) {
    for (const format of formats) {
      for (const preferUnused of [true, false]) {
        for (const player of shuffle(players)) {
          if (preferUnused && usedSubjects.has(player.id)) continue;
          const item = namedStatItem(title, format, metric, player, players);
          if (!item) continue;
          usedSubjects.add(player.id);
          return item;
        }
      }
    }
    return null;
  }
  for (const format of formats) {
    if (questionHasNumberToken(title) || metric === METRIC.battingAvgClosest50) {
      const closest = pickClosestAverageBelow(players, format);
      if (!closest) continue;
      const filled = fillPlayerQuestionTitle(title, { format, number: formatQuizNumber(closest.target) });
      return { title: filled, format, metric, country: "", options: playerChoices(closest.players, format, "", metric, filled) };
    }
    if (questionHasYearToken(title)) {
      const debut = pickDynamicDebutYear(players, format);
      if (!debut) continue;
      const filled = fillPlayerQuestionTitle(title, { format, year: debut.year });
      return { title: filled, format, metric, country: "", options: playerChoices(debut.players, format, "", metric, filled) };
    }
    const picked = pickCountryAndPlayers(title, players, format, metric);
    if (!picked.players) continue;
    const filled = fillPlayerQuestionTitle(title, { format, country: picked.country });
    return { title: filled, format, metric, country: picked.country, options: playerChoices(picked.players, format, picked.country, metric, filled) };
  }
  return null;
}
