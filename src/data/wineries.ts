import type { Brand } from "@/types";

export interface WineryInfo {
  slug: string;
  name: Brand;
  origin: string;
  altitude: string;
  founded: string;
  winemaker?: string;
  tagline: string;
  story: string[];
  highlights: { label: string; value: string }[];
}

/**
 * Contenido investigado de fuentes públicas de cada bodega (sitios oficiales:
 * escalahumanawines.com, fincaambrosia.com, vinasenflor.com). WBStraders es
 * importador autorizado de estas etiquetas en Perú.
 */
export const WINERIES: WineryInfo[] = [
  {
    slug: "escala-humana",
    name: "Escala Humana",
    origin: "Gualtallary, Tupungato · Valle de Uco, Mendoza",
    altitude: "1,400 msnm",
    founded: "Proyecto Livverá desde 2015",
    winemaker: "Germán Masera",
    tagline: "Vinos de mínima intervención con identidad de suelo",
    story: [
      "Escala Humana nace de la mano del enólogo Germán Masera como un proyecto de libre expresión dentro del universo del vino. Su línea Livverá cobra vida en 2015 en Gualtallary, uno de los terruños más codiciados del Valle de Uco por sus suelos calcáreos de altura.",
      "Los Livverá Malbec y Cabernet Sauvignon provienen de tres viñedos de 15 años en Gualtallary y descansan 12 meses en barricas de roble francés de quinto uso — apenas un susurro de madera que deja hablar a la fruta y al suelo.",
      "La línea Geografía Extraordinaria es su expresión más alta: blends de parcelas excepcionales entre los ríos Tunuyán y Las Tunas, reconocidos con puntajes de 93 a 95 puntos por Vinous, Tim Atkin MW y Robert Parker (Wine Advocate).",
    ],
    highlights: [
      { label: "Enólogo", value: "Germán Masera" },
      { label: "Filosofía", value: "Mínima intervención" },
      { label: "Viñedos", value: "3 parcelas de 15 años en Gualtallary" },
      { label: "Crianza Livverá", value: "12 meses en roble francés de 5º uso" },
    ],
  },
  {
    slug: "finca-ambrosia",
    name: "Finca Ambrosía",
    origin: "Gualtallary · Valle de Uco, Mendoza",
    altitude: "1,250 msnm",
    founded: "Finca orgánica en Gualtallary",
    tagline: "Terroir de altura, agua pura de los Andes",
    story: [
      "Finca Ambrosía cultiva su viñedo orgánico en Gualtallary a 1,250 metros sobre el nivel del mar, sobre suelos calcáreos y pedregosos formados por depósitos cuaternarios y arena de erosión eólica — un terroir que la propia bodega describe como \"un lugar especial para hacer vinos especiales\".",
      "Su línea Casa se elabora sin madera, fermentada y criada en piletas de concreto para preservar la fruta pura de Malbec y Sauvignon Blanc: el vino de todos los días, sin perder origen ni calidad.",
      "El Brut Nature Blanc de Blancs corona el portafolio: un espumante de método tradicional, sin azúcar añadida, pensado para brindar con la misma elegancia que un restaurante de autor.",
    ],
    highlights: [
      { label: "Altitud", value: "1,250 msnm" },
      { label: "Suelo", value: "Calcáreo y pedregoso, depósitos cuaternarios" },
      { label: "Viñedo", value: "Orgánico" },
      { label: "Línea Casa", value: "Sin madera, criada en concreto" },
    ],
  },
  {
    slug: "vinas-en-flor",
    name: "Viñas en Flor",
    origin: "Valle de Cafayate · Salta",
    altitude: "1,700 msnm",
    founded: "Bodega familiar desde 2009",
    tagline: "Viñedos extremos del norte argentino",
    story: [
      "En 2006, la familia detrás de Viñas en Flor adquirió 80 hectáreas en el Valle de Cafayate, Salta, a 1,700 metros de altura sobre suelos franco-arenosos de origen aluvial con composición calcárea-micácea — condiciones extremas que concentran aromas y frescura en cada racimo.",
      "Plantaron principalmente Malbec, Cabernet Sauvignon y Tannat, junto a Torrontés y pequeñas parcelas de Cabernet Franc, Bonarda, Syrah, Petit Verdot y Pinot Noir. La línea 1700 msnm lleva la altura del viñedo en su propio nombre.",
      "RN40 es su etiqueta ícono: un homenaje a la mítica Ruta Nacional 40 que atraviesa Cafayate, con un Malbec profundo y especiado nacido de la misma tierra extrema.",
    ],
    highlights: [
      { label: "Altitud", value: "1,700 msnm" },
      { label: "Extensión", value: "80 hectáreas en Cafayate" },
      { label: "Suelo", value: "Franco-arenoso, calcáreo-micáceo" },
      { label: "Cepas", value: "Malbec, Cabernet Sauvignon, Tannat, Torrontés" },
    ],
  },
];

export const WINERIES_BY_SLUG = new Map(WINERIES.map((w) => [w.slug, w]));
