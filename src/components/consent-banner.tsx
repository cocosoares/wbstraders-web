"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "wbs-consent-v1";

export interface ConsentChoice {
  analytics: boolean;
  decidedAt: string;
}

export function readConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(CONSENT_KEY) ?? "null",
    ) as ConsentChoice | null;
    return parsed && typeof parsed.analytics === "boolean" ? parsed : null;
  } catch {
    return null;
  }
}

function saveConsent(analytics: boolean) {
  const choice: ConsentChoice = {
    analytics,
    decidedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(choice));
  window.dispatchEvent(
    new CustomEvent("wbs:consent-updated", { detail: choice }),
  );
}

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => setVisible(readConsent() === null), []);

  if (!visible) return null;

  const decide = (analytics: boolean) => {
    saveConsent(analytics);
    setVisible(false);
  };

  return (
    <section
      aria-label="Preferencias de privacidad"
      className="fixed inset-x-3 bottom-3 z-[1000] mx-auto max-w-3xl rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-2xl sm:bottom-5 sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink-900">
            Tu privacidad importa
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-700">
            Usamos almacenamiento esencial para el carrito. La medición de
            audiencia solo se activa si la autorizas y nunca recibe tu nombre,
            teléfono, correo ni dirección. Consulta nuestra{" "}
            <Link
              href="/privacidad"
              className="font-semibold text-wine-600 underline-offset-2 hover:underline"
            >
              política de privacidad
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:min-w-44">
          <button
            type="button"
            onClick={() => decide(true)}
            className="min-h-11 rounded-xl bg-wine-600 px-4 py-2.5 text-sm font-bold text-cream-50 transition-colors hover:bg-wine-700"
          >
            Aceptar medición
          </button>
          <button
            type="button"
            onClick={() => decide(false)}
            className="min-h-11 rounded-xl border border-cream-300 px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-cream-200"
          >
            Solo necesarias
          </button>
        </div>
      </div>
    </section>
  );
}
