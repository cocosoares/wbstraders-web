import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WhatsAppCartItem } from "./cart-link";

export type WhatsAppInboundRecord = {
  contactId: string;
  conversationId: string;
  ageVerifiedAt: string | null;
  conversationState: "bot" | "human" | "closed";
  messageId: string | null;
  duplicate: boolean;
};

type RpcRow = {
  contact_id: string;
  conversation_id: string;
  age_verified_at: string | null;
  conversation_state: WhatsAppInboundRecord["conversationState"];
  message_id: string | null;
  duplicate: boolean;
};

function isMissingGreenApiEventProvider(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const details = error as { code?: unknown; message?: unknown };
  return (
    details.code === "23514" &&
    typeof details.message === "string" &&
    details.message.includes("whatsapp_events_provider_check")
  );
}

export async function recordWhatsAppInbound(
  db: SupabaseClient,
  input: {
    provider: "ycloud" | "greenapi";
    phoneNormalized: string;
    providerMessageId: string;
    kind: "text" | "interactive" | "media" | "status";
    body?: string;
    replyToProviderMessageId?: string;
    eventId: string;
    eventType: string;
    media?: { url?: string; fileName: string; mimeType?: string; caption?: string };
  },
): Promise<WhatsAppInboundRecord> {
  const { data, error } = await db.rpc("record_whatsapp_inbound", {
    p_phone_normalized: input.phoneNormalized,
    p_provider_message_id: input.providerMessageId,
    p_message_kind: input.kind,
    p_body: input.body?.slice(0, 4_000) ?? "",
    p_reply_to_provider_message_id: input.replyToProviderMessageId ?? null,
    p_metadata: {
      eventType: input.eventType,
      ...(input.media ? { attachment: input.media } : {}),
    },
  });
  if (error) throw error;
  const row = Array.isArray(data) ? (data[0] as RpcRow | undefined) : undefined;
  if (!row) throw new Error("whatsapp_inbound_not_recorded");

  if (!row.duplicate) {
    const values = {
      provider: input.provider,
      provider_event_id: input.eventId,
      contact_id: row.contact_id,
      conversation_id: row.conversation_id,
      message_id: row.message_id,
      event_type: input.eventType,
      payload: {
        messageKind: input.kind,
        sourceProvider: input.provider,
        ...(input.media
          ? { media: { fileName: input.media.fileName, mimeType: input.media.mimeType ?? null } }
          : {}),
      },
    };
    let event = await db.from("whatsapp_events").insert(values);
    if (input.provider === "greenapi" && isMissingGreenApiEventProvider(event.error)) {
      event = await db.from("whatsapp_events").insert({ ...values, provider: "ycloud" });
    }
    if (event.error && event.error.code !== "23505") throw event.error;
  }

  return {
    contactId: row.contact_id,
    conversationId: row.conversation_id,
    ageVerifiedAt: row.age_verified_at,
    conversationState: row.conversation_state,
    messageId: row.message_id,
    duplicate: row.duplicate,
  };
}

export async function recordWhatsAppConsent(
  db: SupabaseClient,
  input: {
    contactId: string;
    purpose: "marketing" | "age_verification";
    status: "granted" | "denied" | "withdrawn";
    evidence: Record<string, string | boolean | number | null>;
  },
): Promise<void> {
  const { error } = await db.rpc("record_whatsapp_consent", {
    p_contact_id: input.contactId,
    p_purpose: input.purpose,
    p_status: input.status,
    p_policy_version: "2026-07",
    p_source: "whatsapp_conversation",
    p_evidence: input.evidence,
  });
  if (error) throw error;
}

/** Stores optional contact details only after the customer expressly opts in. */
export async function updateWhatsAppContactProfile(
  db: SupabaseClient,
  input: { contactId: string; email: string; name?: string },
): Promise<void> {
  const current = await db
    .from("whatsapp_contacts")
    .select("metadata")
    .eq("id", input.contactId)
    .single();
  if (current.error) throw current.error;

  const metadata =
    typeof current.data.metadata === "object" && current.data.metadata !== null
      ? (current.data.metadata as Record<string, unknown>)
      : {};
  const update = await db
    .from("whatsapp_contacts")
    .update({
      ...(input.name ? { display_name: input.name.slice(0, 160) } : {}),
      metadata: {
        ...metadata,
        email: input.email.toLowerCase().slice(0, 254),
        emailSource: "whatsapp_marketing_opt_in",
      },
    })
    .eq("id", input.contactId);
  if (update.error) throw update.error;

  const linked = await db.rpc("ensure_crm_customer_for_contact", {
    p_contact_id: input.contactId,
    p_name: input.name ?? null,
    p_actor_id: null,
  });
  if (linked.error && !linked.error.message.includes("function public.ensure_crm_customer_for_contact")) {
    throw linked.error;
  }
  const customerId = typeof linked.data === "string" ? linked.data : null;
  if (customerId) {
    const customerUpdate = await db
      .from("customers")
      .update({
        email: input.email.toLowerCase().slice(0, 254),
        ...(input.name ? { name: input.name.slice(0, 160) } : {}),
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", customerId);
    if (customerUpdate.error) throw customerUpdate.error;
  }
}

export async function queueWhatsAppReply(
  db: SupabaseClient,
  input: {
    contactId: string;
    conversationId: string;
    body: string;
    kind?: "text" | "interactive" | "media";
    metadata?: Record<string, unknown>;
  },
): Promise<{ outboxId: string; messageId: string }> {
  const { data, error } = await db.rpc("enqueue_whatsapp_outbound", {
    p_conversation_id: input.conversationId,
    p_contact_id: input.contactId,
    p_body: input.body.slice(0, 4_000),
    p_message_kind: input.kind ?? "text",
    p_metadata: input.metadata ?? {},
  });
  if (error) throw error;
  const row = Array.isArray(data)
    ? (data[0] as { outbox_id?: string; message_id?: string } | undefined)
    : undefined;
  if (!row?.outbox_id || !row.message_id) throw new Error("whatsapp_outbound_not_queued");
  return { outboxId: row.outbox_id, messageId: row.message_id };
}

export async function getRecentWhatsAppInboundMessages(
  db: SupabaseClient,
  conversationId: string,
  limit = 8,
): Promise<string[]> {
  const { data, error } = await db
    .from("whatsapp_messages")
    .select("body")
    .eq("conversation_id", conversationId)
    .eq("direction", "inbound")
    .order("occurred_at", { ascending: false })
    .limit(Math.min(12, Math.max(1, limit)));
  if (error) throw error;
  return (data ?? [])
    .flatMap((row) => (typeof row.body === "string" && row.body.trim() ? [row.body.trim()] : []))
    .reverse();
}

export async function updateWhatsAppConversationQualification(
  db: SupabaseClient,
  conversationId: string,
  qualification: {
    occasion?: string;
    wineStyle?: string;
    purchaseFormat?: string;
    budget?: string;
  },
  intent?: string,
): Promise<void> {
  const safeQualification = Object.fromEntries(
    Object.entries(qualification).flatMap(([key, value]) =>
      typeof value === "string" && value.trim() ? [[key.slice(0, 80), value.trim().slice(0, 160)]] : [],
    ),
  );
  if (!Object.keys(safeQualification).length) return;

  const current = await db
    .from("whatsapp_conversations")
    .select("metadata")
    .eq("id", conversationId)
    .single();
  if (current.error) throw current.error;
  const metadata =
    typeof current.data.metadata === "object" && current.data.metadata !== null
      ? (current.data.metadata as Record<string, unknown>)
      : {};
  const previousQualification =
    typeof metadata.qualification === "object" && metadata.qualification !== null
      ? (metadata.qualification as Record<string, unknown>)
      : {};
  const updated = await db
    .from("whatsapp_conversations")
    .update({
      ...(intent ? { current_intent: intent.slice(0, 120) } : {}),
      metadata: {
        ...metadata,
        qualification: { ...previousQualification, ...safeQualification },
      },
    })
    .eq("id", conversationId);
  if (updated.error) throw updated.error;
}

export async function recordCrmSignal(
  db: SupabaseClient,
  input: {
    contactId: string;
    conversationId: string;
    eventKey: string;
    eventType:
      | "qualification"
      | "purchase_intent"
      | "human_handoff"
      | "checkout_started"
      | "purchase_confirmed";
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await db.rpc("record_crm_signal", {
    p_contact_id: input.contactId,
    p_conversation_id: input.conversationId,
    p_event_key: input.eventKey.slice(0, 240),
    p_event_type: input.eventType,
    p_metadata: input.metadata ?? {},
  });
  // During a staggered deploy the app may reach a server before its database
  // migration. WhatsApp remains available and the retry is safe after deploy.
  if (error && !error.message.includes("function public.record_crm_signal")) throw error;
}

export async function requestWhatsAppHandoff(
  db: SupabaseClient,
  input: {
    conversationId: string;
    reason: string;
    requestedBy: "customer" | "bot" | "system";
    summary?: string;
  },
): Promise<void> {
  const { error } = await db.rpc("request_whatsapp_handoff", {
    p_conversation_id: input.conversationId,
    p_reason: input.reason.slice(0, 160),
    p_requested_by: input.requestedBy,
    p_summary: input.summary?.slice(0, 2_000) ?? null,
    p_metadata: {},
  });
  if (error) throw error;
}

export async function createWhatsAppCheckoutSession(
  db: SupabaseClient,
  input: {
    contactId: string;
    conversationId: string;
    items: readonly WhatsAppCartItem[];
  },
): Promise<string> {
  const cart = input.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }));
  const { data, error } = await db.rpc("create_whatsapp_checkout_session", {
    p_contact_id: input.contactId,
    p_conversation_id: input.conversationId,
    p_cart_snapshot: cart,
    p_attribution: { source: "whatsapp", medium: "conversation", campaign: "sommelier" },
    p_ttl_minutes: 60,
  });
  if (error) throw error;
  const row = Array.isArray(data)
    ? (data[0] as { token?: string } | undefined)
    : undefined;
  if (!row?.token || !/^[a-f0-9]{64}$/.test(row.token)) {
    throw new Error("whatsapp_checkout_session_not_created");
  }
  return row.token;
}

export async function consumeWhatsAppCheckoutSession(
  db: SupabaseClient,
  token: string,
): Promise<{ items: Record<string, number>; attribution: Record<string, string> } | null> {
  const { data, error } = await db.rpc("consume_whatsapp_checkout_session", {
    p_token: token,
  });
  if (error) throw error;
  const row = Array.isArray(data)
    ? (data[0] as { cart_snapshot?: unknown; attribution?: unknown } | undefined)
    : undefined;
  if (!row || !Array.isArray(row.cart_snapshot)) return null;

  const items: Record<string, number> = {};
  for (const item of row.cart_snapshot) {
    if (
      typeof item === "object" &&
      item !== null &&
      typeof (item as { productId?: unknown }).productId === "string" &&
      Number.isInteger((item as { quantity?: unknown }).quantity)
    ) {
      items[(item as { productId: string }).productId] = (item as { quantity: number }).quantity;
    }
  }
  const attribution =
    typeof row.attribution === "object" && row.attribution !== null
      ? Object.fromEntries(
          Object.entries(row.attribution as Record<string, unknown>).flatMap(([key, value]) =>
            typeof value === "string" ? [[key, value.slice(0, 100)]] : [],
          ),
        )
      : {};
  return { items, attribution };
}

/**
 * Links an already-created order to an opaque WhatsApp checkout session. This
 * is deliberately server-only: a browser query parameter must never be able
 * to label an arbitrary order as WhatsApp revenue.
 */
export async function markWhatsAppCheckoutConverted(
  db: SupabaseClient,
  token: string,
  orderId: string,
): Promise<boolean> {
  const { data, error } = await db.rpc("mark_whatsapp_checkout_converted", {
    p_token: token,
    p_order_id: orderId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? (data[0] as { converted?: unknown } | undefined) : data;
  return row?.converted === true;
}
