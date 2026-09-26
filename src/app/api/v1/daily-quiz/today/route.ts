import { errorResponse, ok } from "@/server/http";
import { asUser } from "@/server/auth";
import { getTodayDailyQuiz } from "@/server/daily-quiz";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return await asUser(request, async () => ok(await getTodayDailyQuiz()));
  } catch (err) {
    return errorResponse(err);
  }
}
