import { empty, errorResponse, ok } from "@/server/http";
import { asUser } from "@/server/auth";
import { deleteDailyQuiz, getDailyQuiz, updateDailyQuizStatus } from "@/server/daily-quiz";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return await asUser(request, async () => ok(await getDailyQuiz(id)));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    return await asUser(request, async () => ok(await updateDailyQuizStatus(id, payload)));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return await asUser(request, async () => {
      await deleteDailyQuiz(id);
      return empty();
    });
  } catch (err) {
    return errorResponse(err);
  }
}
