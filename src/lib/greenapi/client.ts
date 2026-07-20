export type GreenApiTextResult = {
  sent: boolean;
  reason?: "not_configured" | "disabled" | "provider_error";
  messageId?: string;
};

function greenApiConfig() {
  const instanceId = process.env.GREEN_API_INSTANCE_ID?.trim();
  const apiToken = process.env.GREEN_API_TOKEN?.trim();
  const apiUrl = process.env.GREEN_API_URL?.trim() || "https://api.greenapi.com";
  // Green API instance IDs are numeric and can exceed ten digits.
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

export async function sendGreenApiText(args: {
  to: string;
  text: string;
  externalId?: string;
}): Promise<GreenApiTextResult> {
  if (process.env.WHATSAPP_OUTBOUND_ENABLED?.trim().toLowerCase() !== "true") {
    return { sent: false, reason: "disabled" };
  }
  const config = greenApiConfig();
  const chatId = greenApiChatId(args.to);
  const message = args.text.trim().slice(0, 20_000);
  if (!config || !chatId || !message) return { sent: false, reason: "not_configured" };

  try {
    const response = await fetch(
      `${config.apiUrl}/waInstance${config.instanceId}/sendMessage/${config.apiToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message, linkPreview: true }),
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
