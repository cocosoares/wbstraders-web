import "server-only";

import { Resend, type WebhookEventPayload } from "resend";
import type { MarketingContactContext, RenderedEmail } from "./types";

let sendingClient: Resend | undefined;
let contactsClient: Resend | undefined;

function apiKey(): string {
  const value = process.env.RESEND_API_KEY?.trim();
  if (!value) throw new Error("RESEND_API_KEY_MISSING");
  return value;
}

export function getResendClient(): Resend {
  sendingClient ??= new Resend(apiKey());
  return sendingClient;
}

function getResendContactsClient(): Resend {
  const contactsKey = process.env.RESEND_CONTACTS_API_KEY?.trim();
  if (!contactsKey) throw new Error("RESEND_CONTACTS_API_KEY_MISSING");
  contactsClient ??= new Resend(contactsKey);
  return contactsClient;
}

export function resendTransactionalConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() &&
      process.env.RESEND_FROM?.trim() &&
      process.env.EMAIL_OPERATIONS_TO?.trim(),
  );
}

export function resendMarketingConfigured(): boolean {
  return Boolean(process.env.RESEND_CONTACTS_API_KEY?.trim());
}

export async function sendResendEmail(input: {
  to: string;
  content: RenderedEmail;
  idempotencyKey: string;
  kind: string;
}): Promise<{ sent: true; providerReference: string } | { sent: false; errorCode: string }> {
  const from = process.env.RESEND_FROM?.trim();
  if (!from) return { sent: false, errorCode: "resend_from_missing" };
  const replyTo =
    process.env.RESEND_REPLY_TO?.trim() || process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  try {
    const response = await getResendClient().emails.send(
      {
        from,
        to: input.to,
        subject: input.content.subject,
        html: input.content.html,
        text: input.content.text,
        ...(replyTo ? { replyTo } : {}),
        tags: [{ name: "email_kind", value: input.kind.replaceAll(".", "_").slice(0, 256) }],
      },
      { idempotencyKey: input.idempotencyKey },
    );
    if (response.error) {
      return { sent: false, errorCode: `resend_${response.error.name}` };
    }
    return { sent: true, providerReference: response.data.id };
  } catch {
    return { sent: false, errorCode: "resend_provider_error" };
  }
}

export async function syncResendMarketingContact(
  contact: MarketingContactContext,
): Promise<{ sent: true; providerReference: string } | { sent: false; errorCode: string }> {
  const resend = getResendContactsClient();
  const firstName = contact.name?.trim().split(/\s+/)[0];
  try {
    const existing = await resend.contacts.get({ email: contact.email });
    if (existing.error && existing.error.name !== "not_found") {
      return { sent: false, errorCode: `resend_${existing.error.name}` };
    }
    if (existing.data) {
      const updated = await resend.contacts.update({
        email: contact.email,
        unsubscribed: contact.unsubscribed,
        ...(firstName ? { firstName } : {}),
      });
      if (updated.error) return { sent: false, errorCode: `resend_${updated.error.name}` };
      return { sent: true, providerReference: updated.data.id };
    }

    const created = await resend.contacts.create({
      email: contact.email,
      unsubscribed: contact.unsubscribed,
      ...(firstName ? { firstName } : {}),
    });
    if (created.error) return { sent: false, errorCode: `resend_${created.error.name}` };
    return { sent: true, providerReference: created.data.id };
  } catch {
    return { sent: false, errorCode: "resend_provider_error" };
  }
}

export function verifyResendWebhook(input: {
  payload: string;
  id: string;
  timestamp: string;
  signature: string;
  secret: string;
}): WebhookEventPayload {
  return getResendClient().webhooks.verify({
    payload: input.payload,
    webhookSecret: input.secret,
    headers: {
      id: input.id,
      timestamp: input.timestamp,
      signature: input.signature,
    },
  });
}
