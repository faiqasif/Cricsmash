"use client";

import { useFormik } from "formik";
import type { MouseEvent } from "react";
import { TournamentQuestionFields } from "@/components/questions/tournament-question-fields";
import { ApiError } from "@/lib/api";
import type { Category } from "@/lib/questions";
import {
  questionInitialValues,
  questionSchema,
  type QuestionFormValues,
} from "@/validation/question";

type TournamentQuestionCreateSectionProps = {
  categories: Category[];
  initialValues?: QuestionFormValues;
  heading?: string;
  description?: string;
  submitLabel?: string;
  previewTournamentName?: string;
  onSave: (values: QuestionFormValues) => void | Promise<void>;
  onCancel: () => void;
};

export function TournamentQuestionCreateSection({
  categories,
  initialValues,
  heading = "Create tournament specific question",
  description = "This question will only be available on this tournament and will not appear in others.",
  submitLabel = "Add Question",
  previewTournamentName,
  onSave,
  onCancel,
}: TournamentQuestionCreateSectionProps) {
  const formik = useFormik<QuestionFormValues>({
    initialValues: initialValues ?? questionInitialValues(),
    enableReinitialize: true,
    validationSchema: questionSchema("tournament"),
    onSubmit: () => undefined,
  });

  function fieldError(name: keyof QuestionFormValues) {
    return formik.touched[name] ? formik.errors[name] : undefined;
  }

  async function submitQuestion(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    formik.setStatus("");
    const errors = await formik.validateForm();
    await formik.setTouched({
      title: true,
      category_id: true,
      status: true,
      option_1: true,
      option_2: true,
      option_3: true,
      option_4: true,
      correct_option: true,
    });
    if (Object.keys(errors).length > 0) return;
    try {
      await onSave(formik.values);
    } catch (err) {
      formik.setStatus(err instanceof ApiError ? err.message : "Could not save question.");
    }
  }

  return (
    <div className="mt-10 rounded-[24px] border border-purple/30 bg-[#121218] px-5 py-6 sm:px-6">
      <h2 className="text-lg font-semibold text-white">{heading}</h2>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>

      {formik.status ? (
        <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {formik.status}
        </p>
      ) : null}

      <div className="mt-6">
        <TournamentQuestionFields
          values={formik.values}
          categories={categories}
          fieldError={fieldError}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          onStatusChange={(status) => void formik.setFieldValue("status", status)}
          onTitleChange={(title) => void formik.setFieldValue("title", title)}
          previewTournamentName={previewTournamentName}
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-12 items-center rounded-full border border-purple px-8 text-sm font-medium text-purple"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={(event) => void submitQuestion(event)}
          className="inline-flex h-12 items-center rounded-full bg-purple px-8 text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.35)]"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
