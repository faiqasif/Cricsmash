"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDeleteModal, openConfirm } from "@/components/ui/confirm-delete-modal";
import { QuestionsTable } from "@/components/questions/questions-table";
import { api } from "@/lib/api";
import type { Category, CategoryListResponse, Question, QuestionListResponse } from "@/lib/questions";

export default function PlayerQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Question | null>(null);

  useEffect(() => {
    api<CategoryListResponse>("/api/v1/categories?page_size=50")
      .then((data) => setCategories(data.items))
      .catch(() => setCategories([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("type", "player");
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      if (query.trim()) params.set("q", query.trim());
      if (status) params.set("status", status);
      if (categoryId) params.set("category_id", categoryId);
      const data = await api<QuestionListResponse>(`/api/v1/questions?${params.toString()}`);
      if (data.total_pages > 0 && page > data.total_pages) {
        setPage(data.total_pages);
        return;
      }
      setQuestions(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load questions.");
      setQuestions([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [query, status, categoryId, page, pageSize]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  return (
    <div>
      {error ? (
        <p className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      <QuestionsTable
        questions={questions}
        categories={categories}
        total={total}
        loading={loading}
        query={query}
        status={status}
        categoryId={categoryId}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onQueryChange={(value) => {
          setQuery(value);
          setPage(1);
        }}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        onCategoryChange={(value) => {
          setCategoryId(value);
          setPage(1);
        }}
        onPageChange={setPage}
        onDelete={(question) => openConfirm(setPendingDelete, question)}
      />
      <ConfirmDeleteModal
        open={Boolean(pendingDelete)}
        title="Delete question?"
        description={
          pendingDelete
            ? `“${pendingDelete.title}” will be permanently deleted. This cannot be undone.`
            : ""
        }
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await api(`/api/v1/questions/${pendingDelete.id}`, { method: "DELETE" });
          await load();
        }}
      />
    </div>
  );
}
