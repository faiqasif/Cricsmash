import { empty, errorResponse, ok } from "@/server/http";
import { asUser } from "@/server/auth";
import { deletePlayerDay, getPlayerDay, updatePlayerDay, updatePlayerDayStatus } from "@/server/player-of-the-day";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return await asUser(request, async () => ok(await getPlayerDay(id)));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    return await asUser(request, async () => ok(await updatePlayerDay(id, payload)));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    return await asUser(request, async () => ok(await updatePlayerDayStatus(id, payload)));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return await asUser(request, async () => {
      await deletePlayerDay(id);
      return empty();
    });
  } catch (err) {
    return errorResponse(err);
  }
}
