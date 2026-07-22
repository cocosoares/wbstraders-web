import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  requireAdminAccess,
  type DataResult,
} from "@/components/admin/admin-data";
import { crmScoreTier } from "./scoring";
import { PRODUCTS } from "@/data/products";
import type {
  CrmConversationDetail,
  CrmCustomer360,
  CrmInboxData,
  CrmInboxItem,
  CrmMessage,
  CrmMessageAttachment,
  CrmMetrics,
  CrmOpportunityCard,
  CrmPriority,
  CrmSavedReply,
  CrmTag,
  CrmTask,
} from "./types";

const DEMO_MESSAGE = "Conecta Supabase y aplica la migración CRM para consultar conversaciones.";
const ERROR_MESSAGE = "No pudimos cargar el CRM. Confirma que la migración más reciente esté aplicada.";

type JsonRecord = Record<string, unknown>;

function objectValue(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null ? (value as JsonRecord) : {};
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

function priorityValue(value: unknown): CrmPriority {
  return value === 1 || value === 3 || value === 4 ? value : 2;
}

function qualificationValue(metadata: unknown): Record<string, string> {
  const qualification = objectValue(objectValue(metadata).qualification);
  return Object.fromEntries(
    Object.entries(qualification).flatMap(([key, value]) =>
      typeof value === "string" && value.trim() ? [[key, value.trim()]] : [],
    ),
  );
}

function parseAttachment(metadata: unknown): CrmMessageAttachment | undefined {
  const root = objectValue(metadata);
  const rich = objectValue(root.rich);
  const source = Object.keys(objectValue(root.attachment)).length
    ? objectValue(root.attachment)
    : Object.keys(objectValue(rich.attachment)).length
      ? objectValue(rich.attachment)
      : objectValue(rich.image);
  const fileName = stringValue(source.fileName);
  if (!fileName) return undefined;
  return {
    fileName,
    ...(stringValue(source.mimeType) ? { mimeType: stringValue(source.mimeType) } : {}),
    ...(stringValue(source.url) ? { url: stringValue(source.url) } : {}),
    ...(stringValue(source.storagePath) ? { storagePath: stringValue(source.storagePath) } : {}),
  };
}

async function signAttachments(messages: CrmMessage[]): Promise<CrmMessage[]> {
  const db = getSupabaseAdmin();
  return Promise.all(
    messages.map(async (message) => {
      if (!message.attachment?.storagePath || message.attachment.url) return message;
      const signed = await db.storage
        .from("whatsapp-media")
        .createSignedUrl(message.attachment.storagePath, 15 * 60);
      if (signed.error || !signed.data.signedUrl) return message;
      return {
        ...message,
        attachment: { ...message.attachment, url: signed.data.signedUrl },
      };
    }),
  );
}

export async function loadCrmInbox(
  selectedConversationId?: string,
): Promise<DataResult<CrmInboxData>> {
  const access = await requireAdminAccess();
  if (access.mode === "demo") return { state: "demo", message: DEMO_MESSAGE };

  try {
    const db = getSupabaseAdmin();
    const conversationsResult = await db
      .from("whatsapp_conversations")
      .select(
        "id,contact_id,state,assigned_to,current_intent,last_inbound_at,last_outbound_at,last_message_at,last_read_at,sla_due_at,first_human_response_at,priority,metadata,created_at",
      )
      .order("last_message_at", { ascending: false })
      .limit(150);
    if (conversationsResult.error) throw conversationsResult.error;

    const conversations = conversationsResult.data ?? [];
    const contactIds = [...new Set(conversations.map((row) => stringValue(row.contact_id)).filter(Boolean))];
    const conversationIds = conversations.map((row) => stringValue(row.id)).filter(Boolean);

    const [contactsResult, handoffsResult, latestMessagesResult, savedRepliesResult, tagsResult] =
      await Promise.all([
        contactIds.length
          ? db
              .from("whatsapp_contacts")
              .select("id,customer_id,display_name,phone_normalized,marketing_consent_status,metadata")
              .in("id", contactIds)
          : Promise.resolve({ data: [], error: null }),
        conversationIds.length
          ? db
              .from("whatsapp_handoffs")
              .select("conversation_id,status,reason,requested_at")
              .in("conversation_id", conversationIds)
              .in("status", ["open", "assigned"])
              .order("requested_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        conversationIds.length
          ? db
              .from("whatsapp_messages")
              .select("conversation_id,direction,body,occurred_at")
              .in("conversation_id", conversationIds)
              .order("occurred_at", { ascending: false })
              .limit(500)
          : Promise.resolve({ data: [], error: null }),
        db
          .from("crm_saved_replies")
          .select("id,title,body,category")
          .eq("active", true)
          .order("position", { ascending: true }),
        db.from("crm_tags").select("id,name,color").order("name", { ascending: true }),
      ]);
    const queryError = [contactsResult, handoffsResult, latestMessagesResult, savedRepliesResult, tagsResult]
      .find((result) => result.error)?.error;
    if (queryError) throw queryError;

    const contacts = new Map((contactsResult.data ?? []).map((row) => [stringValue(row.id), row]));
    const handoffs = new Map<string, JsonRecord>();
    for (const row of handoffsResult.data ?? []) {
      const key = stringValue(row.conversation_id);
      if (!handoffs.has(key)) handoffs.set(key, row as JsonRecord);
    }
    const latestMessages = new Map<string, JsonRecord>();
    for (const row of latestMessagesResult.data ?? []) {
      const key = stringValue(row.conversation_id);
      if (!latestMessages.has(key)) latestMessages.set(key, row as JsonRecord);
    }

    const customerIds = [...new Set(
      [...contacts.values()].map((row) => stringValue(row.customer_id)).filter(Boolean),
    )];
    const scoreMap = new Map<string, number>();
    if (customerIds.length) {
      const scores = await db
        .from("crm_customer_summary")
        .select("customer_id,score")
        .in("customer_id", customerIds);
      if (scores.error) throw scores.error;
      for (const row of scores.data ?? []) scoreMap.set(stringValue(row.customer_id), numberValue(row.score));
    }

    const now = Date.now();
    const items: CrmInboxItem[] = conversations.map((conversation) => {
      const id = stringValue(conversation.id);
      const contact = contacts.get(stringValue(conversation.contact_id));
      const customerId = stringValue(contact?.customer_id) || null;
      const handoff = handoffs.get(id);
      const latest = latestMessages.get(id);
      const lastInboundAt = stringValue(conversation.last_inbound_at) || null;
      const lastReadAt = stringValue(conversation.last_read_at) || null;
      const slaDueAt = stringValue(conversation.sla_due_at) || null;
      const score = customerId ? scoreMap.get(customerId) ?? 0 : 0;
      return {
        id,
        contactId: stringValue(conversation.contact_id),
        customerId,
        contactName: stringValue(contact?.display_name) || null,
        phone: stringValue(contact?.phone_normalized, "Sin número"),
        state: conversation.state as CrmInboxItem["state"],
        intent: stringValue(conversation.current_intent) || null,
        priority: priorityValue(conversation.priority),
        assignedTo: stringValue(conversation.assigned_to) || null,
        lastInboundAt,
        lastOutboundAt: stringValue(conversation.last_outbound_at) || null,
        lastMessageAt: stringValue(conversation.last_message_at),
        lastReadAt,
        slaDueAt,
        firstHumanResponseAt: stringValue(conversation.first_human_response_at) || null,
        unread: Boolean(lastInboundAt && (!lastReadAt || Date.parse(lastInboundAt) > Date.parse(lastReadAt))),
        slaBreached: Boolean(
          slaDueAt && !conversation.first_human_response_at && conversation.state !== "closed" && Date.parse(slaDueAt) <= now,
        ),
        preview: stringValue(latest?.body, latest?.direction === "inbound" ? "Archivo recibido" : "Mensaje enviado"),
        previewDirection:
          latest?.direction === "inbound" || latest?.direction === "outbound" ? latest.direction : null,
        handoff: handoff
          ? {
              status: stringValue(handoff.status),
              reason: stringValue(handoff.reason),
              requestedAt: stringValue(handoff.requested_at),
            }
          : null,
        qualification: qualificationValue(conversation.metadata),
        marketingConsent: stringValue(contact?.marketing_consent_status, "unknown"),
        score,
        scoreTier: crmScoreTier(score),
      };
    });

    const selectedId =
      selectedConversationId && items.some((item) => item.id === selectedConversationId)
        ? selectedConversationId
        : items[0]?.id;
    const selectedItem = items.find((item) => item.id === selectedId);
    const [selected, metrics] = await Promise.all([
      selectedItem ? loadConversationDetail(selectedItem) : Promise.resolve(null),
      loadCrmMetrics(items),
    ]);

    return {
      state: "ready",
      data: {
        items,
        selected,
        savedReplies: (savedRepliesResult.data ?? []).map((row) => ({
          id: stringValue(row.id),
          title: stringValue(row.title),
          body: stringValue(row.body),
          category: stringValue(row.category),
        })) as CrmSavedReply[],
        tags: (tagsResult.data ?? []).map((row) => ({
          id: stringValue(row.id),
          name: stringValue(row.name),
          color: stringValue(row.color, "gray") as CrmTag["color"],
        })),
        metrics,
      },
    };
  } catch (error) {
    console.error("[crm] inbox load failed", error);
    return { state: "error", message: ERROR_MESSAGE };
  }
}

async function loadConversationDetail(item: CrmInboxItem): Promise<CrmConversationDetail> {
  const db = getSupabaseAdmin();
  const [messagesResult, tasksResult] = await Promise.all([
    db
      .from("whatsapp_messages")
      .select("id,direction,kind,body,delivery_status,metadata,occurred_at")
      .eq("conversation_id", item.id)
      .order("occurred_at", { ascending: true })
      .limit(500),
    db
      .from("activities")
      .select("id,subject,body,status,due_at,priority,kind,conversation_id,opportunity_id,created_at")
      .eq("conversation_id", item.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (messagesResult.error) throw messagesResult.error;
  if (tasksResult.error) throw tasksResult.error;

  const messages = await signAttachments(
    (messagesResult.data ?? []).map((row) => ({
      id: stringValue(row.id),
      direction: row.direction as CrmMessage["direction"],
      kind: row.kind as CrmMessage["kind"],
      body: stringValue(row.body) || null,
      deliveryStatus: stringValue(row.delivery_status),
      occurredAt: stringValue(row.occurred_at),
      metadata: objectValue(row.metadata),
      ...(parseAttachment(row.metadata) ? { attachment: parseAttachment(row.metadata) } : {}),
    })),
  );
  const tasks = (tasksResult.data ?? []).map(mapTask);
  const customer = item.customerId
    ? await loadCrmCustomerRecord(item.customerId, item.qualification, item.marketingConsent)
    : null;
  return { conversation: item, messages, customer, tasks };
}

export async function loadCrmCustomer(
  customerId: string,
): Promise<DataResult<CrmCustomer360>> {
  const access = await requireAdminAccess();
  if (access.mode === "demo") return { state: "demo", message: DEMO_MESSAGE };
  try {
    const db = getSupabaseAdmin();
    const contactResult = await db
      .from("whatsapp_contacts")
      .select("id,marketing_consent_status")
      .eq("customer_id", customerId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (contactResult.error) throw contactResult.error;
    let qualification: Record<string, string> = {};
    if (contactResult.data?.id) {
      const conversation = await db
        .from("whatsapp_conversations")
        .select("metadata")
        .eq("contact_id", contactResult.data.id)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (conversation.error) throw conversation.error;
      qualification = qualificationValue(conversation.data?.metadata);
    }
    return {
      state: "ready",
      data: await loadCrmCustomerRecord(
        customerId,
        qualification,
        stringValue(contactResult.data?.marketing_consent_status, "unknown"),
      ),
    };
  } catch (error) {
    console.error("[crm] customer load failed", error);
    return { state: "error", message: ERROR_MESSAGE };
  }
}

async function loadCrmCustomerRecord(
  customerId: string,
  qualification: Record<string, string>,
  whatsappConsent: string,
): Promise<CrmCustomer360> {
  const db = getSupabaseAdmin();
  const [customerResult, summaryResult, ordersResult, opportunitiesResult, tasksResult, selectedTagsResult, allTagsResult, mergeCandidatesResult] =
    await Promise.all([
      db
        .from("customers")
        .select("id,name,email,phone,lifecycle_stage,source_channel,last_activity_at,last_purchase_at")
        .eq("id", customerId)
        .single(),
      db.from("crm_customer_summary").select("*").eq("customer_id", customerId).single(),
      db
        .from("orders")
        .select("id,order_number,payment_status,fulfillment_status,total_cents,currency,created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("opportunities")
        .select("id,title,segment,stage,score,value_cents,currency,next_action,next_action_at,lost_reason,updated_at")
        .eq("customer_id", customerId)
        .order("updated_at", { ascending: false }),
      db
        .from("activities")
        .select("id,subject,body,status,due_at,priority,kind,conversation_id,opportunity_id,created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(150),
      db.from("crm_customer_tags").select("tag_id").eq("customer_id", customerId),
      db.from("crm_tags").select("id,name,color").order("name", { ascending: true }),
      db
        .from("customers")
        .select("id,name,email,phone")
        .neq("id", customerId)
        .order("updated_at", { ascending: false })
        .limit(50),
    ]);
  const error = [customerResult, summaryResult, ordersResult, opportunitiesResult, tasksResult, selectedTagsResult, allTagsResult, mergeCandidatesResult]
    .find((result) => result.error)?.error;
  if (error) throw error;

  const customer = customerResult.data;
  const summary = summaryResult.data;
  if (!customer || !summary) throw new Error("crm_customer_not_found");
  const email = stringValue(customer.email) || null;
  const phoneNormalized = stringValue(customer.phone).replace(/\D/g, "");
  const orderIds = (ordersResult.data ?? []).map((row) => stringValue(row.id));
  const [claimsResult, emailsResult] = await Promise.all([
    phoneNormalized || email
      ? db
          .from("consumer_claims")
          .select("id,claim_number,status,claim_type,created_at")
          .or(
            [phoneNormalized ? `phone_normalized.eq.${phoneNormalized}` : "", email ? `email.eq.${email}` : ""]
              .filter(Boolean)
              .join(","),
          )
          .order("created_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [], error: null }),
    email || orderIds.length
      ? db
          .from("email_outbox")
          .select("id,kind,state,delivery_status,created_at,payload,recipient_email")
          .or(
            [email ? `recipient_email.eq.${email}` : "", ...orderIds.map((id) => `payload->>orderId.eq.${id}`)]
              .filter(Boolean)
              .join(","),
          )
          .order("created_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (claimsResult.error) throw claimsResult.error;
  if (emailsResult.error) throw emailsResult.error;

  const selectedTags = new Set((selectedTagsResult.data ?? []).map((row) => stringValue(row.tag_id)));
  const score = numberValue(summary.score);
  return {
    id: stringValue(customer.id),
    name: stringValue(customer.name),
    email,
    phone: stringValue(customer.phone),
    lifecycleStage: stringValue(customer.lifecycle_stage, "prospect"),
    sourceChannel: stringValue(customer.source_channel, "web"),
    marketingConsent: whatsappConsent,
    score,
    scoreTier: crmScoreTier(score),
    totalOrders: numberValue(summary.total_orders),
    paidOrders: numberValue(summary.paid_orders),
    totalSpentCents: numberValue(summary.total_spent_cents),
    averageOrderCents: numberValue(summary.avg_order_cents),
    lastOrderAt: stringValue(summary.last_order_at) || null,
    lastActivityAt: stringValue(customer.last_activity_at) || null,
    lastPurchaseAt: stringValue(customer.last_purchase_at) || null,
    qualification,
    tags: (allTagsResult.data ?? []).map((row) => ({
      id: stringValue(row.id),
      name: stringValue(row.name),
      color: stringValue(row.color, "gray") as CrmTag["color"],
      selected: selectedTags.has(stringValue(row.id)),
    })),
    orders: (ordersResult.data ?? []).map((row) => ({
      id: stringValue(row.id),
      orderNumber: stringValue(row.order_number),
      paymentStatus: stringValue(row.payment_status),
      fulfillmentStatus: stringValue(row.fulfillment_status),
      totalCents: numberValue(row.total_cents),
      currency: stringValue(row.currency, "PEN"),
      createdAt: stringValue(row.created_at),
    })),
    opportunities: (opportunitiesResult.data ?? []).map(mapOpportunity),
    tasks: (tasksResult.data ?? []).map(mapTask),
    claims: (claimsResult.data ?? []).map((row) => ({
      id: stringValue(row.id),
      claimNumber: stringValue(row.claim_number),
      status: stringValue(row.status),
      claimType: stringValue(row.claim_type),
      createdAt: stringValue(row.created_at),
    })),
    emails: (emailsResult.data ?? []).map((row) => ({
      id: stringValue(row.id),
      kind: stringValue(row.kind),
      state: stringValue(row.state),
      deliveryStatus: stringValue(row.delivery_status) || null,
      createdAt: stringValue(row.created_at),
    })),
    mergeCandidates: (mergeCandidatesResult.data ?? []).map((row) => ({
      id: stringValue(row.id),
      name: stringValue(row.name),
      email: stringValue(row.email) || null,
      phone: stringValue(row.phone),
    })),
  };
}

async function loadCrmMetrics(items: CrmInboxItem[]): Promise<CrmMetrics> {
  const db = getSupabaseAdmin();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [tasks, orders, closed, checkouts, scores, opportunities, customers, recentConversations] = await Promise.all([
    db.from("activities").select("id,due_at", { count: "exact" }).eq("status", "planned"),
    db.from("orders").select("id,total_cents").eq("channel", "whatsapp").gte("created_at", thirtyDaysAgo),
    db
      .from("whatsapp_conversations")
      .select("id,assigned_to,created_at,first_human_response_at")
      .eq("state", "closed")
      .gte("created_at", thirtyDaysAgo),
    db
      .from("whatsapp_checkout_sessions")
      .select("id,cart_snapshot,visited_at,converted_at,expires_at")
      .gte("created_at", thirtyDaysAgo),
    db.from("crm_customer_summary").select("customer_id,score"),
    db.from("opportunities").select("id,stage,value_cents").not("stage", "in", "(won,lost)"),
    db.from("customers").select("id,lifecycle_stage"),
    db
      .from("whatsapp_conversations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo),
  ]);
  const error = [tasks, orders, closed, checkouts, scores, opportunities, customers, recentConversations]
    .find((result) => result.error)?.error;
  if (error) throw error;

  const taskRows = tasks.data ?? [];
  const orderRows = orders.data ?? [];
  const closedRows = closed.data ?? [];
  const checkoutRows = checkouts.data ?? [];
  const orderIds = orderRows.map((row) => stringValue(row.id)).filter(Boolean);
  const orderItems = orderIds.length
    ? await db.from("order_items").select("product_id,product_name,quantity").in("order_id", orderIds)
    : { data: [], error: null };
  if (orderItems.error) throw orderItems.error;
  const productNames = new Map(PRODUCTS.map((product) => [product.id, product.name]));
  const recommended = new Map<string, { name: string; quantity: number }>();
  for (const checkout of checkoutRows) {
    if (!Array.isArray(checkout.cart_snapshot)) continue;
    for (const raw of checkout.cart_snapshot) {
      const cartItem = objectValue(raw);
      const productId = stringValue(cartItem.productId);
      if (!productId) continue;
      const current = recommended.get(productId) ?? {
        name: productNames.get(productId) || productId,
        quantity: 0,
      };
      current.quantity += Math.max(1, numberValue(cartItem.quantity));
      recommended.set(productId, current);
    }
  }
  const sold = new Map<string, { name: string; quantity: number }>();
  for (const row of orderItems.data ?? []) {
    const productId = stringValue(row.product_id);
    const current = sold.get(productId) ?? {
      name: stringValue(row.product_name, productNames.get(productId) || productId),
      quantity: 0,
    };
    current.quantity += numberValue(row.quantity);
    sold.set(productId, current);
  }
  const segments: Record<string, number> = {};
  for (const customer of customers.data ?? []) {
    const stage = stringValue(customer.lifecycle_stage, "prospect");
    segments[stage] = (segments[stage] ?? 0) + 1;
  }
  const stageCounts: Record<string, number> = {};
  for (const opportunity of opportunities.data ?? []) {
    const stage = stringValue(opportunity.stage, "lead");
    stageCounts[stage] = (stageCounts[stage] ?? 0) + 1;
  }
  const totalBottles = (orderItems.data ?? []).reduce((sum, row) => sum + numberValue(row.quantity), 0);
  const humanResponseMinutes = closedRows.flatMap((row) => {
    if (!row.first_human_response_at || !row.created_at) return [];
    const duration = (Date.parse(row.first_human_response_at) - Date.parse(row.created_at)) / 60000;
    return Number.isFinite(duration) && duration >= 0 ? [duration] : [];
  });
  return {
    newConversations: recentConversations.count ?? 0,
    openConversations: items.filter((item) => item.state !== "closed").length,
    unreadConversations: items.filter((item) => item.unread).length,
    breachedSla: items.filter((item) => item.slaBreached).length,
    openHumanHandoffs: items.filter((item) => item.handoff && item.state !== "closed").length,
    openTasks: tasks.count ?? taskRows.length,
    overdueTasks: taskRows.filter((row) => row.due_at && Date.parse(row.due_at) <= Date.now()).length,
    whatsappOrders: orderRows.length,
    whatsappRevenueCents: orderRows.reduce((sum, row) => sum + numberValue(row.total_cents), 0),
    averageFirstResponseMinutes: humanResponseMinutes.length
      ? humanResponseMinutes.reduce((sum, value) => sum + value, 0) / humanResponseMinutes.length
      : null,
    botResolutionRate: closedRows.length
      ? closedRows.filter((row) => !row.assigned_to).length / closedRows.length
      : null,
    checkoutConversionRate: checkoutRows.length
      ? checkoutRows.filter((row) => row.converted_at).length / checkoutRows.length
      : null,
    hotLeads: (scores.data ?? []).filter((row) => numberValue(row.score) >= 50).length,
    totalCheckouts: checkoutRows.length,
    abandonedCheckouts: checkoutRows.filter(
      (row) => row.visited_at && !row.converted_at && Date.parse(row.expires_at) <= Date.now(),
    ).length,
    recoveredCheckouts: checkoutRows.filter((row) => row.visited_at && row.converted_at).length,
    averageBottlesPerOrder: orderRows.length ? totalBottles / orderRows.length : null,
    openOpportunityCount: opportunities.data?.length ?? 0,
    pipelineValueCents: (opportunities.data ?? []).reduce(
      (sum, row) => sum + numberValue(row.value_cents),
      0,
    ),
    customerSegments: segments,
    opportunitiesByStage: stageCounts,
    topRecommendedProducts: topProductRows(recommended),
    topSoldProducts: topProductRows(sold),
  };
}

function topProductRows(source: Map<string, { name: string; quantity: number }>) {
  return [...source.entries()]
    .map(([productId, value]) => ({ productId, ...value }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
}

function mapTask(row: JsonRecord): CrmTask {
  return {
    id: stringValue(row.id),
    subject: stringValue(row.subject),
    body: stringValue(row.body) || null,
    status: row.status as CrmTask["status"],
    dueAt: stringValue(row.due_at) || null,
    priority: priorityValue(row.priority),
    kind: stringValue(row.kind),
    conversationId: stringValue(row.conversation_id) || null,
    opportunityId: stringValue(row.opportunity_id) || null,
    createdAt: stringValue(row.created_at),
  };
}

function mapOpportunity(row: JsonRecord): CrmOpportunityCard {
  return {
    id: stringValue(row.id),
    title: stringValue(row.title),
    segment: stringValue(row.segment),
    stage: stringValue(row.stage),
    score: numberValue(row.score),
    valueCents: row.value_cents === null || row.value_cents === undefined ? null : numberValue(row.value_cents),
    currency: stringValue(row.currency, "PEN"),
    nextAction: stringValue(row.next_action) || null,
    nextActionAt: stringValue(row.next_action_at) || null,
    lostReason: stringValue(row.lost_reason) || null,
    updatedAt: stringValue(row.updated_at),
  };
}
