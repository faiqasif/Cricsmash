import { empty, errorResponse, ok } from "@/server/http";
import { asUser } from "@/server/auth";
import { deleteTournament, getTournament, updateTournament } from "@/server/tournaments";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return await asUser(request, async () => ok(await getTournament(id)));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    return await asUser(request, async () => ok(await updateTournament(id, payload)));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return await asUser(request, async () => {
      await deleteTournament(id);
      return empty();
    });
  } catch (err) {
    return errorResponse(err);
  }
}
