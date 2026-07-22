import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyCronBearer } from "@/lib/ycloud/outbox";

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
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (process.env.CRM_ALERTS_24_7?.trim().toLowerCase() === "false") {
    return NextResponse.json({ disabled: true }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const { data, error } = await getSupabaseAdmin().rpc("queue_crm_automations");
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    return NextResponse.json(
      {
        slaAlerts: Number(result?.sla_alerts ?? 0),
        abandonedCheckouts: Number(result?.abandoned_checkouts ?? 0),
        repurchaseTasks: Number(result?.repurchase_tasks ?? 0),
        staleTasks: Number(result?.stale_tasks ?? 0),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[crm] maintenance failed", error);
    return NextResponse.json(
      { error: { code: "CRM_MAINTENANCE_FAILED" } },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
