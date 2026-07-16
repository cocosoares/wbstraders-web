"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Send, Sparkles, Wine, X } from "lucide-react";
import { create } from "zustand";
import { BottleArt } from "@/components/bottle-art";
import { PRODUCTS_BY_SLUG } from "@/data/products";
import { formatPEN } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";

interface SommelierUiState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

/** Estado global del panel para poder abrirlo desde cualquier sección. */
export const useSommelierUi = create<SommelierUiState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

/** CTA reutilizable que abre el sommelier (usado en el home). */
export function AskSommelierButton({ className }: { className?: string }) {
  const setOpen = useSommelierUi((s) => s.setOpen);
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={className}
    >
      <Sparkles className="h-5 w-5" />
      Preguntar al Sommelier IA
    </button>
  );
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
}

const QUICK_PROMPTS = [
  "¿Qué vino va con ceviche?",
  "Asado del domingo",
  "Busco un regalo",
  "Algo para celebrar",
];

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "¡Hola! Soy el sommelier virtual de WBStraders. Cuéntame qué vas a comer, la ocasión o tu presupuesto, y te recomiendo la botella perfecta de nuestra cava.",
};

function SuggestionCard({ slug }: { slug: string }) {
  const add = useCart((s) => s.add);
  const product = PRODUCTS_BY_SLUG.get(slug);
  if (!product) return null;

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-cream-300 bg-cream-50 p-2">
      <div className="h-12 w-8 shrink-0">
        <BottleArt product={product} className="h-12" />
      </div>
      <div className="min-w-0 flex-1">
        <Link
          href={`/producto/${product.slug}`}
          className="block truncate text-xs font-semibold text-ink-900 hover:text-wine-600"
        >
          {product.name}
        </Link>
        <p className="text-[11px] text-ink-500">
          Desde {formatPEN(product.tiers[0].packTotalCents)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => add(product.id)}
        aria-label={`Agregar ${product.name} al carrito`}
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-olive-600 text-cream-50 transition-colors duration-200 hover:bg-olive-700"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export function SommelierWidget() {
  const open = useSommelierUi((s) => s.open);
  const setOpen = useSommelierUi((s) => s.setOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const history = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(history);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/sommelier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history
            .filter((m) => m !== WELCOME)
            .map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as {
        reply: string;
        suggestions?: string[];
      };
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          suggestions: data.suggestions ?? [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Disculpa, tuve un problema de conexión. Inténtalo de nuevo o escríbenos por WhatsApp y te asesoramos al instante.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
        onClick={() => setOpen(!open)}
        aria-label={open ? "Cerrar sommelier virtual" : "Abrir sommelier virtual"}
        className="fixed right-4 bottom-4 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-wine-600 text-cream-50 shadow-lg transition-colors duration-200 hover:bg-wine-700 sm:right-6 sm:bottom-6"
      >
        {open ? <X className="h-6 w-6" /> : <Wine className="h-6 w-6" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className="fixed right-4 bottom-20 z-40 flex max-h-[70dvh] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-cream-300 bg-cream-100 shadow-2xl sm:right-6 sm:bottom-24"
            role="dialog"
            aria-label="Sommelier virtual"
          >
            <div className="flex items-center gap-2 bg-olive-800 px-4 py-3 text-cream-50">
              <Wine className="h-5 w-5" />
              <div>
                <p className="text-sm font-bold">Sommelier WBStraders</p>
                <p className="text-[11px] text-olive-200">
                  Te ayudo a elegir el vino perfecto
                </p>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto px-3 py-4"
            >
              {messages.map((message, index) => (
                <div key={index}>
                  <div
                    className={
                      message.role === "user"
                        ? "ml-8 rounded-2xl rounded-br-sm bg-olive-600 px-3.5 py-2.5 text-sm text-cream-50"
                        : "mr-8 rounded-2xl rounded-bl-sm bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 shadow-sm"
                    }
                  >
                    {message.content}
                  </div>
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-2 mr-8 space-y-1.5">
                      {message.suggestions.map((slug) => (
                        <SuggestionCard key={slug} slug={slug} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="mr-8 flex gap-1.5 rounded-2xl rounded-bl-sm bg-cream-50 px-4 py-3 shadow-sm">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-ink-300 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-ink-300 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-ink-300" />
                </div>
              )}
              {messages.length === 1 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => send(prompt)}
                      className="cursor-pointer rounded-full border border-olive-200 bg-olive-50 px-3 py-1.5 text-xs font-medium text-olive-700 transition-colors duration-200 hover:bg-olive-100"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              className="flex items-center gap-2 border-t border-cream-300 bg-cream-50 p-3"
            >
              <label htmlFor="sommelier-input" className="sr-only">
                Escribe tu consulta al sommelier
              </label>
              <input
                id="sommelier-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ej.: cena romántica con pastas…"
                className="min-w-0 flex-1 rounded-full border border-cream-300 bg-cream-100 px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-300"
              />
              <button
                type="submit"
                disabled={loading || input.trim().length === 0}
                aria-label="Enviar mensaje"
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-wine-600 text-cream-50 transition-colors duration-200 hover:bg-wine-700 disabled:cursor-not-allowed disabled:bg-ink-300"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
