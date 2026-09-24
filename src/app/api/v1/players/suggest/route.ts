import { errorResponse, ok } from "@/server/http";
import { asUser } from "@/server/auth";
import { suggestPlayers } from "@/server/players";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const exclude = (url.searchParams.get("exclude") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return await asUser(request, async () => {
      const data = await suggestPlayers({
        q: url.searchParams.get("q") ?? "",
        country: url.searchParams.get("country") ?? "",
        exclude,
        limit: Number(url.searchParams.get("limit") ?? "12"),
      });
      return ok(data);
    });
  } catch (err) {
    return errorResponse(err);
  }
}
