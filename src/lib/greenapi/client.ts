import {
  parseWhatsAppRichMessage,
  whatsappTextFallback,
  type WhatsAppRichMessage,
} from "@/lib/whatsapp/rich-message";

export type GreenApiTextResult = {
  sent: boolean;
  reason?: "not_configured" | "disabled" | "provider_error";
  messageId?: string;
};

export type GreenApiConfig = {
  instanceId: string;
  apiToken: string;
  apiUrl: string;
};

export function getGreenApiConfig(): GreenApiConfig | null {
  const instanceId = process.env.GREEN_API_INSTANCE_ID?.trim();
  const apiToken = process.env.GREEN_API_TOKEN?.trim();
  const apiUrl = process.env.GREEN_API_URL?.trim() || "https://api.greenapi.com";
  if (!instanceId || !apiToken || !/^\d{1,20}$/.test(instanceId)) return null;
  try {
    const url = new URL(apiUrl);
    if (url.protocol !== "https:") return null;
    return { instanceId, apiToken, apiUrl: url.origin };
  } catch {
    return null;
  }
}

export function greenApiChatId(phone: string): string | null {
  const normalized = phone.replace(/\D/g, "");
  return /^[1-9]\d{7,14}$/.test(normalized) ? `${normalized}@c.us` : null;
}

async function sendGreenApiRequest(
  config: GreenApiConfig,
  method: string,
  payload: Record<string, unknown>,
): Promise<GreenApiTextResult> {
  try {
    const response = await fetch(
      `${config.apiUrl}/waInstance${config.instanceId}/${method}/${config.apiToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!response.ok) return { sent: false, reason: "provider_error" };
    const data = (await response.json().catch(() => ({}))) as { idMessage?: unknown };
    return {
      sent: true,
      messageId: typeof data.idMessage === "string" ? data.idMessage : undefined,
    };
  } catch {
    return { sent: false, reason: "provider_error" };
  }
}

export async function sendGreenApiMessage(args: {
  to: string;
  text: string;
  externalId?: string;
  rich?: WhatsAppRichMessage;
}): Promise<GreenApiTextResult> {
  if (process.env.WHATSAPP_OUTBOUND_ENABLED?.trim().toLowerCase() !== "true") {
    return { sent: false, reason: "disabled" };
  }
  const config = getGreenApiConfig();
  const chatId = greenApiChatId(args.to);
  const message = args.text.trim().slice(0, 20_000);
  if (!config || !chatId || !message) return { sent: false, reason: "not_configured" };

  const rich = parseWhatsAppRichMessage(args.rich);

  // The product photo is helpful but not allowed to block the sales reply.
  // Green API accepts one media file per request, so it is sent immediately
  // before the interactive message.
  if (rich?.image) {
    await sendGreenApiRequest(config, "sendFileByUrl", {
      chatId,
      urlFile: rich.image.url,
      fileName: rich.image.fileName,
      ...(rich.image.caption ? { caption: rich.image.caption } : {}),
    });
  }

  let interactive: GreenApiTextResult | undefined;
  if (rich?.actionButtons?.length) {
    interactive = await sendGreenApiRequest(config, "sendInteractiveButtons", {
      chatId,
      ...(rich.header ? { header: rich.header } : {}),
      body: message,
      ...(rich.footer ? { footer: rich.footer } : {}),
      buttons: [
        ...rich.actionButtons.map((button) => ({
          type: button.type,
          buttonId: button.id,
          buttonText: button.text,
          ...(button.type === "url" ? { url: button.url } : {}),
          ...(button.type === "call" ? { phoneNumber: button.phoneNumber } : {}),
          ...(button.type === "copy" ? { copyCode: button.copyCode } : {}),
        })),
        ...(rich.replyButtons ?? []).map((button) => ({
          type: "reply",
          buttonId: button.id,
          buttonText: button.text,
        })),
      ].slice(0, 3),
    });
  } else if (rich?.replyButtons?.length) {
    interactive = await sendGreenApiRequest(config, "sendInteractiveButtonsReply", {
      chatId,
      ...(rich.header ? { header: rich.header } : {}),
      body: message,
      ...(rich.footer ? { footer: rich.footer } : {}),
      buttons: rich.replyButtons.map((button) => ({
        buttonId: button.id,
        buttonText: button.text,
      })),
    });
  }

  if (interactive?.sent) return interactive;

  // Interactive methods are currently beta in Green API. A normal text
  // message keeps the conversation usable if the provider rejects buttons.
  return sendGreenApiRequest(config, "sendMessage", {
    chatId,
    message: whatsappTextFallback(message, rich),
    linkPreview: Boolean(rich?.actionButtons?.some((button) => button.type === "url")),
  });
}

export async function sendGreenApiText(args: {
  to: string;
  text: string;
  externalId?: string;
}): Promise<GreenApiTextResult> {
  return sendGreenApiMessage(args);
}
