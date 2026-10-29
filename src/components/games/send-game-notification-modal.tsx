"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { ApiError } from "@/lib/api";
import { sendGameNotification } from "@/lib/notifications";

type SendGameNotificationModalProps = {
  open: boolean;
  game: string;
  gameTitle: string;
  playDate: string;
  dateLabel: string;
  detail: string;
  onClose: () => void;
  onSent: () => void;
};

const fieldClass =
  "w-full rounded-2xl border border-white/8 bg-[#0c0c10] px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50";

export function SendGameNotificationModal({
  open,
  game,
  gameTitle,
  playDate,
  dateLabel,
  detail,
  onClose,
  onSent,
}: SendGameNotificationModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setTitle(`${gameTitle} is ready`);
      setBody(detail ? `${gameTitle} for ${dateLabel}: ${detail}` : `Play ${gameTitle} for ${dateLabel}.`);
      setError("");
      setLoading(false);
      dialog.showModal();
      window.setTimeout(() => cancelRef.current?.focus(), 0);
    }
    if (!open && dialog.open) dialog.close();
  }, [dateLabel, detail, gameTitle, open]);

  async function handleSend() {
    setError("");
    setLoading(true);
    try {
      await sendGameNotification({
        title: title.trim(),
        body: body.trim(),
        game,
        play_date: playDate,
      });
      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Could not send the notification.");
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
      <div className="px-6 py-8 sm:px-8">
        <div className="flex size-12 items-center justify-center rounded-full bg-purple/20 text-purple">
          <Bell className="size-5" />
        </div>
        <h2 id={titleId} className="mt-5 text-2xl font-semibold tracking-tight text-white">
          Send notification
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          {gameTitle}
          {dateLabel ? ` for ${dateLabel}` : ""}
          {detail ? ` · ${detail}` : ""}. The saved game is included in the notification data.
        </p>

        <label className="mt-6 block">
          <span className="mb-2 block text-sm font-medium text-white">Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={`${fieldClass} h-12`}
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-medium text-white">Message</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            className={`${fieldClass} py-3`}
          />
        </label>

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            ref={cancelRef}
            type="button"
            disabled={loading}
            onClick={onClose}
            className="inline-flex h-12 items-center rounded-full border border-purple px-8 text-sm font-medium text-purple disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || !title.trim() || !body.trim()}
            onClick={() => void handleSend()}
            className="inline-flex h-12 items-center rounded-full bg-purple px-8 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
