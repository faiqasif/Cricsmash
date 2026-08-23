"use client";

import { useEffect, useId, useRef } from "react";
import { useFormik } from "formik";
import { ErrorText } from "@/components/form/error-text";
import { api, ApiError } from "@/lib/api";
import type { Category } from "@/lib/questions";
import {
  categoryInitialValues,
  categoryPayloadFromValues,
  categorySchema,
  type CategoryFormValues,
} from "@/validation/category";

const inputClass =
  "h-12 w-full rounded-full border bg-[#0c0c10] px-5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50";

type CategoryFormModalProps = {
  open: boolean;
  category?: Category | null;
  onClose: () => void;
  onSaved: () => void;
};

export function CategoryFormModal({ open, category, onClose, onSaved }: CategoryFormModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const editing = Boolean(category);

  const formik = useFormik<CategoryFormValues>({
    initialValues: categoryInitialValues(category ?? undefined),
    enableReinitialize: true,
    validationSchema: categorySchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus("");
      try {
        const body = categoryPayloadFromValues(values);
        if (editing && category) {
          await api(`/api/v1/categories/${category.id}`, {
            method: "PUT",
            body: JSON.stringify(body),
          });
        } else {
          await api("/api/v1/categories", {
            method: "POST",
            body: JSON.stringify(body),
          });
        }
        onSaved();
        onClose();
      } catch (err) {
        helpers.setStatus(err instanceof ApiError ? err.message : "Could not save category.");
      }
    },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      window.setTimeout(() => nameRef.current?.focus(), 0);
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function fieldError(name: keyof CategoryFormValues) {
    return formik.touched[name] ? formik.errors[name] : undefined;
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="app-modal w-[min(100%-2rem,48rem)] rounded-[28px] border-0 bg-[#14141a] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form onSubmit={formik.handleSubmit} noValidate className="px-6 py-8 sm:px-10 sm:py-10">
        <h2 id={titleId} className="text-[32px] font-semibold tracking-tight text-white">
          {editing ? "Edit Category" : "Add a new Category"}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {editing ? "Update this category for games and quizzes." : "Create a new Category to be used in games."}
        </p>

        {formik.status ? (
          <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {formik.status}
          </p>
        ) : null}

        <label className="mt-8 block">
          <span className="mb-2 block text-sm font-medium text-white">
            Category<span className="text-red-400">*</span>
          </span>
          <input
            ref={nameRef}
            name="name"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Category Name"
            className={`${inputClass} ${fieldError("name") ? "border-red-500/50" : "border-white/8"}`}
          />
          <ErrorText message={fieldError("name")} />
        </label>

        <label className="mt-6 block">
          <span className="mb-2 block text-sm font-medium text-white">
            Number of questions<span className="text-red-400">*</span>
          </span>
          <input
            name="daily_question_limit"
            inputMode="numeric"
            value={formik.values.daily_question_limit}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Add number of questions"
            className={`${inputClass} ${fieldError("daily_question_limit") ? "border-red-500/50" : "border-white/8"}`}
          />
          <ErrorText message={fieldError("daily_question_limit")} />
        </label>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 items-center rounded-full border border-purple px-8 text-sm font-medium text-purple"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={formik.isSubmitting}
            className="inline-flex h-12 items-center rounded-full bg-purple px-8 text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.35)] disabled:opacity-60"
          >
            {formik.isSubmitting ? "Saving..." : "Save Category"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
