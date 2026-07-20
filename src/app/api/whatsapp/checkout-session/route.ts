import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { consumeWhatsAppCheckoutSession } from "@/lib/whatsapp/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return NextResponse.json({ error: "Enlace de WhatsApp invÃ¡lido." }, { status: 400 });
  }

  const clientKey = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = consumeRateLimit(`whatsapp-checkout:${clientKey}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta nuevamente en un minuto." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const session = await consumeWhatsAppCheckoutSession(getSupabaseAdmin(), token);
    if (!session || Object.keys(session.items).length === 0) {
      return NextResponse.json(
        { error: "Este enlace de compra venciÃ³. Vuelve a pedir una recomendaciÃ³n por WhatsApp." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    const response = NextResponse.json(session, { headers: { "Cache-Control": "no-store" } });
    // The opaque token is only available to the order route via HttpOnly
    // cookie. The client cannot use a URL parameter to forge WhatsApp sales
    // attribution for another order.
    response.cookies.set("wbs-whatsapp-checkout", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "No pudimos preparar tu carrito. Intenta nuevamente desde WhatsApp." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
