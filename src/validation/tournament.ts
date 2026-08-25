import * as Yup from "yup";
import type { Question } from "@/lib/questions";
import type { Tournament, TournamentPayload } from "@/lib/tournaments";

export type TournamentAnswerFormValues = {
  question_id: string;
  title: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  correct_option: string;
};

export type TournamentFormValues = {
  name: string;
  answers: TournamentAnswerFormValues[];
};

const optionSchema = Yup.string()
  .trim()
  .required("This option is required")
  .max(200, "Must be 200 characters or fewer");

export function tournamentInitialValues(
  templates: Question[],
  tournament?: Tournament,
): TournamentFormValues {
  const saved = new Map((tournament?.answers ?? []).map((item) => [item.question_id, item]));
  const seen = new Set<string>();
  const answers: TournamentAnswerFormValues[] = [];

  for (const template of templates) {
    const existing = saved.get(template.id);
    seen.add(template.id);
    answers.push({
      question_id: template.id,
      title: template.title,
      option_1: existing?.option_1 ?? "",
      option_2: existing?.option_2 ?? "",
      option_3: existing?.option_3 ?? "",
      option_4: existing?.option_4 ?? "",
      correct_option: existing?.correct_option != null ? String(existing.correct_option) : "",
    });
  }

  for (const item of tournament?.answers ?? []) {
    if (seen.has(item.question_id)) continue;
    answers.push({
      question_id: item.question_id,
      title: item.question_title,
      option_1: item.option_1,
      option_2: item.option_2,
      option_3: item.option_3,
      option_4: item.option_4,
      correct_option: String(item.correct_option),
    });
  }

  return {
    name: tournament?.name ?? "",
    answers,
  };
}

export const tournamentSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Tournament name is required")
    .min(2, "Enter at least 2 characters")
    .max(200, "Must be 200 characters or fewer"),
  answers: Yup.array()
    .of(
      Yup.object({
        question_id: Yup.string().required(),
        title: Yup.string(),
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
      }),
    )
    .required(),
});

export function tournamentPayloadFromValues(values: TournamentFormValues): TournamentPayload {
  return {
    name: values.name.trim(),
    answers: values.answers.map((item) => ({
      question_id: item.question_id,
      option_1: item.option_1.trim(),
      option_2: item.option_2.trim(),
      option_3: item.option_3.trim(),
      option_4: item.option_4.trim(),
      correct_option: Number.parseInt(item.correct_option, 10),
    })),
  };
}
