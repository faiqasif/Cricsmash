import { errorResponse, ok } from "@/server/http";
import { asUser } from "@/server/auth";
import { publishPlayerRelease } from "@/server/players";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    return await asUser(request, async () => ok(await publishPlayerRelease(payload)));
  } catch (err) {
    return errorResponse(err);
  }
}
