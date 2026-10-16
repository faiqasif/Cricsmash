import { errorResponse, ok } from "@/server/http";
import { asUser } from "@/server/auth";
import { getPlayerVersion } from "@/server/player-versions";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return await asUser(request, async () => ok(await getPlayerVersion(id)));
  } catch (err) {
    return errorResponse(err);
  }
}
