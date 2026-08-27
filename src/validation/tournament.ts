import type { Question } from "@/lib/questions";
import type { Tournament, TournamentPayload } from "@/lib/tournaments";

export type TournamentAnswerFormValues = {
  question_id: string;
  client_id: string;
  title: string;
  category_id: string;
  category_name: string;
  status: "active" | "inactive";
  is_new: boolean;
  is_specific: boolean;
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

type AnswerFieldErrors = Partial<Record<keyof TournamentAnswerFormValues, string>>;

export type TournamentFormErrors = {
  name?: string;
  answers?: Array<AnswerFieldErrors | undefined>;
};

function answerIsBlank(value: {
  option_1?: string;
  option_2?: string;
  option_3?: string;
  option_4?: string;
  correct_option?: string;
}) {
  const options = [value.option_1, value.option_2, value.option_3, value.option_4].map(
    (item) => item?.trim() ?? "",
  );
  return options.every((item) => !item) && !String(value.correct_option ?? "").trim();
}

export function validateTournamentForm(values: TournamentFormValues): TournamentFormErrors {
  const errors: TournamentFormErrors = {};
  const name = values.name.trim();
  if (!name) {
    errors.name = "Tournament name is required";
  } else if (name.length < 2) {
    errors.name = "Enter at least 2 characters";
  } else if (name.length > 200) {
    errors.name = "Must be 200 characters or fewer";
  }

  const answerErrors: Array<AnswerFieldErrors | undefined> = [];
  values.answers.forEach((answer, index) => {
    if (answerIsBlank(answer)) return;
    const row: AnswerFieldErrors = {};
    const options = [answer.option_1, answer.option_2, answer.option_3, answer.option_4].map(
      (item) => item.trim(),
    );
    options.forEach((option, optionIndex) => {
      if (!option) {
        row[`option_${optionIndex + 1}` as keyof TournamentAnswerFormValues] = "This option is required";
      } else if (option.length > 200) {
        row[`option_${optionIndex + 1}` as keyof TournamentAnswerFormValues] =
          "Must be 200 characters or fewer";
      }
    });
    if (new Set(options.filter(Boolean).map((item) => item.toLowerCase())).size !== options.filter(Boolean).length) {
      row.option_4 = "Each option must be different";
    }
    if (!["1", "2", "3", "4"].includes(answer.correct_option)) {
      row.correct_option = "Select the correct option";
    }
    if (Object.keys(row).length > 0) {
      answerErrors[index] = row;
    }
  });
  if (answerErrors.some(Boolean)) {
    errors.answers = answerErrors;
  }
  return errors;
}

export function firstTournamentError(errors: TournamentFormErrors): string | undefined {
  if (errors.name) return errors.name;
  for (const row of errors.answers ?? []) {
    if (!row) continue;
    for (const message of Object.values(row)) {
      if (message) return message;
    }
  }
  return undefined;
}

export function tournamentPayloadFromValues(values: TournamentFormValues): TournamentPayload {
  return {
    name: values.name.trim(),
    answers: values.answers
      .filter((item) => !item.is_new && !answerIsBlank(item))
      .map((item) => ({
        question_id: item.question_id,
        option_1: item.option_1.trim(),
        option_2: item.option_2.trim(),
        option_3: item.option_3.trim(),
        option_4: item.option_4.trim(),
        correct_option: Number.parseInt(item.correct_option, 10),
      })),
    new_questions: values.answers
      .filter((item) => item.is_new)
      .map((item) => {
        const payload: TournamentPayload["new_questions"][number] = {
          title: item.title.trim(),
          category_id: item.category_id,
          status: item.status,
        };
        if (!answerIsBlank(item)) {
          payload.option_1 = item.option_1.trim();
          payload.option_2 = item.option_2.trim();
          payload.option_3 = item.option_3.trim();
          payload.option_4 = item.option_4.trim();
          payload.correct_option = Number.parseInt(item.correct_option, 10);
        }
        return payload;
      }),
  };
}

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
      client_id: template.id,
      title: template.title,
      category_id: template.category_id,
      category_name: template.category_name,
      status: template.status,
      is_new: false,
      is_specific: Boolean(template.tournament_id),
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
      client_id: item.question_id,
      title: item.question_title,
      category_id: item.question_category_id || "",
      category_name: "",
      status: item.question_status === "inactive" ? "inactive" : "active",
      is_new: false,
      is_specific: Boolean(item.question_tournament_id),
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
