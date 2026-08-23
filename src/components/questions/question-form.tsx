"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { ErrorText } from "@/components/form/error-text";
import { api, ApiError } from "@/lib/api";
import type { Category, Question, QuestionType } from "@/lib/questions";
import {
  questionInitialValues,
  questionPayloadFromValues,
  questionSchema,
  type QuestionFormValues,
} from "@/validation/question";

const inputClass =
  "w-full rounded-[22px] border bg-[#0c0c10] px-5 py-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50";
const labelClass = "mb-1 block text-sm font-medium text-white";

type QuestionFormProps = {
  question?: Question;
  categories: Category[];
  type?: QuestionType;
};

export function QuestionForm({ question, categories, type = "player" }: QuestionFormProps) {
  const router = useRouter();
  const editing = Boolean(question);
  const listHref = "/questions/player";

  const formik = useFormik<QuestionFormValues>({
    initialValues: questionInitialValues(question),
    enableReinitialize: true,
    validationSchema: questionSchema,
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
              placeholder="e.g. Which of these players has the highest batting average (odi/test/t20) ?"
              className={`${inputClass} resize-none ${
                fieldError("title") ? "border-red-500/50" : "border-white/8"
              }`}
            />
            <ErrorText message={fieldError("title")} />
          </label>
        </div>

        <div className="mt-8">
          <span className={labelClass}>
            Category<span className="text-red-400">*</span>
          </span>
          <p className="mb-3 text-sm text-zinc-500">Select the category this questions belong to.</p>
          <div className="relative max-w-xl">
            <select
              name="category_id"
              value={formik.values.category_id}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={`h-12 w-full appearance-none rounded-full border bg-[#0c0c10] px-5 pr-10 text-sm text-white outline-none ${
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

function StatusCard({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-[22px] border px-5 py-5 text-left transition ${
        selected ? "border-purple bg-purple/5" : "border-white/8 bg-[#121218]"
      }`}
    >
      <span
        className={`mt-0.5 flex size-5 items-center justify-center rounded-full border ${
          selected ? "border-purple" : "border-zinc-500"
        }`}
      >
        {selected ? <span className="size-2.5 rounded-full bg-purple" /> : null}
      </span>
      <span>
        <span className="block font-semibold text-white">{title}</span>
        <span className="mt-1 block text-sm text-zinc-500">{description}</span>
      </span>
    </button>
  );
}
