import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  expireStockReservations,
  normalizeReservationExpiryLimit,
} from "@/lib/inventory/reservation-maintenance";
import { verifyCronBearer } from "@/lib/ycloud/outbox";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json(
      { error: { code: "CRON_NOT_CONFIGURED" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!verifyCronBearer(request.headers.get("authorization"), cronSecret)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED" } },
      {
        status: 401,
        headers: { "WWW-Authenticate": "Bearer", "Cache-Control": "no-store" },
      },
    );
  }

  const limit = normalizeReservationExpiryLimit(
    new URL(request.url).searchParams.get("limit"),
  );
  try {
    const expired = await expireStockReservations(getSupabaseAdmin(), limit);
    return NextResponse.json(
      { expired },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: { code: "RESERVATION_EXPIRY_FAILED" } },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
