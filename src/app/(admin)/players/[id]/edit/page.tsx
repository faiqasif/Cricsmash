"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PlayerForm } from "@/components/players/player-form";
import { api } from "@/lib/api";
import type { Player } from "@/lib/players";

export default function EditPlayerPage() {
  const params = useParams<{ id: string }>();
  const [player, setPlayer] = useState<Player | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api<Player>(`/api/v1/players/${params.id}`)
      .then((data) => {
        if (!cancelled) setPlayer(data);
      })
      .catch(() => {
        if (!cancelled) setError("Player not found.");
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

  if (!player) {
    return <p className="text-sm text-zinc-500">Loading player...</p>;
  }

  return <PlayerForm player={player} />;
}
