"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { generateDailyQuiz } from "@/lib/daily-quiz";
import {
  fetchAllCategories,
  fetchAllQuestions,
  GENERAL_CATEGORY_NAME,
  type Category,
} from "@/lib/questions";

function todayISO() {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return utc.toISOString().slice(0, 10);
}

type QuizGenerateFormProps = {
  initialDate?: string;
  lockDate?: boolean;
};

export function QuizGenerateForm({ initialDate, lockDate = false }: QuizGenerateFormProps) {
  const router = useRouter();
  const minDate = todayISO();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [quizDate, setQuizDate] = useState(initialDate || minDate);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const requestedTotal = useMemo(() => {
    return selectedIds.reduce((sum, id) => {
      const parsed = Number.parseInt(counts[id] ?? "1", 10);
      if (!Number.isInteger(parsed) || parsed < 1) return sum;
      return sum + parsed;
    }, 0);
  }, [counts, selectedIds]);

  useEffect(() => {
    Promise.all([
      fetchAllCategories(),
      fetchAllQuestions({ type: "player", status: "active" }),
      fetchAllQuestions({ type: "general", status: "active" }),
      fetchAllQuestions({ type: "tournament", status: "active" }),
    ])
      .then(([all, playerQuestions, generalQuestions, tournamentQuestions]) => {
        const withTemplates = new Set(
          [...playerQuestions, ...generalQuestions, ...tournamentQuestions].map((item) => item.category_id),
        );
        const items = all
          .filter((item) => item.status === "active" && withTemplates.has(item.id))
          .sort((a, b) => {
            const aGeneral = a.name.trim().toLowerCase() === GENERAL_CATEGORY_NAME.toLowerCase();
            const bGeneral = b.name.trim().toLowerCase() === GENERAL_CATEGORY_NAME.toLowerCase();
            if (aGeneral !== bGeneral) return aGeneral ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
        setCategories(items);
        setCounts((prev) => {
          const next = { ...prev };
          for (const item of items) {
            if (next[item.id] == null) next[item.id] = "1";
          }
          return next;
        });
      })
      .catch(() => setCategories([]));
  }, []);

  const toggleCategory = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  const generate = useCallback(async () => {
    if (selectedIds.length === 0) {
      setError("Select at least one category.");
      return;
    }
    const payload: { category_id: string; count: number }[] = [];
    let total = 0;
    for (const id of selectedIds) {
      const category = categories.find((item) => item.id === id);
      const parsedCount = Number.parseInt(counts[id] ?? "", 10);
      if (!Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > 50) {
        setError(`Enter a number of questions between 1 and 50${category ? ` for ${category.name}` : ""}.`);
        return;
      }
      payload.push({ category_id: id, count: parsedCount });
      total += parsedCount;
    }
    if (total > 50) {
      setError("Total questions cannot exceed 50.");
      return;
    }
    if (!quizDate) {
      setError("Choose a quiz date.");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const data = await generateDailyQuiz({ quiz_date: quizDate, categories: payload });
      router.push(`/games/daily-quiz/${data.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the quiz.");
    } finally {
      setGenerating(false);
    }
  }, [categories, counts, quizDate, router, selectedIds]);

  return (
    <form
      className="rounded-[28px] bg-[#14141a] p-5 sm:p-7"
      onSubmit={(event) => {
        event.preventDefault();
        void generate();
      }}
    >
      {error ? (
        <p className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <label className="block max-w-xs">
        <span className="mb-1 block text-sm font-medium text-white">Quiz date</span>
        <input
          type="date"
          min={minDate}
          value={quizDate}
          disabled={lockDate}
          onChange={(event) => setQuizDate(event.target.value)}
          className="h-12 w-full rounded-full border border-white/8 bg-[#0c0c10] px-5 text-sm text-white outline-none focus:border-purple/50 disabled:opacity-60"
        />
        <span className="mt-1 block text-xs text-zinc-500">Today or a future date. This replaces any quiz already on that date.</span>
      </label>

      <div className="mt-6">
        <p className="text-sm font-medium text-white">Categories</p>
        <p className="mt-1 text-sm text-zinc-500">
          Select one or more, then set the question count for each. Categories with no templates are hidden. Tournament categories copy A–D from Tournament events.
        </p>
      </div>
      {categories.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No active categories found.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {categories.map((category) => {
            const selected = selectedIds.includes(category.id);
            return (
              <li
                key={category.id}
                className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                  selected ? "border-purple/40 bg-purple/10" : "border-white/8 bg-[#0c0c10]"
                }`}
              >
                <label className="flex min-w-0 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleCategory(category.id)}
                    className="size-4 shrink-0 accent-[var(--purple)]"
                  />
                  <span className="truncate text-sm font-medium text-white">{category.name}</span>
                </label>
                <label className="flex items-center gap-2 sm:w-44">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Questions</span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    disabled={!selected}
                    value={counts[category.id] ?? "1"}
                    onChange={(event) =>
                      setCounts((prev) => ({ ...prev, [category.id]: event.target.value }))
                    }
                    className="h-10 w-full rounded-full border border-white/8 bg-[#14141a] px-4 text-sm text-white outline-none focus:border-purple/50 disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">
          {selectedIds.length === 0
            ? "No categories selected"
            : `${selectedIds.length} categor${selectedIds.length === 1 ? "y" : "ies"} · ${requestedTotal} question${requestedTotal === 1 ? "" : "s"}`}
        </p>
        <button
          type="submit"
          disabled={generating}
          className="h-12 shrink-0 rounded-full bg-purple px-6 text-sm font-medium text-white disabled:opacity-50"
        >
          {generating ? "Creating…" : "Create questions"}
        </button>
      </div>
    </form>
  );
}
