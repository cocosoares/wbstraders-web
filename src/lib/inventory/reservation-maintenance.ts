import type { SupabaseClient } from "@supabase/supabase-js";

export function normalizeReservationExpiryLimit(value: string | null): number {
  if (value === null || value.trim() === "") return 500;
  if (!/^\d+$/.test(value)) return 500;
  const parsed = Number.parseInt(value, 10);
  return Math.min(1000, Math.max(1, parsed));
}

export async function expireStockReservations(
  db: SupabaseClient,
  limit: number,
): Promise<number> {
  const { data, error } = await db.rpc("expire_stock_reservations", {
    p_limit: limit,
  });
  if (error) throw error;
  return typeof data === "number" ? data : Number(data) || 0;
}
