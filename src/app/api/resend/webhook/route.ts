import { NextResponse } from "next/server";
import { recordResendContactEvent, recordResendEmailEvent } from "@/lib/email/repository";
import { verifyResendWebhook } from "@/lib/email/resend";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function eventMetadata(event: ReturnType<typeof verifyResendWebhook>): Record<string, unknown> {
  if (event.type === "email.bounced") {
    return {
      reason: event.data.bounce.message,
      bounceType: event.data.bounce.type,
      bounceSubtype: event.data.bounce.subType,
    };
  }
  if (event.type === "email.failed") return { reason: event.data.failed.reason };
  if (event.type === "email.suppressed") {
    return { reason: event.data.suppressed.message, suppressionType: event.data.suppressed.type };
  }
  if (event.type === "email.complained") return { reason: "recipient_complaint" };
  return {};
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret || !process.env.RESEND_API_KEY?.trim()) {
    return NextResponse.json({ received: false }, { status: 503 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 1_000_000) {
    return NextResponse.json({ received: false }, { status: 413 });
  }
  const id = request.headers.get("svix-id") ?? "";
  const timestamp = request.headers.get("svix-timestamp") ?? "";
  const signature = request.headers.get("svix-signature") ?? "";
  if (!id || !timestamp || !signature) {
    return NextResponse.json({ received: false }, { status: 401 });
  }

  let event: ReturnType<typeof verifyResendWebhook>;
  try {
    event = verifyResendWebhook({ payload: rawBody, id, timestamp, signature, secret });
  } catch {
    return NextResponse.json({ received: false }, { status: 401 });
  }

  if (event.type === "contact.updated" || event.type === "contact.deleted") {
    try {
      const result = await recordResendContactEvent(getSupabaseAdmin(), {
        providerEventId: id,
        eventType: event.type,
        contactId: event.data.id,
        recipientEmail: event.data.email,
        unsubscribed: event.type === "contact.deleted" ? true : event.data.unsubscribed,
      });
      return NextResponse.json({ received: true, duplicate: result.duplicate });
    } catch {
      return NextResponse.json({ received: false }, { status: 500 });
    }
  }

  if (!event.type.startsWith("email.") || !("email_id" in event.data)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const result = await recordResendEmailEvent(getSupabaseAdmin(), {
      providerEventId: id,
      eventType: event.type,
      providerEmailId: event.data.email_id,
      recipientEmail: "to" in event.data && Array.isArray(event.data.to) ? event.data.to[0] : undefined,
      metadata: eventMetadata(event),
    });
    return NextResponse.json({ received: true, duplicate: result.duplicate });
  } catch {
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
