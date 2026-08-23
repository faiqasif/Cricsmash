import * as Yup from "yup";
import type { Question, QuestionPayload, QuestionStatus, QuestionType } from "@/lib/questions";

export type QuestionFormValues = {
  title: string;
  category_id: string;
  status: QuestionStatus;
};

export function questionInitialValues(question?: Question): QuestionFormValues {
  return {
    title: question?.title ?? "",
    category_id: question?.category_id ?? "",
    status: question?.status ?? "active",
  };
}

export const questionSchema = Yup.object({
  title: Yup.string()
    .trim()
    .required("Question title is required")
    .min(8, "Enter at least 8 characters")
    .max(500, "Must be 500 characters or fewer"),
  category_id: Yup.string().required("Select a category"),
  status: Yup.string().oneOf(["active", "inactive"], "Select a status").required("Select a status"),
});

export function questionPayloadFromValues(
  values: QuestionFormValues,
  type: QuestionType,
): QuestionPayload {
  return {
    type,
    title: values.title.trim(),
    category_id: values.category_id,
    status: values.status,
  };
}
