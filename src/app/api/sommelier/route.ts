import { NextResponse } from "next/server";
import {
  SOMMELIER_SYSTEM_PROMPT,
  localRecommend,
  parseModelResponse,
} from "@/lib/sommelier";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_MESSAGES = 12;
const MAX_LENGTH = 1000;

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

async function askClaude(messages: ChatMessage[]): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.SOMMELIER_MODEL ?? "claude-sonnet-5",
      max_tokens: 600,
      system: SOMMELIER_SYSTEM_PROMPT,
      messages,
    }),
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API respondió ${response.status}`);
  }
  const data = (await response.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = data.content?.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("Respuesta del modelo sin texto");
  return text;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const messages = sanitizeMessages(
    (body as { messages?: unknown })?.messages,
  );
  if (!messages) {
    return NextResponse.json(
      { error: "Formato de mensajes inválido" },
      { status: 400 },
    );
  }

  const lastUserMessage = messages[messages.length - 1].content;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(localRecommend(lastUserMessage));
  }

  try {
    const raw = await askClaude(messages);
    return NextResponse.json(parseModelResponse(raw));
  } catch (error) {
    console.error("[sommelier] fallo del modelo, usando fallback local:", error);
    return NextResponse.json(localRecommend(lastUserMessage));
  }
}
