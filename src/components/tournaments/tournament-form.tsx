"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import { ArrowLeft } from "lucide-react";
import { ErrorText } from "@/components/form/error-text";
import { api, ApiError } from "@/lib/api";
import type { Question } from "@/lib/questions";
import type { Tournament } from "@/lib/tournaments";
import {
  tournamentInitialValues,
  tournamentPayloadFromValues,
  tournamentSchema,
  type TournamentFormValues,
} from "@/validation/tournament";

const inputClass =
  "w-full rounded-[22px] border bg-[#0c0c10] px-5 py-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50";
const fieldClass =
  "h-12 w-full rounded-full border bg-[#0c0c10] px-5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50";
const labelClass = "mb-1 block text-sm font-medium text-white";
const OPTION_KEYS = ["option_1", "option_2", "option_3", "option_4"] as const;
const OPTION_LABELS = ["A", "B", "C", "D"] as const;

type TournamentFormProps = {
  templates: Question[];
  tournament?: Tournament;
};

export function TournamentForm({ templates, tournament }: TournamentFormProps) {
  const router = useRouter();
  const editing = Boolean(tournament);

  const formik = useFormik<TournamentFormValues>({
    initialValues: tournamentInitialValues(templates, tournament),
    enableReinitialize: true,
    validationSchema: tournamentSchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus("");
      try {
        const body = tournamentPayloadFromValues(values);
        if (editing && tournament) {
          await api(`/api/v1/tournaments/${tournament.id}`, {
            method: "PUT",
            body: JSON.stringify(body),
          });
        } else {
          await api("/api/v1/tournaments", {
            method: "POST",
            body: JSON.stringify(body),
          });
        }
        router.push("/tournaments");
        router.refresh();
      } catch (err) {
        helpers.setStatus(err instanceof ApiError ? err.message : "Could not save tournament.");
      }
    },
  });

  function fieldError(name: string) {
    const touched = getPath(formik.touched, name);
    const error = getPath(formik.errors, name);
    return touched ? error : undefined;
  }

  return (
    <form onSubmit={formik.handleSubmit} noValidate className="pb-10">
      <div className="rounded-[28px] bg-[#14141a] px-6 py-8 sm:px-8">
        <Link
          href="/tournaments"
          className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to tournaments
        </Link>

        <h1 className="text-[32px] font-semibold tracking-tight text-white">
          {editing ? "Edit tournament" : "Add a new Tournament"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Enter tournament details.</p>

        {formik.status ? (
          <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {formik.status}
          </p>
        ) : null}

        <div className="mt-8">
          <label className="block">
            <span className={labelClass}>
              Tournament Name<span className="text-red-400">*</span>
            </span>
            <input
              name="name"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="Enter Tournament Name"
              className={`mt-3 ${fieldClass} ${fieldError("name") ? "border-red-500/50" : "border-white/8"}`}
            />
            <ErrorText message={fieldError("name")} />
          </label>
        </div>

        {formik.values.answers.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-white/8 bg-[#121218] px-5 py-4 text-sm text-zinc-400">
            No active tournament question templates yet.{" "}
            <Link href="/questions/tournament/new" className="text-purple hover:underline">
              Create a template
            </Link>{" "}
            first, then come back to assign answers.
          </p>
        ) : (
          formik.values.answers.map((answer, index) => (
            <div key={answer.question_id} className="mt-10">
              <h2 className="text-lg font-semibold text-white">Question {index + 1}</h2>
              <textarea
                readOnly
                rows={3}
                value={answer.title}
                className={`mt-4 ${inputClass} resize-none border-white/8 text-zinc-200`}
              />

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {OPTION_KEYS.map((name, optionIndex) => {
                  const fieldName = `answers.${index}.${name}`;
                  const selected = formik.values.answers[index].correct_option === String(optionIndex + 1);
                  return (
                    <div key={name}>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            void formik.setFieldValue(`answers.${index}.correct_option`, String(optionIndex + 1));
                            void formik.setFieldTouched(`answers.${index}.correct_option`, true, false);
                          }}
                          className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
                            selected ? "border-purple" : "border-zinc-500"
                          }`}
                          aria-label={`Mark option ${OPTION_LABELS[optionIndex]} as correct`}
                        >
                          {selected ? <span className="size-3 rounded-full bg-purple" /> : null}
                        </button>
                        <span className="w-4 shrink-0 text-sm font-medium text-zinc-400">
                          {OPTION_LABELS[optionIndex]}
                        </span>
                        <div className="min-w-0 flex-1">
                          <input
                            name={fieldName}
                            value={formik.values.answers[index][name]}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            placeholder={`Option ${optionIndex + 1}`}
                            className={`${fieldClass} ${
                              fieldError(fieldName) ? "border-red-500/50" : "border-white/8"
                            }`}
                          />
                        </div>
                      </div>
                      <div className="pl-[52px]">
                        <ErrorText message={fieldError(fieldName)} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <ErrorText message={fieldError(`answers.${index}.correct_option`)} />
            </div>
          ))
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/tournaments"
            className="inline-flex h-12 items-center rounded-full border border-purple px-8 text-sm font-medium text-purple"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={formik.isSubmitting}
            className="inline-flex h-12 items-center rounded-full bg-purple px-8 text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.35)] disabled:opacity-60"
          >
            {formik.isSubmitting ? "Saving..." : "Save Tournament"}
          </button>
        </div>
      </div>
    </form>
  );
}

function getPath(source: unknown, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((current, key) => {
    if (current == null || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
  return typeof value === "string" ? value : undefined;
}
