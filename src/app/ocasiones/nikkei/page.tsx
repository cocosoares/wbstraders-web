import type { Metadata } from "next";
import { OccasionLanding } from "@/components/occasion-landing";

export const metadata: Metadata = {
  title: "Vinos para comida nikkei",
  description:
    "Vinos blancos, rosados y espumantes para acompañar sushi, tiraditos y cocina nikkei en Lima.",
};

export default function NikkeiOccasionPage() {
  return (
    <OccasionLanding
      slug="nikkei"
      eyebrow="Mesa nikkei"
      title="Frescura y precisión para cítricos, salinidad y umami"
      intro="La cocina nikkei cambia de intensidad en cada plato. Blancos aromáticos, rosados secos y burbujas permiten acompañar esa variedad sin dominarla."
      selectionTitle="Una selección versátil"
      selectionIntro="Son perfiles diferentes, pensados para moverse desde entradas frescas hasta bocados con más textura o salsas intensas."
      productIds={["livvera-malvasia", "livvera-sangiovese-rose", "ambrosia-brut-nature"]}
      tips={[
        { title: "Prioriza frescura", description: "La acidez ayuda frente a frituras, mayonesa, palta y otros componentes de textura cremosa." },
        { title: "Modera tanino y madera", description: "Con pescado crudo y salsa de soya suelen integrarse mejor blancos, rosados o tintos muy ligeros." },
        { title: "Usa las burbujas", description: "Un espumante seco es una opción flexible cuando la mesa reúne varios platos para compartir." },
      ]}
      whatsappMessage="Hola WBStraders, necesito vinos para una comida nikkei."
    />
  );
}
