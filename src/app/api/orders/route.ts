import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { calculateOrder, OrderPricingError } from "@/lib/orders/pricing";
import { boletaRequiresDni } from "@/lib/fiscal/tax";
import { databaseOrderError } from "@/lib/orders/errors";
import {
  createOrderRecord,
  createPaymentAttempt,
  failPaymentAttempt,
  updatePaymentPreference,
} from "@/lib/orders/repository";
import { createOrderSchema } from "@/lib/orders/schema";
import { hasValidTestCheckoutCoupon } from "@/lib/orders/test-checkout";
import { createPublicOrderToken, hashPublicOrderToken } from "@/lib/orders/tokens";
import {
  createMercadoPagoPreference,
  mercadoPagoConfigured,
  MercadoPagoError,
} from "@/lib/payments/mercadopago";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/rate-limit";
import { markWhatsAppCheckoutConverted } from "@/lib/whatsapp/repository";

export const runtime = "nodejs";

function jsonError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export async function POST(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientKey = forwardedFor || request.headers.get("x-real-ip")?.trim() || "unknown";
  const rateLimit = consumeRateLimit(`orders:${clientKey}`, 8, 10 * 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Demasiados intentos. Intenta nuevamente en unos minutos" } },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 64_000) return jsonError(413, "PAYLOAD_TOO_LARGE", "La solicitud es demasiado grande");

  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > 64_000) {
      return jsonError(413, "PAYLOAD_TOO_LARGE", "La solicitud es demasiado grande");
    }
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonError(400, "INVALID_JSON", "El cuerpo no contiene JSON válido");
    }

    const input = createOrderSchema.parse(body);
    const testCheckout = hasValidTestCheckoutCoupon(input.testCoupon);
    if (input.testCoupon && !testCheckout) {
      return jsonError(422, "TEST_COUPON_INVALID", "El código de prueba no es válido o no está habilitado");
    }
    const orderInput = testCheckout
      ? {
          ...input,
          paymentMethod: "manual" as const,
          notes: [input.notes, "Pedido interno de prueba: pago no procesado."].filter(Boolean).join("\n"),
          attribution: {
            ...input.attribution,
            source: input.attribution?.source ?? "internal_test",
            medium: input.attribution?.medium ?? "test_coupon",
          },
        }
      : input;
    const calculated = calculateOrder(orderInput.items, orderInput.delivery.district);
    if (
      orderInput.fiscal.receiptType === "boleta" &&
      boletaRequiresDni(calculated.totalCents) &&
      !/^\d{8}$/.test(orderInput.fiscal.documentNumber ?? "")
    ) {
      return jsonError(
        422,
        "BOLETA_DNI_REQUIRED",
        "Para boletas superiores a S/ 700 debes ingresar un DNI vÃ¡lido.",
      );
    }
    const db = getSupabaseAdmin();
    const accessToken = createPublicOrderToken();
    const orderId = randomUUID();
    const requestedMercadoPago =
      !testCheckout &&
      orderInput.paymentMethod === "mercadopago" &&
      process.env.PAYMENT_PROVIDER?.trim().toLowerCase() !== "manual";
    const paymentProvider = requestedMercadoPago && mercadoPagoConfigured() ? "mercadopago" : "manual";

    let created;
    try {
      created = await createOrderRecord(db, orderInput, calculated, {
        orderId,
        tokenHash: hashPublicOrderToken(accessToken),
        paymentProvider,
      });
    } catch (error) {
      const mapped = databaseOrderError(error as { message?: string; code?: string });
      return jsonError(mapped.status, mapped.code, mapped.message);
    }

    let whatsappCheckoutConverted = false;
    const whatsappCheckoutToken = (await cookies()).get("wbs-whatsapp-checkout")?.value ?? "";
    if (/^[a-f0-9]{64}$/.test(whatsappCheckoutToken)) {
      // Attribution must never jeopardize a valid order. The token is opaque,
      // short-lived and is validated again by the database function.
      whatsappCheckoutConverted = await markWhatsAppCheckoutConverted(
        db,
        whatsappCheckoutToken,
        created.orderId,
      ).catch(() => false);
    }

    const idempotencyKey = randomUUID();
    const attemptId = await createPaymentAttempt(db, {
      orderId,
      provider: paymentProvider,
      amountCents: calculated.totalCents,
      idempotencyKey,
    });

    let checkoutUrl: string | undefined;
    if (paymentProvider === "mercadopago") {
      try {
        const preference = await createMercadoPagoPreference({
          orderId,
          orderNumber: created.orderNumber,
          calculated,
          customerEmail: orderInput.customer.email,
          idempotencyKey,
        });
        checkoutUrl = preference.checkoutUrl;
        await updatePaymentPreference(db, attemptId, {
          preferenceId: preference.id,
          checkoutUrl: preference.checkoutUrl,
          snapshot: {
            preferenceId: preference.id,
            sandboxCheckoutUrl: preference.sandboxCheckoutUrl ?? null,
          },
        });
      } catch (error) {
        const code = error instanceof MercadoPagoError ? error.code : "PREFERENCE_UNAVAILABLE";
        // The order remains pending and can be recovered manually; it is never
        // assumed paid when the provider is unavailable.
        await failPaymentAttempt(db, attemptId, code).catch(() => undefined);
      }
    }

    const response = NextResponse.json(
      {
        orderId: created.orderId,
        orderNumber: created.orderNumber,
        status: "pending_payment",
        ...(testCheckout ? { testCheckout: true } : {}),
        ...(checkoutUrl ? { checkoutUrl } : {}),
        accessToken,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
    if (whatsappCheckoutConverted) {
      response.cookies.set("wbs-whatsapp-checkout", "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
      });
    }
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(422, "VALIDATION_ERROR", "Revisa los datos del pedido", error.issues);
    }
    if (error instanceof OrderPricingError) {
      const status = error.code === "UNKNOWN_PRODUCT" ? 400 : 422;
      return jsonError(status, error.code, error.message);
    }
    if (error instanceof Error && error.message === "SUPABASE_SERVER_CONFIG_MISSING") {
      return jsonError(503, "COMMERCE_UNAVAILABLE", "El sistema de pedidos todavía no está configurado");
    }
    return jsonError(500, "ORDER_CREATION_FAILED", "No pudimos crear el pedido");
  }
}
