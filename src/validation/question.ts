import * as Yup from "yup";
import type { Question, QuestionPayload, QuestionStatus, QuestionType } from "@/lib/questions";

export type QuestionFormValues = {
  title: string;
  category_id: string;
  status: QuestionStatus;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  correct_option: string;
};

const optionSchema = Yup.string()
  .trim()
  .required("This option is required")
  .max(200, "Must be 200 characters or fewer");

export function questionInitialValues(question?: Question): QuestionFormValues {
  return {
    title: question?.title ?? "",
    category_id: question?.category_id ?? "",
    status: question?.status ?? "active",
    option_1: question?.option_1 ?? "",
    option_2: question?.option_2 ?? "",
    option_3: question?.option_3 ?? "",
    option_4: question?.option_4 ?? "",
    correct_option: question?.correct_option != null ? String(question.correct_option) : "",
  };
}

export function questionSchema(type: QuestionType) {
  const base = {
    title: Yup.string()
      .trim()
      .required("Question title is required")
      .min(8, "Enter at least 8 characters")
      .max(500, "Must be 500 characters or fewer"),
    category_id:
      type === "general" ? Yup.string() : Yup.string().required("Select a category"),
    status: Yup.string().oneOf(["active", "inactive"], "Select a status").required("Select a status"),
    option_1: Yup.string(),
    option_2: Yup.string(),
    option_3: Yup.string(),
    option_4: Yup.string(),
    correct_option: Yup.string(),
  };

  if (type !== "general") {
    return Yup.object(base);
  }

  return Yup.object({
    ...base,
    option_1: optionSchema,
    option_2: optionSchema,
    option_3: optionSchema,
    option_4: optionSchema,
    correct_option: Yup.string()
      .oneOf(["1", "2", "3", "4"], "Select the correct option")
      .required("Select the correct option"),
  }).test("unique-options", "Each option must be different", function (value) {
    const options = [value.option_1, value.option_2, value.option_3, value.option_4]
      .map((item) => item?.trim().toLowerCase())
      .filter(Boolean);
    if (new Set(options).size === options.length) return true;
    return this.createError({ path: "option_4", message: "Each option must be different" });
  });
}

export function questionPayloadFromValues(
  values: QuestionFormValues,
  type: QuestionType,
): QuestionPayload {
  const payload: QuestionPayload = {
    type,
    title: values.title.trim(),
    category_id: values.category_id,
    status: values.status,
  };
  if (type === "general") {
    payload.option_1 = values.option_1.trim();
    payload.option_2 = values.option_2.trim();
    payload.option_3 = values.option_3.trim();
    payload.option_4 = values.option_4.trim();
    payload.correct_option = Number.parseInt(values.correct_option, 10);
  }
  return payload;
}
