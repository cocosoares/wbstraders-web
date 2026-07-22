import { after, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import {
  claimWebhookEvent,
  finishWebhookEvent,
  isMissingGreenApiWebhookProvider,
} from "@/lib/orders/webhooks";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { extractGreenApiMessage, greenApiEventSchema, verifyGreenApiWebhookSecret } from "@/lib/greenapi/webhook";
import { respondToWhatsApp } from "@/lib/whatsapp/conversation";
import { createWhatsAppCheckoutSessionUrl } from "@/lib/whatsapp/cart-link";
import { buildWhatsAppBotDelivery } from "@/lib/whatsapp/bot-delivery";
import { dispatchPendingWhatsAppOutbox } from "@/lib/whatsapp/outbox";
import {
  createWhatsAppCheckoutSession,
  getWhatsAppConversationJourney,
  getRecentWhatsAppInboundMessages,
  hasNewWhatsAppQualification,
  queueWhatsAppReply,
  recordCrmSignal,
  recordWhatsAppConsent,
  recordWhatsAppInbound,
  requestWhatsAppHandoff,
  updateWhatsAppContactProfile,
  updateWhatsAppConversationJourney,
  upsertHorecaWhatsAppOpportunity,
} from "@/lib/whatsapp/repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 1_000_000) {
    return NextResponse.json({ received: false }, { status: 413 });
  }
  const secret = process.env.GREEN_API_WEBHOOK_SECRET?.trim() || "";
  const providedSecret = new URL(request.url).searchParams.get("secret");
  if (!verifyGreenApiWebhookSecret(providedSecret, secret)) {
    return NextResponse.json({ received: false }, { status: 401 });
  }

  let event;
  try {
    event = greenApiEventSchema.parse(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  const eventId = `greenapi:${event.typeWebhook}:${event.idMessage ?? createHash("sha256").update(rawBody).digest("hex")}`;
  const db = getSupabaseAdmin();
  let claim: { id: string; duplicate: boolean };
  try {
    claim = await claimWebhookEvent(db, {
      provider: "greenapi",
      eventId,
      eventType: event.typeWebhook,
      payload: event,
    });
  } catch (error) {
    if (!isMissingGreenApiWebhookProvider(error)) {
      return NextResponse.json({ received: false }, { status: 500 });
    }
    try {
      claim = await claimWebhookEvent(db, {
        provider: "ycloud",
        eventId,
        eventType: event.typeWebhook,
        payload: event,
      });
    } catch {
      return NextResponse.json({ received: false }, { status: 500 });
    }
  }
  if (claim.duplicate) return NextResponse.json({ received: true, duplicate: true });

  try {
    const message = extractGreenApiMessage(event);
    if (event.typeWebhook === "incomingMessageReceived" && message.phone && message.messageId) {
      const inbound = await recordWhatsAppInbound(db, {
        provider: "greenapi",
        phoneNormalized: message.phone,
        providerMessageId: message.messageId,
        kind: message.kind,
        body: message.text,
        replyToProviderMessageId: message.replyToMessageId,
        eventId,
        eventType: event.typeWebhook,
        ...(message.media ? { media: message.media } : {}),
      });
      if (!inbound.duplicate) {
        const [recentInboundMessages, journey] = await Promise.all([
          getRecentWhatsAppInboundMessages(db, inbound.conversationId),
          getWhatsAppConversationJourney(db, inbound.conversationId),
        ]);
        const reply = respondToWhatsApp({
          message: message.text ?? "",
          recentInboundMessages,
          journey,
        });
        const qualificationChanged = hasNewWhatsAppQualification(journey, reply.leadData);
        await updateWhatsAppConversationJourney(db, inbound.conversationId, {
          journey: reply.journey,
          qualification: reply.leadData,
          intent: reply.intent,
        });
        if (reply.leadData && qualificationChanged) {
          await recordCrmSignal(db, {
            contactId: inbound.contactId,
            conversationId: inbound.conversationId,
            eventKey: `${eventId}:qualification`,
            eventType: "qualification",
            metadata: { ...reply.leadData, funnelStage: reply.journey?.stage ?? null },
          });
        }
        if (reply.withdrawMarketingConsent) {
          await recordWhatsAppConsent(db, { contactId: inbound.contactId, purpose: "marketing", status: "withdrawn", evidence: { eventId, channel: "whatsapp" } });
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
            evidence: { eventId, channel: "whatsapp", emailProvided: true },
          });
        }
        if (reply.requiresHuman) {
          await requestWhatsAppHandoff(db, { conversationId: inbound.conversationId, reason: reply.intent, requestedBy: reply.intent === "human_handoff" ? "customer" : "bot", summary: message.text?.slice(0, 500) });
          if (reply.journey?.path === "horeca") {
            await upsertHorecaWhatsAppOpportunity(db, {
              contactId: inbound.contactId,
              conversationId: inbound.conversationId,
              qualification: reply.leadData ?? { customerType: "horeca" },
            });
          } else {
            await recordCrmSignal(db, {
              contactId: inbound.contactId,
              conversationId: inbound.conversationId,
              eventKey: `${eventId}:handoff`,
              eventType: "human_handoff",
              metadata: { intent: reply.intent },
            });
          }
        } else if (reply.intent === "recommendation" && reply.checkoutItems?.length) {
          await recordCrmSignal(db, {
            contactId: inbound.contactId,
            conversationId: inbound.conversationId,
            eventKey: `${eventId}:purchase-intent`,
            eventType: "purchase_intent",
            metadata: { products: reply.checkoutItems.map((item) => item.productId) },
          });
        }
        const botEnabled = process.env.WHATSAPP_BOT_ENABLED?.trim().toLowerCase() === "true";
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wbstraders.pe";
        let checkoutUrl: string | null = null;
        if (botEnabled && reply.checkoutItems?.length) {
          const token = await createWhatsAppCheckoutSession(db, { contactId: inbound.contactId, conversationId: inbound.conversationId, items: reply.checkoutItems });
          checkoutUrl = createWhatsAppCheckoutSessionUrl({ baseUrl, token });
        }
        if (botEnabled && (inbound.conversationState === "bot" || reply.requiresHuman)) {
          const delivery = buildWhatsAppBotDelivery({
            reply,
            baseUrl,
            checkoutUrl,
            provider: "greenapi",
          });
          await queueWhatsAppReply(db, {
            contactId: inbound.contactId,
            conversationId: inbound.conversationId,
            body: delivery.body,
            kind: delivery.kind,
            metadata: delivery.metadata,
          });
          // Send right away without making the webhook response wait for the
          // provider. The minute-based worker still retries any failed send.
          after(() =>
            dispatchPendingWhatsAppOutbox(db).catch((error) => {
              console.error("[whatsapp] immediate outbox dispatch failed", error);
            }),
          );
        }
      }
    }
    await finishWebhookEvent(db, claim.id, "processed");
    return NextResponse.json({ received: true });
  } catch (error) {
    await finishWebhookEvent(db, claim.id, "failed", error instanceof Error ? error.message : "greenapi_processing_failed").catch(() => undefined);
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
