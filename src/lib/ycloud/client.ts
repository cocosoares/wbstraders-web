export interface YCloudTemplateResult {
  sent: boolean;
  reason?: "not_configured" | "disabled" | "provider_error";
  messageId?: string;
}

export interface YCloudTextResult extends YCloudTemplateResult {}

function yCloudConfig() {
  const apiKey = process.env.YCLOUD_API_KEY?.trim();
  const from = process.env.YCLOUD_WHATSAPP_NUMBER?.trim();
  if (!apiKey || !from || !/^\+[1-9]\d{7,14}$/.test(from)) return null;
  return { apiKey, from };
}

function normalizeRecipient(value: string): string | null {
  const normalized = value.startsWith("+") ? value : `+${value.replace(/\D/g, "")}`;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

/**
 * Enqueues an approved YCloud template without logging the recipient or payload.
 * Missing configuration is an explicit, safe no-op so local/manual commerce keeps
 * working without pretending that a notification was sent.
 */
export async function sendYCloudTemplate(args: {
  to: string;
  parameters?: string[];
  externalId?: string;
  templateName?: string;
  languageCode?: string;
}): Promise<YCloudTemplateResult> {
  const config = yCloudConfig();
  const templateName = args.templateName?.trim() || process.env.YCLOUD_PAYMENT_CONFIRMED_TEMPLATE?.trim();
  const languageCode = args.languageCode?.trim() || process.env.YCLOUD_TEMPLATE_LANGUAGE?.trim();
  if (!config || !templateName || !languageCode) {
    return { sent: false, reason: "not_configured" };
  }

  const to = normalizeRecipient(args.to);
  if (!to) {
    return { sent: false, reason: "not_configured" };
  }
  const components = args.parameters?.length
    ? [
        {
          type: "body",
          parameters: args.parameters.map((text) => ({ type: "text", text: text.slice(0, 1024) })),
        },
      ]
    : undefined;

  try {
    const response = await fetch("https://api.ycloud.com/v2/whatsapp/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": config.apiKey },
      body: JSON.stringify({
        from: config.from,
        to,
        type: "template",
        externalId: args.externalId?.slice(0, 200),
        filterBlocked: true,
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(components ? { components } : {}),
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return { sent: false, reason: "provider_error" };
    const data = (await response.json().catch(() => ({}))) as { id?: unknown };
    return { sent: true, messageId: typeof data.id === "string" ? data.id : undefined };
  } catch {
    return { sent: false, reason: "provider_error" };
  }
}

/**
 * Sends a free-form response only after the conversation processor has confirmed
 * that the user wrote within the active WhatsApp service window. Keeping this
 * behind an explicit flag prevents accidental bot activation during setup.
 */
export async function sendYCloudText(args: {
  to: string;
  text: string;
  externalId?: string;
}): Promise<YCloudTextResult> {
  if (process.env.WHATSAPP_OUTBOUND_ENABLED?.trim().toLowerCase() !== "true") {
    return { sent: false, reason: "disabled" };
  }
  const config = yCloudConfig();
  const to = normalizeRecipient(args.to);
  const text = args.text.trim().slice(0, 4_000);
  if (!config || !to || !text) return { sent: false, reason: "not_configured" };

  try {
    const response = await fetch("https://api.ycloud.com/v2/whatsapp/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": config.apiKey },
      body: JSON.stringify({
        from: config.from,
        to,
        type: "text",
        externalId: args.externalId?.slice(0, 200),
        filterBlocked: true,
        text: { body: text },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return { sent: false, reason: "provider_error" };
    const data = (await response.json().catch(() => ({}))) as { id?: unknown };
    return { sent: true, messageId: typeof data.id === "string" ? data.id : undefined };
  } catch {
    return { sent: false, reason: "provider_error" };
  }
}
