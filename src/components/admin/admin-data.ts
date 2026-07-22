import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PRODUCTS } from "@/data/products";

export type DataResult<T> =
  | { state: "ready"; data: T }
  | { state: "demo" | "error"; message: string };

export type AdminAccess = {
  mode: "live" | "demo";
  userId: string | null;
  userEmail: string | null;
  displayName: string;
};

export type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentProvider: string;
  fulfillmentStatus: string;
  totalCents: number;
  currency: string;
  channel: string;
  customerName: string;
  customerEmail: string | null;
  createdAt: string;
};

export type AdminCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
};

export type AdminInventoryItem = {
  productId: string;
  productName: string;
  onHand: number;
  reserved: number;
  available: number;
};

export type AdminOpportunity = {
  id: string;
  customerId: string | null;
  title: string;
  segment: string;
  stage: string;
  customerName: string;
  score: number;
  sourceChannel: string;
  nextAction: string | null;
  nextActionAt: string | null;
  valueCents: number | null;
  currency: string;
};

export type AdminConsumerClaim = {
  id: string;
  claimNumber: string;
  claimType: string;
  itemType: string;
  customerName: string;
  documentType: string;
  maskedDocument: string;
  phone: string;
  email: string;
  orderNumber: string | null;
  detail: string;
  consumerRequest: string;
  status: string;
  createdAt: string;
};

export type AdminFiscalDocument = {
  id: string;
  orderId: string;
  orderNumber: string;
  documentType: string;
  provider: string;
  recipientName: string;
  recipientDocumentType: string | null;
  recipientDocumentNumber: string | null;
  recipientAddress: string | null;
  recipientEmail: string | null;
  status: string;
  series: string | null;
  number: string | null;
  providerReference: string | null;
  statusReason: string | null;
  createdAt: string;
  issuedAt: string | null;
};

export type AdminWhatsAppConversation = {
  id: string;
  contactId: string;
  contactName: string | null;
  phone: string;
  state: "bot" | "human" | "closed";
  intent: string | null;
  lastInboundAt: string | null;
  lastMessageAt: string;
  ageVerified: boolean;
  handoff: { status: string; reason: string; requestedAt: string } | null;
};

export type AdminWhatsAppMetrics = {
  activeConversations: number;
  openHandoffs: number;
  checkoutStartsToday: number;
  ordersToday: number;
  revenueTodayCents: number;
};

export type DashboardData = {
  paidTodayCents: number;
  paidTodayCount: number;
  toPrepareCount: number;
  lowStockCount: number;
  overdueOpportunityCount: number;
  recentOrders: AdminOrder[];
};

export type AdminEmailOutboxItem = {
  id: string;
  kind: string;
  recipientEmail: string | null;
  state: string;
  attempts: number;
  maxAttempts: number;
  deliveryStatus: string | null;
  lastError: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
};

export type AdminEmailEvent = {
  id: string;
  eventType: string;
  providerEmailId: string | null;
  recipientEmail: string | null;
  receivedAt: string;
};

export type AdminEmailSuppression = {
  email: string;
  reason: string;
  active: boolean;
  updatedAt: string;
};

export type AdminEmailDashboard = {
  sentToday: number;
  deliveredToday: number;
  attentionRequired: number;
  activeSuppressions: number;
  outbox: AdminEmailOutboxItem[];
  events: AdminEmailEvent[];
  suppressions: AdminEmailSuppression[];
  settings: {
    transactionalEnabled: boolean;
    marketingEnabled: boolean;
    testMode: boolean;
    testRecipient: string | null;
    fromAddress: string | null;
  };
};

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_provider: string;
  fulfillment_status: string;
  total_cents: number;
  currency: string;
  channel: string;
  customer_snapshot: unknown;
  created_at: string;
};

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
};

type InventoryRow = {
  product_id: string;
  on_hand: number | string;
  reserved: number | string;
  available: number | string;
};

type OpportunityRow = {
  id: string;
  customer_id: string | null;
  title: string;
  segment: string;
  stage: string;
  score: number | null;
  source_channel: string | null;
  next_action: string | null;
  next_action_at: string | null;
  value_cents: number | null;
  currency: string;
};

type ConsumerClaimRow = {
  id: string;
  claim_number: string;
  claim_type: string;
  item_type: string;
  customer_name: string;
  document_type: string;
  document_number: string;
  phone: string;
  email: string;
  order_number: string | null;
  detail: string;
  consumer_request: string;
  status: string;
  created_at: string;
};

type FiscalDocumentRow = {
  id: string;
  order_id: string;
  document_type: string;
  provider: string;
  recipient_snapshot: unknown;
  status: string;
  series: string | null;
  number: string | null;
  provider_reference: string | null;
  cancellation_reference: string | null;
  cancellation_reason: string | null;
  error_message: string | null;
  issued_at: string | null;
  created_at: string;
};

type FiscalOrderRow = {
  id: string;
  order_number: string;
  customer_snapshot: unknown;
  fiscal_snapshot: unknown;
};

type WhatsAppConversationRow = {
  id: string;
  contact_id: string;
  state: "bot" | "human" | "closed";
  current_intent: string | null;
  last_inbound_at: string | null;
  last_message_at: string;
};

type WhatsAppContactRow = {
  id: string;
  display_name: string | null;
  phone_normalized: string;
  age_verified_at: string | null;
};

type WhatsAppHandoffRow = {
  conversation_id: string;
  status: string;
  reason: string;
  requested_at: string;
};

type EmailOutboxRow = {
  id: string;
  kind: string;
  recipient_email: string | null;
  state: string;
  attempts: number;
  max_attempts: number;
  delivery_status: string | null;
  last_error: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
};

type EmailEventRow = {
  id: string;
  event_type: string;
  provider_email_id: string | null;
  recipient_email: string | null;
  received_at: string;
};

type EmailSuppressionRow = {
  email: string;
  reason: string;
  active: boolean;
  updated_at: string;
};

const DEMO_MESSAGE =
  "Configura NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY. El panel permanecerá vacío hasta conectarse a una fuente real.";
const ERROR_MESSAGE =
  "Revisa la conexión a Supabase y confirma que la migración commerce_core se haya ejecutado correctamente.";

function hasPublicSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export async function requireAdminAccess(): Promise<AdminAccess> {
  if (!hasPublicSupabaseConfig()) {
    return {
      mode: "demo",
      userId: null,
      userEmail: null,
      displayName: "Configuración",
    };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components can read the refreshed session even when the
            // response context does not allow mutating cookies.
          }
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const allowedEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const userEmail = user.email?.toLowerCase() || null;
  const hasAdminRole = user.app_metadata?.role === "admin";
  const isAllowedEmail = Boolean(userEmail && allowedEmails.includes(userEmail));

  if (!hasAdminRole && !isAllowedEmail) {
    redirect("/admin/login?error=unauthorized");
  }

  const metadataName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name.trim()
      : "";

  return {
    mode: "live",
    userId: user.id,
    userEmail,
    displayName: metadataName || user.email || "Administración",
  };
}

export async function loadOrders(): Promise<DataResult<AdminOrder[]>> {
  const access = await requireAdminAccess();
  if (access.mode === "demo") return { state: "demo", message: DEMO_MESSAGE };

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("orders")
      .select(
        "id,order_number,status,payment_status,payment_provider,fulfillment_status,total_cents,currency,channel,customer_snapshot,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    return {
      state: "ready",
      data: ((data || []) as OrderRow[]).map(mapOrder),
    };
  } catch {
    return { state: "error", message: ERROR_MESSAGE };
  }
}

export async function loadCustomers(): Promise<DataResult<AdminCustomer[]>> {
  const access = await requireAdminAccess();
  if (access.mode === "demo") return { state: "demo", message: DEMO_MESSAGE };

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("customers")
      .select("id,name,email,phone,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    return {
      state: "ready",
      data: ((data || []) as CustomerRow[]).map((customer) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        createdAt: customer.created_at,
      })),
    };
  } catch {
    return { state: "error", message: ERROR_MESSAGE };
  }
}

export async function loadInventory(): Promise<DataResult<AdminInventoryItem[]>> {
  const access = await requireAdminAccess();
  if (access.mode === "demo") return { state: "demo", message: DEMO_MESSAGE };

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("inventory_availability")
      .select("product_id,on_hand,reserved,available")
      .order("available", { ascending: true });
    if (error) throw error;

    const names = new Map(PRODUCTS.map((product) => [product.id, product.name]));
    return {
      state: "ready",
      data: ((data || []) as InventoryRow[]).map((item) => ({
        productId: item.product_id,
        productName: names.get(item.product_id) || "Producto no identificado",
        onHand: Number(item.on_hand),
        reserved: Number(item.reserved),
        available: Number(item.available),
      })),
    };
  } catch {
    return { state: "error", message: ERROR_MESSAGE };
  }
}

export async function loadOpportunities(): Promise<
  DataResult<AdminOpportunity[]>
> {
  const access = await requireAdminAccess();
  if (access.mode === "demo") return { state: "demo", message: DEMO_MESSAGE };

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("opportunities")
      .select(
        "id,customer_id,title,segment,stage,score,source_channel,next_action,next_action_at,value_cents,currency",
      )
      .order("next_action_at", { ascending: true, nullsFirst: false })
      .limit(100);
    if (error) throw error;

    const opportunities = (data || []) as OpportunityRow[];
    const customerIds = opportunities
      .map((item) => item.customer_id)
      .filter((id): id is string => Boolean(id));
    const customerNames = new Map<string, string>();

    if (customerIds.length > 0) {
      const { data: customers, error: customerError } = await supabase
        .from("customers")
        .select("id,name")
        .in("id", customerIds);
      if (customerError) throw customerError;
      for (const customer of (customers || []) as Pick<CustomerRow, "id" | "name">[]) {
        customerNames.set(customer.id, customer.name);
      }
    }

    return {
      state: "ready",
      data: opportunities.map((item) => ({
        id: item.id,
        customerId: item.customer_id,
        title: item.title,
        segment: item.segment,
        stage: item.stage,
        customerName: item.customer_id
          ? customerNames.get(item.customer_id) || "Cliente sin nombre"
          : "Sin cliente asociado",
        score: Number(item.score || 0),
        sourceChannel: item.source_channel || "web",
        nextAction: item.next_action,
        nextActionAt: item.next_action_at,
        valueCents: item.value_cents,
        currency: item.currency,
      })),
    };
  } catch {
    return { state: "error", message: ERROR_MESSAGE };
  }
}

export async function loadConsumerClaims(): Promise<
  DataResult<AdminConsumerClaim[]>
> {
  const access = await requireAdminAccess();
  if (access.mode === "demo") return { state: "demo", message: DEMO_MESSAGE };

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("consumer_claims")
      .select(
        "id,claim_number,claim_type,item_type,customer_name,document_type,document_number,phone,email,order_number,detail,consumer_request,status,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    return {
      state: "ready",
      data: ((data || []) as ConsumerClaimRow[]).map((claim) => ({
        id: claim.id,
        claimNumber: claim.claim_number,
        claimType: claim.claim_type,
        itemType: claim.item_type,
        customerName: claim.customer_name,
        documentType: claim.document_type,
        maskedDocument: maskDocument(claim.document_number),
        phone: claim.phone,
        email: claim.email,
        orderNumber: claim.order_number,
        detail: claim.detail,
        consumerRequest: claim.consumer_request,
        status: claim.status,
        createdAt: claim.created_at,
      })),
    };
  } catch {
    return {
      state: "error",
      message:
        "Revisa la conexión a Supabase y confirma que la migración consumer_claims se haya ejecutado correctamente.",
    };
  }
}

export async function loadFiscalDocuments(): Promise<
  DataResult<AdminFiscalDocument[]>
> {
  const access = await requireAdminAccess();
  if (access.mode === "demo") return { state: "demo", message: DEMO_MESSAGE };

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("fiscal_documents")
      .select(
        "id,order_id,document_type,provider,recipient_snapshot,status,series,number,provider_reference,cancellation_reference,cancellation_reason,error_message,issued_at,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    const documents = (data || []) as FiscalDocumentRow[];
    const orderIds = [...new Set(documents.map((document) => document.order_id))];
    const ordersById = new Map<string, FiscalOrderRow>();

    if (orderIds.length > 0) {
      const { data: orders, error: orderError } = await supabase
        .from("orders")
        .select("id,order_number,customer_snapshot,fiscal_snapshot")
        .in("id", orderIds);
      if (orderError) throw orderError;
      for (const order of (orders || []) as FiscalOrderRow[]) {
        ordersById.set(order.id, order);
      }
    }

    return {
      state: "ready",
      data: documents.map((document) => {
        const order = ordersById.get(document.order_id);
        const recipient = asRecord(document.recipient_snapshot);
        const fiscal = Object.keys(recipient).length
          ? recipient
          : asRecord(order?.fiscal_snapshot);
        const customer = asRecord(order?.customer_snapshot);
        const documentType = readString(fiscal, "documentType");
        const documentNumber = readString(fiscal, "documentNumber");
        const businessName = readString(fiscal, "businessName");

        return {
          id: document.id,
          orderId: document.order_id,
          orderNumber: order?.order_number || "Pedido no disponible",
          documentType: document.document_type,
          provider: document.provider,
          recipientName:
            businessName ||
            readString(customer, "name") ||
            readString(customer, "fullName") ||
            "Destinatario no disponible",
          recipientDocumentType: documentType,
          recipientDocumentNumber: documentNumber,
          recipientAddress: readString(fiscal, "fiscalAddress"),
          recipientEmail: readString(customer, "email"),
          status: document.status,
          series: document.series,
          number: document.number,
          providerReference:
            document.status === "cancelled"
              ? document.cancellation_reference
              : document.provider_reference,
          statusReason:
            document.status === "cancelled"
              ? document.cancellation_reason
              : document.error_message,
          createdAt: document.created_at,
          issuedAt: document.issued_at,
        };
      }),
    };
  } catch {
    return {
      state: "error",
      message:
        "Revisa la conexión a Supabase y confirma que la migración de documentos fiscales esté actualizada.",
    };
  }
}

export async function loadWhatsAppInbox(): Promise<
  DataResult<AdminWhatsAppConversation[]>
> {
  const access = await requireAdminAccess();
  if (access.mode === "demo") return { state: "demo", message: DEMO_MESSAGE };

  try {
    const supabase = getSupabaseAdmin();
    const { data: rawConversations, error: conversationError } = await supabase
      .from("whatsapp_conversations")
      .select("id,contact_id,state,current_intent,last_inbound_at,last_message_at")
      .neq("state", "closed")
      .order("last_message_at", { ascending: false })
      .limit(100);
    if (conversationError) throw conversationError;

    const conversations = (rawConversations || []) as WhatsAppConversationRow[];
    if (conversations.length === 0) return { state: "ready", data: [] };

    const contactIds = conversations.map((conversation) => conversation.contact_id);
    const conversationIds = conversations.map((conversation) => conversation.id);
    const [contactsResult, handoffsResult] = await Promise.all([
      supabase
        .from("whatsapp_contacts")
        .select("id,display_name,phone_normalized,age_verified_at")
        .in("id", contactIds),
      supabase
        .from("whatsapp_handoffs")
        .select("conversation_id,status,reason,requested_at")
        .in("conversation_id", conversationIds)
        .in("status", ["open", "assigned"])
        .order("requested_at", { ascending: false }),
    ]);
    if (contactsResult.error) throw contactsResult.error;
    if (handoffsResult.error) throw handoffsResult.error;

    const contacts = new Map<string, WhatsAppContactRow>();
    for (const contact of (contactsResult.data || []) as WhatsAppContactRow[]) {
      contacts.set(contact.id, contact);
    }
    const handoffs = new Map<string, WhatsAppHandoffRow>();
    for (const handoff of (handoffsResult.data || []) as WhatsAppHandoffRow[]) {
      if (!handoffs.has(handoff.conversation_id)) handoffs.set(handoff.conversation_id, handoff);
    }

    return {
      state: "ready",
      data: conversations.map((conversation) => {
        const contact = contacts.get(conversation.contact_id);
        const handoff = handoffs.get(conversation.id);
        return {
          id: conversation.id,
          contactId: conversation.contact_id,
          contactName: contact?.display_name ?? null,
          phone: contact?.phone_normalized ?? "Sin nÃºmero",
          state: conversation.state,
          intent: conversation.current_intent,
          lastInboundAt: conversation.last_inbound_at,
          lastMessageAt: conversation.last_message_at,
          ageVerified: Boolean(contact?.age_verified_at),
          handoff: handoff
            ? { status: handoff.status, reason: handoff.reason, requestedAt: handoff.requested_at }
            : null,
        };
      }),
    };
  } catch {
    return {
      state: "error",
      message:
        "Revisa la conexiÃ³n a Supabase y confirma que la migraciÃ³n de WhatsApp se haya ejecutado correctamente.",
    };
  }
}

export async function loadWhatsAppMetrics(): Promise<DataResult<AdminWhatsAppMetrics>> {
  const access = await requireAdminAccess();
  if (access.mode === "demo") return { state: "demo", message: DEMO_MESSAGE };

  try {
    const supabase = getSupabaseAdmin();
    const todayStart = limaTodayStart();
    const [active, handoffs, checkouts, orders] = await Promise.all([
      supabase
        .from("whatsapp_conversations")
        .select("id", { count: "exact", head: true })
        .neq("state", "closed"),
      supabase
        .from("whatsapp_handoffs")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "assigned"]),
      supabase
        .from("whatsapp_checkout_sessions")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStart),
      supabase
        .from("orders")
        .select("total_cents", { count: "exact" })
        .eq("channel", "whatsapp")
        .gte("created_at", todayStart),
    ]);
    const failure = [active, handoffs, checkouts, orders].find((result) => result.error)?.error;
    if (failure) throw failure;
    const whatsappOrders = (orders.data || []) as Pick<OrderRow, "total_cents">[];
    return {
      state: "ready",
      data: {
        activeConversations: active.count || 0,
        openHandoffs: handoffs.count || 0,
        checkoutStartsToday: checkouts.count || 0,
        ordersToday: orders.count || 0,
        revenueTodayCents: whatsappOrders.reduce((sum, order) => sum + order.total_cents, 0),
      },
    };
  } catch {
    return {
      state: "error",
      message:
        "No pudimos calcular las métricas de WhatsApp. Confirma que la migración esté aplicada.",
    };
  }
}

export async function loadEmailDashboard(filters?: {
  state?: string;
  query?: string;
}): Promise<DataResult<AdminEmailDashboard>> {
  const access = await requireAdminAccess();
  if (access.mode === "demo") return { state: "demo", message: DEMO_MESSAGE };

  try {
    const supabase = getSupabaseAdmin();
    const todayStart = limaTodayStart();
    const [sent, delivered, attention, suppressionCount, outbox, events, suppressions] =
      await Promise.all([
        supabase
          .from("email_events")
          .select("id", { count: "exact", head: true })
          .eq("event_type", "email.sent")
          .gte("received_at", todayStart),
        supabase
          .from("email_events")
          .select("id", { count: "exact", head: true })
          .eq("event_type", "email.delivered")
          .gte("received_at", todayStart),
        supabase
          .from("email_outbox")
          .select("id", { count: "exact", head: true })
          .in("state", ["failed", "dead"]),
        supabase
          .from("email_suppressions")
          .select("email", { count: "exact", head: true })
          .eq("active", true),
        supabase
          .from("email_outbox")
          .select(
            "id,kind,recipient_email,state,attempts,max_attempts,delivery_status,last_error,sent_at,delivered_at,created_at",
          )
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("email_events")
          .select("id,event_type,provider_email_id,recipient_email,received_at")
          .order("received_at", { ascending: false })
          .limit(50),
        supabase
          .from("email_suppressions")
          .select("email,reason,active,updated_at")
          .eq("active", true)
          .order("updated_at", { ascending: false })
          .limit(50),
      ]);

    const firstError = [sent, delivered, attention, suppressionCount, outbox, events, suppressions]
      .find((result) => result.error)?.error;
    if (firstError) throw firstError;

    const requestedState = String(filters?.state || "all").toLowerCase();
    const allowedStates = new Set([
      "all",
      "pending",
      "processing",
      "sent",
      "failed",
      "dead",
      "suppressed",
    ]);
    const stateFilter = allowedStates.has(requestedState) ? requestedState : "all";
    const query = String(filters?.query || "").trim().toLowerCase().slice(0, 120);
    const mappedOutbox = ((outbox.data || []) as EmailOutboxRow[]).map((row) => ({
      id: row.id,
      kind: row.kind,
      recipientEmail: row.recipient_email,
      state: row.state,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      deliveryStatus: row.delivery_status,
      lastError: row.last_error,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      createdAt: row.created_at,
    }));

    return {
      state: "ready",
      data: {
        sentToday: sent.count || 0,
        deliveredToday: delivered.count || 0,
        attentionRequired: attention.count || 0,
        activeSuppressions: suppressionCount.count || 0,
        outbox: mappedOutbox.filter((item) => {
          const matchesState = stateFilter === "all" || item.state === stateFilter;
          const matchesQuery =
            !query ||
            item.kind.toLowerCase().includes(query) ||
            item.recipientEmail?.toLowerCase().includes(query) ||
            item.lastError?.toLowerCase().includes(query);
          return matchesState && Boolean(matchesQuery);
        }),
        events: ((events.data || []) as EmailEventRow[]).map((event) => ({
          id: event.id,
          eventType: event.event_type,
          providerEmailId: event.provider_email_id,
          recipientEmail: event.recipient_email,
          receivedAt: event.received_at,
        })),
        suppressions: ((suppressions.data || []) as EmailSuppressionRow[]).map(
          (suppression) => ({
            email: suppression.email,
            reason: suppression.reason,
            active: suppression.active,
            updatedAt: suppression.updated_at,
          }),
        ),
        settings: {
          transactionalEnabled:
            process.env.EMAIL_TRANSACTIONAL_ENABLED?.trim().toLowerCase() === "true" &&
            Boolean(process.env.RESEND_API_KEY?.trim()),
          marketingEnabled:
            process.env.EMAIL_MARKETING_SYNC_ENABLED?.trim().toLowerCase() === "true",
          testMode: Boolean(process.env.EMAIL_TEST_RECIPIENT?.trim()),
          testRecipient: process.env.EMAIL_TEST_RECIPIENT?.trim() || null,
          fromAddress: process.env.RESEND_FROM?.trim() || null,
        },
      },
    };
  } catch {
    return {
      state: "error",
      message:
        "No pudimos cargar la operación de email. Confirma que las migraciones de Resend estén aplicadas.",
    };
  }
}

export async function loadDashboard(): Promise<DataResult<DashboardData>> {
  const access = await requireAdminAccess();
  if (access.mode === "demo") return { state: "demo", message: DEMO_MESSAGE };

  try {
    const supabase = getSupabaseAdmin();
    const todayStart = limaTodayStart();
    const now = new Date().toISOString();
    const [paidToday, toPrepare, lowStock, overdue, recent] = await Promise.all([
      supabase
        .from("orders")
        .select("total_cents", { count: "exact" })
        .eq("payment_status", "approved")
        .gte("paid_at", todayStart),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "approved")
        .in("fulfillment_status", ["unfulfilled", "reserved", "preparing"]),
      supabase
        .from("inventory_availability")
        .select("product_id", { count: "exact", head: true })
        .lte("available", 5),
      supabase
        .from("opportunities")
        .select("id", { count: "exact", head: true })
        .not("stage", "in", "(won,lost)")
        .not("next_action_at", "is", null)
        .lte("next_action_at", now),
      supabase
        .from("orders")
        .select(
          "id,order_number,status,payment_status,payment_provider,fulfillment_status,total_cents,currency,channel,customer_snapshot,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const firstError = [paidToday, toPrepare, lowStock, overdue, recent].find(
      (result) => result.error,
    )?.error;
    if (firstError) throw firstError;

    const paidRows = (paidToday.data || []) as Pick<OrderRow, "total_cents">[];
    return {
      state: "ready",
      data: {
        paidTodayCents: paidRows.reduce(
          (total, order) => total + order.total_cents,
          0,
        ),
        paidTodayCount: paidToday.count || 0,
        toPrepareCount: toPrepare.count || 0,
        lowStockCount: lowStock.count || 0,
        overdueOpportunityCount: overdue.count || 0,
        recentOrders: ((recent.data || []) as OrderRow[]).map(mapOrder),
      },
    };
  } catch {
    return { state: "error", message: ERROR_MESSAGE };
  }
}

function mapOrder(order: OrderRow): AdminOrder {
  const customer = asRecord(order.customer_snapshot);
  return {
    id: order.id,
    orderNumber: order.order_number,
    status: displayOrderStatus(order.status, order.fulfillment_status),
    paymentStatus: order.payment_status,
    paymentProvider: order.payment_provider,
    fulfillmentStatus: order.fulfillment_status,
    totalCents: order.total_cents,
    currency: order.currency,
    channel: order.channel,
    customerName:
      readString(customer, "name") || readString(customer, "fullName") || "Cliente sin nombre",
    customerEmail: readString(customer, "email"),
    createdAt: order.created_at,
  };
}

function displayOrderStatus(orderStatus: string, fulfillmentStatus: string) {
  if (orderStatus === "paid" || orderStatus === "fulfilled") {
    const fulfillmentLabels: Record<string, string> = {
      preparing: "picking",
      shipped: "dispatched",
      delivered: "delivered",
      cancelled: "cancelled",
      returned: "refunded",
    };
    return fulfillmentLabels[fulfillmentStatus] || orderStatus;
  }
  return orderStatus;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function limaTodayStart() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T00:00:00-05:00`;
}

function maskDocument(value: string) {
  const normalized = value.trim();
  if (!normalized) return "Documento no disponible";
  if (normalized.length <= 3) return "•".repeat(normalized.length);
  const visibleCharacters = Math.min(3, normalized.length - 1);
  const visible = normalized.slice(-visibleCharacters);
  const maskedLength = Math.max(1, normalized.length - visibleCharacters);
  return `${"•".repeat(Math.min(maskedLength, 6))}${visible}`;
}
