"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";
import { useOpenMenu } from "@/components/layout/admin-shell";
import { api, ApiError } from "@/lib/api";

type VersionDetail = {
  id: string;
  guess_the_stat_version_number: number;
  created_at: string;
  question_count: number;
  questions: {
    question_id: string;
    op: "upsert" | "delete";
    question: string;
    answer: string;
  }[];
};

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return date.toLocaleString();
}

export default function GuessStatVersionDetailPage() {
  const params = useParams<{ id: string }>();
  const openMenu = useOpenMenu();
  const [version, setVersion] = useState<VersionDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void api<VersionDetail>(`/api/v1/guess-stat-versions/${params.id}`)
      .then((data) => {
        if (active) setVersion(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : "Could not load this version.");
      });
    return () => {
      active = false;
    };
  }, [params.id]);

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
            <Link href="/guess-stat-versions" className="mb-2 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
              <ArrowLeft className="size-4" />
              Stat Version Numbers
            </Link>
            <h1 className="text-[28px] font-semibold tracking-tight text-white sm:text-[32px]">
              {version ? `guess_the_stat_version_number ${version.guess_the_stat_version_number}` : "Version"}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {version
                ? `${version.question_count} question${version.question_count === 1 ? "" : "s"} · ${formatWhen(version.created_at)}`
                : "Questions published in this stat version."}
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      ) : null}
      {!version && !error ? <p className="mt-6 text-sm text-zinc-500">Loading version...</p> : null}

      {version ? (
        <div className="mt-5 space-y-4">
          {version.questions.map((question) => (
            <section key={question.question_id} className="overflow-hidden rounded-[28px] bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
                <h2 className="text-lg font-medium text-white">{question.op === "delete" ? "Deleted question" : question.question}</h2>
                {question.op === "delete" ? (
                  <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-300">Deleted</span>
                ) : null}
              </div>
              <p className="px-5 py-4 text-sm text-zinc-300">
                {question.op === "delete" ? "Phones remove this question." : `Correct answer: ${question.answer}`}
              </p>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
