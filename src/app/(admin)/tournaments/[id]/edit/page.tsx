"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TournamentForm } from "@/components/tournaments/tournament-form";
import { api } from "@/lib/api";
import type { Question, QuestionListResponse } from "@/lib/questions";
import type { Tournament } from "@/lib/tournaments";

export default function EditTournamentPage() {
  const params = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [templates, setTemplates] = useState<Question[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<Tournament>(`/api/v1/tournaments/${params.id}`),
      api<QuestionListResponse>("/api/v1/questions?type=tournament&status=active&page_size=50"),
    ])
      .then(([item, questions]) => {
        if (cancelled) return;
        setTournament(item);
        setTemplates(questions.items);
      })
      .catch(() => {
        if (!cancelled) setError("Tournament not found.");
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

  if (!tournament) {
    return <p className="text-sm text-zinc-500">Loading tournament...</p>;
  }

  return <TournamentForm tournament={tournament} templates={templates} />;
}
