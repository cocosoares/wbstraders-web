import { NextResponse } from "next/server";
import {
  SOMMELIER_SYSTEM_PROMPT,
  localRecommend,
  parseModelResponse,
} from "@/lib/sommelier";
import { consumeRateLimit } from "@/lib/rate-limit";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_MESSAGES = 12;
const MAX_LENGTH = 1000;
const MAX_BODY_BYTES = 32_000;

/** Valida la entrada en el borde del sistema: nunca confiar en el cliente. */
function sanitizeMessages(input: unknown): ChatMessage[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const messages: ChatMessage[] = [];
  for (const item of input.slice(-MAX_MESSAGES)) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("role" in item) ||
      !("content" in item)
    ) {
      return null;
    }
    const { role, content } = item as { role: unknown; content: unknown };
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || content.trim().length === 0) return null;
    messages.push({ role, content: content.slice(0, MAX_LENGTH) });
  }
  if (messages[messages.length - 1].role !== "user") return null;
  return messages;
}

async function askOpenRouter(messages: ChatMessage[]): Promise<string> {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY ?? ""}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://wbstraders.com",
        "X-Title": "WBStraders Sommelier",
      },
      body: JSON.stringify({
        model:
          process.env.OPENROUTER_MODEL ??
          process.env.SOMMELIER_MODEL ??
          "google/gemini-3.1-flash-lite",
        max_tokens: 600,
        messages: [
          { role: "system", content: SOMMELIER_SYSTEM_PROMPT },
          ...messages,
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    },
  );

  if (!response.ok) {
    throw new Error(`OpenRouter respondió ${response.status}`);
  }
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Respuesta del modelo sin texto");
  return text;
}

export async function POST(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const clientKey = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const limit = consumeRateLimit(`sommelier:${clientKey}`, 10, 60_000);
  const rateHeaders = {
    "X-RateLimit-Limit": "10",
    "X-RateLimit-Remaining": String(limit.remaining),
    "X-RateLimit-Reset": String(Math.ceil(limit.resetAt / 1000)),
  };
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Demasiadas consultas. Intenta nuevamente en un minuto." },
      { status: 429, headers: rateHeaders },
    );
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "La solicitud es demasiado grande." },
      { status: 413, headers: rateHeaders },
    );
  }

  let body: unknown;
  try {
    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "La solicitud es demasiado grande." },
        { status: 413, headers: rateHeaders },
      );
    }
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "JSON inválido" },
      { status: 400, headers: rateHeaders },
    );
  }

  const messages = sanitizeMessages(
    (body as { messages?: unknown })?.messages,
  );
  if (!messages) {
    return NextResponse.json(
      { error: "Formato de mensajes inválido" },
      { status: 400, headers: rateHeaders },
    );
  }

  const lastUserMessage = messages[messages.length - 1].content;

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(localRecommend(lastUserMessage), {
      headers: rateHeaders,
    });
  }

  try {
    const raw = await askOpenRouter(messages);
    return NextResponse.json(parseModelResponse(raw), { headers: rateHeaders });
  } catch (error) {
    console.error("[sommelier] fallo del modelo, usando fallback local:", error);
    return NextResponse.json(localRecommend(lastUserMessage), {
      headers: rateHeaders,
    });
  }
}
