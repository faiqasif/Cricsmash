"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { downloadPlayerTemplate, readPlayerWorkbook } from "@/lib/player-excel";
import type { PlayerCustomField } from "@/lib/players";
import type { ParsedPlayerRow } from "@/lib/player-sheet";

type ShownRow = ParsedPlayerRow & { saved?: boolean };

type ImportResult = {
  saved: { row: number; id: string; name: string }[];
  failed: { row: number; message: string }[];
};

export function PlayerImportActions({ onSaved }: { onSaved: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<PlayerCustomField[]>([]);
  const [rows, setRows] = useState<ShownRow[]>([]);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const ready = rows.filter((row) => row.payload && !row.saved);
  const blocked = rows.filter((row) => row.error);

  async function loadFields() {
    try {
      return await api<PlayerCustomField[]>("/api/v1/player-fields");
    } catch {
      return [];
    }
  }

  async function download() {
    const next = fields.length ? fields : await loadFields();
    setFields(next);
    await downloadPlayerTemplate(next);
  }

  function resetFile() {
    setRows([]);
    setIgnored([]);
    setFileName("");
    setError("");
    setSavedCount(0);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setReading(true);
    setError("");
    setSavedCount(0);
    try {
      const nextFields = await loadFields();
      setFields(nextFields);
      const parsed = await readPlayerWorkbook(await file.arrayBuffer(), nextFields);
      if (parsed.rows.length === 0) {
        setRows([]);
        setIgnored(parsed.ignoredColumns);
        setError("The Players sheet has no filled rows.");
      } else {
        setRows(parsed.rows);
        setIgnored(parsed.ignoredColumns);
      }
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
      const result = await api<ImportResult>("/api/v1/players/import", {
        method: "POST",
        body: JSON.stringify({
          players: ready.map((row) => ({ row: row.row, player: row.payload })),
        }),
      });
      const failed = new Map(result.failed.map((item) => [item.row, item.message]));
      const saved = new Set(result.saved.map((item) => item.row));
      setRows((current) =>
        current.map((row) => {
          if (saved.has(row.row)) return { ...row, payload: null, error: "", saved: true };
          const message = failed.get(row.row);
          return message ? { ...row, payload: null, error: message } : row;
        }),
      );
      setSavedCount(result.saved.length);
      if (result.saved.length) await onSaved();
      if (!result.failed.length) setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Could not save the players.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void download()}
        className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 bg-[#14141a] px-5 text-sm font-medium text-white transition hover:border-purple/50"
      >
        <Download className="size-4" />
        Excel template
      </button>
      <button
        type="button"
        onClick={() => {
          resetFile();
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
        className="app-modal w-[min(100%-2rem,920px)] rounded-[28px] border-0 bg-[#14141a] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        onCancel={(event) => {
          event.preventDefault();
          if (!saving) setOpen(false);
        }}
        onClick={(event) => {
          if (!saving && event.target === event.currentTarget) setOpen(false);
        }}
      >
        <div className="px-6 py-7 sm:px-8">
          <div className="flex size-12 items-center justify-center rounded-full bg-purple/15 text-purple">
            <FileSpreadsheet className="size-5" />
          </div>
          <h2 id={titleId} className="mt-5 text-2xl font-semibold tracking-tight">
            Import players
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Download the template, fill one player per row on the Players sheet, then import it. Valid rows are shown here before they are saved.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void download()}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-purple px-5 text-sm font-medium text-purple"
            >
              <Download className="size-4" />
              Download template
            </button>
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-purple px-5 text-sm font-medium text-white">
              <Upload className="size-4" />
              {reading ? "Reading..." : "Choose file"}
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(event) => void onFile(event.target.files?.[0])}
              />
            </label>
            {fileName ? <span className="text-sm text-zinc-400">{fileName}</span> : null}
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
          ) : null}
          {ignored.length ? (
            <p className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Ignored columns: {ignored.join(", ")}
            </p>
          ) : null}
          {savedCount ? (
            <p className="mt-4 rounded-2xl border border-green/30 bg-green/10 px-4 py-3 text-sm text-green">
              Saved {savedCount} {savedCount === 1 ? "player" : "players"}.
            </p>
          ) : null}

          {rows.length ? (
            <>
              <p className="mt-5 text-sm text-zinc-400">
                {ready.length} ready to save. {blocked.length} need a fix.
              </p>
              <div className="mt-3 max-h-80 overflow-auto rounded-2xl border border-white/8">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-[#16122A] text-xs uppercase tracking-wide text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Row</th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Country</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Check</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.row} className="border-t border-white/8">
                        <td className="px-4 py-3 text-zinc-400">{row.row}</td>
                        <td className="px-4 py-3">{row.name || "—"}</td>
                        <td className="px-4 py-3">{row.country || "—"}</td>
                        <td className="px-4 py-3">{row.role || "—"}</td>
                        <td className="px-4 py-3">{row.status || "—"}</td>
                        <td className={`px-4 py-3 ${row.error ? "text-red-300" : "text-green"}`}>
                          {row.saved ? "Saved" : row.error || "Ready"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => setOpen(false)}
              className="inline-flex h-12 items-center rounded-full border border-purple px-8 text-sm font-medium text-purple disabled:opacity-50"
            >
              Close
            </button>
            <button
              type="button"
              disabled={saving || ready.length === 0}
              onClick={() => void save()}
              className="inline-flex h-12 items-center rounded-full bg-purple px-8 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : `Save ${ready.length} ${ready.length === 1 ? "player" : "players"}`}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
