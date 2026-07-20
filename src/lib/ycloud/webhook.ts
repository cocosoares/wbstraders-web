import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const yCloudEventSchema = z
  .object({
    id: z.string().min(1).max(200),
    type: z.string().min(1).max(200),
    apiVersion: z.string().max(30).optional(),
    createTime: z.string().max(80).optional(),
  })
  .passthrough();

export type YCloudEvent = z.infer<typeof yCloudEventSchema>;

export function verifyYCloudSignature(args: {
  rawBody: string;
  signatureHeader: string;
  secret: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): boolean {
  const parts = new Map(
    args.signatureHeader.split(",").map((part) => {
      const [key, value] = part.trim().split("=", 2);
      return [key, value] as const;
    }),
  );
  const timestamp = parts.get("t");
  const signature = parts.get("s");
  if (!timestamp || !signature || !/^\d+$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  if (args.toleranceSeconds !== undefined) {
    const now = args.nowSeconds ?? Math.floor(Date.now() / 1000);
    if (Math.abs(now - Number(timestamp)) > args.toleranceSeconds) return false;
  }

  const expected = createHmac("sha256", args.secret).update(`${timestamp}.${args.rawBody}`).digest();
  const received = Buffer.from(signature, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function extractYCloudMessage(event: YCloudEvent): {
  from?: string;
  messageId?: string;
  text?: string;
  status?: string;
  type?: string;
  replyToMessageId?: string;
} {
  const container = (event.whatsappInboundMessage ?? event.whatsappMessage) as Record<string, unknown> | undefined;
  if (!container) return {};
  const textObject = container.text as Record<string, unknown> | undefined;
  const interactive = container.interactive as Record<string, unknown> | undefined;
  const buttonReply = interactive?.buttonReply as Record<string, unknown> | undefined;
  const listReply = interactive?.listReply as Record<string, unknown> | undefined;
  const context = container.context as Record<string, unknown> | undefined;
  const interactiveText: string | undefined =
    (typeof buttonReply?.title === "string" && buttonReply.title) ||
    (typeof listReply?.title === "string" && listReply.title) ||
    (typeof buttonReply?.id === "string" && buttonReply.id) ||
    (typeof listReply?.id === "string" && listReply.id) ||
    undefined;
  return {
    from: typeof container.from === "string" ? container.from : undefined,
    messageId: typeof container.id === "string" ? container.id : undefined,
    text:
      typeof textObject?.body === "string"
        ? textObject.body
        : interactiveText,
    status: typeof container.status === "string" ? container.status : undefined,
    type: typeof container.type === "string" ? container.type : undefined,
    replyToMessageId:
      typeof context?.messageId === "string" ? context.messageId : undefined,
  };
}
