import { errorResponse, ok } from "@/server/http";
import { asUser } from "@/server/auth";
import { publishQueuedStatVersion } from "@/server/guess-player-stats";
import { listGuessStatVersions } from "@/server/guess-stat-versions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return await asUser(request, async () => ok(await listGuessStatVersions()));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    return await asUser(request, async () => ok(await publishQueuedStatVersion()));
  } catch (err) {
    return errorResponse(err);
  }
}
