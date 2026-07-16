export const SITE = {
  name: "WBStraders",
  tagline: "Vinos de autor argentinos con delivery en Lima",
  description:
    "Importadores boutique de vinos de autor de Argentina: Escala Humana, Finca Ambrosía y Viñas en Flor. Los vinos de los mejores restaurantes de Lima, ahora con delivery a tu mesa. Paga con Yape, Plin o tarjeta.",
  // Fallback al dominio real de Hostinger hasta conectar un dominio propio (wbstraders.pe)
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://brown-crocodile-993400.hostingersite.com",
  email: "ventas@wbstraders.com",
  /** Número principal de ventas para pedidos por WhatsApp (formato wa.me). */
  whatsapp: "51993518681",
  phones: ["+51 993 518 681", "+51 955 677 717", "+51 995 050 490"],
  yape: "+51 965 204 624",
  bcp: {
    ctaSoles: "194-4712999-0-48",
    cci: "002-194-004712999048-98",
  },
  instagram: "https://www.instagram.com/wbstraders",
  /** Umbral mínimo de envío gratis (Zona 1) en céntimos. */
  freeShippingFromCents: 25000,
  legal: {
    ageWarning: "Venta prohibida a menores de 18 años.",
    alcoholWarning: "TOMAR BEBIDAS ALCOHÓLICAS EN EXCESO ES DAÑINO.",
  },
} as const;
