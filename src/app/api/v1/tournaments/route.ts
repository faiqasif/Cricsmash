import { errorResponse, ok } from "@/server/http";
import { asUser } from "@/server/auth";
import { createTournament, listTournaments } from "@/server/tournaments";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return await asUser(request, async () =>
      ok(
        await listTournaments({
          q: url.searchParams.get("q") ?? "",
          used: url.searchParams.get("used") ?? "",
          page: Number(url.searchParams.get("page") ?? "1"),
          pageSize: Number(url.searchParams.get("page_size") ?? "5"),
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
    return await asUser(request, async () => ok(await createTournament(payload), 201));
  } catch (err) {
    return errorResponse(err);
  }
}
