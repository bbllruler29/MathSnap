import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toResponse } from "@/lib/api/errors";
import { parseOrThrow } from "@/lib/api/parse";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { listFlaggedSolves } from "@/lib/solves/repository";
import { adminFlaggedSolvesQuerySchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    await requireAdmin(supabase);

    const url = new URL(request.url);
    const query = parseOrThrow(adminFlaggedSolvesQuerySchema, {
      status: url.searchParams.get("status") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
    });

    const result = await listFlaggedSolves(supabase, query.status, query.cursor);
    return Response.json({ items: result.items, next_cursor: result.nextCursor });
  } catch (err) {
    return toResponse(err);
  }
}
