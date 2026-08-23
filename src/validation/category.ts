import * as Yup from "yup";
import type { Category, CategoryPayload } from "@/lib/questions";

export type CategoryFormValues = {
  name: string;
  daily_question_limit: string;
};

export function categoryInitialValues(category?: Category): CategoryFormValues {
  return {
    name: category?.name ?? "",
    daily_question_limit: category?.daily_question_limit != null ? String(category.daily_question_limit) : "",
  };
}

export const categorySchema = Yup.object({
  name: Yup.string().trim().required("Category name is required").min(2, "Enter at least 2 characters").max(120, "Must be 120 characters or fewer"),
  daily_question_limit: Yup.string()
    .trim()
    .required("Number of questions is required")
    .test("int", "Enter a whole number between 1 and 50", (value) => {
      if (!value) return false;
      if (!/^\d+$/.test(value)) return false;
      const parsed = Number.parseInt(value, 10);
      return parsed >= 1 && parsed <= 50;
    }),
});

export function categoryPayloadFromValues(values: CategoryFormValues): CategoryPayload {
  return {
    name: values.name.trim(),
    daily_question_limit: Number.parseInt(values.daily_question_limit, 10),
  };
}
