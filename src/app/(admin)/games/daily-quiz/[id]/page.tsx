"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Menu, Pencil, Trash2 } from "lucide-react";
import { HeaderActions } from "@/components/layout/header-actions";
import { useOpenMenu } from "@/components/layout/admin-shell";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import { ApiError } from "@/lib/api";
import {
  deleteDailyQuiz,
  formatQuizDate,
  getDailyQuiz,
  quizStatusLabel,
  type DailyQuiz,
} from "@/lib/daily-quiz";

const OPTION_LABELS = ["A", "B", "C", "D"];

function statusClass(status: string) {
  if (status === "active") return "bg-emerald-500/15 text-emerald-300";
  if (status === "past") return "bg-red-500/15 text-red-300";
  return "bg-amber-500/15 text-amber-300";
}

export default function DailyQuizDetailPage() {
  const openMenu = useOpenMenu();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<DailyQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setQuiz(await getDailyQuiz(params.id));
    } catch (err) {
      setQuiz(null);
      setError(err instanceof ApiError ? err.message : "Could not load this quiz.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const date = quiz ? formatQuizDate(quiz.quiz_date) : null;

  return (
    <div>
      <p className="mb-4 text-sm text-zinc-500">
        <Link href="/games" className="hover:text-zinc-300">
          Games
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/games/daily-quiz" className="hover:text-zinc-300">
          Daily Quiz
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-white">Daily Quiz Details</span>
      </p>

      <Link
        href="/games/daily-quiz"
        className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Back to daily quiz
      </Link>

      {error ? (
        <p className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {loading || !quiz || !date ? (
        <p className="text-sm text-zinc-500">{loading ? "Loading quiz…" : ""}</p>
      ) : (
        <>
          <div className="flex flex-col gap-4 rounded-[28px] bg-[#14141a] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="flex min-w-0 items-center gap-4">
              <button
                type="button"
                onClick={openMenu}
                className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </button>
              <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-[#0c0c10]">
                <img src="/games/daily-quiz.png" alt="" className="size-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-white">
                    Daily Quiz - {date.label}
                  </h1>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(quiz.status)}`}>
                    {quizStatusLabel(quiz.status, true)}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
                  <CalendarDays className="size-4" />
                  Available {date.label}, 12:00 AM to 11:59 PM
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">Each quiz contains {quiz.items.length} questions</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HeaderActions />
              <Link
                href={`/games/daily-quiz/${quiz.id}/edit`}
                className="rounded-full p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
                aria-label="Edit quiz"
              >
                <Pencil className="size-4" />
              </Link>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-full p-2 text-zinc-400 hover:bg-white/5 hover:text-red-300"
                aria-label="Delete quiz"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>

          <h2 className="mt-6 text-lg font-semibold text-white">All Question({quiz.items.length})</h2>
          <div className="mt-4 space-y-4">
            {quiz.items.map((item) => (
              <section key={item.id} className="rounded-[28px] bg-[#14141a] px-5 py-5 sm:px-7">
                <p className="text-base font-medium text-white">{item.title}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {item.options.map((option, index) => (
                    <div
                      key={option.player_id}
                      className={`flex items-center gap-3 rounded-full border px-4 py-3 ${
                        option.correct
                          ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                          : "border-white/8 bg-[#0c0c10] text-zinc-200"
                      }`}
                    >
                      <span className="text-sm font-semibold">{OPTION_LABELS[index] ?? index + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{option.name}</p>
                        {option.value ? <p className="text-xs opacity-70">{option.value}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      <ConfirmDeleteModal
        open={confirmDelete}
        title="Delete quiz?"
        description="This removes the quiz and frees those question formats for later dates."
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await deleteDailyQuiz(params.id);
          router.push("/games/daily-quiz");
        }}
      />
    </div>
  );
}
