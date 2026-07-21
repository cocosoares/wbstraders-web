import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const greenApiEventSchema = z
  .object({
    typeWebhook: z.string().min(1).max(100),
    idMessage: z.string().max(300).optional(),
    timestamp: z.number().int().nonnegative().optional(),
    senderData: z
      .object({
        chatId: z.string().max(120).optional(),
        sender: z.string().max(120).optional(),
      })
      .optional(),
    messageData: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export type GreenApiEvent = z.infer<typeof greenApiEventSchema>;

export function verifyGreenApiWebhookSecret(provided: string | null, expected: string): boolean {
  if (!provided || !expected) return false;
  const actual = Buffer.from(provided, "utf8");
  const target = Buffer.from(expected, "utf8");
  return actual.length === target.length && timingSafeEqual(actual, target);
}

function directPhone(value: string | undefined): string | undefined {
  if (!value || !value.endsWith("@c.us")) return undefined;
  const normalized = value.slice(0, -5).replace(/\D/g, "");
  return /^[1-9]\d{7,14}$/.test(normalized) ? normalized : undefined;
}

export function extractGreenApiMessage(event: GreenApiEvent): {
  phone?: string;
  messageId?: string;
  text?: string;
  kind: "text" | "interactive" | "media";
  replyToMessageId?: string;
} {
  const message = event.messageData ?? {};
  const type = typeof message.typeMessage === "string" ? message.typeMessage : "";
  const textMessageData = message.textMessageData as Record<string, unknown> | undefined;
  const extendedTextMessageData = message.extendedTextMessageData as Record<string, unknown> | undefined;
  const buttonsResponseMessage = message.buttonsResponseMessage as Record<string, unknown> | undefined;
  const listResponseMessage = message.listResponseMessage as Record<string, unknown> | undefined;
  const templateButtonReplyMessage = message.templateButtonReplyMessage as
    | Record<string, unknown>
    | undefined;
  // GREEN API's current interactive reply method returns this payload when a
  // customer taps one of the reply buttons. Keep it alongside the legacy
  // button response formats for compatibility across WhatsApp clients.
  const interactiveButtonsResponse = message.interactiveButtonsResponse as
    | Record<string, unknown>
    | undefined;
  const quoted = message.quotedMessage as Record<string, unknown> | undefined;
  const interactiveText =
    (typeof interactiveButtonsResponse?.selectedDisplayText === "string" &&
      interactiveButtonsResponse.selectedDisplayText) ||
    (typeof interactiveButtonsResponse?.selectedId === "string" &&
      interactiveButtonsResponse.selectedId) ||
    (typeof templateButtonReplyMessage?.selectedDisplayText === "string" &&
      templateButtonReplyMessage.selectedDisplayText) ||
    (typeof templateButtonReplyMessage?.selectedId === "string" &&
      templateButtonReplyMessage.selectedId) ||
    (typeof buttonsResponseMessage?.selectedButtonId === "string" && buttonsResponseMessage.selectedButtonId) ||
    (typeof buttonsResponseMessage?.selectedDisplayText === "string" && buttonsResponseMessage.selectedDisplayText) ||
    (typeof listResponseMessage?.title === "string" && listResponseMessage.title) ||
    (typeof listResponseMessage?.rowId === "string" && listResponseMessage.rowId) ||
    undefined;
  const text =
    (typeof textMessageData?.textMessage === "string" && textMessageData.textMessage) ||
    (typeof extendedTextMessageData?.text === "string" && extendedTextMessageData.text) ||
    interactiveText ||
    undefined;
  return {
    phone: directPhone(event.senderData?.sender ?? event.senderData?.chatId),
    messageId: event.idMessage,
    text,
    kind: interactiveText ? "interactive" : text ? "text" : "media",
    replyToMessageId: typeof quoted?.stanzaId === "string" ? quoted.stanzaId : undefined,
  };
}
