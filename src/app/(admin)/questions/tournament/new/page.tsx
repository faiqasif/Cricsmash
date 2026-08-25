"use client";

import { useEffect, useState } from "react";
import { QuestionForm } from "@/components/questions/question-form";
import { fetchAllCategories, type Category } from "@/lib/questions";

export default function NewTournamentQuestionPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllCategories()
      .then((items) => setCategories(items))
      .catch(() => setError("Could not load categories."))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="rounded-[28px] bg-card px-8 py-16 text-center">
        <h1 className="text-2xl font-semibold text-white">{error}</h1>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading categories...</p>;
  }

  return <QuestionForm categories={categories} type="tournament" />;
}
