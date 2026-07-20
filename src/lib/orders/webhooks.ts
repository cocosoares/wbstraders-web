import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export function fallbackEventId(rawBody: string): string {
  return createHash("sha256").update(rawBody, "utf8").digest("hex");
}

export async function claimWebhookEvent(
  db: SupabaseClient,
  values: { provider: "mercadopago" | "ycloud" | "greenapi"; eventId: string; eventType?: string; payload: unknown },
): Promise<{ id: string; duplicate: boolean }> {
  const { data, error } = await db
    .from("webhook_events")
    .insert({
      provider: values.provider,
      provider_event_id: values.eventId,
      event_type: values.eventType ?? null,
      payload: values.payload,
      status: "processing",
    })
    .select("id")
    .single();

  if (!error) return { id: data.id as string, duplicate: false };
  if (error.code !== "23505") throw error;

  const existing = await db
    .from("webhook_events")
    .select("id,status,received_at")
    .eq("provider", values.provider)
    .eq("provider_event_id", values.eventId)
    .single();
  if (existing.error) throw existing.error;
  const staleProcessing =
    existing.data.status === "processing" &&
    Date.now() - new Date(existing.data.received_at as string).getTime() > 5 * 60_000;
  if (existing.data.status === "failed" || staleProcessing) {
    const retry = await db
      .from("webhook_events")
      .update({
        status: "processing",
        error_message: null,
        received_at: new Date().toISOString(),
        processed_at: null,
      })
      .eq("id", existing.data.id)
      .eq("status", existing.data.status)
      .eq("received_at", existing.data.received_at)
      .select("id")
      .maybeSingle();
    if (retry.error) throw retry.error;
    return {
      id: existing.data.id as string,
      duplicate: !retry.data,
    };
  }
  return { id: existing.data.id as string, duplicate: true };
}

/**
 * Older production schemas did not yet include `greenapi` in the provider
 * constraint. Keep inbound webhooks available while that additive migration is
 * being rolled out, without masking unrelated database errors.
 */
export function isMissingGreenApiWebhookProvider(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const details = error as { code?: unknown; message?: unknown };
  return (
    details.code === "23514" &&
    typeof details.message === "string" &&
    details.message.includes("webhook_events_provider_check")
  );
}

export async function finishWebhookEvent(
  db: SupabaseClient,
  id: string,
  status: "processed" | "failed" | "ignored",
  errorMessage?: string,
): Promise<void> {
  const { error } = await db
    .from("webhook_events")
    .update({
      status,
      processed_at: new Date().toISOString(),
      error_message: errorMessage?.slice(0, 500) ?? null,
    })
    .eq("id", id);
  if (error) throw error;
}
