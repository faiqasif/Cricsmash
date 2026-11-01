"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";

const fieldClass =
  "w-full rounded-2xl border border-white/8 bg-[#0c0c10] px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50";

type GuessPlayerStatFormProps = {
  initialQuestion?: string;
  initialAnswer?: string;
  submitLabel: string;
  onSubmit: (value: { question: string; answer: string }) => Promise<void>;
};

export function GuessPlayerStatForm({
  initialQuestion = "",
  initialAnswer = "",
  submitLabel,
  onSubmit,
}: GuessPlayerStatFormProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState(initialAnswer);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit({ question: question.trim(), answer: answer.trim() });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this question.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 rounded-[28px] bg-[#14141a] px-5 py-6 sm:px-7">
      {error ? (
        <p className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      ) : null}
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white">Question</span>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={4}
          placeholder="Who has the highest ODI batting average?"
          className={`${fieldClass} py-3`}
        />
      </label>
      <label className="mt-5 block">
        <span className="mb-2 block text-sm font-medium text-white">Correct answer</span>
        <input
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="56.78"
          className={`${fieldClass} h-12`}
        />
      </label>
      <p className="mt-4 text-sm text-zinc-500">
        The question is saved now. Phones receive it when you create the next version from Stat Version Numbers.
      </p>
      <button
        type="submit"
        disabled={saving || question.trim().length < 4 || !answer.trim()}
        className="mt-6 inline-flex h-12 items-center rounded-full bg-purple px-8 text-sm font-medium text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
