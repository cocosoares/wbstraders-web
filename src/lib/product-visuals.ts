import type { Product, ProductVisualTone, WineType } from "@/types";

export interface ProductVisualPalette {
  highlight: string;
  middle: string;
  depth: string;
  glow: string;
  shadow: string;
}

const PALETTES: Record<ProductVisualTone, ProductVisualPalette> = {
  garnet: {
    highlight: "#f6dcdf",
    middle: "#c98790",
    depth: "#6f3142",
    glow: "#fff5ed",
    shadow: "#3e1723",
  },
  terracotta: {
    highlight: "#f5dfcf",
    middle: "#c8896d",
    depth: "#704133",
    glow: "#fff4df",
    shadow: "#47261f",
  },
  plum: {
    highlight: "#ecdde9",
    middle: "#aa7a9f",
    depth: "#5e365a",
    glow: "#fff3fb",
    shadow: "#37213a",
  },
  celadon: {
    highlight: "#edf1d9",
    middle: "#aebd86",
    depth: "#536647",
    glow: "#ffffea",
    shadow: "#34432f",
  },
  blush: {
    highlight: "#fae4df",
    middle: "#dda39d",
    depth: "#925b68",
    glow: "#fff7ef",
    shadow: "#583644",
  },
  champagne: {
    highlight: "#f8edcf",
    middle: "#d5b972",
    depth: "#75623c",
    glow: "#fffbea",
    shadow: "#4a3e28",
  },
  teal: {
    highlight: "#d8eee8",
    middle: "#76a99e",
    depth: "#315d5c",
    glow: "#f4fffb",
    shadow: "#1d3d3d",
  },
  slate: {
    highlight: "#e1e9e9",
    middle: "#91a6aa",
    depth: "#4b626b",
    glow: "#f8ffff",
    shadow: "#2d3c43",
  },
  ochre: {
    highlight: "#f3e9cc",
    middle: "#c6a866",
    depth: "#76613a",
    glow: "#fff9e8",
    shadow: "#493b25",
  },
  lavender: {
    highlight: "#ece7f2",
    middle: "#a895bd",
    depth: "#5c4b74",
    glow: "#fcf8ff",
    shadow: "#382f49",
  },
  mineral: {
    highlight: "#e4ece7",
    middle: "#9ab1a2",
    depth: "#526b61",
    glow: "#f8fff9",
    shadow: "#30453d",
  },
  copper: {
    highlight: "#f3dec9",
    middle: "#bd8561",
    depth: "#70492f",
    glow: "#fff4e4",
    shadow: "#452b1e",
  },
  indigo: {
    highlight: "#e4e6f1",
    middle: "#9297b2",
    depth: "#505873",
    glow: "#fafaff",
    shadow: "#30364c",
  },
  sky: {
    highlight: "#e4eff4",
    middle: "#8fb3c0",
    depth: "#476e7b",
    glow: "#f7fdff",
    shadow: "#294550",
  },
};

const FALLBACK_TONES: Record<WineType, ProductVisualTone> = {
  Tinto: "garnet",
  Blanco: "teal",
  Rosado: "blush",
  Espumante: "champagne",
};

export function getProductVisualPalette(
  product: Pick<Product, "type" | "visualTone">,
): ProductVisualPalette {
  return PALETTES[product.visualTone ?? FALLBACK_TONES[product.type]];
}
