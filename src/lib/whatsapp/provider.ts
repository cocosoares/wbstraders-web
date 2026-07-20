import { sendGreenApiText } from "@/lib/greenapi/client";
import { sendYCloudText } from "@/lib/ycloud/client";

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

export async function sendWhatsAppText(args: {
  to: string;
  text: string;
  externalId?: string;
}): Promise<WhatsAppDeliveryResult> {
  return activeWhatsAppProvider() === "greenapi"
    ? sendGreenApiText(args)
    : sendYCloudText(args);
}
