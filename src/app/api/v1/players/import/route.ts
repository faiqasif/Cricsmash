import { asUser } from "@/server/auth";
import { errorResponse, ok } from "@/server/http";
import { importPlayers, PlayerInputError } from "@/server/players";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { players?: unknown };
    if (!body || !Array.isArray(body.players)) throw new PlayerInputError("Add at least one player");
    const players = body.players.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as { row?: unknown; player?: unknown };
      return [{ row: typeof row.row === "number" ? row.row : 0, player: row.player }];
    });
    return await asUser(request, async () => ok(await importPlayers(players)));
  } catch (err) {
    return errorResponse(err);
  }
}
