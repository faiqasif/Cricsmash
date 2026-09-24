import { NextResponse } from "next/server";

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function empty() {
  return new NextResponse(null, { status: 204 });
}

export function errorResponse(err: unknown) {
  if (err instanceof Error && err.name === "PlayerInputError") {
    return fail(400, "invalid_input", err.message);
  }
  if (err instanceof Error && err.name === "PlayerNotFoundError") {
    return fail(404, "not_found", err.message);
  }
  if (err instanceof Error && err.name === "AuthError") {
    const status = "status" in err && typeof err.status === "number" ? err.status : 401;
    return fail(status, "unauthorized", err.message);
  }
  if (err instanceof Error && err.name === "FirebaseError") {
    const code = "code" in err ? String(err.code) : "";
    if (code === "permission-denied" || code === "storage/unauthorized") {
      return fail(
        403,
        "permission_denied",
        "Firebase blocked this request. Sign in, and allow signed-in access to the players and playerFields collections.",
      );
    }
    return fail(502, "firebase_error", err.message);
  }
  const message = err instanceof Error ? err.message : "Request failed";
  return fail(500, "error", message);
}
