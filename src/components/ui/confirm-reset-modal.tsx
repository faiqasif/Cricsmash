"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ApiError } from "@/lib/api";

type ConfirmResetModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function ConfirmResetModal({
  open,
  title,
  description,
  confirmLabel = "Reset",
  onClose,
  onConfirm,
}: ConfirmResetModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setError("");
      setLoading(false);
      dialog.showModal();
      window.setTimeout(() => cancelRef.current?.focus(), 0);
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  async function handleConfirm() {
    setError("");
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Could not reset.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="app-modal w-[min(100%-2rem,32rem)] rounded-[28px] border-0 bg-[#14141a] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      onCancel={(event) => {
        event.preventDefault();
        if (!loading) onClose();
      }}
      onClick={(event) => {
        if (!loading && event.target === event.currentTarget) onClose();
      }}
    >
      <div className="px-6 py-10 text-center sm:px-10">
        <h2 id={titleId} className="text-[22px] font-semibold leading-snug tracking-tight text-white sm:text-2xl">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-white/90">{description}</p>

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            ref={cancelRef}
            type="button"
            disabled={loading}
            onClick={onClose}
            className="inline-flex h-12 min-w-[120px] items-center justify-center rounded-full border border-purple px-8 text-sm font-medium text-purple disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleConfirm()}
            className="inline-flex h-12 min-w-[120px] items-center justify-center rounded-full bg-purple px-8 text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.45)] transition hover:bg-[#6d4dff] disabled:opacity-60"
          >
            {loading ? "Resetting..." : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
