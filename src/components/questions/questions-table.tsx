"use client";

import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, Menu, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { HeaderActions } from "@/components/layout/header-actions";
import { useOpenMenu } from "@/components/layout/admin-shell";
import type { Category, Question } from "@/lib/questions";

function padIndex(index: number) {
  return String(index).padStart(2, "0");
}

type QuestionsTableProps = {
  questions: Question[];
  categories: Category[];
  total: number;
  loading: boolean;
  query: string;
  status: string;
  categoryId: string;
  page: number;
  pageSize: number;
  totalPages: number;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onDelete: (question: Question) => void;
};

export function QuestionsTable({
  questions,
  categories,
  total,
  loading,
  query,
  status,
  categoryId,
  page,
  pageSize,
  totalPages,
  onQueryChange,
  onStatusChange,
  onCategoryChange,
  onPageChange,
  onDelete,
}: QuestionsTableProps) {
  const empty = !loading && questions.length === 0;
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
              Questions({total})
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Create and manage all questions used in games and quizzes
            </p>
          </div>
        </div>
        <HeaderActions />
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search questions by title or keyword"
            className="h-12 w-full rounded-full border border-white/8 bg-[#14141a] pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50"
          />
        </label>

        <FilterSelect value={status} onChange={onStatusChange} placeholder="All Status">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </FilterSelect>

        <FilterSelect value={categoryId} onChange={onCategoryChange} placeholder="All Categories">
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </FilterSelect>

        <Link
          href="/questions/player/new"
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-purple px-6 text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.4)] transition hover:bg-[#6d4dff]"
        >
          <Plus className="size-4" />
          Add New Question
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-[28px] bg-card">
        <table className="min-w-full text-left">
          <thead>
            <tr className="bg-[#16122A] text-xs font-medium uppercase tracking-wide text-zinc-400">
              <th className="px-5 py-4 font-medium">#</th>
              <th className="px-5 py-4 font-medium">Question Title</th>
              <th className="px-5 py-4 font-medium">Category</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-zinc-500">
                  Loading questions...
                </td>
              </tr>
            ) : empty ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-zinc-500">
                  No questions found.
                </td>
              </tr>
            ) : (
              questions.map((question, index) => (
                <tr key={question.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-4 text-sm text-zinc-400">
                    {padIndex((page - 1) * pageSize + index + 1)}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-white">{question.title}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-full bg-purple/15 px-3 py-1 text-xs font-medium text-purple">
                      {question.category_name}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        question.status === "active"
                          ? "bg-green/15 text-green"
                          : "bg-zinc-700/80 text-zinc-300"
                      }`}
                    >
                      {question.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/questions/player/${question.id}/edit`}
                        className="text-zinc-400 transition hover:text-white"
                        aria-label={`Edit ${question.title}`}
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDelete(question)}
                        className="text-red-400 transition hover:text-red-300"
                        aria-label={`Delete ${question.title}`}
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
                  n === page
                    ? "bg-purple font-medium text-white"
                    : "border border-white/10 text-zinc-300"
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

function FilterSelect({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 appearance-none rounded-full border border-white/8 bg-[#16122A] py-0 pl-5 pr-11 text-sm text-zinc-300 outline-none"
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
    </div>
  );
}
