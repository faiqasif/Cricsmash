import { errorResponse, ok } from "@/server/http";
import { asUser } from "@/server/auth";
import { createPlayerDays, listPlayerDays } from "@/server/player-of-the-day";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return await asUser(request, async () =>
      ok(
        await listPlayerDays({
          q: url.searchParams.get("q") ?? "",
          status: url.searchParams.get("status") ?? "",
          from: url.searchParams.get("from") ?? "",
          to: url.searchParams.get("to") ?? "",
          page: Number(url.searchParams.get("page") ?? "1"),
          pageSize: Number(url.searchParams.get("page_size") ?? "10"),
        }),
      ),
    );
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    return await asUser(request, async () => ok(await createPlayerDays(payload), 201));
  } catch (err) {
    return errorResponse(err);
  }
}
