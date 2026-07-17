export const COLORS = {
  cream50: "#fcfaf5",
  cream100: "#faf7f1",
  cream200: "#f1ebdf",
  ink900: "#201d17",
  ink700: "#3a362e",
  ink500: "#6b6459",
  olive100: "#e3ebdc",
  olive500: "#4f6b42",
  olive700: "#344729",
  olive800: "#2a3a22",
  olive900: "#1e2a18",
  wine50: "#f9eeef",
  wine600: "#7a1f2e",
  wine700: "#611825",
  gold500: "#b08a3e",
} as const;

export const FPS = 30;

export const DURATIONS = {
  intro: 75,
  headline: 90,
  bottle: 80,
  cta: 100,
  outro: 70,
  transition: 15,
} as const;

export interface BottleInfo {
  image: string;
  name: string;
  brand: string;
  price: string;
  note: string;
}

export const BOTTLES: BottleInfo[] = [
  {
    image: "bottles/livvera-tintas.webp",
    name: "Livverá Malbec",
    brand: "Escala Humana",
    price: "Desde S/ 62",
    note: "Mínima intervención · Gualtallary",
  },
  {
    image: "bottles/rn40-malbec.webp",
    name: "RN40 Malbec",
    brand: "Viñas en Flor",
    price: "Desde S/ 38",
    note: "Ícono de la casa · Cafayate",
  },
  {
    image: "bottles/1700-msnm-torrontes.webp",
    name: "1700 msnm Torrontés",
    brand: "Viñas en Flor",
    price: "Desde S/ 45",
    note: "Ideal con ceviche · 1,700 msnm",
  },
  {
    image: "bottles/finca-ambrosia-brut-nature.webp",
    name: "Brut Nature",
    brand: "Finca Ambrosía",
    price: "Desde S/ 51",
    note: "Método tradicional · Para celebrar",
  },
];
