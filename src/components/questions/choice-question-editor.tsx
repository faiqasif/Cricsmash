"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QuestionForm } from "@/components/questions/question-form";
import { api } from "@/lib/api";
import type { Category, CategoryListResponse, ChoiceQuestionType, Question } from "@/lib/questions";

export function NewChoiceQuestionPage({ type }: { type: ChoiceQuestionType }) {
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

  return <QuestionForm categories={categories} type={type} />;
}

export function EditChoiceQuestionPage({ type }: { type: ChoiceQuestionType }) {
  const params = useParams<{ id: string }>();
  const [question, setQuestion] = useState<Question | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<Question>(`/api/v1/questions/${params.id}`),
      api<CategoryListResponse>("/api/v1/categories?page_size=50"),
    ])
      .then(([item, cats]) => {
        if (cancelled) return;
        setQuestion(item);
        setCategories(cats.items);
      })
      .catch(() => {
        if (!cancelled) setError("Question not found.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (error) {
    return (
      <div className="rounded-[28px] bg-card px-8 py-16 text-center">
        <h1 className="text-2xl font-semibold text-white">{error}</h1>
      </div>
    );
  }

  if (!question) {
    return <p className="text-sm text-zinc-500">Loading question...</p>;
  }

  return <QuestionForm question={question} categories={categories} type={type} />;
}
