import { describe, expect, it, vi } from "vitest";
import { dispatchYCloudOutbox, verifyCronBearer, type YCloudOutboxJob } from "@/lib/ycloud/outbox";

describe("YCloud outbox dispatcher", () => {
  it("authenticates the exact Bearer secret", () => {
    expect(verifyCronBearer("Bearer cron-secret", "cron-secret")).toBe(true);
    expect(verifyCronBearer("Bearer wrong-secret", "cron-secret")).toBe(false);
    expect(verifyCronBearer(null, "cron-secret")).toBe(false);
  });

  it("uses stable external IDs and finalizes sent/failed jobs", async () => {
    const jobs: YCloudOutboxJob[] = [
      { outboxId: "outbox-1", orderId: "order-1", phone: "51999888777", orderNumber: "WBS-001", attempt: 1 },
      { outboxId: "outbox-2", orderId: "order-2", phone: "51999888666", orderNumber: "WBS-002", attempt: 2 },
    ];
    const complete = vi.fn(async () => undefined);
    const send = vi
      .fn()
      .mockResolvedValueOnce({ sent: true, messageId: "message-1" })
      .mockResolvedValueOnce({ sent: false, reason: "provider_error" });

    const result = await dispatchYCloudOutbox({
      workerId: "worker-1",
      limit: 5,
      claim: async () => jobs,
      complete,
      send,
    });

    expect(result).toEqual({ claimed: 2, sent: 1, failed: 1, finalizationErrors: 0 });
    expect(send).toHaveBeenNthCalledWith(1, {
      to: "51999888777",
      parameters: ["WBS-001"],
      externalId: "wbs-outbox-outbox-1",
    });
    expect(complete).toHaveBeenNthCalledWith(1, {
      outboxId: "outbox-1",
      workerId: "worker-1",
      sent: true,
      providerReference: "message-1",
      errorCode: undefined,
    });
    expect(complete).toHaveBeenNthCalledWith(2, {
      outboxId: "outbox-2",
      workerId: "worker-1",
      sent: false,
      providerReference: undefined,
      errorCode: "provider_error",
    });
  });

  it("does not throw or release a lease when finalization fails", async () => {
    const result = await dispatchYCloudOutbox({
      workerId: "worker-1",
      limit: 1,
      claim: async () => [
        { outboxId: "outbox-1", orderId: "order-1", phone: "51999888777", orderNumber: "WBS-001", attempt: 1 },
      ],
      send: async () => ({ sent: true, messageId: "message-1" }),
      complete: async () => {
        throw new Error("database unavailable");
      },
    });
    expect(result).toEqual({ claimed: 1, sent: 0, failed: 0, finalizationErrors: 1 });
  });
});
