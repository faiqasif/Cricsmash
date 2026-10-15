import { errorResponse, ok } from "@/server/http";
import { asUser } from "@/server/auth";
import { createNotification, listNotifications } from "@/server/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return await asUser(request, async () => ok({ items: await listNotifications() }));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    return await asUser(request, async () => ok(await createNotification(payload), 201));
  } catch (err) {
    return errorResponse(err);
  }
}
