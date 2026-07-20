import { randomUUID } from "node:crypto";
import type { EmailJobResult } from "./outbox";
import type { EmailOutboxJob } from "./types";

export type EmailOutboxResult = {
  claimed: number;
  sent: number;
  failed: number;
  finalizationErrors: number;
};

export async function dispatchEmailOutbox(args: {
  workerId?: string;
  limit: number;
  claim: (workerId: string, limit: number) => Promise<EmailOutboxJob[]>;
  complete: (values: {
    outboxId: string;
    workerId: string;
    sent: boolean;
    providerReference?: string;
    errorCode?: string;
  }) => Promise<void>;
  process: (job: EmailOutboxJob) => Promise<EmailJobResult>;
  interJobDelayMs?: number;
}): Promise<EmailOutboxResult> {
  const workerId = args.workerId ?? randomUUID();
  const jobs = await args.claim(workerId, args.limit);
  const result: EmailOutboxResult = {
    claimed: jobs.length,
    sent: 0,
    failed: 0,
    finalizationErrors: 0,
  };

  for (const [index, job] of jobs.entries()) {
    let delivery: EmailJobResult;
    try {
      delivery = await args.process(job);
    } catch {
      delivery = { sent: false, errorCode: "email_job_processing_failed" };
    }

    try {
      await args.complete({
        outboxId: job.outboxId,
        workerId,
        sent: delivery.sent,
        providerReference: delivery.sent ? delivery.providerReference : undefined,
        errorCode: delivery.sent ? undefined : delivery.errorCode,
      });
      if (delivery.sent) result.sent += 1;
      else result.failed += 1;
    } catch {
      result.finalizationErrors += 1;
    }
    if (index < jobs.length - 1 && (args.interJobDelayMs ?? 1_100) > 0) {
      await new Promise((resolve) => setTimeout(resolve, args.interJobDelayMs ?? 1_100));
    }
  }
  return result;
}
