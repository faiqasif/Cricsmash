import { errorResponse, ok } from "@/server/http";
import { asUser } from "@/server/auth";
import { listDailyQuizzes } from "@/server/daily-quiz";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return await asUser(request, async () =>
      ok(
        await listDailyQuizzes({
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
