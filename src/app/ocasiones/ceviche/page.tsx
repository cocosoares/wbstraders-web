import type { Metadata } from "next";
import { OccasionLanding } from "@/components/occasion-landing";

export const metadata: Metadata = {
  title: "Vinos para ceviche y cocina marina",
  description:
    "Blancos argentinos frescos para acompañar ceviche, tiradito y cocina marina peruana. Compra por botella o arma tu caja.",
};

export default function CevicheOccasionPage() {
  return (
    <OccasionLanding
      slug="ceviche"
      eyebrow="Ceviche y cocina marina"
      title="Frescura para acompañar el limón, el ají y el mar"
      intro="Una buena pareja para el ceviche suma acidez y aroma sin tapar el pescado. Aquí reunimos blancos secos del catálogo con perfiles cítricos, florales o salinos."
      selectionTitle="Blancos para una mesa marina"
      selectionIntro="Tres perfiles distintos para elegir según el plato: cítrico y directo, aromático de altura o más textural para una cena especial."
      productIds={["casa-sauvignon-blanc", "1700-torrontes", "livvera-malvasia"]}
      catalogHref="/catalogo?tipo=Blanco"
      tips={[
        { title: "Busca acidez", description: "Ayuda a que el vino se mantenga vivo junto al limón y refresque entre bocados." },
        { title: "Cuida el alcohol", description: "Con ají intenso suelen funcionar mejor perfiles frescos y equilibrados que vinos pesados." },
        { title: "Sirve fresco", description: "Enfría el blanco, pero evita servirlo helado para no esconder sus aromas y textura." },
      ]}
      whatsappMessage="Hola WBStraders, necesito una recomendación de vino para ceviche o cocina marina."
    />
  );
}
