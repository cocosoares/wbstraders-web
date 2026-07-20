import type { Metadata } from "next";
import { OccasionLanding } from "@/components/occasion-landing";

export const metadata: Metadata = {
  title: "Vinos para celebraciones",
  description:
    "Espumantes y vinos argentinos para brindar, compartir y acompañar celebraciones con delivery en Lima.",
};

export default function CelebrationOccasionPage() {
  return (
    <OccasionLanding
      slug="celebracion"
      eyebrow="Celebraciones"
      title="El brindis importa; lo que sirves después también"
      intro="Combina burbujas para abrir la ocasión con vinos que puedan quedarse en la mesa. Puedes comprar por estilo o armar una caja para distintos momentos."
      selectionTitle="Para brindar y compartir"
      selectionIntro="Una opción seca para el brindis, un blanco de conversación y un tinto con presencia para la comida."
      productIds={["ambrosia-brut-nature", "geografia-blancas", "geografia-tintas"]}
      tips={[
        { title: "Calcula por servicio", description: "Una botella de 750 ml rinde aproximadamente seis copas moderadas; ajusta por duración y otras bebidas." },
        { title: "Enfría con tiempo", description: "Reserva espacio de refrigeración y evita depender solo de hielo justo antes del brindis." },
        { title: "Incluye alternativas", description: "Agua y bebidas sin alcohol deben estar siempre disponibles para acompañar un consumo responsable." },
      ]}
      whatsappMessage="Hola WBStraders, estoy organizando una celebración y necesito ayuda con los vinos."
    />
  );
}
