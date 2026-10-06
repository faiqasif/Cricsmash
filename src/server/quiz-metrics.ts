import type { FormatStats, Player } from "@/lib/players";

export const METRIC = {
  matches: "matches",
  runs: "runs",
  battingAvgMax: "batting_average_max",
  battingAvgMin: "batting_average_min",
  battingSrMax: "batting_strike_rate_max",
  battingSrMin: "batting_strike_rate_min",
  hundreds: "hundreds",
  fifties: "fifties",
  highestScore: "highest_score",
  sixes: "sixes",
  battingAvgClosest50: "batting_average_closest_50",
  battingAvgAway: "batting_average_away",
  battingAvgInCountry: "batting_average_in_country",
  battingAvgVsCountryTest: "batting_average_vs_country_test",
  battingAvgVsCountryOdi: "batting_average_vs_country_odi",
  wickets: "wickets",
  bowlingAverage: "bowling_average",
  bowlingStrikeRate: "bowling_strike_rate",
  bowlingEconomy: "bowling_economy",
  wicketHauls: "wicket_hauls",
  wicketsClosest300: "wickets_closest_300",
  manOfTheMatch: "man_of_the_match",
  tournamentsWon: "tournaments_won",
  catches: "catches",
  debutMin: "debut_year_min",
  debutMax: "debut_year_max",
  hundredsVsCountryTest: "hundreds_vs_country_test",
  hundredsInCountryTest: "hundreds_in_country_test",
  hundredsVsCountryOdi: "hundreds_vs_country_odi",
  ballsPlayedTest: "balls_played_test",
  battingAvgHomeTest: "batting_avg_home_test",
  wicketsHomeTest: "wickets_home_test",
  wicketsAwayTest: "wickets_away_test",
  wicketsVsCountry: "wickets_vs_country",
  wicketsInCountry: "wickets_in_country",
  odiWcBattingAverage: "odi_wc_batting_average",
  odiWcStrikeRate: "odi_wc_strike_rate",
  odiWcHundreds: "odi_wc_hundreds",
  odiWcFifties: "odi_wc_fifties",
  odiWcHighestScore: "odi_wc_highest_score",
  odiWcPlayerOfMatch: "odi_wc_player_of_match",
  odiWcWickets: "odi_wc_wickets",
  odiWcBowlingSr: "odi_wc_bowling_strike_rate",
  t20WcBattingAverage: "t20_wc_batting_average",
  t20WcStrikeRate: "t20_wc_strike_rate",
  t20WcHundreds: "t20_wc_hundreds",
  t20WcFifties: "t20_wc_fifties",
  t20WcHighestScore: "t20_wc_highest_score",
  t20WcPlayerOfMatch: "t20_wc_player_of_match",
  t20WcWickets: "t20_wc_wickets",
  t20WcBowlingSr: "t20_wc_bowling_strike_rate",
  mostHundredsAgainst: "most_hundreds_against",
  battingPosition: "batting_position",
  mostDismissalsBowler: "most_dismissals_against_bowler",
  mostDismissedBatter: "most_dismissed_batter",
  debutTeam: "debut_team",
  lastMatchTeam: "last_match_team",
  lastMatchYear: "last_match_year",
} as const;

const KNOWN = new Set<string>(Object.values(METRIC));
const FORMATS = ["odi", "t20", "test"] as const;

export function questionHasFormatToken(title: string) {
  return title.includes("{format}");
}

export function questionHasCountryToken(title: string) {
  return title.includes("{country}") || title.includes("{country_name}");
}

export function questionHasPlayerNameToken(title: string) {
  return title.includes("{player_name}");
}

export function questionHasYearToken(title: string) {
  return title.includes("{year}");
}

export function questionHasNumberToken(title: string) {
  return title.includes("{number}");
}

export function subjectDebutRelation(title: string) {
  if (!questionHasPlayerNameToken(title)) return "";
  const text = title.toLowerCase();
  const comparison = text.includes("which of these") || text.includes("who among these") || text.includes("also made");
  if (!comparison) return "";
  if (text.includes("before")) return "before";
  if (text.includes("after")) return "after";
  return "same_year";
}

export function inferPlayerMetric(title: string) {
  if (questionHasPlayerNameToken(title)) return inferNamedPlayerStatMetric(title);
  const text = title.toLowerCase();
  const worldCup = inferWorldCupMetric(text);
  if (worldCup) return worldCup;
  const country = inferCountryStatMetric(title, text);
  if (country) return country;
  if (text.includes("debut")) {
    if (text.includes("last") || text.includes("latest") || text.includes("most recently")) return METRIC.debutMax;
    return METRIC.debutMin;
  }
  if (text.includes("closest to 300")) return METRIC.wicketsClosest300;
  if (text.includes("closest to")) return METRIC.battingAvgClosest50;
  if (text.includes("five-wicket") || text.includes("five wicket")) return METRIC.wicketHauls;
  if (text.includes("balls") && (text.includes("test") || text.includes("faced"))) return METRIC.ballsPlayedTest;
  if (text.includes("batting average") && text.includes("at home")) return METRIC.battingAvgHomeTest;
  if (text.includes("wicket") && text.includes("test") && text.includes("at home")) return METRIC.wicketsHomeTest;
  if (text.includes("wicket") && text.includes("test") && text.includes("away")) return METRIC.wicketsAwayTest;
  if (text.includes("bowling strike rate")) return METRIC.bowlingStrikeRate;
  if (text.includes("economy")) return METRIC.bowlingEconomy;
  if (text.includes("bowling average")) return METRIC.bowlingAverage;
  if (text.includes("home country") || text.includes("outside their home") || (text.includes("batting average") && text.includes("away"))) {
    return METRIC.battingAvgAway;
  }
  if (text.includes("lowest batting average")) return METRIC.battingAvgMin;
  if (text.includes("highest batting average") || text.includes("best test batting average")) return METRIC.battingAvgMax;
  if (text.includes("highest batting strike rate") || text.includes("best strike rate")) return METRIC.battingSrMax;
  if (text.includes("lowest strike rate") || text.includes("lowest batting strike rate")) return METRIC.battingSrMin;
  if (text.includes("most hundreds") || text.includes("most centuries") || text.includes("highest number of centuries")) return METRIC.hundreds;
  if (text.includes("most fifties") || text.includes("most half-centuries") || text.includes("most half centuries")) return METRIC.fifties;
  if (text.includes("highest individual") || text.includes("highest score")) return METRIC.highestScore;
  if (text.includes("most sixes")) return METRIC.sixes;
  if (text.includes("most matches") || text.includes("most appearances")) return METRIC.matches;
  if (text.includes("most runs") || text.includes("highest run tally")) return METRIC.runs;
  if (text.includes("man of the match") || text.includes("player of the match")) return METRIC.manOfTheMatch;
  if (text.includes("tournament title")) return METRIC.tournamentsWon;
  if (text.includes("catches")) return METRIC.catches;
  if (text.includes("most wickets") || text.includes("highest wicket tally") || text.includes("claimed the most wickets")) return METRIC.wickets;
  return "";
}

function inferNamedPlayerStatMetric(title: string) {
  const text = title.toLowerCase();
  const relation = subjectDebutRelation(title);
  if (relation === "after") return METRIC.debutMax;
  if (relation) return METRIC.debutMin;
  if (text.includes("debut") && text.includes("team")) return METRIC.debutTeam;
  if (text.includes("team") && (text.includes("last") || text.includes("final"))) return METRIC.lastMatchTeam;
  if (text.includes("year") && (text.includes("last") || text.includes("final"))) return METRIC.lastMatchYear;
  if (text.includes("year") && text.includes("debut")) return METRIC.debutMin;
  if (text.includes("against which team") || (text.includes("against") && (text.includes("centur") || text.includes("hundred")))) {
    return METRIC.mostHundredsAgainst;
  }
  if (text.includes("batting position")) return METRIC.battingPosition;
  if (text.includes("which bowler") && text.includes("dismiss")) return METRIC.mostDismissalsBowler;
  if (text.includes("which batter") && text.includes("dismiss")) return METRIC.mostDismissedBatter;
  if (text.includes("outside") && text.includes("wicket")) return METRIC.wicketsAwayTest;
  if (text.includes("wicket") && questionHasCountryToken(title)) return METRIC.wicketsHomeTest;
  if (text.includes("five-wicket") || text.includes("five wicket")) return METRIC.wicketHauls;
  if (text.includes("bowling strike")) return METRIC.bowlingStrikeRate;
  if (text.includes("bowling average")) return METRIC.bowlingAverage;
  if (text.includes("batting strike") || (text.includes("strike rate") && !text.includes("bowling"))) return METRIC.battingSrMax;
  if (text.includes("batting average")) return METRIC.battingAvgMax;
  if (text.includes("highest") && text.includes("score")) return METRIC.highestScore;
  if (text.includes("player of the match") || text.includes("man of the match")) return METRIC.manOfTheMatch;
  if (text.includes("tournament")) return METRIC.tournamentsWon;
  if (text.includes("centur") || text.includes("hundred")) return METRIC.hundreds;
  if (text.includes("wicket")) return METRIC.wickets;
  return "";
}

function inferWorldCupMetric(text: string) {
  const odi = text.includes("odi world cup");
  const t20 = text.includes("t20 world cup");
  if (!odi && !t20) return "";
  if (text.includes("bowling strike")) return odi ? METRIC.odiWcBowlingSr : METRIC.t20WcBowlingSr;
  if (text.includes("wicket")) return odi ? METRIC.odiWcWickets : METRIC.t20WcWickets;
  if (text.includes("player of the match") || text.includes("man of the match")) return odi ? METRIC.odiWcPlayerOfMatch : METRIC.t20WcPlayerOfMatch;
  if (text.includes("strike rate")) return odi ? METRIC.odiWcStrikeRate : METRIC.t20WcStrikeRate;
  if (text.includes("hundred") || text.includes("centur") || text.includes("100")) return odi ? METRIC.odiWcHundreds : METRIC.t20WcHundreds;
  if (text.includes("fift") || text.includes("50")) return odi ? METRIC.odiWcFifties : METRIC.t20WcFifties;
  if (text.includes("highest score") || text.includes("highest individual")) return odi ? METRIC.odiWcHighestScore : METRIC.t20WcHighestScore;
  if (text.includes("average")) return odi ? METRIC.odiWcBattingAverage : METRIC.t20WcBattingAverage;
  return "";
}

function inferCountryStatMetric(title: string, text: string) {
  if (!questionHasCountryToken(title)) return "";
  const hundreds = text.includes("hundred") || text.includes("centur");
  const wickets = text.includes("wicket");
  const versus = text.includes(" vs ") || text.includes("versus") || text.includes("against");
  const odi = text.includes("odi") || text.includes("one-day");
  if (hundreds && odi) return METRIC.hundredsVsCountryOdi;
  if (hundreds && versus) return METRIC.hundredsVsCountryTest;
  if (hundreds) return METRIC.hundredsInCountryTest;
  if (wickets && versus) return METRIC.wicketsVsCountry;
  if (wickets) return METRIC.wicketsInCountry;
  if (text.includes("average") && versus && odi) return METRIC.battingAvgVsCountryOdi;
  if (text.includes("average") && versus) return METRIC.battingAvgVsCountryTest;
  return METRIC.battingAvgInCountry;
}

export function resolvePlayerMetric(title: string, stored = "") {
  const saved = stored.trim();
  const inferred = inferPlayerMetric(title);
  if (!saved) return inferred;
  if (KNOWN.has(saved)) return saved;
  return inferred || saved;
}

export function formatNamedInTitle(title: string) {
  const text = title.toLowerCase();
  if (text.includes("t20 international")) return "t20";
  if (text.includes("odis") || text.includes("odi cricket")) return "odi";
  if (text.includes("test")) return "test";
  return "";
}

export function slotFormats(title: string, metric: string) {
  if (
    [
      METRIC.battingAvgAway,
      METRIC.battingAvgInCountry,
      METRIC.battingAvgVsCountryTest,
      METRIC.wicketsClosest300,
      METRIC.hundredsVsCountryTest,
      METRIC.hundredsInCountryTest,
      METRIC.ballsPlayedTest,
      METRIC.battingAvgHomeTest,
      METRIC.wicketsHomeTest,
      METRIC.wicketsAwayTest,
    ].some((value) => value === metric)
  ) {
    return ["test"];
  }
  if (metric === METRIC.battingAvgVsCountryOdi || metric === METRIC.hundredsVsCountryOdi) return ["odi"];
  if (questionHasFormatToken(title)) return ["odi", "t20", "test"];
  const named = formatNamedInTitle(title);
  if (named) return [named];
  return [""];
}

function metricIsBowling(metric: string) {
  return [
    METRIC.wickets,
    METRIC.bowlingAverage,
    METRIC.bowlingStrikeRate,
    METRIC.bowlingEconomy,
    METRIC.wicketHauls,
    METRIC.wicketsClosest300,
    METRIC.wicketsHomeTest,
    METRIC.wicketsAwayTest,
    METRIC.wicketsVsCountry,
    METRIC.wicketsInCountry,
    METRIC.odiWcWickets,
    METRIC.odiWcBowlingSr,
    METRIC.t20WcWickets,
    METRIC.t20WcBowlingSr,
    METRIC.mostDismissedBatter,
  ].some((value) => value === metric);
}

export function metricIsTextStat(metric: string) {
  return [
    METRIC.mostHundredsAgainst,
    METRIC.battingPosition,
    METRIC.mostDismissalsBowler,
    METRIC.mostDismissedBatter,
    METRIC.debutTeam,
    METRIC.lastMatchTeam,
  ].some((value) => value === metric);
}

export function metricRoleOk(role: string, metric: string) {
  const value = role.trim().toLowerCase();
  if (
    [
      METRIC.matches,
      METRIC.manOfTheMatch,
      METRIC.tournamentsWon,
      METRIC.debutMin,
      METRIC.debutMax,
      METRIC.debutTeam,
      METRIC.lastMatchTeam,
      METRIC.lastMatchYear,
      METRIC.odiWcPlayerOfMatch,
      METRIC.t20WcPlayerOfMatch,
    ].some((value) => value === metric)
  ) {
    return true;
  }
  if (metric === METRIC.catches) return value === "wicketkeeper";
  if (metricIsBowling(metric)) return value === "bowler" || value === "all-rounder";
  return value === "batsman" || value === "wicketkeeper" || value === "all-rounder";
}

function formatStats(player: Player, format: string): FormatStats | null {
  if (format === "odi") return player.odi;
  if (format === "t20") return player.t20;
  if (format === "test") return player.test;
  return null;
}

function asFloat(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatPlayed(stats: FormatStats | null) {
  if (!stats) return false;
  if (typeof stats.matches === "number") return stats.matches > 0;
  return stats.runs != null || stats.wickets != null || stats.batting_average != null || stats.highest_score != null;
}

function countOrZero(played: boolean, value: number | null | undefined) {
  if (typeof value === "number") return value;
  return played ? 0 : null;
}

export function playerDebutYear(player: Player, format: string) {
  if (format) return asFloat(formatStats(player, format)?.debut_year);
  let earliest: number | null = null;
  for (const key of FORMATS) {
    const year = formatStats(player, key)?.debut_year;
    if (typeof year === "number" && (earliest == null || year < earliest)) earliest = year;
  }
  return earliest;
}

function playerLastMatchYear(player: Player, format: string) {
  return asFloat(formatStats(player, format)?.last_match_year);
}

export function playerEraYear(player: Player, format: string) {
  const debut = playerDebutYear(player, format);
  if (debut != null) return debut;
  const dob = player.date_of_birth?.slice(0, 4);
  const year = dob ? Number(dob) : Number.NaN;
  return Number.isInteger(year) ? year : null;
}

function countryNumber(
  country: string,
  india: number | null | undefined,
  australia: number | null | undefined,
  england: number | null | undefined,
  southAfrica: number | null | undefined,
  pakistan?: number | null,
) {
  switch (country.trim().toLowerCase()) {
    case "india":
      return asFloat(india);
    case "australia":
      return asFloat(australia);
    case "england":
      return asFloat(england);
    case "south africa":
      return asFloat(southAfrica);
    case "pakistan":
      return asFloat(pakistan);
    default:
      return null;
  }
}

function derivedBowlingEconomy(stats: FormatStats | null) {
  if (!stats || stats.bowling_average == null || stats.bowling_strike_rate == null || stats.bowling_strike_rate <= 0) return null;
  const economy = (stats.bowling_average * 6) / stats.bowling_strike_rate;
  if (!Number.isFinite(economy) || economy <= 0) return null;
  return Math.round(economy * 100) / 100;
}

function careerCatches(player: Player) {
  if (player.catches != null) return player.catches;
  let sum = 0;
  let found = false;
  let played = false;
  for (const format of FORMATS) {
    const stats = formatStats(player, format);
    if (!stats) continue;
    if (formatPlayed(stats)) played = true;
    if (stats.catches == null) continue;
    sum += stats.catches;
    found = true;
  }
  if (found) return sum;
  return played ? 0 : null;
}

export function playerStatValue(player: Player, format: string, country: string, metric: string): number | null {
  switch (metric) {
    case METRIC.debutMin:
    case METRIC.debutMax:
      return playerDebutYear(player, format);
    case METRIC.lastMatchYear:
      return playerLastMatchYear(player, format);
    case METRIC.battingAvgAway:
      return asFloat(player.batting_avg_away_test);
    case METRIC.battingAvgHomeTest:
      return asFloat(player.batting_avg_home_test);
    case METRIC.battingAvgInCountry:
      return countryNumber(
        country,
        player.batting_avg_in_india_test,
        player.batting_avg_in_australia_test,
        player.batting_avg_in_england_test,
        player.batting_avg_in_south_africa_test,
      );
    case METRIC.battingAvgVsCountryTest:
      return countryNumber(
        country,
        player.batting_avg_vs_india_test,
        player.batting_avg_vs_australia_test,
        player.batting_avg_vs_england_test,
        player.batting_avg_vs_south_africa_test,
        player.batting_avg_vs_pakistan_test,
      );
    case METRIC.battingAvgVsCountryOdi:
      return countryNumber(
        country,
        player.batting_avg_vs_india_odi,
        player.batting_avg_vs_australia_odi,
        player.batting_avg_vs_england_odi,
        player.batting_avg_vs_south_africa_odi,
        player.batting_avg_vs_pakistan_odi,
      );
    case METRIC.hundredsVsCountryTest:
      return countryNumber(
        country,
        player.hundreds_vs_india_test,
        player.hundreds_vs_australia_test,
        player.hundreds_vs_england_test,
        player.hundreds_vs_south_africa_test,
        player.hundreds_vs_pakistan_test,
      );
    case METRIC.hundredsInCountryTest:
      return countryNumber(country, player.hundreds_in_india_test, player.hundreds_in_australia_test, player.hundreds_in_england_test, player.hundreds_in_south_africa_test);
    case METRIC.hundredsVsCountryOdi:
      return countryNumber(
        country,
        player.hundreds_vs_india_odi,
        player.hundreds_vs_australia_odi,
        player.hundreds_vs_england_odi,
        player.hundreds_vs_south_africa_odi,
        player.hundreds_vs_pakistan_odi,
      );
    case METRIC.ballsPlayedTest:
      return asFloat(player.balls_played_test);
    case METRIC.wicketsHomeTest:
      return asFloat(player.wickets_home_test);
    case METRIC.wicketsAwayTest:
      return asFloat(player.wickets_away_test);
    case METRIC.wicketsVsCountry:
      return countryNumber(country, player.wickets_vs_india, player.wickets_vs_australia, player.wickets_vs_england, player.wickets_vs_south_africa);
    case METRIC.wicketsInCountry:
      return countryNumber(country, player.wickets_in_india, player.wickets_in_australia, player.wickets_in_england, player.wickets_in_south_africa);
    case METRIC.odiWcBattingAverage:
      return asFloat(player.odi_wc_batting_average);
    case METRIC.odiWcStrikeRate:
      return asFloat(player.odi_wc_strike_rate);
    case METRIC.odiWcHundreds:
      return asFloat(player.odi_wc_hundreds);
    case METRIC.odiWcFifties:
      return asFloat(player.odi_wc_fifties);
    case METRIC.odiWcHighestScore:
      return asFloat(player.odi_wc_highest_score);
    case METRIC.odiWcPlayerOfMatch:
      return asFloat(player.odi_wc_player_of_match);
    case METRIC.odiWcWickets:
      return asFloat(player.odi_wc_wickets);
    case METRIC.odiWcBowlingSr:
      return asFloat(player.odi_wc_bowling_strike_rate);
    case METRIC.t20WcBattingAverage:
      return asFloat(player.t20_wc_batting_average);
    case METRIC.t20WcStrikeRate:
      return asFloat(player.t20_wc_strike_rate);
    case METRIC.t20WcHundreds:
      return asFloat(player.t20_wc_hundreds);
    case METRIC.t20WcFifties:
      return asFloat(player.t20_wc_fifties);
    case METRIC.t20WcHighestScore:
      return asFloat(player.t20_wc_highest_score);
    case METRIC.t20WcPlayerOfMatch:
      return asFloat(player.t20_wc_player_of_match);
    case METRIC.t20WcWickets:
      return asFloat(player.t20_wc_wickets);
    case METRIC.t20WcBowlingSr:
      return asFloat(player.t20_wc_bowling_strike_rate);
    case METRIC.tournamentsWon:
      return countOrZero(true, player.tournaments_won);
    case METRIC.catches:
      return careerCatches(player);
    case METRIC.wicketsClosest300: {
      const stats = formatStats(player, "test");
      return countOrZero(formatPlayed(stats), stats?.wickets);
    }
    case METRIC.battingPosition: {
      const stats = formatStats(player, format || "odi");
      const position = stats?.batting_position;
      if (position == null || position < 1 || position > 11) return null;
      return position;
    }
    default:
      break;
  }

  const stats = formatStats(player, format || "odi");
  if (!stats) return null;
  const played = formatPlayed(stats);
  if (
    (metric === METRIC.bowlingAverage || metric === METRIC.bowlingStrikeRate || metric === METRIC.bowlingEconomy) &&
    (stats.wickets == null || stats.wickets < 1)
  ) {
    return null;
  }
  switch (metric) {
    case METRIC.matches:
      return asFloat(stats.matches);
    case METRIC.runs:
      return countOrZero(played, stats.runs);
    case METRIC.battingAvgMax:
    case METRIC.battingAvgMin:
    case METRIC.battingAvgClosest50:
      return asFloat(stats.batting_average);
    case METRIC.battingSrMax:
    case METRIC.battingSrMin:
      return asFloat(stats.batting_strike_rate);
    case METRIC.hundreds:
      return countOrZero(played, stats.hundreds);
    case METRIC.fifties:
      return countOrZero(played, stats.fifties);
    case METRIC.highestScore:
      return countOrZero(played, stats.highest_score);
    case METRIC.sixes:
      return countOrZero(played, stats.sixes);
    case METRIC.wickets:
      return countOrZero(played, stats.wickets);
    case METRIC.bowlingAverage:
      return asFloat(stats.bowling_average);
    case METRIC.bowlingStrikeRate:
      return asFloat(stats.bowling_strike_rate);
    case METRIC.bowlingEconomy:
      return asFloat(stats.bowling_economy) ?? derivedBowlingEconomy(stats);
    case METRIC.wicketHauls:
      return countOrZero(played, stats.wicket_hauls);
    case METRIC.manOfTheMatch:
      return countOrZero(played, stats.man_of_the_match);
    default:
      return null;
  }
}

export function playerStatText(player: Player, format: string, metric: string) {
  if (metric === METRIC.mostHundredsAgainst) {
    for (const key of [format, "odi", "t20", "test"]) {
      if (!key) continue;
      const value = formatStats(player, key)?.most_hundreds_against?.trim();
      if (value) return value;
    }
    return "";
  }
  if (metric === METRIC.debutTeam || metric === METRIC.lastMatchTeam) {
    const stats = formatStats(player, format || "odi");
    const value = (metric === METRIC.debutTeam ? stats?.debut_team : stats?.last_match_team)?.trim();
    return value || "";
  }
  if (metric === METRIC.battingPosition) {
    const value = playerStatValue(player, format, "", metric);
    return value == null ? "" : String(Math.round(value));
  }
  if (metric === METRIC.mostDismissalsBowler) return player.most_dismissals_against_bowler.trim();
  if (metric === METRIC.mostDismissedBatter) return player.most_dismissed_batter?.trim() || "";
  return "";
}

export function formatPlayerStatAnswer(metric: string, value: number) {
  const averages = [METRIC.battingAvgMax, METRIC.battingAvgMin, METRIC.battingSrMax, METRIC.battingSrMin, METRIC.bowlingAverage, METRIC.bowlingStrikeRate, METRIC.bowlingEconomy];
  if (averages.some((value) => value === metric) && value !== Math.trunc(value)) return value.toFixed(2);
  return String(Math.round(value));
}

function betterStat(metric: string, candidate: number, current: number) {
  if (
    [METRIC.battingAvgMin, METRIC.bowlingAverage, METRIC.bowlingStrikeRate, METRIC.bowlingEconomy, METRIC.debutMin, METRIC.odiWcBowlingSr, METRIC.t20WcBowlingSr].some(
      (value) => value === metric,
    )
  ) {
    return candidate < current;
  }
  if (metric === METRIC.battingAvgClosest50) return closerStat(candidate, current, 50);
  if (metric === METRIC.wicketsClosest300) return closerStat(candidate, current, 300);
  return candidate > current;
}

function statsTie(metric: string, left: number, right: number) {
  if (metric === METRIC.battingAvgClosest50) return Math.abs(left - 50) === Math.abs(right - 50);
  if (metric === METRIC.wicketsClosest300) return Math.abs(left - 300) === Math.abs(right - 300);
  return left === right;
}

function closerStat(candidate: number, current: number, target: number) {
  const candidateDistance = Math.abs(candidate - target);
  const currentDistance = Math.abs(current - target);
  if (candidateDistance === currentDistance) return candidate > current;
  return candidateDistance < currentDistance;
}

export function bestPlayerIndexes(players: Player[], format: string, country: string, metric: string) {
  const best: number[] = [];
  let bestValue: number | null = null;
  players.forEach((player, index) => {
    const value = playerStatValue(player, format, country, metric);
    if (value == null) return;
    if (bestValue == null || betterStat(metric, value, bestValue)) {
      bestValue = value;
      best.length = 0;
      best.push(index);
      return;
    }
    if (statsTie(metric, value, bestValue)) best.push(index);
  });
  return best;
}

const debutYearInTitle = /\b(?:19|20)\d{2}\b/;

export function debutTargetYear(title: string) {
  const text = title.toLowerCase();
  if (!text.includes("debut")) return null;
  if (["first", "earliest", "oldest", "last", "latest", "before", "after"].some((word) => text.includes(word))) return null;
  const raw = title.match(debutYearInTitle)?.[0];
  const year = raw ? Number(raw) : Number.NaN;
  return Number.isInteger(year) ? year : null;
}

export function closestTargetNumber(title: string) {
  const text = title.toLowerCase();
  if (!text.includes("closest to") || text.includes("wicket")) return null;
  const raw = title.match(/closest to\s+(\d+(?:\.\d+)?)/i)?.[1];
  const value = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(value) && value > 0 ? value : null;
}

function closestBelowIndexes(players: Player[], format: string, country: string, metric: string, target: number) {
  const best: number[] = [];
  let bestDistance: number | null = null;
  players.forEach((player, index) => {
    const value = playerStatValue(player, format, country, metric);
    if (value == null || value >= target) return;
    const distance = target - value;
    if (bestDistance == null || distance < bestDistance) {
      bestDistance = distance;
      best.length = 0;
      best.push(index);
      return;
    }
    if (distance === bestDistance) best.push(index);
  });
  return best;
}

export function correctPlayerIndexes(players: Player[], format: string, country: string, metric: string, title: string) {
  const year = debutTargetYear(title);
  if (year != null) {
    return players.flatMap((player, index) => (playerDebutYear(player, format) === year ? [index] : []));
  }
  const target = closestTargetNumber(title);
  if (target != null) return closestBelowIndexes(players, format, country, metric, target);
  return bestPlayerIndexes(players, format, country, metric);
}

export function formatOptionStat(metric: string, value: number | null) {
  if (value == null) return "";
  const rounded = Math.round(value);
  switch (metric) {
    case METRIC.wickets:
    case METRIC.wicketsHomeTest:
    case METRIC.wicketsAwayTest:
    case METRIC.wicketsVsCountry:
    case METRIC.wicketsInCountry:
    case METRIC.odiWcWickets:
    case METRIC.t20WcWickets:
      return `${rounded} wickets`;
    case METRIC.runs:
      return `${rounded} runs`;
    case METRIC.matches:
      return `${rounded} matches`;
    case METRIC.hundreds:
    case METRIC.hundredsVsCountryTest:
    case METRIC.hundredsInCountryTest:
    case METRIC.hundredsVsCountryOdi:
    case METRIC.odiWcHundreds:
    case METRIC.t20WcHundreds:
      return `${rounded} centuries`;
    case METRIC.fifties:
    case METRIC.odiWcFifties:
    case METRIC.t20WcFifties:
      return `${rounded} fifties`;
    case METRIC.sixes:
      return `${rounded} sixes`;
    case METRIC.manOfTheMatch:
    case METRIC.odiWcPlayerOfMatch:
    case METRIC.t20WcPlayerOfMatch:
      return `${rounded} awards`;
    case METRIC.tournamentsWon:
      return `${rounded} titles`;
    case METRIC.catches:
      return `${rounded} catches`;
    case METRIC.ballsPlayedTest:
      return `${rounded} balls`;
    case METRIC.wicketHauls:
      return `${rounded} hauls`;
    case METRIC.bowlingEconomy:
      return value.toFixed(2);
    default:
      return value === rounded ? String(rounded) : value.toFixed(2);
  }
}

export function formatQuizNumber(number: number) {
  return number === Math.trunc(number) ? String(Math.trunc(number)) : number.toFixed(2);
}
