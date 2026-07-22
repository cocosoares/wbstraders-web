"use client";

import { useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Circle } from "lucide-react";

const TABLES = [
  "whatsapp_conversations",
  "whatsapp_messages",
  "whatsapp_handoffs",
  "activities",
  "opportunities",
] as const;

export function CrmRealtimeRefresh() {
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "polling">("connecting");

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 500);
    };
    const fallback = setInterval(() => router.refresh(), 10_000);
    if (!url || !key) {
      setStatus("polling");
      return () => clearInterval(fallback);
    }

    const supabase = createBrowserClient(url, key);
    let channel = supabase.channel("admin-crm");
    for (const table of TABLES) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        scheduleRefresh,
      );
    }
    channel.subscribe((subscriptionStatus) => {
      setStatus(subscriptionStatus === "SUBSCRIBED" ? "live" : "polling");
    });

    return () => {
      clearInterval(fallback);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500">
      <Circle
        className={status === "live" ? "h-2.5 w-2.5 fill-emerald-500 text-emerald-500" : "h-2.5 w-2.5 fill-gold-500 text-gold-500"}
        aria-hidden="true"
      />
      {status === "live" ? "En tiempo real" : status === "connecting" ? "Conectando" : "Actualización cada 10 s"}
    </span>
  );
}
