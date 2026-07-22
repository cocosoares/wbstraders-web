export type WhatsAppReplyButton = {
  id: string;
  text: string;
};

export type WhatsAppActionButton =
  | { type: "url"; id: string; text: string; url: string }
  | { type: "call"; id: string; text: string; phoneNumber: string }
  | { type: "copy"; id: string; text: string; copyCode: string };

export type WhatsAppMediaAttachment = {
  url?: string;
  storagePath?: string;
  fileName: string;
  caption?: string;
  mimeType?: string;
};

export type WhatsAppRichMessage = {
  header?: string;
  footer?: string;
  replyButtons?: WhatsAppReplyButton[];
  actionButtons?: WhatsAppActionButton[];
  image?: WhatsAppMediaAttachment;
  attachment?: WhatsAppMediaAttachment;
};

function shortString(value: unknown, maxLength: number): string | undefined {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : undefined;
}

function safeHttpsUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function safeStoragePath(value: unknown): string | undefined {
  const path = shortString(value, 500);
  return path && /^[a-zA-Z0-9/_-]+\.[a-zA-Z0-9]{2,5}$/.test(path)
    ? path
    : undefined;
}

function parseMedia(value: unknown): WhatsAppMediaAttachment | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const media = value as Record<string, unknown>;
  const url = safeHttpsUrl(media.url);
  const storagePath = safeStoragePath(media.storagePath);
  const fileName = shortString(media.fileName, 120)?.replace(/[^a-zA-Z0-9._-]/g, "-");
  if ((!url && !storagePath) || !fileName || !/\.[a-zA-Z0-9]{2,5}$/.test(fileName)) {
    return undefined;
  }
  return {
    ...(url ? { url } : {}),
    ...(storagePath ? { storagePath } : {}),
    fileName,
    ...(shortString(media.caption, 1_024) ? { caption: shortString(media.caption, 1_024) } : {}),
    ...(shortString(media.mimeType, 120) ? { mimeType: shortString(media.mimeType, 120) } : {}),
  };
}

export function parseWhatsAppRichMessage(value: unknown): WhatsAppRichMessage | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const source = value as Record<string, unknown>;
  const header = shortString(source.header, 120);
  const footer = shortString(source.footer, 120);

  const replyButtons = Array.isArray(source.replyButtons)
    ? source.replyButtons
        .flatMap((entry) => {
          if (typeof entry !== "object" || entry === null) return [];
          const button = entry as Record<string, unknown>;
          const id = shortString(button.id, 80);
          const text = shortString(button.text, 25);
          return id && text ? [{ id, text }] : [];
        })
        .slice(0, 3)
    : undefined;

  const actionButtons = Array.isArray(source.actionButtons)
    ? source.actionButtons
        .flatMap((entry): WhatsAppActionButton[] => {
          if (typeof entry !== "object" || entry === null) return [];
          const button = entry as Record<string, unknown>;
          const type = button.type;
          const id = shortString(button.id, 80);
          const text = shortString(button.text, 25);
          if (!id || !text) return [];
          if (type === "url") {
            const url = safeHttpsUrl(button.url);
            return url ? [{ type, id, text, url }] : [];
          }
          if (type === "call") {
            const phoneNumber = shortString(button.phoneNumber, 20)?.replace(/[^+\d]/g, "");
            return phoneNumber ? [{ type, id, text, phoneNumber }] : [];
          }
          if (type === "copy") {
            const copyCode = shortString(button.copyCode, 200);
            return copyCode ? [{ type, id, text, copyCode }] : [];
          }
          return [];
        })
        .slice(0, 3)
    : undefined;

  const image = parseMedia(source.image);
  const attachment = parseMedia(source.attachment);

  if (!header && !footer && !replyButtons?.length && !actionButtons?.length && !image && !attachment) {
    return undefined;
  }
  return {
    ...(header ? { header } : {}),
    ...(footer ? { footer } : {}),
    ...(replyButtons?.length ? { replyButtons } : {}),
    ...(actionButtons?.length ? { actionButtons } : {}),
    ...(image ? { image } : {}),
    ...(attachment ? { attachment } : {}),
  };
}

export function whatsappTextFallback(text: string, rich?: WhatsAppRichMessage): string {
  let fallback = text.trim();
  if (rich?.replyButtons?.length) {
    fallback += `\n\nResponde con una opción: ${rich.replyButtons.map((button) => button.text).join(" · ")}`;
  }
  if (rich?.actionButtons?.length) {
    for (const button of rich.actionButtons) {
      if (button.type === "url") fallback += `\n\n${button.text}: ${button.url}`;
      if (button.type === "call") fallback += `\n\n${button.text}: ${button.phoneNumber}`;
      if (button.type === "copy") fallback += `\n\n${button.text}: ${button.copyCode}`;
    }
  }
  const media = rich?.attachment ?? rich?.image;
  if (media?.url && !rich?.actionButtons?.some((button) => button.type === "url" && button.url === media.url)) {
    fallback += `\n\n${media.fileName}: ${media.url}`;
  }
  return fallback.slice(0, 4_000);
}
