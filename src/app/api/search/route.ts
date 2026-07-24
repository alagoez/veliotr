import { search } from "@/lib/search";
import type { SearchRequest } from "@/lib/types";

export async function POST(request: Request) {
  let body: SearchRequest;
  try {
    body = (await request.json()) as SearchRequest;
  } catch {
    return Response.json({ error: "Geçersiz istek gövdesi" }, { status: 400 });
  }

  const req: SearchRequest = {
    filters: body.filters ?? {},
    sort: body.sort ?? "outlier",
    page: Math.max(0, body.page ?? 0),
    pageSize: Math.min(48, Math.max(6, body.pageSize ?? 24)),
    seed: body.seed,
  };

  try {
    const res = await search(req);
    return Response.json(res);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bilinmeyen hata";
    return Response.json({ error: msg }, { status: 500 });
  }
}
