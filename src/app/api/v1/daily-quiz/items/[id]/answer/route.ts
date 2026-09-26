import { errorResponse, ok } from "@/server/http";
import { asUser } from "@/server/auth";
import { answerDailyQuizItem } from "@/server/daily-quiz";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    return await asUser(request, async () => ok(await answerDailyQuizItem(id, payload)));
  } catch (err) {
    return errorResponse(err);
  }
}
