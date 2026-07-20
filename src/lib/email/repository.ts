import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { EMAIL_JOB_KINDS, type ClaimEmailContext, type EmailOutboxJob, type MarketingContactContext, type OrderEmailContext } from "./types";

function objectValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function claimEmailOutbox(
  db: SupabaseClient,
  workerId: string,
  limit: number,
  options: { includeTransactional: boolean; includeMarketing: boolean },
): Promise<EmailOutboxJob[]> {
  const { data, error } = await db.rpc("claim_email_outbox", {
    p_worker_id: workerId,
    p_limit: limit,
    p_lease_seconds: 120,
    p_include_transactional: options.includeTransactional,
    p_include_marketing: options.includeMarketing,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map((row) => {
    const kind = stringValue(row.kind);
    if (!EMAIL_JOB_KINDS.includes(kind as (typeof EMAIL_JOB_KINDS)[number])) {
      throw new Error("EMAIL_OUTBOX_UNKNOWN_KIND");
    }
    return {
      outboxId: stringValue(row.outbox_id),
      kind: kind as EmailOutboxJob["kind"],
      recipientEmail: stringValue(row.recipient_email) || undefined,
      payload: objectValue(row.payload),
      attempt: numberValue(row.attempt),
    };
  });
}

export async function completeEmailOutbox(
  db: SupabaseClient,
  values: {
    outboxId: string;
    workerId: string;
    sent: boolean;
    providerReference?: string;
    errorCode?: string;
  },
): Promise<void> {
  const { error } = await db.rpc("complete_email_outbox", {
    p_outbox_id: values.outboxId,
    p_worker_id: values.workerId,
    p_sent: values.sent,
    p_provider_reference: values.providerReference ?? null,
    p_error_code: values.errorCode ?? null,
  });
  if (error) throw error;
}

export async function getOrderEmailContext(
  db: SupabaseClient,
  orderId: string,
): Promise<OrderEmailContext> {
  const orderResult = await db
    .from("orders")
    .select(
      "id,order_number,customer_snapshot,delivery_snapshot,fiscal_snapshot,total_cents,currency,payment_status,fulfillment_status,created_at",
    )
    .eq("id", orderId)
    .single();
  if (orderResult.error) throw orderResult.error;

  const itemsResult = await db
    .from("order_items")
    .select("product_name,quantity,line_total_cents")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (itemsResult.error) throw itemsResult.error;

  const fiscalResult = await db
    .from("fiscal_documents")
    .select("document_type,series,number,pdf_path,status")
    .eq("order_id", orderId)
    .eq("status", "issued")
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fiscalResult.error) throw fiscalResult.error;

  const customer = objectValue(orderResult.data.customer_snapshot);
  const delivery = objectValue(orderResult.data.delivery_snapshot);
  const fiscal = objectValue(orderResult.data.fiscal_snapshot);
  const pdfPath = stringValue(fiscalResult.data?.pdf_path);

  return {
    orderId: stringValue(orderResult.data.id),
    orderNumber: stringValue(orderResult.data.order_number),
    customerName: stringValue(customer.name, "Cliente"),
    customerEmail: stringValue(customer.email) || undefined,
    customerPhone: stringValue(customer.phone),
    totalCents: numberValue(orderResult.data.total_cents),
    currency: stringValue(orderResult.data.currency, "PEN"),
    paymentStatus: stringValue(orderResult.data.payment_status),
    fulfillmentStatus: stringValue(orderResult.data.fulfillment_status),
    receiptType: stringValue(fiscal.receiptType, "boleta"),
    deliveryDistrict: stringValue(delivery.district),
    deliveryAddress: stringValue(delivery.address),
    createdAt: stringValue(orderResult.data.created_at),
    items: (itemsResult.data ?? []).map((item) => ({
      productName: stringValue(item.product_name),
      quantity: numberValue(item.quantity),
      lineTotalCents: numberValue(item.line_total_cents),
    })),
    fiscalDocument: fiscalResult.data
      ? {
          documentType: stringValue(fiscalResult.data.document_type, "comprobante"),
          series: stringValue(fiscalResult.data.series) || undefined,
          number: stringValue(fiscalResult.data.number) || undefined,
          pdfUrl: /^https:\/\//i.test(pdfPath) ? pdfPath : undefined,
        }
      : undefined,
  };
}

export async function getClaimEmailContext(
  db: SupabaseClient,
  claimId: string,
): Promise<ClaimEmailContext> {
  const { data, error } = await db
    .from("consumer_claims")
    .select(
      "id,claim_number,customer_name,email,phone,claim_type,item_description,detail,consumer_request,order_number,created_at",
    )
    .eq("id", claimId)
    .single();
  if (error) throw error;
  return {
    claimId: stringValue(data.id),
    claimNumber: stringValue(data.claim_number),
    customerName: stringValue(data.customer_name, "Cliente"),
    customerEmail: stringValue(data.email),
    customerPhone: stringValue(data.phone),
    claimType: stringValue(data.claim_type, "reclamo"),
    itemDescription: stringValue(data.item_description),
    detail: stringValue(data.detail),
    consumerRequest: stringValue(data.consumer_request),
    orderNumber: stringValue(data.order_number) || undefined,
    createdAt: stringValue(data.created_at),
  };
}

export async function getMarketingContactContext(
  db: SupabaseClient,
  job: EmailOutboxJob,
): Promise<MarketingContactContext> {
  if (!job.recipientEmail) throw new Error("EMAIL_RECIPIENT_MISSING");
  const customerId = stringValue(job.payload.customerId);
  let name: string | undefined;
  let consentStatus = stringValue(job.payload.consentStatus, "withdrawn");

  if (customerId) {
    const customerResult = await db
      .from("customers")
      .select("name")
      .eq("id", customerId)
      .maybeSingle();
    if (customerResult.error) throw customerResult.error;
    name = stringValue(customerResult.data?.name) || undefined;

    const consentResult = await db
      .from("consents")
      .select("status")
      .eq("customer_id", customerId)
      .eq("purpose", "marketing")
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (consentResult.error) throw consentResult.error;
    consentStatus = stringValue(consentResult.data?.status, consentStatus);
  }

  const suppressionResult = await db
    .from("email_suppressions")
    .select("active")
    .eq("email", job.recipientEmail.toLowerCase())
    .eq("active", true)
    .maybeSingle();
  if (suppressionResult.error) throw suppressionResult.error;

  return {
    email: job.recipientEmail.toLowerCase(),
    name,
    unsubscribed: consentStatus !== "granted" || suppressionResult.data?.active === true,
  };
}

export async function recordResendEmailEvent(
  db: SupabaseClient,
  values: {
    providerEventId: string;
    eventType: string;
    providerEmailId?: string;
    recipientEmail?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<{ duplicate: boolean }> {
  const { data, error } = await db.rpc("record_resend_email_event", {
    p_provider_event_id: values.providerEventId,
    p_event_type: values.eventType,
    p_provider_email_id: values.providerEmailId ?? null,
    p_recipient_email: values.recipientEmail ?? null,
    p_metadata: values.metadata ?? {},
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { duplicate: row?.duplicate === true };
}

export async function recordResendContactEvent(
  db: SupabaseClient,
  values: {
    providerEventId: string;
    eventType: "contact.updated" | "contact.deleted";
    contactId: string;
    recipientEmail: string;
    unsubscribed: boolean;
  },
): Promise<{ duplicate: boolean }> {
  const { data, error } = await db.rpc("record_resend_contact_event", {
    p_provider_event_id: values.providerEventId,
    p_event_type: values.eventType,
    p_contact_id: values.contactId,
    p_recipient_email: values.recipientEmail,
    p_unsubscribed: values.unsubscribed,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { duplicate: row?.duplicate === true };
}
