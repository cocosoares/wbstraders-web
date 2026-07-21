import type { WhatsAppBotReply } from "@/lib/whatsapp/conversation";
import type { WhatsAppActionButton, WhatsAppRichMessage } from "@/lib/whatsapp/rich-message";

function absoluteHttpsUrl(baseUrl: string, path: string): string | undefined {
  try {
    const url = new URL(path, baseUrl);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function buildWhatsAppBotDelivery(args: {
  reply: WhatsAppBotReply;
  baseUrl: string;
  checkoutUrl?: string | null;
  provider: "greenapi" | "ycloud";
}): {
  body: string;
  kind: "text" | "interactive" | "media";
  metadata: Record<string, unknown>;
} {
  const imageUrl = args.reply.productImage
    ? absoluteHttpsUrl(args.baseUrl, args.reply.productImage.path)
    : undefined;
  const checkoutUrl = args.checkoutUrl
    ? absoluteHttpsUrl(args.baseUrl, args.checkoutUrl)
    : undefined;
  const actionButtons: WhatsAppActionButton[] = [
    ...(checkoutUrl
      ? [
          {
            type: "url" as const,
            id: "secure_checkout",
            text: "Comprar selección 🛒",
            url: checkoutUrl,
          },
        ]
      : []),
    ...(args.reply.actionButtons ?? []).flatMap((button): WhatsAppActionButton[] => {
      if (button.type !== "url") return [button];
      const url = absoluteHttpsUrl(args.baseUrl, button.url);
      return url ? [{ ...button, url }] : [];
    }),
  ].slice(0, 3);

  const rich: WhatsAppRichMessage = {
    header:
      args.reply.intent === "recommendation"
        ? "Tu selección WBStraders"
        : "WBStraders",
    ...(args.reply.footer ? { footer: args.reply.footer } : {}),
    ...(args.reply.replyButtons?.length ? { replyButtons: args.reply.replyButtons } : {}),
    ...(actionButtons.length ? { actionButtons } : {}),
    ...(imageUrl && args.reply.productImage
      ? {
          image: {
            url: imageUrl,
            fileName: args.reply.productImage.fileName,
            caption: args.reply.productImage.caption,
          },
        }
      : {}),
  };

  const interactive = Boolean(rich.replyButtons?.length || rich.actionButtons?.length);
  return {
    body: args.reply.text,
    kind: interactive ? "interactive" : rich.image ? "media" : "text",
    metadata: {
      intent: args.reply.intent,
      provider: args.provider,
      suggestions: args.reply.suggestionSlugs,
      ...(args.reply.leadData ? { qualification: args.reply.leadData } : {}),
      rich,
    },
  };
}
