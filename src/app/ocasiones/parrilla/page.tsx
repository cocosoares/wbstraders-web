import type { Metadata } from "next";
import { OccasionLanding } from "@/components/occasion-landing";

export const metadata: Metadata = {
  title: "Vinos para parrilla",
  description:
    "Malbec y Cabernet argentinos para parrilla, carnes y vegetales a la brasa, disponibles con delivery en Lima.",
};

export default function GrillOccasionPage() {
  return (
    <OccasionLanding
      slug="parrilla"
      eyebrow="Parrilla"
      title="Tintos con fruta y estructura para el fuego"
      intro="La intensidad del vino puede acompañar la del corte, el término y las salsas. Estas opciones recorren desde un Malbec amable hasta tintos con más profundidad."
      selectionTitle="Tres caminos para la parrilla"
      selectionIntro="Elige por estilo y por lo que habrá en la mesa; no necesitas reservar el vino más intenso para todos los platos."
      productIds={["rn40-malbec", "1700-malbec", "livvera-cabernet"]}
      catalogHref="/catalogo?tipo=Tinto"
      tips={[
        { title: "Piensa en el corte", description: "Carnes con más grasa toleran mayor estructura; cortes magros agradecen tintos más frescos." },
        { title: "Mira las salsas", description: "Chimichurri, dulzor o picante pueden importar tanto como la carne al elegir el vino." },
        { title: "Evita servirlo caliente", description: "Una temperatura ligeramente fresca ayuda a conservar fruta, equilibrio y facilidad de tomar." },
      ]}
      whatsappMessage="Hola WBStraders, quiero elegir vinos para una parrilla."
    />
  );
}
