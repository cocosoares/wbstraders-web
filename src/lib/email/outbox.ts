import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getClaimEmailContext,
  getMarketingContactContext,
  getOrderEmailContext,
} from "./repository";
import { sendResendEmail, syncResendMarketingContact } from "./resend";
import { renderClaimEmail, renderOrderEmail } from "./templates";
import type { EmailOutboxJob } from "./types";

export type EmailJobResult =
  | { sent: true; providerReference: string }
  | { sent: false; errorCode: string };

function payloadId(job: EmailOutboxJob, key: string): string {
  const value = job.payload[key];
  if (typeof value !== "string" || !/^[0-9a-f-]{36}$/i.test(value)) {
    throw new Error(`EMAIL_PAYLOAD_${key.toUpperCase()}_MISSING`);
  }
  return value;
}

export async function processEmailJob(
  db: SupabaseClient,
  job: EmailOutboxJob,
): Promise<EmailJobResult> {
  if (job.kind === "marketing.contact_sync") {
    const contact = await getMarketingContactContext(db, job);
    return syncResendMarketingContact(contact);
  }

  const intendedRecipient = job.kind.endsWith(".operations")
    ? process.env.EMAIL_OPERATIONS_TO?.trim()
    : job.recipientEmail;
  if (!intendedRecipient) return { sent: false, errorCode: "email_recipient_missing" };
  const testRecipient = process.env.EMAIL_TEST_RECIPIENT?.trim();
  const recipient = testRecipient || intendedRecipient;

  const rendered = job.kind.startsWith("claim.")
    ? renderClaimEmail(job.kind, await getClaimEmailContext(db, payloadId(job, "claimId")))
    : renderOrderEmail(job.kind, await getOrderEmailContext(db, payloadId(job, "orderId")));
  const content = testRecipient
    ? { ...rendered, subject: `[PRUEBA] ${rendered.subject}` }
    : rendered;

  return sendResendEmail({
    to: recipient,
    content,
    kind: job.kind,
    idempotencyKey: `wbs-email-${job.outboxId}`,
  });
}
