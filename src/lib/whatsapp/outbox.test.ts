import { describe, expect, it, vi } from "vitest";
import { dispatchWhatsAppOutbox, type WhatsAppOutboxJob } from "./outbox";

describe("WhatsApp outbox", () => {
  it("sends queued replies with a stable provider external ID", async () => {
    const jobs: WhatsAppOutboxJob[] = [
      { outboxId: "outbox-1", messageId: "message-1", phone: "51999888777", body: "Hola", attempt: 1 },
    ];
    const complete = vi.fn(async () => undefined);
    const send = vi.fn(async () => ({ sent: true, messageId: "provider-1" }));

    const result = await dispatchWhatsAppOutbox({
      workerId: "worker-1",
      limit: 5,
      claim: async () => jobs,
      complete,
      send,
    });

    expect(result).toEqual({ claimed: 1, sent: 1, failed: 0, finalizationErrors: 0 });
    expect(send).toHaveBeenCalledWith({
      to: "51999888777",
      text: "Hola",
      externalId: "wbs-whatsapp-outbox-1",
    });
    expect(complete).toHaveBeenCalledWith({
      outboxId: "outbox-1",
      workerId: "worker-1",
      sent: true,
      providerReference: "provider-1",
      errorCode: undefined,
    });
  });
});
