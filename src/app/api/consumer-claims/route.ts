import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { consumerClaimSchema } from "@/lib/consumer-claims/schema";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientKey = forwardedFor || request.headers.get("x-real-ip")?.trim() || "unknown";
  const limit = consumeRateLimit(`consumer-claims:${clientKey}`, 5, 60 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Alcanzaste el límite temporal. Intenta nuevamente más tarde.",
        },
      },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1_000))),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 64_000) {
    return errorResponse(413, "PAYLOAD_TOO_LARGE", "La solicitud es demasiado grande.");
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > 64_000) {
      return errorResponse(413, "PAYLOAD_TOO_LARGE", "La solicitud es demasiado grande.");
    }
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse(400, "INVALID_JSON", "La solicitud no contiene JSON válido.");
  }

  const parsed = consumerClaimSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(422, "VALIDATION_ERROR", "Revisa los datos obligatorios del formulario.");
  }

  const claimId = randomUUID();
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const claimNumber = `LR-${date}-${claimId.slice(0, 8).toUpperCase()}`;
  const input = parsed.data;

  try {
    const { error } = await getSupabaseAdmin().from("consumer_claims").insert({
      id: claimId,
      claim_number: claimNumber,
      customer_name: input.customerName,
      document_type: input.documentType,
      document_number: input.documentNumber,
      address: input.address,
      phone: input.phone,
      phone_normalized: input.phone.replace(/\D/g, ""),
      email: input.email,
      item_type: input.itemType,
      item_description: input.itemDescription,
      order_number: input.orderNumber || null,
      amount_cents: input.amountCents ?? null,
      claim_type: input.claimType,
      detail: input.detail,
      consumer_request: input.consumerRequest,
      privacy_accepted_at: new Date().toISOString(),
      privacy_notice_path: "/privacidad",
    });
    if (error) throw error;
  } catch {
    return errorResponse(
      503,
      "CLAIMS_SERVICE_UNAVAILABLE",
      "No pudimos registrar el reclamo. Intenta nuevamente o contáctanos por el canal de soporte.",
    );
  }

  return NextResponse.json(
    { claimNumber, status: "received" },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
