"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { HeaderActions } from "@/components/layout/header-actions";
import { useOpenMenu } from "@/components/layout/admin-shell";
import { flagUrl, FORMAT_LABELS } from "@/data/cricket";
import { ApiError } from "@/lib/api";
import {
  answerDailyQuizItem,
  getTodayDailyQuiz,
  isPlayerStatItem,
  type DailyQuiz,
  type DailyQuizAnswer,
  type DailyQuizItem,
} from "@/lib/daily-quiz";

type ItemState = {
  selectedId: string;
  submitting: boolean;
  result: DailyQuizAnswer | null;
  error: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function DailyQuizDemoPage() {
  const openMenu = useOpenMenu();
  const [quiz, setQuiz] = useState<DailyQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [itemState, setItemState] = useState<Record<string, ItemState>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getTodayDailyQuiz();
      setQuiz(data);
    } catch (err) {
      setQuiz(null);
      if (err instanceof ApiError && err.status === 404) {
        setError("No quiz for today yet. Create questions first.");
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load today's quiz. Make sure the Go API is running on port 8080.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const answeredCount = useMemo(() => {
    if (!quiz) return 0;
    return quiz.items.filter((item) => itemState[item.id]?.result).length;
  }, [quiz, itemState]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 rounded-[28px] bg-[#14141a] px-5 py-5 sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={openMenu}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-white sm:text-[32px]">
              Daily Quiz Demo
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Preview only. The live quiz is created on the backend and sent to the app.
            </p>
          </div>
        </div>
        <HeaderActions />
      </div>

      {error ? (
        <p className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}{" "}
          <Link href="/games" className="font-medium text-white hover:underline">
            Go to Daily Quiz
          </Link>
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">
          {loading
            ? "Loading today's quiz…"
            : quiz
              ? `${quiz.quiz_date} · ${answeredCount}/${quiz.items.length} answered`
              : "No questions to preview"}
        </p>
        <Link href="/games" className="text-sm font-medium text-purple hover:underline">
          Back to Daily Quiz
        </Link>
      </div>

      {loading || !quiz ? null : (
        <div className="mt-6 space-y-5">
          {quiz.items.map((item, index) => (
            <QuizCard
              key={item.id}
              index={index + 1}
              item={item}
              state={itemState[item.id]}
              onSelect={(playerId) => {
                setItemState((current) => ({
                  ...current,
                  [item.id]: {
                    selectedId: playerId,
                    submitting: false,
                    result: current[item.id]?.result ?? null,
                    error: "",
                  },
                }));
              }}
              onSubmit={async () => {
                const selectedId = itemState[item.id]?.selectedId;
                if (!selectedId) return;
                setItemState((current) => ({
                  ...current,
                  [item.id]: {
                    selectedId,
                    submitting: true,
                    result: null,
                    error: "",
                  },
                }));
                try {
                  const result = isPlayerStatItem(item)
                    ? await answerDailyQuizItem(item.id, undefined, Number.parseInt(selectedId, 10))
                    : await answerDailyQuizItem(item.id, selectedId);
                  setItemState((current) => ({
                    ...current,
                    [item.id]: {
                      selectedId,
                      submitting: false,
                      result,
                      error: "",
                    },
                  }));
                } catch (err) {
                  setItemState((current) => ({
                    ...current,
                    [item.id]: {
                      selectedId,
                      submitting: false,
                      result: null,
                      error: err instanceof ApiError ? err.message : "Could not check that answer.",
                    },
                  }));
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuizCard({
  index,
  item,
  state,
  onSelect,
  onSubmit,
}: {
  index: number;
  item: DailyQuizItem;
  state?: ItemState;
  onSelect: (playerId: string) => void;
  onSubmit: () => void;
}) {
  const result = state?.result ?? null;
  const locked = Boolean(result);
  const format =
    item.format && item.format in FORMAT_LABELS
      ? FORMAT_LABELS[item.format as keyof typeof FORMAT_LABELS]
      : "";

  return (
    <section className="rounded-[28px] bg-[#14141a] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Question {String(index).padStart(2, "0")}
            {item.category_name ? ` · ${item.category_name}` : ""}
            {format ? ` · ${format}` : ""}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white sm:text-xl">{item.title}</h2>
        </div>
        {result ? (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              result.correct ? "bg-green/15 text-green" : "bg-red-500/15 text-red-300"
            }`}
          >
            {result.correct ? "Correct" : "Wrong"}
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {item.options.map((player, index) => {
          const optionKey = player.player_id || String(player.option ?? index + 1);
          const selected = state?.selectedId === optionKey;
          const isCorrect = result
            ? player.player_id
              ? Boolean(result.correct_player_ids?.includes(player.player_id))
              : result.correct_option === (player.option ?? index + 1)
            : false;
          const isWrongPick = Boolean(result) && selected && !isCorrect;
          const statOption = !player.player_id;
          return (
            <button
              key={optionKey}
              type="button"
              disabled={locked}
              onClick={() => onSelect(optionKey)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                isCorrect
                  ? "border-green/50 bg-green/10"
                  : isWrongPick
                    ? "border-red-500/40 bg-red-500/10"
                    : selected
                      ? "border-purple/60 bg-purple/10"
                      : "border-white/8 bg-[#121218] hover:border-white/20"
              }`}
            >
              {statOption ? (
                <span className="flex size-11 items-center justify-center rounded-full bg-purple-soft text-sm font-semibold text-purple">
                  {["A", "B", "C", "D"][index] ?? index + 1}
                </span>
              ) : player.photo_url ? (
                <Image
                  src={player.photo_url}
                  alt={player.name}
                  width={44}
                  height={44}
                  className="size-11 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-11 items-center justify-center rounded-full bg-purple-soft text-xs font-semibold text-purple">
                  {initials(player.name)}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate font-medium text-white">{player.name}</span>
                {statOption || !player.country ? null : (
                  <span className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
                    <Image
                      src={flagUrl(player.country)}
                      alt=""
                      width={20}
                      height={14}
                      className="h-3.5 w-5 rounded-sm object-cover"
                    />
                    {player.country}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {state?.error ? <p className="mt-4 text-sm text-red-300">{state.error}</p> : null}

      {!locked ? (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!state?.selectedId || state.submitting}
          className="mt-5 h-11 rounded-full bg-purple px-5 text-sm font-medium text-white disabled:opacity-50"
        >
          {state?.submitting ? "Checking…" : "Submit answer"}
        </button>
      ) : null}
    </section>
  );
}
