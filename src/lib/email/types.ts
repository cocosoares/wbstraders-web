export const EMAIL_JOB_KINDS = [
  "order.received.customer",
  "order.received.operations",
  "payment.confirmed.customer",
  "payment.refunded.customer",
  "fulfillment.preparing.customer",
  "fulfillment.shipped.customer",
  "fulfillment.delivered.customer",
  "order.cancelled.customer",
  "fiscal.issued.customer",
  "claim.received.customer",
  "claim.received.operations",
  "crm.handoff.operations",
  "crm.sla_breached.operations",
  "marketing.contact_sync",
] as const;

export type EmailJobKind = (typeof EMAIL_JOB_KINDS)[number];

export type EmailOutboxJob = {
  outboxId: string;
  kind: EmailJobKind;
  recipientEmail?: string;
  payload: Record<string, unknown>;
  attempt: number;
};

export type OrderEmailContext = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  totalCents: number;
  currency: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  receiptType: string;
  deliveryDistrict: string;
  deliveryAddress: string;
  createdAt: string;
  items: Array<{
    productName: string;
    quantity: number;
    lineTotalCents: number;
  }>;
  fiscalDocument?: {
    documentType: string;
    series?: string;
    number?: string;
    pdfUrl?: string;
  };
};

export type ClaimEmailContext = {
  claimId: string;
  claimNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  claimType: string;
  itemDescription: string;
  detail: string;
  consumerRequest: string;
  orderNumber?: string;
  createdAt: string;
};

export type MarketingContactContext = {
  email: string;
  name?: string;
  unsubscribed: boolean;
};

export type CrmAlertEmailContext = {
  conversationId: string;
  customerName?: string;
  phone?: string;
  reason?: string;
  requestedAt?: string;
  slaDueAt?: string;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};
