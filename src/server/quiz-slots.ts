import type { DailyQuizPlayer } from "@/lib/daily-quiz";
import type { Question } from "@/lib/questions";
import { fillTournamentTitle } from "@/lib/questions";
import type { Player } from "@/lib/players";
import { buildStatQuestion } from "@/server/quiz-pick";
import { resolvePlayerMetric, slotFormats } from "@/server/quiz-metrics";

export type FormatUses = Map<string, Set<string>>;

export type SlotItem = {
  questionId: string;
  title: string;
  format: string;
  metric: string;
  kind: "player_stat" | "general" | "tournament";
  country: string;
  options: DailyQuizPlayer[];
  answerId: string;
};

export type TournamentQuizAnswer = {
  id: string;
  tournamentId: string;
  tournamentName: string;
  questionId: string;
  questionTitle: string;
  questionCategoryId: string;
  questionStatus: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctOption: number;
  lastUsedOn: string | null;
};

type QuizSlot = { question: Question; format: string; metric: string };

function shuffle<T>(values: T[]) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function slotKey(slot: QuizSlot) {
  return `${slot.question.id}|${slot.format}`;
}

function hasUse(uses: FormatUses, id: string) {
  return (uses.get(id)?.size ?? 0) > 0;
}

function markFormat(uses: FormatUses, id: string, format: string) {
  const formats = uses.get(id) ?? new Set<string>();
  formats.add(format);
  uses.set(id, formats);
}

function textOptions(question: Question): DailyQuizPlayer[] | null {
  const values = [question.option_1, question.option_2, question.option_3, question.option_4];
  if (values.some((value) => !value?.trim())) return null;
  if (question.correct_option == null || question.correct_option < 1 || question.correct_option > 4) return null;
  return values.map((value, index) => ({
    player_id: "",
    name: value?.trim() ?? "",
    country: "",
    photo_url: null,
    correct: question.correct_option === index + 1,
    option: index + 1,
  }));
}

function answerOptions(answer: TournamentQuizAnswer): DailyQuizPlayer[] | null {
  const values = [answer.option1, answer.option2, answer.option3, answer.option4].map((value) => value.trim());
  if (values.some((value) => !value)) return null;
  if (answer.correctOption < 1 || answer.correctOption > 4) return null;
  return values.map((value, index) => ({
    player_id: "",
    name: value,
    country: "",
    photo_url: null,
    correct: answer.correctOption === index + 1,
    option: index + 1,
  }));
}

function uniqueSlots(slots: QuizSlot[]) {
  const shuffled = shuffle(slots);
  const seen = new Set<string>();
  const out: QuizSlot[] = [];
  for (const slot of shuffled) {
    if (seen.has(slot.question.id)) continue;
    seen.add(slot.question.id);
    out.push(slot);
  }
  return out;
}

function appendFromSlots(
  items: SlotItem[],
  slots: QuizSlot[],
  players: Player[],
  uses: FormatUses,
  usedSubjects: Set<string>,
  picked: Set<string>,
  count: number,
  today: string,
  generalLastUsed: Map<string, string | null>,
) {
  for (const slot of shuffle(slots)) {
    if (items.length >= count) return;
    const key = slotKey(slot);
    if (picked.has(key)) continue;
    if (slot.metric === "general") {
      const options = textOptions(slot.question);
      if (!options) continue;
      items.push({
        questionId: slot.question.id,
        title: slot.question.title,
        format: "",
        metric: "general",
        kind: "general",
        country: "",
        options,
        answerId: "",
      });
      picked.add(key);
      generalLastUsed.set(slot.question.id, today);
      continue;
    }
    let built = null;
    for (let attempt = 0; attempt < 8 && !built; attempt += 1) {
      built = buildStatQuestion(slot.question.title, slot.question.metric ?? "", players, usedSubjects, slot.format);
    }
    if (!built) continue;
    items.push({
      questionId: slot.question.id,
      title: built.title,
      format: built.format,
      metric: built.metric,
      kind: "player_stat",
      country: built.country,
      options: built.options,
      answerId: "",
    });
    picked.add(key);
    markFormat(uses, slot.question.id, slot.format);
  }
}

function fillWaves(
  items: SlotItem[],
  pool: QuizSlot[],
  players: Player[],
  uses: FormatUses,
  usedSubjects: Set<string>,
  picked: Set<string>,
  count: number,
  today: string,
  generalLastUsed: Map<string, string | null>,
  repeatTemplates: boolean,
) {
  let remaining = pool;
  while (items.length < count && remaining.length > 0) {
    const usedQuestion = new Set(items.map((item) => item.questionId));
    let fresh = remaining.filter((slot) => !usedQuestion.has(slot.question.id));
    if (fresh.length === 0 && !repeatTemplates) {
      fresh = remaining.filter((slot) => !picked.has(slotKey(slot)));
      if (fresh.length === 0) break;
    }
    const source = fresh.length > 0 ? fresh : remaining;
    const wave = uniqueSlots(source);
    const attempted = new Set(wave.map(slotKey));
    appendFromSlots(items, wave, players, uses, usedSubjects, picked, count, today, generalLastUsed);
    remaining = remaining.filter((slot) => {
      const key = slotKey(slot);
      return !picked.has(key) && !attempted.has(key);
    });
  }
}

function recycle(uses: FormatUses, slots: QuizSlot[]) {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const slot of slots) {
    if (seen.has(slot.question.id)) continue;
    seen.add(slot.question.id);
    ids.push(slot.question.id);
    uses.delete(slot.question.id);
  }
  return ids;
}

function templateHasUnusedFormat(slots: QuizSlot[], uses: FormatUses, questionId: string) {
  return slots.some((slot) => slot.question.id === questionId && !uses.get(questionId)?.has(slot.format));
}

export function pickPlayerCategory(input: {
  questions: Question[];
  categoryId: string;
  count: number;
  players: Player[];
  uses: FormatUses;
  usedSubjects: Set<string>;
  generalLastUsed: Map<string, string | null>;
  today: string;
}) {
  const unusedGeneral: QuizSlot[] = [];
  const usedGeneral: QuizSlot[] = [];
  const playerSlots: QuizSlot[] = [];
  let templates = 0;
  for (const question of input.questions) {
    if (question.category_id !== input.categoryId || question.status !== "active") continue;
    templates += 1;
    if (question.type === "general") {
      if (!textOptions(question)) continue;
      const slot = { question, format: "", metric: "general" };
      const last = input.generalLastUsed.get(question.id) ?? null;
      if (last === input.today) usedGeneral.push(slot);
      else unusedGeneral.push(slot);
      continue;
    }
    if (question.type !== "player") continue;
    const metric = resolvePlayerMetric(question.title, question.metric ?? "");
    if (!metric) continue;
    for (const format of slotFormats(question.title, metric)) {
      playerSlots.push({ question, format, metric });
    }
  }

  const unusedFresh = playerSlots.filter((slot) => !hasUse(input.uses, slot.question.id));
  const unusedPartial = playerSlots.filter((slot) => hasUse(input.uses, slot.question.id) && !input.uses.get(slot.question.id)?.has(slot.format));
  const recycled: string[] = [];
  let fresh = unusedFresh;
  if (playerSlots.length > 0 && fresh.length === 0 && unusedPartial.length === 0) {
    recycled.push(...recycle(input.uses, playerSlots));
    fresh = [...playerSlots];
  }

  let generalFirst = unusedGeneral;
  if (generalFirst.length === 0 && usedGeneral.length > 0) generalFirst = usedGeneral;

  const items: SlotItem[] = [];
  const picked = new Set<string>();
  const wave = (pool: QuizSlot[], repeat: boolean) => {
    fillWaves(items, pool, input.players, input.uses, input.usedSubjects, picked, input.count, input.today, input.generalLastUsed, repeat);
  };
  wave(generalFirst, false);
  wave(fresh, false);
  wave(unusedPartial, false);

  if (items.length < input.count) {
    const allGeneral = [...unusedGeneral, ...usedGeneral];
    if (allGeneral.length > 0) {
      let remainingGeneral = allGeneral.filter((slot) => !picked.has(slotKey(slot)));
      if (remainingGeneral.length === 0) {
        for (const slot of allGeneral) picked.delete(slotKey(slot));
        remainingGeneral = allGeneral;
      }
      wave(remainingGeneral, true);
    }
  }
  if (items.length < input.count && playerSlots.length > 0) {
    const unusedLeft = [
      ...playerSlots.filter((slot) => !hasUse(input.uses, slot.question.id)),
      ...playerSlots.filter((slot) => hasUse(input.uses, slot.question.id) && !input.uses.get(slot.question.id)?.has(slot.format)),
    ].filter((slot) => !picked.has(slotKey(slot)));
    if (unusedLeft.length > 0) wave(unusedLeft, true);
    if (items.length < input.count) {
      const exhausted = playerSlots.filter((slot) => !templateHasUnusedFormat(playerSlots, input.uses, slot.question.id));
      if (exhausted.length > 0) {
        recycled.push(...recycle(input.uses, exhausted));
        for (const item of items) {
          if (item.kind !== "player_stat") continue;
          markFormat(input.uses, item.questionId, item.format);
        }
        let remaining = exhausted.filter((slot) => !picked.has(slotKey(slot)));
        if (remaining.length === 0) {
          for (const slot of exhausted) picked.delete(slotKey(slot));
          remaining = [...exhausted];
        }
        wave(remaining, true);
      }
    }
  }

  return { items, recycled, templates };
}

function questionHasTournamentUse(answers: TournamentQuizAnswer[], questionId: string) {
  return answers.some((answer) => answer.questionId === questionId && answer.lastUsedOn);
}

function uniqueAnswerIndexes(answers: TournamentQuizAnswer[], indexes: number[]) {
  const shuffled = shuffle(indexes);
  const seen = new Set<string>();
  const out: number[] = [];
  for (const index of shuffled) {
    const id = answers[index]?.questionId ?? "";
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(index);
  }
  return out;
}

function fillTournamentWaves(answers: TournamentQuizAnswer[], pool: number[], items: SlotItem[], picked: Set<string>, count: number, quizDate: string) {
  let remaining = pool;
  while (items.length < count && remaining.length > 0) {
    const usedQuestion = new Set(items.map((item) => item.questionId));
    const fresh = remaining.filter((index) => !usedQuestion.has(answers[index]?.questionId ?? ""));
    const source = fresh.length > 0 ? fresh : remaining;
    const wave = uniqueAnswerIndexes(answers, source);
    const attempted = new Set(wave.map((index) => answers[index]?.id ?? ""));
    for (const index of shuffle(wave)) {
      if (items.length >= count) break;
      const answer = answers[index];
      if (!answer || picked.has(answer.id)) continue;
      const options = answerOptions(answer);
      if (!options) continue;
      items.push({
        questionId: answer.questionId,
        title: fillTournamentTitle(answer.questionTitle, answer.tournamentName),
        format: "",
        metric: "tournament",
        kind: "tournament",
        country: answer.tournamentName.trim(),
        options,
        answerId: answer.id,
      });
      picked.add(answer.id);
      answer.lastUsedOn = quizDate;
    }
    remaining = remaining.filter((index) => {
      const id = answers[index]?.id ?? "";
      return !picked.has(id) && !attempted.has(id);
    });
  }
}

export function pickTournamentCategory(answers: TournamentQuizAnswer[], categoryId: string, count: number, quizDate: string) {
  const pool = answers.flatMap((answer, index) => {
    if (answer.questionCategoryId !== categoryId || answer.questionStatus !== "active") return [];
    if (!answerOptions(answer)) return [];
    return [index];
  });
  const unused = pool.filter((index) => !answers[index]?.lastUsedOn);
  const fresh = unused.filter((index) => !questionHasTournamentUse(answers, answers[index]?.questionId ?? ""));
  const partial = unused.filter((index) => questionHasTournamentUse(answers, answers[index]?.questionId ?? ""));
  const recycled: string[] = [];
  let first = fresh;
  if (first.length === 0 && partial.length === 0) {
    for (const index of pool) {
      const answer = answers[index];
      if (!answer) continue;
      recycled.push(answer.id);
      answer.lastUsedOn = null;
    }
    first = [...pool];
  }
  const items: SlotItem[] = [];
  const picked = new Set<string>();
  fillTournamentWaves(answers, first, items, picked, count, quizDate);
  fillTournamentWaves(answers, partial, items, picked, count, quizDate);
  if (items.length < count) {
    for (const index of pool) {
      const answer = answers[index];
      if (!answer || picked.has(answer.id)) continue;
      recycled.push(answer.id);
      answer.lastUsedOn = null;
    }
    const remaining = pool.filter((index) => !picked.has(answers[index]?.id ?? ""));
    const next = remaining.length > 0 ? remaining : pool;
    if (remaining.length === 0) picked.clear();
    fillTournamentWaves(answers, next, items, picked, count, quizDate);
  }
  return { items, recycled, answers: pool.length };
}
