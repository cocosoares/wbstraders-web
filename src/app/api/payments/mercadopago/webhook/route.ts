import { NextResponse } from "next/server";
import { z } from "zod";
import { claimWebhookEvent, fallbackEventId, finishWebhookEvent } from "@/lib/orders/webhooks";
import {
  getMercadoPagoPayment,
  paymentSnapshot,
  verifyMercadoPagoSignature,
} from "@/lib/payments/mercadopago";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const notificationSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    type: z.string().optional(),
    action: z.string().optional(),
    data: z.object({ id: z.union([z.string(), z.number()]) }),
  })
  .passthrough();

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 1_000_000) {
    return NextResponse.json({ received: false }, { status: 413 });
  }

  let payload: z.infer<typeof notificationSchema>;
  try {
    payload = notificationSchema.parse(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  const signature = request.headers.get("x-signature") ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";
  const queryDataId = new URL(request.url).searchParams.get("data.id");
  const bodyDataId = String(payload.data.id);
  const dataId = queryDataId ?? bodyDataId;
  if (
    !secret ||
    !queryDataId ||
    queryDataId !== bodyDataId ||
    // Mercado Pago retries notifications after progressively longer delays.
    // The timestamp remains part of the authenticated manifest, but imposing a
    // freshness window here could reject a legitimate retry; durable event IDs
    // provide replay/idempotency protection instead.
    !verifyMercadoPagoSignature({ signatureHeader: signature, requestId, dataId, secret })
  ) {
    return NextResponse.json({ received: false }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const eventId = payload.id ? String(payload.id) : fallbackEventId(rawBody);
  let claim: { id: string; duplicate: boolean };
  try {
    claim = await claimWebhookEvent(db, {
      provider: "mercadopago",
      eventId,
      eventType: payload.action ?? payload.type,
      payload,
    });
  } catch {
    return NextResponse.json({ received: false }, { status: 500 });
  }
  if (claim.duplicate) return NextResponse.json({ received: true, duplicate: true });

  try {
    if (payload.type && payload.type !== "payment") {
      await finishWebhookEvent(db, claim.id, "ignored");
      return NextResponse.json({ received: true });
    }

    const payment = await getMercadoPagoPayment(dataId);
    const orderId = payment.external_reference;
    if (!orderId) {
      await finishWebhookEvent(db, claim.id, "ignored", "missing_external_reference");
      return NextResponse.json({ received: true });
    }

    const orderResult = await db
      .from("orders")
      .select("id,total_cents,currency,payment_provider")
      .eq("id", orderId)
      .maybeSingle();
    if (orderResult.error) throw orderResult.error;
    if (
      !orderResult.data ||
      orderResult.data.payment_provider !== "mercadopago" ||
      orderResult.data.currency !== payment.currency_id ||
      orderResult.data.total_cents !== Math.round(payment.transaction_amount * 100)
    ) {
      await finishWebhookEvent(db, claim.id, "ignored", "order_or_amount_mismatch");
      return NextResponse.json({ received: true });
    }

    const snapshot = paymentSnapshot(payment);
    const result = await db.rpc("apply_payment_result", {
      p_order_id: orderId,
      p_provider_reference: String(payment.id),
      p_provider_status: payment.status,
      p_status_detail: payment.status_detail ?? null,
      p_snapshot: snapshot,
    });
    if (result.error) throw result.error;
    await finishWebhookEvent(db, claim.id, "processed");
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "payment_processing_failed";
    await finishWebhookEvent(db, claim.id, "failed", message).catch(() => undefined);
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
