import { asUser } from "@/server/auth";
import { CatalogInputError, importGeneralQuestions } from "@/server/catalog";
import { errorResponse, ok } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || !Array.isArray((body as { questions?: unknown }).questions)) {
      throw new CatalogInputError("Add at least one question");
    }
    return await asUser(request, async () => ok(await importGeneralQuestions(body)));
  } catch (err) {
    return errorResponse(err);
  }
}
