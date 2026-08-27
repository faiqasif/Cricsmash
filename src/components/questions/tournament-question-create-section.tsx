"use client";

import { useFormik } from "formik";
import type { MouseEvent } from "react";
import { TournamentQuestionFields } from "@/components/questions/tournament-question-fields";
import type { Category } from "@/lib/questions";
import {
  questionInitialValues,
  questionSchema,
  type QuestionFormValues,
} from "@/validation/question";

type TournamentQuestionCreateSectionProps = {
  categories: Category[];
  onAdd: (values: QuestionFormValues) => void;
  onCancel: () => void;
};

export function TournamentQuestionCreateSection({
  categories,
  onAdd,
  onCancel,
}: TournamentQuestionCreateSectionProps) {
  const formik = useFormik<QuestionFormValues>({
    initialValues: questionInitialValues(),
    validationSchema: questionSchema("tournament"),
    onSubmit: () => undefined,
  });

  function fieldError(name: keyof QuestionFormValues) {
    return formik.touched[name] ? formik.errors[name] : undefined;
  }

  async function addQuestion(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
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
    onAdd(formik.values);
  }

  return (
    <div className="mt-10 rounded-[24px] border border-purple/30 bg-[#121218] px-5 py-6 sm:px-6">
      <h2 className="text-lg font-semibold text-white">Create tournament specific question</h2>
      <p className="mt-1 text-sm text-zinc-500">
        This question will only be available on this tournament and will not appear in others.
      </p>

      <div className="mt-6">
        <TournamentQuestionFields
          values={formik.values}
          categories={categories}
          fieldError={fieldError}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          onStatusChange={(status) => void formik.setFieldValue("status", status)}
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
          onClick={(event) => void addQuestion(event)}
          className="inline-flex h-12 items-center rounded-full bg-purple px-8 text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.35)]"
        >
          Add Question
        </button>
      </div>
    </div>
  );
}
