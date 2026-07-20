import { sendGreenApiMessage } from "@/lib/greenapi/client";
import { sendYCloudText } from "@/lib/ycloud/client";
import { whatsappTextFallback, type WhatsAppRichMessage } from "@/lib/whatsapp/rich-message";

export type WhatsAppDeliveryResult = {
  sent: boolean;
  reason?: "not_configured" | "disabled" | "provider_error";
  messageId?: string;
};

export function activeWhatsAppProvider(): "greenapi" | "ycloud" {
  return process.env.WHATSAPP_PROVIDER?.trim().toLowerCase() === "greenapi"
    ? "greenapi"
    : "ycloud";
}

export async function sendWhatsAppMessage(args: {
  to: string;
  text: string;
  externalId?: string;
  rich?: WhatsAppRichMessage;
}): Promise<WhatsAppDeliveryResult> {
  return activeWhatsAppProvider() === "greenapi"
    ? sendGreenApiMessage(args)
    : sendYCloudText({ ...args, text: whatsappTextFallback(args.text, args.rich) });
}

export async function sendWhatsAppText(args: {
  to: string;
  text: string;
  externalId?: string;
}): Promise<WhatsAppDeliveryResult> {
  return sendWhatsAppMessage(args);
}
