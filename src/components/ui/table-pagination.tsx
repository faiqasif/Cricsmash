"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function TablePagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 text-zinc-300 disabled:opacity-40"
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-[5.5rem] text-center text-sm text-zinc-300">
        Page {page}/{totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 text-zinc-300 disabled:opacity-40"
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
