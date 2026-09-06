"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFormik, type FormikErrors } from "formik";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { ErrorText } from "@/components/form/error-text";
import { TournamentQuestionCreateSection } from "@/components/questions/tournament-question-create-section";
import { ConfirmDeleteModal, openConfirm } from "@/components/ui/confirm-delete-modal";
import { api, ApiError } from "@/lib/api";
import {
  fetchAllCategories,
  fillTournamentTitle,
  isQuizTournamentCategory,
  tournamentQuestionCategories,
  type Category,
  type Question,
} from "@/lib/questions";
import type { Tournament } from "@/lib/tournaments";
import { questionInitialValues, questionPayloadFromValues, type QuestionFormValues } from "@/validation/question";
import {
  firstTournamentError,
  tournamentInitialValues,
  tournamentPayloadFromValues,
  validateTournamentForm,
  type TournamentAnswerFormValues,
  type TournamentFormValues,
} from "@/validation/tournament";

const inputClass =
  "w-full rounded-[22px] border bg-[#0c0c10] px-5 py-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50";
const fieldClass =
  "h-12 w-full rounded-full border bg-[#0c0c10] px-5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50";
const labelClass = "mb-1 block text-sm font-medium text-white";
const OPTION_KEYS = ["option_1", "option_2", "option_3", "option_4"] as const;
const OPTION_LABELS = ["A", "B", "C", "D"] as const;

type TournamentFormProps = {
  templates: Question[];
  tournament?: Tournament;
};

export function TournamentForm({ templates, tournament }: TournamentFormProps) {
  const router = useRouter();
  const editing = Boolean(tournament);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [showSpecificQuestion, setShowSpecificQuestion] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState<TournamentAnswerFormValues | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TournamentAnswerFormValues | null>(null);

  const formik = useFormik<TournamentFormValues>({
    initialValues: tournamentInitialValues(templates, tournament),
    enableReinitialize: true,
    validate: validateTournamentForm,
    onSubmit: async (values, helpers) => {
      helpers.setStatus("");
      helpers.setSubmitting(true);
      try {
        const body = tournamentPayloadFromValues(values);
        if (editing && tournament) {
          await api(`/api/v1/tournaments/${tournament.id}`, {
            method: "PUT",
            body: JSON.stringify(body),
          });
        } else {
          await api("/api/v1/tournaments", {
            method: "POST",
            body: JSON.stringify(body),
          });
        }
        router.push("/tournaments");
        router.refresh();
      } catch (err) {
        helpers.setStatus(err instanceof ApiError ? err.message : "Could not save tournament.");
      } finally {
        helpers.setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    fetchAllCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const questionCategories = useMemo(
    () => tournamentQuestionCategories(categories),
    [categories],
  );

  const quizCategories = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    for (const template of templates) {
      if (template.category_id && template.category_name && isQuizTournamentCategory(template.category_name)) {
        byId.set(template.category_id, { id: template.category_id, name: template.category_name });
      }
    }
    for (const answer of formik.values.answers) {
      if (!answer.category_id) continue;
      const category = categories.find((item) => item.id === answer.category_id);
      const name = category?.name || answer.category_name;
      if (name && isQuizTournamentCategory(name)) {
        byId.set(answer.category_id, { id: answer.category_id, name });
      }
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, templates, formik.values.answers]);

  useEffect(() => {
    if (quizCategories.length === 0) {
      setSelectedCategoryId("");
      return;
    }
    if (!quizCategories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId(quizCategories[0].id);
    }
  }, [quizCategories, selectedCategoryId]);

  const visibleAnswers = formik.values.answers
    .map((answer, index) => ({ answer, index }))
    .filter(({ answer }) => selectedCategoryId && answer.category_id === selectedCategoryId);

  function addSpecificQuestion(values: QuestionFormValues) {
    const category = categories.find((item) => item.id === values.category_id);
    const clientId = `new-${crypto.randomUUID()}`;
    void formik.setFieldValue("answers", [
      ...formik.values.answers,
      {
        question_id: "",
        client_id: clientId,
        title: values.title.trim(),
        category_id: values.category_id,
        category_name: category?.name ?? "",
        status: values.status,
        is_new: true,
        is_specific: true,
        option_1: "",
        option_2: "",
        option_3: "",
        option_4: "",
        correct_option: "",
      },
    ]);
    setSelectedCategoryId(values.category_id);
    setShowSpecificQuestion(false);
    setEditingAnswer(null);
  }

  async function saveSpecificQuestion(values: QuestionFormValues) {
    if (!editingAnswer) return;
    const category = categories.find((item) => item.id === values.category_id);
    if (!editingAnswer.is_new && editingAnswer.question_id) {
      await api(`/api/v1/questions/${editingAnswer.question_id}`, {
        method: "PUT",
        body: JSON.stringify(questionPayloadFromValues(values, "tournament")),
      });
    }
    void formik.setFieldValue(
      "answers",
      formik.values.answers.map((item) =>
        item.client_id === editingAnswer.client_id
          ? {
              ...item,
              title: values.title.trim(),
              category_id: values.category_id,
              category_name: category?.name ?? item.category_name,
              status: values.status,
            }
          : item,
      ),
    );
    setSelectedCategoryId(values.category_id);
    setEditingAnswer(null);
  }

  async function deleteSpecificQuestion(answer: TournamentAnswerFormValues) {
    if (!answer.is_new && answer.question_id) {
      await api(`/api/v1/questions/${answer.question_id}`, { method: "DELETE" });
    }
    void formik.setFieldValue(
      "answers",
      formik.values.answers.filter((item) => item.client_id !== answer.client_id),
    );
    if (editingAnswer?.client_id === answer.client_id) {
      setEditingAnswer(null);
    }
  }

  async function saveTournament() {
    const errors = validateTournamentForm(formik.values);
    const message = firstTournamentError(errors);
    void formik.setErrors(errors as FormikErrors<TournamentFormValues>);
    void formik.setTouched({
      name: true,
      answers: formik.values.answers.map(() => ({
        option_1: true,
        option_2: true,
        option_3: true,
        option_4: true,
        correct_option: true,
      })),
    });
    if (message) {
      formik.setStatus(message);
      return;
    }

    formik.setStatus("");
    formik.setSubmitting(true);
    try {
      const body = tournamentPayloadFromValues(formik.values);
      if (editing && tournament) {
        await api(`/api/v1/tournaments/${tournament.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await api("/api/v1/tournaments", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      router.push("/tournaments");
      router.refresh();
    } catch (err) {
      formik.setStatus(err instanceof ApiError ? err.message : "Could not save tournament.");
    } finally {
      formik.setSubmitting(false);
    }
  }

  function fieldError(name: string) {
    const touched = getPath(formik.touched, name);
    const error = getPath(formik.errors, name);
    return touched ? error : undefined;
  }

  return (
    <>
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void saveTournament();
      }}
      noValidate
      className="pb-10"
    >
      <div className="rounded-[28px] bg-[#14141a] px-6 py-8 sm:px-8">
        <Link
          href="/tournaments"
          className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to tournaments
        </Link>

        <h1 className="text-[32px] font-semibold tracking-tight text-white">
          {editing ? "Edit tournament" : "Add a new Tournament"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Enter a tournament name. Shared question templates will insert that name automatically.
        </p>

        {formik.status ? (
          <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {formik.status}
          </p>
        ) : null}

        <div className="mt-8">
          <label className="block">
            <span className={labelClass}>
              Tournament Name<span className="text-red-400">*</span>
            </span>
            <input
              name="name"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="Enter Tournament Name"
              className={`mt-3 ${fieldClass} ${fieldError("name") ? "border-red-500/50" : "border-white/8"}`}
            />
            <ErrorText message={fieldError("name")} />
          </label>
        </div>

        {showSpecificQuestion ? (
          <TournamentQuestionCreateSection
            categories={questionCategories}
            initialValues={{
              ...questionInitialValues(),
              category_id: selectedCategoryId,
            }}
            previewTournamentName={formik.values.name}
            onSave={addSpecificQuestion}
            onCancel={() => setShowSpecificQuestion(false)}
          />
        ) : editingAnswer ? (
          <TournamentQuestionCreateSection
            key={editingAnswer.client_id}
            categories={questionCategories}
            initialValues={{
              title: editingAnswer.title,
              category_id: editingAnswer.category_id,
              status: editingAnswer.status,
              option_1: "",
              option_2: "",
              option_3: "",
              option_4: "",
              correct_option: "",
            }}
            heading="Edit tournament specific question"
            description="Update this question. It will still only be available on this tournament."
            submitLabel="Save Question"
            previewTournamentName={formik.values.name}
            onSave={saveSpecificQuestion}
            onCancel={() => setEditingAnswer(null)}
          />
        ) : (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setEditingAnswer(null);
                setShowSpecificQuestion(true);
              }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-purple px-6 text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.35)]"
            >
              <Plus className="size-4" />
              Create tournament specific question
            </button>
          </div>
        )}

        {quizCategories.length > 0 ? (
          <div className="mt-8">
            <p className={labelClass}>Category</p>
            <p className="mb-3 text-sm text-zinc-500">
              Select a category from Tournament Questions to see its templates.
            </p>
            <div className="flex flex-wrap gap-2">
              {quizCategories.map((category) => {
                const selected = category.id === selectedCategoryId;
                return (
                  <button
                    type="button"
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`h-10 rounded-full px-5 text-sm font-medium transition ${
                      selected
                        ? "bg-purple text-white"
                        : "border border-white/10 bg-[#121218] text-zinc-300 hover:border-purple/50"
                    }`}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="mt-8 rounded-2xl border border-white/8 bg-[#121218] px-5 py-4 text-sm text-zinc-400">
            No tournament question templates yet.{" "}
            <Link href="/questions/tournament/new" className="text-purple hover:underline">
              Add them in Tournament Questions
            </Link>
            , then return here to fill answers.
          </p>
        )}

        {quizCategories.length > 0 && visibleAnswers.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-white/8 bg-[#121218] px-5 py-4 text-sm text-zinc-400">
            No tournament questions in this category yet.{" "}
            <Link href="/questions/tournament/new" className="text-purple hover:underline">
              Create a tournament question template
            </Link>{" "}
            and assign it to this category.
          </p>
        ) : null}

        {visibleAnswers.map(({ answer, index }, visibleIndex) => (
          <div key={answer.client_id || answer.question_id} className="mt-10">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-white">Question {visibleIndex + 1}</h2>
              {answer.is_specific ? (
                <>
                  <span className="rounded-full border border-purple/40 bg-purple/10 px-3 py-1 text-xs font-medium text-purple">
                    This tournament only
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Edit ${answer.title}`}
                      onClick={() => {
                        setShowSpecificQuestion(false);
                        setEditingAnswer(answer);
                      }}
                      className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:border-purple/40 hover:text-white"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${answer.title}`}
                      onClick={() => openConfirm(setPendingDelete, answer)}
                      className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:border-red-500/40 hover:text-red-400"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </>
              ) : null}
            </div>
            <textarea
              readOnly
              rows={3}
              value={fillTournamentTitle(answer.title, formik.values.name)}
              className={`mt-4 ${inputClass} resize-none border-white/8 text-zinc-200`}
            />

            <p className="mt-4 text-sm text-zinc-500">
              Optional. To include this question, enter four options and select the radio next to
              the correct answer.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {OPTION_KEYS.map((name, optionIndex) => {
                const fieldName = `answers.${index}.${name}`;
                const selected = formik.values.answers[index].correct_option === String(optionIndex + 1);
                return (
                  <div key={name}>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          void formik.setFieldValue(`answers.${index}.correct_option`, String(optionIndex + 1));
                          void formik.setFieldTouched(`answers.${index}.correct_option`, true, false);
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
                          name={fieldName}
                          value={formik.values.answers[index][name]}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          placeholder={`Option ${optionIndex + 1}`}
                          className={`${fieldClass} ${
                            fieldError(fieldName) ? "border-red-500/50" : "border-white/8"
                          }`}
                        />
                      </div>
                    </div>
                    <div className="pl-[52px]">
                      <ErrorText message={fieldError(fieldName)} />
                    </div>
                  </div>
                );
              })}
            </div>
            <ErrorText message={fieldError(`answers.${index}.correct_option`)} />
          </div>
        ))}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/tournaments"
            className="inline-flex h-12 items-center rounded-full border border-purple px-8 text-sm font-medium text-purple"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={formik.isSubmitting}
            className="inline-flex h-12 items-center rounded-full bg-purple px-8 text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.35)] disabled:opacity-60"
          >
            {formik.isSubmitting ? "Saving..." : "Save Tournament"}
          </button>
        </div>
      </div>
    </form>
      <ConfirmDeleteModal
        open={Boolean(pendingDelete)}
        title="Delete question?"
        description={
          pendingDelete
            ? `“${pendingDelete.title}” will be removed from this tournament. This cannot be undone.`
            : ""
        }
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await deleteSpecificQuestion(pendingDelete);
        }}
      />
    </>
  );
}

function getPath(source: unknown, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((current, key) => {
    if (current == null || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
  return typeof value === "string" ? value : undefined;
}
