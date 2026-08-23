"use client";

import { useEffect, useState } from "react";
import { QuestionForm } from "@/components/questions/question-form";
import { api } from "@/lib/api";
import type { Category, CategoryListResponse } from "@/lib/questions";

export default function NewPlayerQuestionPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<CategoryListResponse>("/api/v1/categories?page_size=50")
      .then((data) => setCategories(data.items))
      .catch(() => setError("Could not load categories."));
  }, []);

  if (error) {
    return (
      <div className="rounded-[28px] bg-card px-8 py-16 text-center">
        <h1 className="text-2xl font-semibold text-white">{error}</h1>
      </div>
    );
  }

  return <QuestionForm categories={categories} type="player" />;
}
