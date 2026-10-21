"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDeleteModal, openConfirm } from "@/components/ui/confirm-delete-modal";
import { GeneralQuestionImport } from "@/components/questions/general-question-import";
import { QuestionsTable } from "@/components/questions/questions-table";
import { api } from "@/lib/api";
import type { Category, CategoryListResponse, Question, QuestionListResponse } from "@/lib/questions";

export default function GeneralQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [used, setUsed] = useState("");
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Question | null>(null);
  const [togglingUsedId, setTogglingUsedId] = useState<string | null>(null);

  useEffect(() => {
    api<CategoryListResponse>("/api/v1/categories?page_size=50")
      .then((data) => setCategories(data.items))
      .catch(() => setCategories([]));
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("type", "general");
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      if (query.trim()) params.set("q", query.trim());
      if (used) params.set("used", used);
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
      if (!silent) setLoading(false);
    }
  }, [query, used, page, pageSize]);

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
        status=""
        used={used}
        categoryId=""
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        basePath="/questions/general"
        showCategoryFilter={false}
        showUsed
        toolbarExtra={<GeneralQuestionImport onSaved={() => load(true)} />}
        onQueryChange={(value) => {
          setQuery(value);
          setPage(1);
        }}
        onStatusChange={() => undefined}
        onUsedChange={(value) => {
          setUsed(value);
          setPage(1);
        }}
        onCategoryChange={() => undefined}
        onPageChange={setPage}
        onDelete={(question) => openConfirm(setPendingDelete, question)}
        onToggleUsed={async (question) => {
          setTogglingUsedId(question.id);
          setError("");
          try {
            await api(`/api/v1/questions/${question.id}/used`, {
              method: "PATCH",
              body: JSON.stringify({ used: !question.used }),
            });
            await load(true);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not update Used.");
          } finally {
            setTogglingUsedId(null);
          }
        }}
        togglingUsedId={togglingUsedId}
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
