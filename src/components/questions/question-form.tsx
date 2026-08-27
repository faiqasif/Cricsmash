"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormik } from "formik";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { ErrorText } from "@/components/form/error-text";
import { StatusCard, TournamentQuestionFields } from "@/components/questions/tournament-question-fields";
import { api, ApiError } from "@/lib/api";
import { GENERAL_CATEGORY_NAME, type Category, type Question, type QuestionType } from "@/lib/questions";
import {
  questionInitialValues,
  questionPayloadFromValues,
  questionSchema,
  type QuestionFormValues,
} from "@/validation/question";

const inputClass =
  "w-full rounded-[22px] border bg-[#0c0c10] px-5 py-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50";
const fieldClass =
  "h-12 w-full appearance-none rounded-full border bg-[#0c0c10] px-5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50";
const labelClass = "mb-1 block text-sm font-medium text-white";
const OPTION_KEYS = ["option_1", "option_2", "option_3", "option_4"] as const;
const OPTION_LABELS = ["A", "B", "C", "D"] as const;

type QuestionFormProps = {
  question?: Question;
  categories: Category[];
  type?: QuestionType;
};

export function QuestionForm({ question, categories, type = "player" }: QuestionFormProps) {
  const router = useRouter();
  const editing = Boolean(question);
  const isGeneral = type === "general";
  const isTournament = type === "tournament";
  const listHref =
    type === "general" ? "/questions/general" : type === "tournament" ? "/questions/tournament" : "/questions/player";

  const formik = useFormik<QuestionFormValues>({
    initialValues: questionInitialValues(question),
    enableReinitialize: true,
    validationSchema: questionSchema(type),
    onSubmit: async (values, helpers) => {
      helpers.setStatus("");
      try {
        const body = questionPayloadFromValues(values, type);
        if (editing && question) {
          await api(`/api/v1/questions/${question.id}`, {
            method: "PUT",
            body: JSON.stringify(body),
          });
        } else {
          await api("/api/v1/questions", {
            method: "POST",
            body: JSON.stringify(body),
          });
        }
        router.push(listHref);
        router.refresh();
      } catch (err) {
        helpers.setStatus(err instanceof ApiError ? err.message : "Could not save question.");
      }
    },
  });

  useEffect(() => {
    if (!isGeneral || formik.values.category_id) return;
    const category =
      categories.find((item) => item.name.toLowerCase() === GENERAL_CATEGORY_NAME.toLowerCase()) ??
      categories.find((item) => item.name.toLowerCase() === "general knowledge");
    if (category) {
      void formik.setFieldValue("category_id", category.id, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, isGeneral, formik.values.category_id]);

  function fieldError(name: keyof QuestionFormValues) {
    return formik.touched[name] ? formik.errors[name] : undefined;
  }

  return (
    <form onSubmit={formik.handleSubmit} noValidate className="pb-10">
      <div className="rounded-[28px] bg-[#14141a] px-6 py-8 sm:px-8">
        <Link
          href={listHref}
          className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to all questions
        </Link>

        <h1 className="text-[32px] font-semibold tracking-tight text-white">
          {editing ? "Edit question" : "Add a new question"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Create a new question to be used in games.</p>

        {formik.status ? (
          <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {formik.status}
          </p>
        ) : null}

        {isTournament ? (
          <div className="mt-8">
            <TournamentQuestionFields
              values={formik.values}
              categories={categories}
              fieldError={fieldError}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              onStatusChange={(status) => void formik.setFieldValue("status", status)}
            />
          </div>
        ) : (
          <>
            <div className="mt-8">
              <label className="block">
                <span className={labelClass}>
                  Question Title<span className="text-red-400">*</span>
                </span>
                <p className="mb-3 text-sm text-zinc-500">
                  Enter the question exactly as it will appear to users.
                </p>
                <textarea
                  name="title"
                  rows={4}
                  value={formik.values.title}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder={
                    isGeneral
                      ? "e.g. Who won the 2023 ODI World Cup?"
                      : "e.g. Which of these players has the highest batting average (odi/test/t20) ?"
                  }
                  className={`${inputClass} resize-none ${
                    fieldError("title") ? "border-red-500/50" : "border-white/8"
                  }`}
                />
                <ErrorText message={fieldError("title")} />
              </label>
            </div>

            {isGeneral ? (
              <div className="mt-8">
                <span className={labelClass}>
                  Answer Options<span className="text-red-400">*</span>
                </span>
                <p className="mb-4 text-sm text-zinc-500">
                  Enter four options, then select the radio next to the correct answer.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {OPTION_KEYS.map((name, optionIndex) => {
                    const selected = formik.values.correct_option === String(optionIndex + 1);
                    return (
                      <div key={name}>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              void formik.setFieldValue("correct_option", String(optionIndex + 1));
                              void formik.setFieldTouched("correct_option", true, false);
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
                              name={name}
                              value={formik.values[name]}
                              onChange={formik.handleChange}
                              onBlur={formik.handleBlur}
                              placeholder={`Option ${optionIndex + 1}`}
                              className={`${fieldClass} ${
                                fieldError(name) ? "border-red-500/50" : "border-white/8"
                              }`}
                            />
                          </div>
                        </div>
                        <div className="pl-[52px]">
                          <ErrorText message={fieldError(name)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <ErrorText message={fieldError("correct_option")} />
              </div>
            ) : null}

            <div className="mt-8">
              <span className={labelClass}>
                Category<span className="text-red-400">*</span>
              </span>
              {isGeneral ? (
                <>
                  <p className="mb-3 text-sm text-zinc-500">
                    All questions in this section are assigned to General Questions.
                  </p>
                  <span className="inline-flex h-12 items-center rounded-full border border-white/8 bg-[#0c0c10] px-5 text-sm text-white">
                    {GENERAL_CATEGORY_NAME}
                  </span>
                </>
              ) : (
                <>
                  <p className="mb-3 text-sm text-zinc-500">Select the category this questions belong to.</p>
                  <div className="relative max-w-xl">
                    <select
                      name="category_id"
                      value={formik.values.category_id}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`${fieldClass} pr-10 ${
                        fieldError("category_id") ? "border-red-500/50" : "border-white/8"
                      }`}
                    >
                      <option value="">Select Category</option>
                      {categories.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                  </div>
                  <ErrorText message={fieldError("category_id")} />
                </>
              )}
            </div>

            <div className="mt-8">
              <p className={labelClass}>
                Status<span className="text-red-400">*</span>
              </p>
              <p className="mb-3 text-sm text-zinc-500">Set the status of this question</p>
              <div className="grid gap-4 md:grid-cols-2">
                <StatusCard
                  selected={formik.values.status === "active"}
                  title="Active"
                  description="Question will be available in games."
                  onClick={() => formik.setFieldValue("status", "active")}
                />
                <StatusCard
                  selected={formik.values.status === "inactive"}
                  title="Inactive"
                  description="Question will not be available in games."
                  onClick={() => formik.setFieldValue("status", "inactive")}
                />
              </div>
              <ErrorText message={fieldError("status")} />
            </div>
          </>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={listHref}
            className="inline-flex h-12 items-center rounded-full border border-purple px-8 text-sm font-medium text-purple"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={formik.isSubmitting}
            className="inline-flex h-12 items-center rounded-full bg-purple px-8 text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.35)] disabled:opacity-60"
          >
            {formik.isSubmitting ? "Saving..." : "Save Question"}
          </button>
        </div>
      </div>
    </form>
  );
}
