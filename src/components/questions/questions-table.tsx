"use client";

import Link from "next/link";
import { ChevronDown, Menu, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { HeaderActions } from "@/components/layout/header-actions";
import { useOpenMenu } from "@/components/layout/admin-shell";
import { TablePagination } from "@/components/ui/table-pagination";
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
  onUsedChange?: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onDelete: (question: Question) => void;
  onToggleUsed?: (question: Question) => void;
  togglingUsedId?: string | null;
  basePath?: string;
  showCategoryFilter?: boolean;
  showUsed?: boolean;
  used?: string;
  toolbarExtra?: React.ReactNode;
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
  onUsedChange,
  onCategoryChange,
  onPageChange,
  onDelete,
  onToggleUsed,
  togglingUsedId = null,
  basePath = "/questions/player",
  showCategoryFilter = true,
  showUsed = false,
  used = "",
  toolbarExtra,
}: QuestionsTableProps) {
  const empty = !loading && questions.length === 0;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const openMenu = useOpenMenu();
  const colSpan = 4 + (showCategoryFilter ? 1 : 0);

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

        {showUsed ? (
          <FilterSelect value={used} onChange={onUsedChange ?? (() => undefined)} placeholder="Used">
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </FilterSelect>
        ) : (
          <FilterSelect value={status} onChange={onStatusChange} placeholder="All Status">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </FilterSelect>
        )}

        {showCategoryFilter ? (
          <FilterSelect value={categoryId} onChange={onCategoryChange} placeholder="All Categories">
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </FilterSelect>
        ) : null}

        {toolbarExtra}
        <Link
          href={`${basePath}/new`}
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
              {showCategoryFilter ? <th className="px-5 py-4 font-medium">Category</th> : null}
              <th className="px-5 py-4 font-medium">
                {showUsed ? (
                  <div>
                    <span>Used</span>
                    <p className="mt-1 text-[11px] font-normal normal-case tracking-normal text-zinc-500">
                      Click Yes/No to toggle
                    </p>
                  </div>
                ) : (
                  "Status"
                )}
              </th>
              <th className="px-5 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-5 py-12 text-center text-sm text-zinc-500">
                  Loading questions...
                </td>
              </tr>
            ) : empty ? (
              <tr>
                <td colSpan={colSpan} className="px-5 py-12 text-center text-sm text-zinc-500">
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
                  {showCategoryFilter ? (
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-purple/15 px-3 py-1 text-xs font-medium text-purple">
                        {question.category_name}
                      </span>
                    </td>
                  ) : null}
                  <td className="px-5 py-4">
                    {showUsed ? (
                      <button
                        type="button"
                        disabled={Boolean(onToggleUsed) && togglingUsedId === question.id}
                        onClick={() => onToggleUsed?.(question)}
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
                          question.used ? "bg-green/15 text-green" : "bg-red-500/15 text-red-400"
                        } ${onToggleUsed ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                        aria-label={`Mark ${question.title} as ${question.used ? "not used" : "used"}`}
                      >
                        {question.used ? "Yes" : "No"}
                      </button>
                    ) : (
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          question.status === "active"
                            ? "bg-green/15 text-green"
                            : "bg-zinc-700/80 text-zinc-300"
                        }`}
                      >
                        {question.status === "active" ? "Active" : "Inactive"}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`${basePath}/${question.id}/edit`}
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
          <TablePagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
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
