import { errorResponse, ok } from "@/server/http";
import { asUser } from "@/server/auth";
import { createPlayerField, listPlayerFields } from "@/server/players";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return await asUser(request, async () => ok(await listPlayerFields()));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    return await asUser(request, async () => ok(await createPlayerField(payload), 201));
  } catch (err) {
    return errorResponse(err);
  }
}
