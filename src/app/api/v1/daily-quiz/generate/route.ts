import { errorResponse, ok } from "@/server/http";
import { asUser } from "@/server/auth";
import { generateDailyQuiz } from "@/server/daily-quiz";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    return await asUser(request, async () => ok(await generateDailyQuiz(payload), 201));
  } catch (err) {
    return errorResponse(err);
  }
}
