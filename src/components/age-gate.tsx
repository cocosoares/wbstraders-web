"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogoIcon, LogoWordmark } from "@/components/logo";
import { SITE } from "@/data/site";

const STORAGE_KEY = "wbs-age-verified";

/** Verificación de mayoría de edad exigida para venta de alcohol en Perú. */
export function AgeGate() {
  const [status, setStatus] = useState<"hidden" | "ask" | "denied">("hidden");

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== "yes") {
        setStatus("ask");
      }
    } catch {
      setStatus("ask");
    }
  }, []);

  const confirm = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "yes");
    } catch {
      // localStorage bloqueado: permitimos la sesión igualmente
    }
    setStatus("hidden");
  };

  return (
    <AnimatePresence>
      {status !== "hidden" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-900/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Verificación de edad"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md rounded-2xl bg-cream-50 p-8 text-center shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-center gap-2 text-ink-900">
              <LogoIcon className="h-10 w-10" />
              <LogoWordmark />
            </div>
            {status === "ask" ? (
              <>
                <h2 className="font-display text-2xl font-semibold">
                  ¿Eres mayor de 18 años?
                </h2>
                <p className="mt-2 text-sm text-ink-500">
                  Para ingresar a nuestra cava debes ser mayor de edad.{" "}
                  {SITE.legal.ageWarning}
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={confirm}
                    className="cursor-pointer rounded-lg bg-olive-600 px-4 py-3 font-semibold text-cream-50 transition-colors duration-200 hover:bg-olive-700"
                  >
                    Sí, soy mayor
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("denied")}
                    className="cursor-pointer rounded-lg border border-cream-300 px-4 py-3 font-semibold text-ink-700 transition-colors duration-200 hover:bg-cream-200"
                  >
                    No
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl font-semibold">
                  Vuelve pronto
                </h2>
                <p className="mt-2 text-sm text-ink-500">
                  Lo sentimos, este sitio es solo para mayores de 18 años.
                </p>
              </>
            )}
            <p className="mt-6 text-[11px] tracking-wide text-ink-300 uppercase">
              {SITE.legal.alcoholWarning}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
