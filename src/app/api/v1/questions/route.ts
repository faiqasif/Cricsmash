import { errorResponse, ok } from "@/server/http";
import { asUser } from "@/server/auth";
import { createQuestion, listQuestions } from "@/server/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return await asUser(request, async () =>
      ok(
        await listQuestions({
          type: url.searchParams.get("type") ?? "",
          q: url.searchParams.get("q") ?? "",
          status: url.searchParams.get("status") ?? "",
          used: url.searchParams.get("used") ?? "",
          categoryId: url.searchParams.get("category_id") ?? "",
          tournamentId: url.searchParams.get("tournament_id") ?? "",
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
    return await asUser(request, async () => ok(await createQuestion(payload), 201));
  } catch (err) {
    return errorResponse(err);
  }
}
