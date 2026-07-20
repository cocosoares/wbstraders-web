import { createHmac, timingSafeEqual } from "node:crypto";
import type { CalculatedOrder } from "@/lib/orders/pricing";

const API_URL = "https://api.mercadopago.com";

export interface MercadoPagoPreference {
  id: string;
  checkoutUrl: string;
  sandboxCheckoutUrl?: string;
}

export interface MercadoPagoPayment {
  id: number | string;
  status: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount: number;
  currency_id: string;
  date_approved?: string;
  date_last_updated?: string;
}

export class MercadoPagoError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

function siteUrl(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) throw new MercadoPagoError("SITE_URL_MISSING", "Falta NEXT_PUBLIC_SITE_URL");
  const url = new URL(value);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new MercadoPagoError("SITE_URL_NOT_HTTPS", "El sitio de producción debe usar HTTPS");
  }
  return url.origin;
}

export function mercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() && process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim());
}

async function mercadoPagoRequest<T>(path: string, init: RequestInit): Promise<T> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!accessToken) throw new MercadoPagoError("ACCESS_TOKEN_MISSING", "Mercado Pago no está configurado");

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new MercadoPagoError(`HTTP_${response.status}`, typeof body.message === "string" ? body.message : "Error del proveedor");
  }
  return body as T;
}

export async function createMercadoPagoPreference(args: {
  orderId: string;
  orderNumber: string;
  calculated: CalculatedOrder;
  customerEmail?: string;
  idempotencyKey: string;
}): Promise<MercadoPagoPreference> {
  const origin = siteUrl();
  const now = Date.now();
  const effectiveFrom = new Date(now - 60_000).toISOString();
  const expiresAt = new Date(now + 45 * 60_000).toISOString();
  const items = args.calculated.items.map((item) => ({
    id: item.productId,
    title: `${item.quantity} × ${item.productName}`,
    description: `Pedido ${args.orderNumber}`,
    quantity: 1,
    currency_id: "PEN",
    unit_price: item.lineTotalCents / 100,
  }));
  if (args.calculated.deliveryCents > 0) {
    items.push({
      id: "delivery",
      title: "Entrega",
      description: `Pedido ${args.orderNumber}`,
      quantity: 1,
      currency_id: "PEN",
      unit_price: args.calculated.deliveryCents / 100,
    });
  }

  const result = await mercadoPagoRequest<{
    id: string;
    init_point: string;
    sandbox_init_point?: string;
  }>("/checkout/preferences", {
    method: "POST",
    headers: { "X-Idempotency-Key": args.idempotencyKey },
    body: JSON.stringify({
      items,
      payer: args.customerEmail ? { email: args.customerEmail } : undefined,
      external_reference: args.orderId,
      statement_descriptor: "WBSTRADERS",
      binary_mode: true,
      expires: true,
      expiration_date_from: effectiveFrom,
      expiration_date_to: expiresAt,
      notification_url: `${origin}/api/payments/mercadopago/webhook`,
      back_urls: {
        success: `${origin}/pago/exito?order=${encodeURIComponent(args.orderId)}`,
        pending: `${origin}/pago/pendiente?order=${encodeURIComponent(args.orderId)}`,
        failure: `${origin}/pago/error?order=${encodeURIComponent(args.orderId)}`,
      },
      auto_return: "approved",
      metadata: { order_id: args.orderId, order_number: args.orderNumber },
    }),
  });

  if (!result.id || !result.init_point) throw new MercadoPagoError("INVALID_PREFERENCE", "Respuesta incompleta del proveedor");
  return { id: result.id, checkoutUrl: result.init_point, sandboxCheckoutUrl: result.sandbox_init_point };
}

export async function getMercadoPagoPayment(paymentId: string): Promise<MercadoPagoPayment> {
  return mercadoPagoRequest<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(paymentId)}`, { method: "GET" });
}

function signatureParts(header: string): { ts?: string; v1?: string } {
  const result: { ts?: string; v1?: string } = {};
  for (const part of header.split(",")) {
    const [key, value] = part.trim().split("=", 2);
    if (key === "ts") result.ts = value;
    if (key === "v1") result.v1 = value;
  }
  return result;
}

export function verifyMercadoPagoSignature(args: {
  signatureHeader: string;
  requestId: string;
  dataId: string;
  secret: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): boolean {
  const { ts, v1 } = signatureParts(args.signatureHeader);
  if (!ts || !v1 || !/^\d+$/.test(ts) || !/^[a-f0-9]{64}$/i.test(v1)) return false;
  if (args.toleranceSeconds !== undefined) {
    const now = args.nowSeconds ?? Math.floor(Date.now() / 1000);
    if (Math.abs(now - Number(ts)) > args.toleranceSeconds) return false;
  }

  const manifest = `id:${args.dataId.toLowerCase()};request-id:${args.requestId};ts:${ts};`;
  const expected = createHmac("sha256", args.secret).update(manifest).digest();
  const received = Buffer.from(v1, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function paymentSnapshot(payment: MercadoPagoPayment): Record<string, unknown> {
  return {
    id: String(payment.id),
    status: payment.status,
    statusDetail: payment.status_detail ?? null,
    externalReference: payment.external_reference ?? null,
    transactionAmount: payment.transaction_amount,
    currencyId: payment.currency_id,
    dateApproved: payment.date_approved ?? null,
    dateLastUpdated: payment.date_last_updated ?? null,
  };
}
