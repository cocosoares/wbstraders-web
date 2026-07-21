import { after, NextResponse } from "next/server";
import { claimWebhookEvent, finishWebhookEvent } from "@/lib/orders/webhooks";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  extractYCloudMessage,
  verifyYCloudSignature,
  yCloudEventSchema,
} from "@/lib/ycloud/webhook";
import { respondToWhatsApp } from "@/lib/whatsapp/conversation";
import { createWhatsAppCheckoutSessionUrl } from "@/lib/whatsapp/cart-link";
import { buildWhatsAppBotDelivery } from "@/lib/whatsapp/bot-delivery";
import { dispatchPendingWhatsAppOutbox } from "@/lib/whatsapp/outbox";
import {
  createWhatsAppCheckoutSession,
  getRecentWhatsAppInboundMessages,
  queueWhatsAppReply,
  recordWhatsAppConsent,
  recordWhatsAppInbound,
  requestWhatsAppHandoff,
  updateWhatsAppContactProfile,
  updateWhatsAppConversationQualification,
} from "@/lib/whatsapp/repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 1_000_000) {
    return NextResponse.json({ received: false }, { status: 413 });
  }
  const secret = process.env.YCLOUD_WEBHOOK_SECRET?.trim();
  const signature = request.headers.get("ycloud-signature") ?? "";
  const configuredTolerance = Number.parseInt(
    process.env.WHATSAPP_WEBHOOK_TOLERANCE_SECONDS?.trim() || "300",
    10,
  );
  const toleranceSeconds = Number.isFinite(configuredTolerance)
    ? Math.min(900, Math.max(30, configuredTolerance))
    : 300;
  if (
    !secret ||
    !verifyYCloudSignature({
      rawBody,
      signatureHeader: signature,
      secret,
      toleranceSeconds,
    })
  ) {
    return NextResponse.json({ received: false }, { status: 401 });
  }

  let event;
  try {
    event = yCloudEventSchema.parse(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  let claim: { id: string; duplicate: boolean };
  try {
    claim = await claimWebhookEvent(db, {
      provider: "ycloud",
      eventId: event.id,
      eventType: event.type,
      payload: event,
    });
  } catch {
    return NextResponse.json({ received: false }, { status: 500 });
  }
  if (claim.duplicate) return NextResponse.json({ received: true, duplicate: true });

  try {
    const message = extractYCloudMessage(event);
    const normalizedPhone = message.from?.replace(/\D/g, "");

    if (
      event.type === "whatsapp.inbound_message.received" &&
      normalizedPhone &&
      message.messageId
    ) {
      const inbound = await recordWhatsAppInbound(db, {
        provider: "ycloud",
        phoneNormalized: normalizedPhone,
        providerMessageId: message.messageId,
        kind:
          message.type === "interactive"
            ? "interactive"
            : ["audio", "document", "image", "media", "sticker", "video"].includes(message.type ?? "")
              ? "media"
              : "text",
        body: message.text,
        replyToProviderMessageId: message.replyToMessageId,
        eventId: event.id,
        eventType: event.type,
      });

      if (!inbound.duplicate) {
        const recentInboundMessages = await getRecentWhatsAppInboundMessages(
          db,
          inbound.conversationId,
        );
        const reply = respondToWhatsApp({
          message: message.text ?? "",
          recentInboundMessages,
        });
        if (reply.leadData) {
          await updateWhatsAppConversationQualification(
            db,
            inbound.conversationId,
            reply.leadData,
          );
        }

        if (reply.withdrawMarketingConsent) {
          await recordWhatsAppConsent(db, {
            contactId: inbound.contactId,
            purpose: "marketing",
            status: "withdrawn",
            evidence: { eventId: event.id, channel: "whatsapp" },
          });
        }
        if (reply.marketingLead) {
          await updateWhatsAppContactProfile(db, {
            contactId: inbound.contactId,
            email: reply.marketingLead.email,
            ...(reply.marketingLead.name ? { name: reply.marketingLead.name } : {}),
          });
          await recordWhatsAppConsent(db, {
            contactId: inbound.contactId,
            purpose: "marketing",
            status: "granted",
            evidence: { eventId: event.id, channel: "whatsapp", emailProvided: true },
          });
        }
        if (reply.requiresHuman) {
          await requestWhatsAppHandoff(db, {
            conversationId: inbound.conversationId,
            reason: reply.intent,
            requestedBy: reply.intent === "human_handoff" ? "customer" : "bot",
            summary: message.text?.slice(0, 500),
          });
        }

        const botEnabled = process.env.WHATSAPP_BOT_ENABLED?.trim().toLowerCase() === "true";
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wbstraders.pe";
        let checkoutUrl: string | null = null;
        if (botEnabled && reply.checkoutItems && reply.checkoutItems.length > 0) {
          const token = await createWhatsAppCheckoutSession(db, {
            contactId: inbound.contactId,
            conversationId: inbound.conversationId,
            items: reply.checkoutItems,
          });
          checkoutUrl = createWhatsAppCheckoutSessionUrl({
            baseUrl,
            token,
          });
        }

        // Once a person has taken ownership, the bot stays silent. The first
        // handoff acknowledgement is still allowed so the customer knows a
        // human will continue the conversation.
        if (botEnabled && (inbound.conversationState === "bot" || reply.requiresHuman)) {
          const delivery = buildWhatsAppBotDelivery({
            reply,
            baseUrl,
            checkoutUrl,
            provider: "ycloud",
          });
          await queueWhatsAppReply(db, {
            contactId: inbound.contactId,
            conversationId: inbound.conversationId,
            body: delivery.body,
            kind: delivery.kind,
            metadata: delivery.metadata,
          });
          after(() =>
            dispatchPendingWhatsAppOutbox(db).catch((error) => {
              console.error("[whatsapp] immediate outbox dispatch failed", error);
            }),
          );
        }
      }
    }

    if (normalizedPhone) {
      const customer = await db
        .from("customers")
        .select("id")
        .eq("phone_normalized", normalizedPhone)
        .maybeSingle();
      if (customer.error) throw customer.error;
      if (customer.data) {
        const activity = await db.from("activities").insert({
          customer_id: customer.data.id,
          kind: event.type,
          subject: event.type === "whatsapp.inbound_message.received" ? "Mensaje entrante de WhatsApp" : "Actualización de WhatsApp",
          body: message.text?.slice(0, 4000) ?? null,
          metadata: {
            eventId: event.id,
            messageId: message.messageId ?? null,
            status: message.status ?? null,
          },
        });
        if (activity.error) throw activity.error;
      }
    }
    await finishWebhookEvent(db, claim.id, "processed");
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ycloud_processing_failed";
    await finishWebhookEvent(db, claim.id, "failed", message).catch(() => undefined);
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
