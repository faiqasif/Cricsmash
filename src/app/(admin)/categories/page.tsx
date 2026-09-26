"use client";

import { useCallback, useEffect, useState } from "react";
import { CategoriesTable } from "@/components/categories/categories-table";
import { CategoryFormModal } from "@/components/categories/category-form";
import { ConfirmDeleteModal, openConfirm } from "@/components/ui/confirm-delete-modal";
import { api } from "@/lib/api";
import type { Category, CategoryListResponse } from "@/lib/questions";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      if (query.trim()) params.set("q", query.trim());
      const data = await api<CategoryListResponse>(`/api/v1/categories?${params.toString()}`);
      if (data.total_pages > 0 && page > data.total_pages) {
        setPage(data.total_pages);
        return;
      }
      setCategories(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load categories.");
      setCategories([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [query, page, pageSize]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
  }, []);

  return (
    <div>
      {error ? (
        <p className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      <CategoriesTable
        categories={categories}
        total={total}
        loading={loading}
        query={query}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onQueryChange={(value) => {
          setQuery(value);
          setPage(1);
        }}
        onPageChange={setPage}
        onAdd={() => {
          setEditing(null);
          window.setTimeout(() => setFormOpen(true), 0);
        }}
        onEdit={(category) => {
          setEditing(category);
          window.setTimeout(() => setFormOpen(true), 0);
        }}
        onDelete={(category) => openConfirm(setPendingDelete, category)}
      />
      {formOpen ? (
        <CategoryFormModal
          key={editing?.id ?? "new"}
          open
          category={editing}
          onClose={closeForm}
          onSaved={() => {
            void load();
          }}
        />
      ) : null}
      <ConfirmDeleteModal
        open={Boolean(pendingDelete)}
        title="Delete category?"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” will be permanently deleted. Categories with assigned questions cannot be deleted.`
            : ""
        }
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await api(`/api/v1/categories/${pendingDelete.id}`, { method: "DELETE" });
          await load();
        }}
      />
    </div>
  );
}
