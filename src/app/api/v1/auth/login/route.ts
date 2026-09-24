import { errorResponse, ok } from "@/server/http";
import { AuthError, signIn } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email.trim() || !password) throw new AuthError(400, "Email and password are required.");
    return ok(await signIn(email, password));
  } catch (err) {
    return errorResponse(err);
  }
}
