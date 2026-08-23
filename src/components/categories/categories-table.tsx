"use client";

import { ChevronLeft, ChevronRight, Menu, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { HeaderActions } from "@/components/layout/header-actions";
import { useOpenMenu } from "@/components/layout/admin-shell";
import type { Category } from "@/lib/questions";

function padIndex(index: number) {
  return String(index).padStart(2, "0");
}

type CategoriesTableProps = {
  categories: Category[];
  total: number;
  loading: boolean;
  query: string;
  page: number;
  pageSize: number;
  totalPages: number;
  onQueryChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onAdd: () => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
};

export function CategoriesTable({
  categories,
  total,
  loading,
  query,
  page,
  pageSize,
  totalPages,
  onQueryChange,
  onPageChange,
  onAdd,
  onEdit,
  onDelete,
}: CategoriesTableProps) {
  const empty = !loading && categories.length === 0;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const openMenu = useOpenMenu();

  return (
    <div>
      <div className="flex items-center justify-between gap-4 rounded-[28px] bg-[#14141a] px-5 py-5 sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={openMenu}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-white sm:text-[32px]">
              Categories
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Create and manage all categories used in games and quizzes.
            </p>
          </div>
        </div>
        <HeaderActions />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search categories by name"
            className="h-12 w-full rounded-full border border-white/8 bg-[#14141a] pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50"
          />
        </label>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-purple px-6 text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.4)] transition hover:bg-[#6d4dff]"
        >
          <Plus className="size-4" />
          Add New Category
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-[28px] bg-card">
        <table className="min-w-full text-left">
          <thead>
            <tr className="bg-[#16122A] text-xs font-medium uppercase tracking-wide text-zinc-400">
              <th className="px-5 py-4 font-medium">#</th>
              <th className="px-5 py-4 font-medium">Category</th>
              <th className="px-5 py-4 font-medium">Number of Questions</th>
              <th className="px-5 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-sm text-zinc-500">
                  Loading categories...
                </td>
              </tr>
            ) : empty ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-sm text-zinc-500">
                  No categories found.
                </td>
              </tr>
            ) : (
              categories.map((category, index) => (
                <tr key={category.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-4 text-sm text-zinc-400">
                    {padIndex((page - 1) * pageSize + index + 1)}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-full bg-purple/15 px-3 py-1 text-xs font-medium text-purple">
                      {category.name}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-white">{category.daily_question_limit}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onEdit(category)}
                        className="text-zinc-400 transition hover:text-white"
                        aria-label={`Edit ${category.name}`}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(category)}
                        className="text-red-400 transition hover:text-red-300"
                        aria-label={`Delete ${category.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 0 ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-500">
            Showing {from}-{to} of {total}
          </p>
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onPageChange(n)}
                className={`inline-flex size-10 items-center justify-center rounded-full text-sm ${
                  n === page ? "bg-purple font-medium text-white" : "border border-white/10 text-zinc-300"
                }`}
              >
                {n}
              </button>
            ))}
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
        </div>
      ) : null}
    </div>
  );
}
