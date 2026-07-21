import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyCronBearer } from "@/lib/ycloud/outbox";
import {
  dispatchPendingWhatsAppOutbox,
} from "@/lib/whatsapp/outbox";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json({ error: { code: "CRON_NOT_CONFIGURED" } }, { status: 503 });
  }
  if (!verifyCronBearer(request.headers.get("authorization"), cronSecret)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED" } },
      { status: 401, headers: { "WWW-Authenticate": "Bearer", "Cache-Control": "no-store" } },
    );
  }

  const requestedLimit = Number.parseInt(new URL(request.url).searchParams.get("limit") ?? "5", 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(10, Math.max(1, requestedLimit)) : 5;
  try {
    const db = getSupabaseAdmin();
    const result = await dispatchPendingWhatsAppOutbox(db, limit);
    return NextResponse.json(result, {
      status: result.finalizationErrors > 0 ? 500 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "WHATSAPP_OUTBOX_DISPATCH_FAILED" } },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
