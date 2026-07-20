import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { extractYCloudMessage, verifyYCloudSignature, yCloudEventSchema } from "@/lib/ycloud/webhook";

describe("YCloud webhook", () => {
  it("verifies timestamp.body HMAC signatures", () => {
    const rawBody = '{"id":"evt_1","type":"whatsapp.inbound_message.received"}';
    const ts = "1762224357";
    const secret = "test-secret";
    const signature = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex");
    expect(
      verifyYCloudSignature({
        rawBody,
        signatureHeader: `t=${ts},s=${signature}`,
        secret,
        nowSeconds: Number(ts),
      }),
    ).toBe(true);
  });

  it("extracts only the CRM-relevant message fields", () => {
    const event = yCloudEventSchema.parse({
      id: "evt_1",
      type: "whatsapp.inbound_message.received",
      whatsappInboundMessage: { id: "wamid.1", from: "+51999888777", text: { body: "Hola" } },
    });
    expect(extractYCloudMessage(event)).toEqual({
      from: "+51999888777",
      messageId: "wamid.1",
      text: "Hola",
      status: undefined,
      type: undefined,
      replyToMessageId: undefined,
    });
  });

  it("extracts an interactive selection without depending on a provider-specific reply shape", () => {
    const event = yCloudEventSchema.parse({
      id: "evt_2",
      type: "whatsapp.inbound_message.received",
      whatsappInboundMessage: {
        id: "wamid.2",
        from: "+51999888777",
        type: "interactive",
        interactive: { listReply: { id: "occasion_ceviche", title: "Para ceviche" } },
        context: { messageId: "wamid.previous" },
      },
    });
    expect(extractYCloudMessage(event)).toEqual({
      from: "+51999888777",
      messageId: "wamid.2",
      text: "Para ceviche",
      status: undefined,
      type: "interactive",
      replyToMessageId: "wamid.previous",
    });
  });
});
