import { errorResponse, ok } from "@/server/http";
import { refreshSession } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { refresh_token?: unknown };
    const refreshToken = typeof body.refresh_token === "string" ? body.refresh_token : "";
    return ok(await refreshSession(refreshToken));
  } catch (err) {
    return errorResponse(err);
  }
}
