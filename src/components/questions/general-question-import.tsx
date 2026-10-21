"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { downloadGeneralQuestionTemplate, readGeneralQuestionWorkbook, type GeneralQuestionRow } from "@/lib/general-question-excel";

type ImportResult = {
  saved: { row: number; id: string; title: string }[];
  failed: { row: number; message: string }[];
};

export function GeneralQuestionImport({ onSaved }: { onSaved: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<GeneralQuestionRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ready = rows.filter((row) => !row.error);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setReading(true);
    setError("");
    setSavedCount(0);
    try {
      setRows(await readGeneralQuestionWorkbook(await file.arrayBuffer()));
      setFileName(file.name);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : "Could not read that Excel file.");
    } finally {
      setReading(false);
    }
  }

  async function save() {
    if (!ready.length) return;
    setSaving(true);
    setError("");
    try {
      const result = await api<ImportResult>("/api/v1/questions/import", {
        method: "POST",
        body: JSON.stringify({
          questions: ready.map((row) => ({
            row: row.row,
            title: row.title,
            option_1: row.option_1,
            option_2: row.option_2,
            option_3: row.option_3,
            option_4: row.option_4,
            correct_option: row.correct_option,
            category: row.category,
            used: row.used,
          })),
        }),
      });
      const failed = new Map(result.failed.map((item) => [item.row, item.message]));
      const saved = new Set(result.saved.map((item) => item.row));
      setRows((current) =>
        current.map((row) => {
          if (saved.has(row.row)) return { ...row, error: "" };
          const message = failed.get(row.row);
          return message ? { ...row, error: message } : row;
        }),
      );
      setSavedCount(result.saved.length);
      if (result.saved.length) await onSaved();
      if (!result.failed.length) setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the questions.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void downloadGeneralQuestionTemplate()}
        className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 bg-[#14141a] px-5 text-sm font-medium text-white transition hover:border-purple/50"
      >
        <Download className="size-4" />
        Excel template
      </button>
      <button
        type="button"
        onClick={() => {
          setRows([]);
          setFileName("");
          setError("");
          setSavedCount(0);
          if (fileRef.current) fileRef.current.value = "";
          setOpen(true);
        }}
        className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 bg-[#14141a] px-5 text-sm font-medium text-white transition hover:border-purple/50"
      >
        <Upload className="size-4" />
        Import Excel
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="w-[min(920px,calc(100%-2rem))] rounded-[28px] bg-[#14141a] p-0 text-white backdrop:bg-black/70"
        onClose={() => setOpen(false)}
      >
        <div className="px-6 py-6">
          <h2 id={titleId} className="text-xl font-semibold">
            Import general questions
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Columns are Question Title, Option A, Option B, Option C, Option D, Correct option, Category, and Status. Status defaults to Used=No. You can import another file whenever you add more questions.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="mt-4 block w-full text-sm text-zinc-300"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
          {fileName ? <p className="mt-2 text-xs text-zinc-500">{fileName}</p> : null}
          {reading ? <p className="mt-3 text-sm text-zinc-400">Reading the file…</p> : null}
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          {savedCount ? <p className="mt-3 text-sm text-emerald-300">Saved {savedCount} questions.</p> : null}
          {rows.length ? (
            <div className="mt-4 max-h-80 overflow-auto rounded-2xl border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#16122A] text-xs uppercase text-zinc-400">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Question</th>
                    <th className="px-3 py-2">Correct</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.row} className="border-t border-white/8">
                      <td className="px-3 py-2">{row.row}</td>
                      <td className="px-3 py-2">
                        <span className="block">{row.title}</span>
                        {row.error ? <span className="block text-xs text-red-300">{row.error}</span> : null}
                      </td>
                      <td className="px-3 py-2">{row.correct_option ? String.fromCharCode(64 + row.correct_option) : "—"}</td>
                      <td className="px-3 py-2">{row.used ? "Used=Yes" : "Used=No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-full px-5 text-sm text-zinc-300">
              Close
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || ready.length === 0}
              className="h-11 rounded-full bg-purple px-5 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : `Save ${ready.length} questions`}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
