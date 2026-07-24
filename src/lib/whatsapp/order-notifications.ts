import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatPEN } from "@/lib/utils";
import { activeWhatsAppProvider, sendWhatsAppText, type WhatsAppDeliveryResult } from "./provider";
import { sendYCloudTemplate } from "@/lib/ycloud/client";

export type WhatsAppOrderNotificationKind =
  | "order.received"
  | "payment.confirmed"
  | "fulfillment.preparing"
  | "fulfillment.shipped"
  | "fulfillment.delivered"
  | "order.cancelled";

export type WhatsAppOrderNotificationJob = {
  outboxId: string;
  orderId: string;
  kind: WhatsAppOrderNotificationKind;
  phone: string;
  orderNumber: string;
  customerName?: string;
  totalCents: number;
  attempt: number;
};

export type WhatsAppOrderNotificationResult = {
  claimed: number;
  sent: number;
  failed: number;
  finalizationErrors: number;
};

const TEMPLATE_ENV: Record<WhatsAppOrderNotificationKind, string> = {
  "order.received": "YCLOUD_ORDER_RECEIVED_TEMPLATE",
  "payment.confirmed": "YCLOUD_PAYMENT_CONFIRMED_TEMPLATE",
  "fulfillment.preparing": "YCLOUD_ORDER_PREPARING_TEMPLATE",
  "fulfillment.shipped": "YCLOUD_ORDER_SHIPPED_TEMPLATE",
  "fulfillment.delivered": "YCLOUD_ORDER_DELIVERED_TEMPLATE",
  "order.cancelled": "YCLOUD_ORDER_CANCELLED_TEMPLATE",
};

export function buildWhatsAppOrderNotification(
  job: Pick<
    WhatsAppOrderNotificationJob,
    "kind" | "orderNumber" | "customerName" | "totalCents"
  >,
): string {
  const greeting = job.customerName?.trim()
    ? `Hola, ${job.customerName.trim().split(/\s+/)[0]}.`
    : "Hola.";
  const order = `pedido *${job.orderNumber}*`;
  switch (job.kind) {
    case "order.received":
      return `${greeting} ✅ Recibimos tu ${order} por ${formatPEN(job.totalCents)}. Te avisaremos por este medio cuando confirmemos el pago y avance la entrega.`;
    case "payment.confirmed":
      return `${greeting} ✅ Confirmamos el pago de tu ${order}. Ya podemos preparar tu selección.`;
    case "fulfillment.preparing":
      return `${greeting} 🍷 Tu ${order} ya está en preparación. Te avisaremos cuando salga a reparto.`;
    case "fulfillment.shipped":
      return `${greeting} 🚚 Tu ${order} salió a reparto. Mantén tu celular disponible para coordinar la entrega.`;
    case "fulfillment.delivered":
      return `${greeting} 🙌 Registramos tu ${order} como entregado. Esperamos que disfrutes la selección. Si necesitas ayuda, responde a este mensaje.`;
    case "order.cancelled":
      return `${greeting} Tu ${order} fue cancelado. Si no reconoces este cambio o necesitas ayuda, responde a este mensaje.`;
  }
}

export async function claimWhatsAppOrderNotifications(
  db: SupabaseClient,
  workerId: string,
  limit: number,
): Promise<WhatsAppOrderNotificationJob[]> {
  const { data, error } = await db.rpc("claim_whatsapp_order_notifications", {
    p_worker_id: workerId,
    p_limit: limit,
    p_lease_seconds: 120,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map((row) => ({
    outboxId: row.outbox_id as string,
    orderId: row.order_id as string,
    kind: row.kind as WhatsAppOrderNotificationKind,
    phone: row.phone as string,
    orderNumber: row.order_number as string,
    customerName: (row.customer_name as string | null) ?? undefined,
    totalCents: Number(row.total_cents ?? 0),
    attempt: Number(row.attempt ?? 1),
  }));
}

export async function completeWhatsAppOrderNotification(
  db: SupabaseClient,
  values: {
    outboxId: string;
    workerId: string;
    sent: boolean;
    providerReference?: string;
    errorCode?: string;
  },
): Promise<void> {
  const { error } = await db.rpc("complete_whatsapp_order_notification", {
    p_outbox_id: values.outboxId,
    p_worker_id: values.workerId,
    p_sent: values.sent,
    p_provider_reference: values.providerReference ?? null,
    p_error_code: values.errorCode ?? null,
  });
  if (error) throw error;
}

async function sendOrderNotification(
  job: WhatsAppOrderNotificationJob,
): Promise<WhatsAppDeliveryResult> {
  if (activeWhatsAppProvider() === "ycloud") {
    return sendYCloudTemplate({
      to: job.phone,
      templateName: process.env[TEMPLATE_ENV[job.kind]]?.trim(),
      languageCode: process.env.YCLOUD_TEMPLATE_LANGUAGE?.trim() || "es",
      parameters: [job.orderNumber, formatPEN(job.totalCents)],
      externalId: `wbs-order-${job.outboxId}`,
    });
  }
  return sendWhatsAppText({
    to: job.phone,
    text: buildWhatsAppOrderNotification(job),
    externalId: `wbs-order-${job.outboxId}`,
  });
}

export async function dispatchWhatsAppOrderNotifications(args: {
  db: SupabaseClient;
  limit?: number;
  workerId?: string;
  send?: (job: WhatsAppOrderNotificationJob) => Promise<WhatsAppDeliveryResult>;
}): Promise<WhatsAppOrderNotificationResult> {
  const workerId = args.workerId ?? randomUUID();
  const jobs = await claimWhatsAppOrderNotifications(
    args.db,
    workerId,
    Math.min(10, Math.max(1, args.limit ?? 5)),
  );
  const result: WhatsAppOrderNotificationResult = {
    claimed: jobs.length,
    sent: 0,
    failed: 0,
    finalizationErrors: 0,
  };

  for (const job of jobs) {
    let delivery: WhatsAppDeliveryResult;
    try {
      delivery = await (args.send ?? sendOrderNotification)(job);
    } catch {
      delivery = { sent: false, reason: "provider_error" };
    }
    try {
      await completeWhatsAppOrderNotification(args.db, {
        outboxId: job.outboxId,
        workerId,
        sent: delivery.sent,
        providerReference: delivery.messageId,
        errorCode: delivery.reason,
      });
      if (delivery.sent) result.sent += 1;
      else result.failed += 1;
    } catch {
      result.finalizationErrors += 1;
    }
  }
  return result;
}
