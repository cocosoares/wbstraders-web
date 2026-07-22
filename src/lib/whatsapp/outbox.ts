import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage, type WhatsAppDeliveryResult } from "@/lib/whatsapp/provider";
import {
  parseWhatsAppRichMessage,
  type WhatsAppRichMessage,
} from "@/lib/whatsapp/rich-message";

export type WhatsAppOutboxJob = {
  outboxId: string;
  messageId: string;
  phone: string;
  body: string;
  attempt: number;
  rich?: WhatsAppRichMessage;
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
  const claimed = (Array.isArray(data) ? data : []).map((row) => ({
    outboxId: row.outbox_id as string,
    messageId: row.message_id as string,
    phone: row.phone_normalized as string,
    body: row.body as string,
    attempt: row.attempt as number,
  }));
  if (!claimed.length) return [];

  const messages = await db
    .from("whatsapp_messages")
    .select("id, metadata")
    .in("id", claimed.map((job) => job.messageId));
  if (messages.error) throw messages.error;
  const richByMessageId = new Map(
    await Promise.all((messages.data ?? []).map(async (message) => {
      const metadata =
        typeof message.metadata === "object" && message.metadata !== null
          ? (message.metadata as Record<string, unknown>)
          : {};
      const parsed = parseWhatsAppRichMessage(metadata.rich);
      const media = parsed?.attachment ?? parsed?.image;
      if (parsed && media?.storagePath && !media.url) {
        const signed = await db.storage.from("whatsapp-media").createSignedUrl(media.storagePath, 15 * 60);
        if (!signed.error && signed.data.signedUrl) {
          const resolved = { ...media, url: signed.data.signedUrl };
          return [message.id, {
            ...parsed,
            ...(parsed.attachment ? { attachment: resolved } : { image: resolved }),
          }] as const;
        }
      }
      return [message.id, parsed] as const;
    })),
  );
  return claimed.map((job) => ({ ...job, rich: richByMessageId.get(job.messageId) }));
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
  send?: (args: {
    to: string;
    text: string;
    externalId: string;
    rich?: WhatsAppRichMessage;
  }) => Promise<WhatsAppDeliveryResult>;
}): Promise<WhatsAppOutboxResult> {
  const workerId = args.workerId ?? randomUUID();
  const jobs = await args.claim(workerId, args.limit);
  const result: WhatsAppOutboxResult = {
    claimed: jobs.length,
    sent: 0,
    failed: 0,
    finalizationErrors: 0,
  };
  const send = args.send ?? sendWhatsAppMessage;

  for (const job of jobs) {
    let delivery: WhatsAppDeliveryResult;
    try {
      delivery = await send({
        to: job.phone,
        text: job.body,
        externalId: `wbs-whatsapp-${job.outboxId}`,
        ...(job.rich ? { rich: job.rich } : {}),
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

/**
 * Dispatches pending replies immediately after a webhook is processed. The
 * scheduled worker remains in place as a retry mechanism for provider errors
 * or unexpected process interruptions.
 */
export async function dispatchPendingWhatsAppOutbox(
  db: SupabaseClient,
  limit = 10,
): Promise<WhatsAppOutboxResult> {
  return dispatchWhatsAppOutbox({
    limit: Math.min(10, Math.max(1, limit)),
    claim: (workerId, count) => claimWhatsAppOutbox(db, workerId, count),
    complete: (values) => completeWhatsAppOutbox(db, values),
  });
}
