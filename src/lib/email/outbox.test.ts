import { describe, expect, it, vi } from "vitest";
import { dispatchEmailOutbox } from "./dispatcher";
import type { EmailOutboxJob } from "./types";

const jobs: EmailOutboxJob[] = [
  {
    outboxId: "00000000-0000-4000-8000-000000000001",
    kind: "order.received.customer",
    recipientEmail: "cliente@example.com",
    payload: { orderId: "00000000-0000-4000-8000-000000000010" },
    attempt: 1,
  },
  {
    outboxId: "00000000-0000-4000-8000-000000000002",
    kind: "marketing.contact_sync",
    recipientEmail: "marketing@example.com",
    payload: { customerId: "00000000-0000-4000-8000-000000000020" },
    attempt: 1,
  },
];

describe("dispatchEmailOutbox", () => {
  it("finalizes every claimed job and counts provider failures", async () => {
    const complete = vi.fn(async () => undefined);
    const result = await dispatchEmailOutbox({
      workerId: "00000000-0000-4000-8000-000000000099",
      limit: 10,
      claim: async () => jobs,
      complete,
      process: async (job) =>
        job.kind === "marketing.contact_sync"
          ? { sent: false as const, errorCode: "resend_rate_limit_exceeded" }
          : { sent: true as const, providerReference: "email_123" },
      interJobDelayMs: 0,
    });

    expect(result).toEqual({ claimed: 2, sent: 1, failed: 1, finalizationErrors: 0 });
    expect(complete).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sent: true, providerReference: "email_123" }),
    );
    expect(complete).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sent: false, errorCode: "resend_rate_limit_exceeded" }),
    );
  });

  it("keeps the lease recoverable when finalization fails", async () => {
    const result = await dispatchEmailOutbox({
      workerId: "00000000-0000-4000-8000-000000000099",
      limit: 1,
      claim: async () => jobs.slice(0, 1),
      complete: async () => {
        throw new Error("database unavailable");
      },
      process: async () => ({ sent: true, providerReference: "email_123" }),
      interJobDelayMs: 0,
    });
    expect(result.finalizationErrors).toBe(1);
  });
});
