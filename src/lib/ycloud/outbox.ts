import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendYCloudTemplate, type YCloudTemplateResult } from "@/lib/ycloud/client";

export interface YCloudOutboxJob {
  outboxId: string;
  orderId: string;
  phone: string;
  orderNumber: string;
  attempt: number;
}

export interface YCloudOutboxResult {
  claimed: number;
  sent: number;
  failed: number;
  finalizationErrors: number;
}

export function verifyCronBearer(authorization: string | null, expectedSecret: string): boolean {
  if (!authorization?.startsWith("Bearer ") || !expectedSecret) return false;
  const provided = Buffer.from(authorization.slice(7), "utf8");
  const expected = Buffer.from(expectedSecret, "utf8");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function claimYCloudOutbox(
  db: SupabaseClient,
  workerId: string,
  limit: number,
): Promise<YCloudOutboxJob[]> {
  const { data, error } = await db.rpc("claim_ycloud_outbox", {
    p_worker_id: workerId,
    p_limit: limit,
    p_lease_seconds: 120,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map((row) => ({
    outboxId: row.outbox_id as string,
    orderId: row.order_id as string,
    phone: row.phone as string,
    orderNumber: row.order_number as string,
    attempt: row.attempt as number,
  }));
}

export async function completeYCloudOutbox(
  db: SupabaseClient,
  values: {
    outboxId: string;
    workerId: string;
    sent: boolean;
    providerReference?: string;
    errorCode?: string;
  },
): Promise<void> {
  const { error } = await db.rpc("complete_ycloud_outbox", {
    p_outbox_id: values.outboxId,
    p_worker_id: values.workerId,
    p_sent: values.sent,
    p_provider_reference: values.providerReference ?? null,
    p_error_code: values.errorCode ?? null,
  });
  if (error) throw error;
}

export async function dispatchYCloudOutbox(args: {
  workerId: string;
  limit: number;
  claim: (workerId: string, limit: number) => Promise<YCloudOutboxJob[]>;
  complete: (values: {
    outboxId: string;
    workerId: string;
    sent: boolean;
    providerReference?: string;
    errorCode?: string;
  }) => Promise<void>;
  send?: (args: {
    to: string;
    parameters: string[];
    externalId: string;
  }) => Promise<YCloudTemplateResult>;
}): Promise<YCloudOutboxResult> {
  const jobs = await args.claim(args.workerId, args.limit);
  const result: YCloudOutboxResult = { claimed: jobs.length, sent: 0, failed: 0, finalizationErrors: 0 };
  const send = args.send ?? sendYCloudTemplate;

  for (const job of jobs) {
    let delivery: YCloudTemplateResult;
    try {
      delivery = await send({
        to: job.phone,
        parameters: [job.orderNumber],
        // Stable across retries so YCloud delivery events can be reconciled and
        // duplicate attempts detected without exposing an order/customer value.
        externalId: `wbs-outbox-${job.outboxId}`,
      });
    } catch {
      delivery = { sent: false, reason: "provider_error" };
    }

    try {
      await args.complete({
        outboxId: job.outboxId,
        workerId: args.workerId,
        sent: delivery.sent,
        providerReference: delivery.messageId,
        errorCode: delivery.reason,
      });
      if (delivery.sent) result.sent += 1;
      else result.failed += 1;
    } catch {
      // The lease remains active. Another worker may only retry after it expires.
      result.finalizationErrors += 1;
    }
  }
  return result;
}
