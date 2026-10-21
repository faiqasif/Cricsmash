import { errorResponse, ok } from "@/server/http";
import { asUser } from "@/server/auth";
import { listPlayerVersions } from "@/server/player-versions";
import { publishQueuedVersion } from "@/server/player-version";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return await asUser(request, async () => ok(await listPlayerVersions()));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    return await asUser(request, async () => ok(await publishQueuedVersion()));
  } catch (err) {
    return errorResponse(err);
  }
}
