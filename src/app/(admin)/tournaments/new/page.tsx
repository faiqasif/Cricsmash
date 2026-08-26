"use client";

import { useEffect, useState } from "react";
import { TournamentForm } from "@/components/tournaments/tournament-form";
import { fetchAllQuestions, type Question } from "@/lib/questions";

export default function NewTournamentPage() {
  const [templates, setTemplates] = useState<Question[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllQuestions({ type: "tournament", status: "active" })
      .then((items) => setTemplates(items))
      .catch(() => setError("Could not load tournament question templates."))
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
    return <p className="text-sm text-zinc-500">Loading tournament templates...</p>;
  }

  return <TournamentForm templates={templates} />;
}
