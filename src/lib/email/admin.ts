import type { EmailJobKind } from "./types";

export const EMAIL_KIND_LABELS: Record<EmailJobKind, string> = {
  "order.received.customer": "Pedido recibido · cliente",
  "order.received.operations": "Nuevo pedido · operaciones",
  "payment.confirmed.customer": "Pago confirmado",
  "payment.refunded.customer": "Reembolso registrado",
  "fulfillment.preparing.customer": "Pedido en preparación",
  "fulfillment.shipped.customer": "Pedido despachado",
  "fulfillment.delivered.customer": "Pedido entregado",
  "order.cancelled.customer": "Pedido cancelado",
  "fiscal.issued.customer": "Comprobante emitido",
  "claim.received.customer": "Reclamo recibido · cliente",
  "claim.received.operations": "Nuevo reclamo · operaciones",
  "crm.handoff.operations": "Atención humana solicitada",
  "crm.sla_breached.operations": "SLA de WhatsApp vencido",
  "marketing.contact_sync": "Sincronización de contacto",
};

export const EMAIL_EVENT_LABELS: Record<string, string> = {
  "email.sent": "Enviado",
  "email.delivered": "Entregado",
  "email.delivery_delayed": "Entrega demorada",
  "email.opened": "Abierto",
  "email.clicked": "Clic registrado",
  "email.bounced": "Rebotado",
  "email.complained": "Marcado como spam",
  "email.failed": "Fallido",
  "email.suppressed": "Bloqueado por Resend",
  "contact.updated": "Contacto actualizado",
  "contact.deleted": "Contacto retirado",
};

export type EmailTemplatePreview = {
  kind: EmailJobKind;
  audience: string;
  trigger: string;
  subject: string;
  purpose: string;
};

export const EMAIL_TEMPLATE_PREVIEWS: EmailTemplatePreview[] = [
  {
    kind: "order.received.customer",
    audience: "Cliente",
    trigger: "Al completar el checkout",
    subject: "Recibimos tu pedido {{número}}",
    purpose: "Confirma productos, total y dirección de entrega.",
  },
  {
    kind: "payment.confirmed.customer",
    audience: "Cliente",
    trigger: "Al aprobar o conciliar el pago",
    subject: "Pago confirmado para {{número}}",
    purpose: "Da tranquilidad y explica el siguiente paso operativo.",
  },
  {
    kind: "fulfillment.preparing.customer",
    audience: "Cliente",
    trigger: "Al iniciar la preparación",
    subject: "Estamos preparando tu pedido {{número}}",
    purpose: "Reduce consultas y mantiene informado al comprador.",
  },
  {
    kind: "fulfillment.shipped.customer",
    audience: "Cliente",
    trigger: "Al marcar el pedido como despachado",
    subject: "Tu pedido {{número}} está en camino",
    purpose: "Comunica el avance del despacho y canal de soporte.",
  },
  {
    kind: "fulfillment.delivered.customer",
    audience: "Cliente",
    trigger: "Al confirmar la entrega",
    subject: "Entregamos tu pedido {{número}}",
    purpose: "Cierra la experiencia y facilita reportar inconvenientes.",
  },
  {
    kind: "fiscal.issued.customer",
    audience: "Cliente",
    trigger: "Al registrar el comprobante emitido",
    subject: "Comprobante de tu pedido {{número}}",
    purpose: "Entrega o facilita solicitar la boleta o factura digital.",
  },
  {
    kind: "claim.received.customer",
    audience: "Cliente",
    trigger: "Al registrar un reclamo",
    subject: "Recibimos tu reclamo {{número}}",
    purpose: "Confirma la recepción y conserva el número de seguimiento.",
  },
  {
    kind: "order.received.operations",
    audience: "Operaciones",
    trigger: "Al recibir un pedido nuevo",
    subject: "Nuevo pedido {{número}}",
    purpose: "Avisa al responsable único para iniciar la atención.",
  },
];

export function emailKindLabel(kind: string): string {
  return EMAIL_KIND_LABELS[kind as EmailJobKind] || humanizeEmailCode(kind);
}

export function emailEventLabel(eventType: string): string {
  return EMAIL_EVENT_LABELS[eventType] || humanizeEmailCode(eventType);
}

export function emailDeliveryLabel(deliveryStatus: string | null): string | null {
  if (!deliveryStatus) return null;
  return emailEventLabel(
    deliveryStatus.startsWith("email.")
      ? deliveryStatus
      : `email.${deliveryStatus}`,
  );
}

function humanizeEmailCode(value: string): string {
  const humanized = value.replaceAll(".", " ").replaceAll("_", " ").trim();
  return humanized ? humanized[0].toUpperCase() + humanized.slice(1) : "Sin detalle";
}
