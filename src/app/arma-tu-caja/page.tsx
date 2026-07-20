import type { Metadata } from "next";
import { MixMatchClient } from "./mix-match-client";

export const metadata: Metadata = {
  title: "Arma tu caja — Mix & Match de vinos",
  description:
    "Combina cepas de una misma línea (Livverá, Casa, 1700 msnm, Geografía Extraordinaria) y accede al precio exacto de caja con delivery en Lima.",
};

export default function MixMatchPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.25em] text-wine-600 uppercase">
        Mix & Match
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Arma tu caja</h1>
      <p className="mt-3 max-w-2xl text-ink-700">
        Elige una línea, define el tamaño del pack y combina las cepas como
        quieras: las cantidades se suman y conservas el precio por volumen.
      </p>
      <div className="mt-10">
        <MixMatchClient />
      </div>
    </div>
  );
}
