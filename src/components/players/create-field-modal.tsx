"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { ErrorText } from "@/components/form/error-text";
import { api, ApiError } from "@/lib/api";
import type { PlayerCustomField } from "@/lib/players";
import { CUSTOM_FIELD_ROLES, type CustomFieldAppliesTo } from "@/data/cricket";

const inputClass =
  "h-12 w-full rounded-full border bg-[#0c0c10] px-5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50";

type Values = {
  name: string;
  applies_to: CustomFieldAppliesTo | "";
};

const schema = Yup.object({
  name: Yup.string().trim().required("Field name is required").min(2, "Enter at least 2 characters").max(120, "Must be 120 characters or fewer"),
  applies_to: Yup.string()
    .oneOf(["batter", "bowler", "all-rounder", "wicketkeeper"], "Select who this field applies to")
    .required("Select who this field applies to"),
});

type CreateFieldModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (field: PlayerCustomField) => void;
};

export function CreateFieldModal({ open, onClose, onCreated }: CreateFieldModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const formik = useFormik<Values>({
    initialValues: { name: "", applies_to: "" },
    validationSchema: schema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus("");
      try {
        const field = await api<PlayerCustomField>("/api/v1/player-fields", {
          method: "POST",
          body: JSON.stringify({
            name: values.name.trim(),
            applies_to: values.applies_to,
          }),
        });
        helpers.resetForm();
        onCreated(field);
        onClose();
      } catch (err) {
        helpers.setStatus(err instanceof ApiError ? err.message : "Could not create field.");
      }
    },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      formik.resetForm();
      dialog.showModal();
      window.setTimeout(() => nameRef.current?.focus(), 0);
    }
    if (!open && dialog.open) {
      dialog.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when opening
  }, [open]);

  function fieldError(name: keyof Values) {
    return formik.touched[name] ? formik.errors[name] : undefined;
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="app-modal w-[min(100%-2rem,32rem)] rounded-[28px] border-0 bg-[#14141a] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void formik.submitForm();
        }}
        noValidate
        className="px-6 py-8 sm:px-8"
      >
        <h2 id={titleId} className="text-[28px] font-semibold tracking-tight text-white">
          Create New Field
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Add a custom statistic for batters, bowlers, all-rounders, or wicketkeepers. Existing players stay empty until filled in.
        </p>

        {formik.status ? (
          <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {formik.status}
          </p>
        ) : null}

        <label className="mt-8 block">
          <span className="mb-2 block text-sm font-medium text-white">
            Field name<span className="text-red-400">*</span>
          </span>
          <input
            ref={nameRef}
            name="name"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="e.g. Economy rate"
            className={`${inputClass} ${fieldError("name") ? "border-red-500/50" : "border-white/8"}`}
          />
          <ErrorText message={fieldError("name")} />
        </label>

        <fieldset className="mt-6">
          <legend className="mb-3 text-sm font-medium text-white">
            Associate with<span className="text-red-400">*</span>
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {CUSTOM_FIELD_ROLES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => formik.setFieldValue("applies_to", option.value)}
                className={`rounded-[22px] border px-4 py-4 text-left text-sm font-medium transition ${
                  formik.values.applies_to === option.value
                    ? "border-purple bg-purple/10 text-white"
                    : "border-white/8 bg-[#0c0c10] text-zinc-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <ErrorText message={fieldError("applies_to")} />
        </fieldset>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 items-center rounded-full border border-purple px-8 text-sm font-medium text-purple"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={formik.isSubmitting}
            onClick={() => void formik.submitForm()}
            className="inline-flex h-12 items-center rounded-full bg-purple px-8 text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.35)] disabled:opacity-60"
          >
            {formik.isSubmitting ? "Saving..." : "Save Field"}
          </button>
        </div>
      </form>
    </dialog>,
    document.body,
  );
}
