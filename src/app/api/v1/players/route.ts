import { errorResponse, ok } from "@/server/http";
import { asUser } from "@/server/auth";
import { createPlayer, listPlayers, parsePlayerPayload } from "@/server/players";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return await asUser(request, async () => {
      const data = await listPlayers({
        q: url.searchParams.get("q") ?? "",
        role: url.searchParams.get("role") ?? "",
        country: url.searchParams.get("country") ?? "",
        page: Number(url.searchParams.get("page") ?? "1"),
        pageSize: Number(url.searchParams.get("page_size") ?? "5"),
      });
      return ok(data);
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    return await asUser(request, async () => ok(await createPlayer(parsePlayerPayload(payload)), 201));
  } catch (err) {
    return errorResponse(err);
  }
}
