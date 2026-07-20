import { describe, expect, it } from "vitest";
import {
  extractGreenApiMessage,
  greenApiEventSchema,
  verifyGreenApiWebhookSecret,
} from "@/lib/greenapi/webhook";

describe("GREEN API webhook", () => {
  it("extracts an inbound direct text message", () => {
    const event = greenApiEventSchema.parse({
      typeWebhook: "incomingMessageReceived",
      idMessage: "green-message-1",
      senderData: { sender: "51900000003@c.us" },
      messageData: { typeMessage: "textMessage", textMessageData: { textMessage: "Quiero un vino" } },
    });
    expect(extractGreenApiMessage(event)).toMatchObject({
      phone: "51900000003",
      messageId: "green-message-1",
      text: "Quiero un vino",
      kind: "text",
    });
  });

  it("rejects a missing or incorrect callback secret", () => {
    expect(verifyGreenApiWebhookSecret("correcto", "correcto")).toBe(true);
    expect(verifyGreenApiWebhookSecret("incorrecto", "correcto")).toBe(false);
    expect(verifyGreenApiWebhookSecret(null, "correcto")).toBe(false);
  });

  it("extracts the label selected from an interactive reply button", () => {
    const event = greenApiEventSchema.parse({
      typeWebhook: "incomingMessageReceived",
      idMessage: "green-button-1",
      senderData: { sender: "51900000003@c.us" },
      messageData: {
        typeMessage: "templateButtonsReplyMessage",
        templateButtonReplyMessage: {
          selectedId: "style_red",
          selectedDisplayText: "Tintos 🍷",
        },
      },
    });
    expect(extractGreenApiMessage(event)).toMatchObject({
      text: "Tintos 🍷",
      kind: "interactive",
    });
  });
});
