import type { Metadata } from "next";
import { OccasionLanding } from "@/components/occasion-landing";

export const metadata: Metadata = {
  title: "Vinos argentinos para regalar",
  description:
    "Elige vinos argentinos de autor para regalos personales o corporativos y coordina disponibilidad y entrega en Lima.",
};

export default function GiftsPage() {
  return (
    <OccasionLanding
      slug="regalo"
      eyebrow="Regalos personales y corporativos"
      title="Regala una botella elegida con intención"
      intro="Encuentra una etiqueta para agradecer, felicitar o compartir. Si necesitas varias entregas, dedicatoria o presentación especial, confirma primero la disponibilidad con nuestro equipo."
      selectionTitle="Tres perfiles para regalar"
      selectionIntro="Desde una botella versátil hasta vinos de colección. El empaque y la dedicatoria no están incluidos salvo confirmación expresa."
      productIds={["ambrosia-brut-nature", "geografia-blancas", "geografia-tintas"]}
      tips={[
        { title: "Parte de la persona", description: "Si conoces sus gustos, elige por estilo. Si no, una botella gastronómica y versátil suele ser más segura." },
        { title: "Confirma la presentación", description: "Consulta empaque, dedicatoria y fecha antes de pagar; son servicios sujetos a disponibilidad." },
        { title: "Planifica la entrega", description: "Para regalos corporativos o múltiples destinos, comparte cantidades y fechas para preparar una cotización." },
      ]}
      whatsappMessage="Hola WBStraders, quiero coordinar un regalo de vino."
    />
  );
}
