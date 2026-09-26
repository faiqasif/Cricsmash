import { errorResponse, ok } from "@/server/http";
import { asUser } from "@/server/auth";
import { resetTournamentUsed } from "@/server/tournaments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    return await asUser(request, async () => ok(await resetTournamentUsed()));
  } catch (err) {
    return errorResponse(err);
  }
}
