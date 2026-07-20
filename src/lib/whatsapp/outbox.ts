import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWhatsAppText, type WhatsAppDeliveryResult } from "@/lib/whatsapp/provider";

export type WhatsAppOutboxJob = {
  outboxId: string;
  messageId: string;
  phone: string;
  body: string;
  attempt: number;
};

export type WhatsAppOutboxResult = {
  claimed: number;
  sent: number;
  failed: number;
  finalizationErrors: number;
};

export async function claimWhatsAppOutbox(
  db: SupabaseClient,
  workerId: string,
  limit: number,
): Promise<WhatsAppOutboxJob[]> {
  const { data, error } = await db.rpc("claim_whatsapp_outbox", {
    p_worker_id: workerId,
    p_limit: limit,
    p_lease_seconds: 120,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map((row) => ({
    outboxId: row.outbox_id as string,
    messageId: row.message_id as string,
    phone: row.phone_normalized as string,
    body: row.body as string,
    attempt: row.attempt as number,
  }));
}

export async function completeWhatsAppOutbox(
  db: SupabaseClient,
  values: {
    outboxId: string;
    workerId: string;
    sent: boolean;
    providerReference?: string;
    errorCode?: string;
  },
): Promise<void> {
  const { error } = await db.rpc("complete_whatsapp_outbox", {
    p_outbox_id: values.outboxId,
    p_worker_id: values.workerId,
    p_sent: values.sent,
    p_provider_reference: values.providerReference ?? null,
    p_error_code: values.errorCode ?? null,
  });
  if (error) throw error;
}

export async function dispatchWhatsAppOutbox(args: {
  workerId?: string;
  limit: number;
  claim: (workerId: string, limit: number) => Promise<WhatsAppOutboxJob[]>;
  complete: (values: {
    outboxId: string;
    workerId: string;
    sent: boolean;
    providerReference?: string;
    errorCode?: string;
  }) => Promise<void>;
  send?: (args: { to: string; text: string; externalId: string }) => Promise<WhatsAppDeliveryResult>;
}): Promise<WhatsAppOutboxResult> {
  const workerId = args.workerId ?? randomUUID();
  const jobs = await args.claim(workerId, args.limit);
  const result: WhatsAppOutboxResult = {
    claimed: jobs.length,
    sent: 0,
    failed: 0,
    finalizationErrors: 0,
  };
  const send = args.send ?? sendWhatsAppText;

  for (const job of jobs) {
    let delivery: WhatsAppDeliveryResult;
    try {
      delivery = await send({
        to: job.phone,
        text: job.body,
        externalId: `wbs-whatsapp-${job.outboxId}`,
      });
    } catch {
      delivery = { sent: false, reason: "provider_error" };
    }

    try {
      await args.complete({
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
