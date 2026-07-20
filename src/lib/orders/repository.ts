import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalculatedOrder } from "@/lib/orders/pricing";
import type { CreateOrderInput } from "@/lib/orders/schema";

export interface CreatedOrderRecord {
  orderId: string;
  orderNumber: string;
}

export async function createOrderRecord(
  db: SupabaseClient,
  input: CreateOrderInput,
  calculated: CalculatedOrder,
  options: { orderId: string; tokenHash: string; paymentProvider: "manual" | "mercadopago" },
): Promise<CreatedOrderRecord> {
  const customer = {
    name: input.customer.name,
    phone: input.customer.phone,
    phoneNormalized: input.customer.phone.replace(/\D/g, ""),
    email: input.customer.email ?? null,
  };
  const delivery = {
    ...calculated.deliverySnapshot,
    address: input.delivery.address,
    reference: input.delivery.reference ?? null,
  };

  const { data, error } = await db.rpc("create_order_transaction", {
    p_order_id: options.orderId,
    p_public_token_hash: options.tokenHash,
    p_customer: customer,
    p_delivery: delivery,
    p_fiscal: input.fiscal,
    p_notes: input.notes ?? null,
    p_age_confirmed: input.ageConfirmed,
    p_terms_accepted: input.termsAccepted,
    p_marketing_consent: input.marketingConsent,
    p_attribution: input.attribution ?? {},
    p_subtotal_cents: calculated.subtotalCents,
    p_delivery_cents: calculated.deliveryCents,
    p_discount_cents: calculated.discountCents,
    p_total_cents: calculated.totalCents,
    p_pricing_snapshot: calculated.pricingSnapshot,
    p_items: calculated.items,
    p_payment_provider: options.paymentProvider,
    p_reservation_minutes: 60,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.created_order_id || !row?.created_order_number) {
    throw new Error("ORDER_RPC_INVALID_RESPONSE");
  }
  return { orderId: row.created_order_id as string, orderNumber: row.created_order_number as string };
}

export async function createPaymentAttempt(
  db: SupabaseClient,
  values: {
    orderId: string;
    provider: "manual" | "mercadopago";
    amountCents: number;
    idempotencyKey: string;
  },
): Promise<string> {
  const { data, error } = await db
    .from("payment_attempts")
    .insert({
      order_id: values.orderId,
      provider: values.provider,
      amount_cents: values.amountCents,
      currency: "PEN",
      idempotency_key: values.idempotencyKey,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updatePaymentPreference(
  db: SupabaseClient,
  attemptId: string,
  values: { preferenceId: string; checkoutUrl: string; snapshot: Record<string, unknown> },
): Promise<void> {
  const { error } = await db
    .from("payment_attempts")
    .update({
      preference_id: values.preferenceId,
      checkout_url: values.checkoutUrl,
      response_snapshot: values.snapshot,
    })
    .eq("id", attemptId);
  if (error) throw error;
}

export async function failPaymentAttempt(
  db: SupabaseClient,
  attemptId: string,
  code: string,
): Promise<void> {
  const { error } = await db
    .from("payment_attempts")
    .update({ error_code: code, provider_status_detail: "preference_creation_failed" })
    .eq("id", attemptId);
  if (error) throw error;
}

export async function getPublicOrderStatus(
  db: SupabaseClient,
  id: string,
  tokenHash: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await db
    .from("orders")
    .select("order_number,status,payment_status,fulfillment_status,total_cents,currency,updated_at")
    .eq("id", id)
    .eq("public_access_token_hash", tokenHash)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    orderNumber: data.order_number,
    status: data.status,
    paymentStatus: data.payment_status,
    fulfillmentStatus: data.fulfillment_status,
    totalCents: data.total_cents,
    currency: data.currency,
    updatedAt: data.updated_at,
  };
}
