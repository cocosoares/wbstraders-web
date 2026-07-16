import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AgeGate } from "@/components/age-gate";
import { CartDrawer } from "@/components/cart-drawer";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Providers } from "@/components/providers";
import { SommelierWidget } from "@/components/sommelier-widget";
import { SITE } from "@/data/site";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    "comprar vino online Perú",
    "delivery de vinos Lima",
    "vinos argentinos Lima",
    "vinos de autor",
    "Escala Humana",
    "Finca Ambrosía",
    "Viñas en Flor",
    "Malbec delivery Lima",
    "Torrontés Perú",
  ],
  openGraph: {
    type: "website",
    locale: "es_PE",
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf7f1",
};

const ORGANIZATION_JSONLD = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  email: SITE.email,
  telephone: SITE.phones[0],
  areaServed: "Lima, Perú",
  paymentAccepted: "Yape, Plin, Transferencia bancaria, Tarjeta de crédito",
  currenciesAccepted: "PEN",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${playfair.variable} ${inter.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(ORGANIZATION_JSONLD),
          }}
        />
        <Providers>
          <Navbar />
          <main>{children}</main>
          <Footer />
          <CartDrawer />
          <SommelierWidget />
          <AgeGate />
        </Providers>
      </body>
    </html>
  );
}
