import { getDocument, listDocuments } from "@/lib/firebase";
import { GuessStatNotFoundError, pendingStatQuestionCount } from "@/server/guess-player-stats";

const CHANGES = "playerChanges";
const CATALOG = "playerCatalog";

export type GuessStatVersionQuestion = {
  question_id: string;
  op: "upsert" | "delete";
  question: string;
  answer: string;
};

export type GuessStatVersionSummary = {
  id: string;
  guess_the_stat_version_number: number;
  created_at: string;
  question_count: number;
};

export type GuessStatVersionDetail = GuessStatVersionSummary & {
  questions: GuessStatVersionQuestion[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function wholeNumber(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function readQuestions(value: unknown): GuessStatVersionQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.question_id !== "string") return [];
    return [
      {
        question_id: item.question_id,
        op: item.op === "delete" ? ("delete" as const) : ("upsert" as const),
        question: typeof item.question === "string" ? item.question : "",
        answer: typeof item.answer === "string" ? item.answer : "",
      },
    ];
  });
}

function readSummary(id: string, data: Record<string, unknown>): GuessStatVersionSummary | null {
  const version = wholeNumber(data.guess_the_stat_version_number);
  const questions = readQuestions(data.stat_questions);
  if (version < 1 || questions.length === 0) return null;
  return {
    id,
    guess_the_stat_version_number: version,
    created_at: typeof data.created_at === "string" ? data.created_at : "",
    question_count: questions.length,
  };
}

export async function listGuessStatVersions() {
  const docs = await listDocuments(CHANGES);
  const items = docs
    .flatMap((item) => {
      const summary = readSummary(item.id, item.data);
      return summary ? [summary] : [];
    })
    .sort((left, right) => right.guess_the_stat_version_number - left.guess_the_stat_version_number);
  const catalog = await getDocument(CATALOG, "current");
  const current = wholeNumber(catalog?.data.guess_the_stat_version_number);
  return {
    items,
    current_version: current,
    next_version: current + 1,
    pending_count: await pendingStatQuestionCount(),
  };
}

export async function getGuessStatVersion(id: string): Promise<GuessStatVersionDetail> {
  const snap = await getDocument(CHANGES, id);
  const summary = snap ? readSummary(snap.id, snap.data) : null;
  if (!snap || !summary) throw new GuessStatNotFoundError("Version not found.");
  return { ...summary, questions: readQuestions(snap.data.stat_questions) };
}
