"use client";

import { ChevronDown } from "lucide-react";
import type { ChangeEventHandler, FocusEventHandler } from "react";
import { ErrorText } from "@/components/form/error-text";
import {
  fillTournamentTitle,
  insertTournamentNameToken,
  TOURNAMENT_NAME_TOKEN,
  type Category,
} from "@/lib/questions";
import type { QuestionFormValues } from "@/validation/question";

const inputClass =
  "w-full rounded-[22px] border bg-[#0c0c10] px-5 py-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50";
const fieldClass =
  "h-12 w-full appearance-none rounded-full border bg-[#0c0c10] px-5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50";
const labelClass = "mb-1 block text-sm font-medium text-white";

type FieldName = keyof QuestionFormValues;

type TournamentQuestionFieldsProps = {
  values: QuestionFormValues;
  categories: Category[];
  fieldError: (name: FieldName) => string | undefined;
  onChange: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
  onBlur: FocusEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
  onStatusChange: (status: QuestionFormValues["status"]) => void;
  onTitleChange?: (title: string) => void;
  previewTournamentName?: string;
};

export function TournamentQuestionFields({
  values,
  categories,
  fieldError,
  onChange,
  onBlur,
  onStatusChange,
  onTitleChange,
  previewTournamentName = "World Cup 2023",
}: TournamentQuestionFieldsProps) {
  const preview = fillTournamentTitle(values.title, previewTournamentName);
  const hasToken = values.title.includes(TOURNAMENT_NAME_TOKEN);

  return (
    <>
      <div>
        <label className="block">
          <span className={labelClass}>
            Question Title<span className="text-red-400">*</span>
          </span>
          <p className="mb-3 text-sm text-zinc-500">
            Write the question once, and put{" "}
            <span className="font-medium text-white">{TOURNAMENT_NAME_TOKEN}</span> where the
            tournament name should appear. Each tournament will fill in its own name.
          </p>
          <textarea
            name="title"
            rows={4}
            value={values.title}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={`e.g. Who was the leading run scorer of ${TOURNAMENT_NAME_TOKEN}?`}
            className={`${inputClass} resize-none ${fieldError("title") ? "border-red-500/50" : "border-white/8"}`}
          />
          <ErrorText message={fieldError("title")} />
        </label>
        {onTitleChange ? (
          <button
            type="button"
            onClick={() => onTitleChange(insertTournamentNameToken(values.title))}
            className="mt-3 text-sm font-medium text-purple hover:underline"
          >
            Insert tournament name at the end
          </button>
        ) : null}
        {values.title.trim() ? (
          <p className="mt-3 text-sm text-zinc-500">
            Preview:{" "}
            <span className="text-zinc-200">{preview}</span>
            {hasToken ? null : (
              <span className="mt-1 block text-zinc-500">
                Add {TOURNAMENT_NAME_TOKEN} so the tournament name is filled in automatically.
              </span>
            )}
          </p>
        ) : null}
      </div>

      <div className="mt-8">
        <span className={labelClass}>
          Category<span className="text-red-400">*</span>
        </span>
        <p className="mb-3 text-sm text-zinc-500">Select the category this questions belong to.</p>
        <div className="relative max-w-xl">
          <select
            name="category_id"
            value={values.category_id}
            onChange={onChange}
            onBlur={onBlur}
            className={`${fieldClass} pr-10 ${fieldError("category_id") ? "border-red-500/50" : "border-white/8"}`}
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
            selected={values.status === "active"}
            title="Active"
            description="Question will be available in games."
            onClick={() => onStatusChange("active")}
          />
          <StatusCard
            selected={values.status === "inactive"}
            title="Inactive"
            description="Question will not be available in games."
            onClick={() => onStatusChange("inactive")}
          />
        </div>
        <ErrorText message={fieldError("status")} />
      </div>
    </>
  );
}

export function StatusCard({
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
