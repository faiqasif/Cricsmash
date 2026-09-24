import { empty, errorResponse } from "@/server/http";
import { asUser } from "@/server/auth";
import { deletePlayerField } from "@/server/players";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return await asUser(request, async () => {
      await deletePlayerField(id);
      return empty();
    });
  } catch (err) {
    return errorResponse(err);
  }
}
