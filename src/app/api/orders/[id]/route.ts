import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicOrderStatus } from "@/lib/orders/repository";
import { hashPublicOrderToken } from "@/lib/orders/tokens";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const idSchema = z.string().uuid();
const tokenSchema = z.string().min(32).max(100);

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = new URL(request.url).searchParams.get("token");
  if (!idSchema.safeParse(id).success || !token || !tokenSchema.safeParse(token).success) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Pedido no encontrado" } }, { status: 404 });
  }

  try {
    const order = await getPublicOrderStatus(getSupabaseAdmin(), id, hashPublicOrderToken(token));
    if (!order) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Pedido no encontrado" } }, { status: 404 });
    }
    return NextResponse.json(order, { headers: { "Cache-Control": "no-store, private" } });
  } catch {
    return NextResponse.json(
      { error: { code: "ORDER_STATUS_UNAVAILABLE", message: "No pudimos consultar el pedido" } },
      { status: 503 },
    );
  }
}
