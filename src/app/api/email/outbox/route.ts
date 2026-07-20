import { NextResponse } from "next/server";
import { dispatchEmailOutbox } from "@/lib/email/dispatcher";
import { processEmailJob } from "@/lib/email/outbox";
import { claimEmailOutbox, completeEmailOutbox } from "@/lib/email/repository";
import {
  resendMarketingConfigured,
  resendTransactionalConfigured,
} from "@/lib/email/resend";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyCronBearer } from "@/lib/ycloud/outbox";

export const runtime = "nodejs";
export const maxDuration = 60;

function enabled(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === "true";
}

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

  const includeTransactional = enabled("EMAIL_TRANSACTIONAL_ENABLED");
  const includeMarketing = enabled("EMAIL_MARKETING_SYNC_ENABLED");
  if (includeTransactional && !resendTransactionalConfigured()) {
    return NextResponse.json(
      { error: { code: "RESEND_TRANSACTIONAL_NOT_CONFIGURED" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (includeMarketing && !resendMarketingConfigured()) {
    return NextResponse.json(
      { error: { code: "RESEND_MARKETING_NOT_CONFIGURED" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!includeTransactional && !includeMarketing) {
    return NextResponse.json(
      { claimed: 0, sent: 0, failed: 0, finalizationErrors: 0, disabled: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const requestedLimit = Number.parseInt(new URL(request.url).searchParams.get("limit") ?? "10", 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(20, Math.max(1, requestedLimit)) : 10;
  try {
    const db = getSupabaseAdmin();
    const result = await dispatchEmailOutbox({
      limit,
      claim: (workerId, count) =>
        claimEmailOutbox(db, workerId, count, { includeTransactional, includeMarketing }),
      complete: (values) => completeEmailOutbox(db, values),
      process: (job) => processEmailJob(db, job),
    });
    return NextResponse.json(result, {
      status: result.finalizationErrors > 0 ? 500 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "EMAIL_OUTBOX_DISPATCH_FAILED" } },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
