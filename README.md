# WBStraders — Tienda online de vinos de autor

E-commerce D2C para **WBStraders** (importadora boutique de vinos argentinos en Lima, Perú), construido con Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Zustand y Framer Motion.

## Características

- **Catálogo con escalas de precio reales** del catálogo oficial (x1, x2, x3, x4, x6, x12) con el motor de precios en `src/lib/pricing.ts`.
- **Mix & Match ("Arma tu caja")**: los productos "y/o" de una misma línea comparten grupo de precios — las cantidades se suman entre cepas para alcanzar el descuento (ej. 2 Bonarda + 2 Malvasía + 2 Rosé = precio x6).
- **Carrito con upsell/cross-sell**: nudge de siguiente escala ("agrega 2 más y baja a S/ X c/u"), barra de envío gratis y sugerencias complementarias.
- **Sommelier IA** (`/api/sommelier`): usa la API de Anthropic (Claude) si hay `ANTHROPIC_API_KEY`; sin clave, funciona con un recomendador local por reglas (maridajes peruanos: ceviche → Torrontés, parrilla → RN40, etc.).
- **Checkout peruano**: zonas de delivery por distrito (Zona 1 / Zona 2), Yape, Plin, transferencia BCP y confirmación del pedido por WhatsApp (sin backend de pagos, operativo desde el día 1).
- **SEO**: metadata por página, JSON-LD (OnlineStore, Product/AggregateOffer, FAQPage), sitemap.xml, robots.txt.
- **Legal Perú**: age gate 18+, advertencia Ley N.º 28681 y Libro de Reclamaciones virtual.

## Comandos

```bash
npm run dev     # desarrollo (http://localhost:3000)
npm run build   # build de producción
npm start       # servir producción
npm test        # tests del motor de precios (vitest)
```

## Variables de entorno

Copia `.env.example` a `.env.local`:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL pública (SEO/sitemap). Ej: `https://www.wbstraders.com` |
| `ANTHROPIC_API_KEY` | Clave de [console.anthropic.com](https://console.anthropic.com) para el Sommelier IA. Opcional: sin ella funciona el modo reglas. |
| `SOMMELIER_MODEL` | Modelo Claude (default `claude-sonnet-5`). |

## Estructura

```
src/
├── app/                  # Páginas (App Router)
│   ├── page.tsx          # Home: hero, bodegas, destacados, delivery, B2B, FAQ
│   ├── catalogo/         # Tienda con filtros (tipo, bodega)
│   ├── producto/[slug]/  # Ficha con selector de escalas + JSON-LD Product
│   ├── arma-tu-caja/     # Mix & Match interactivo
│   ├── checkout/         # One-page checkout → WhatsApp
│   ├── libro-de-reclamaciones/
│   └── api/sommelier/    # API del Sommelier IA (Claude + fallback local)
├── components/           # Navbar, footer, cart drawer, age gate, widget IA…
├── data/                 # products.ts (catálogo), delivery-zones.ts, site.ts
├── hooks/use-cart.ts     # Carrito (Zustand + persistencia localStorage)
└── lib/pricing.ts        # Motor de escalas de precio (testeado)
```

## Cómo actualizar el catálogo

Todo el catálogo vive en `src/data/products.ts`. Cada producto tiene `tiers` con el precio EXACTO del pack en soles (`t(cantidad, precioPack, "etiqueta")`). Los productos "y/o" comparten `pricingGroup` para el mix & match.

**Fotos reales**: ya están cargadas — extraídas del catálogo PDF oficial, optimizadas a WebP (~20-40 KB c/u) en `public/products/`. Para reemplazar alguna, coloca el archivo y actualiza `image: "/products/<archivo>.webp"` en el producto. Sin foto, se muestra una ilustración SVG generada por `BottleArt`.

> **Nota**: se corrigió la marca de "Geografía Extraordinaria" a **Escala Humana** (la etiqueta real del catálogo dice "Escala Humana Wines", no Finca Ambrosía) y se citaron los críticos reales visibles en el catálogo: Vinous, Tim Atkin MW y Robert Parker/Wine Advocate (93–95 pts).

## Despliegue

### Opción A — Vercel (recomendada para Next.js)

1. Sube el repo a GitHub y conéctalo en [vercel.com](https://vercel.com) (plan gratuito sirve para empezar).
2. Configura las variables de entorno en el dashboard.
3. En Hostinger (donde está tu dominio), apunta el DNS: registro `A` de `@` a `76.76.21.21` y `CNAME` de `www` a `cname.vercel-dns.com`. Esto se puede automatizar con el MCP `hostinger-dns` ya configurado en `.mcp.json`.

### Opción B — VPS de Hostinger

El plan de hosting compartido de Hostinger no ejecuta Node.js/SSR; necesitas un **VPS** (se puede crear/administrar con el MCP `hostinger-hosting`):

```bash
# En el VPS (Ubuntu):
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
git clone <tu-repo> && cd wbstraders-web
npm ci && npm run build
npm i -g pm2
pm2 start npm --name wbstraders -- start
pm2 save && pm2 startup
# Reverse proxy con Nginx/Caddy + SSL (certbot)
```

### MCP de Hostinger

`.mcp.json` (ignorado por git, contiene tu token) registra 6 servidores MCP: hosting, domains, dns, billing, reach y ecommerce. **Reinicia Claude Code** en esta carpeta y verifica con `/mcp`. Con ellos puedes gestionar DNS del dominio, VPS y catálogos directamente desde el chat.

## Roadmap sugerido

1. **Pagos automáticos**: integrar Culqi o Izipay (tokenización de tarjetas + Yape con QR dinámico) en el checkout.
2. **Pedidos en base de datos**: Supabase (PostgreSQL) para órdenes, stock y clientes; el diseño del carrito ya separa producto/escala para migrarlo directo.
3. **Fotos profesionales** de botellas (reemplazan las ilustraciones SVG automáticamente).
4. **Google Business Profile + Search Console**: alta del negocio, enviar sitemap.
5. **Meta Ads / Google Shopping**: el JSON-LD de producto ya está listo para el feed de Merchant Center.
6. **Club de suscripción** (ingresos recurrentes) y blog de maridajes para SEO.
7. **Videos promocionales con Remotion**: Remotion genera videos programáticos (unboxing, promos para Instagram/Meta Ads) — es la herramienta correcta para video, no para animar la web (eso ya lo hace Framer Motion sin penalizar el rendimiento).

## Marketing y SEO aplicados en el código

- Keywords locales en metadata: "delivery de vinos Lima", "comprar vino online Perú", nombres de bodegas.
- FAQPage JSON-LD en el home (rich results de Google).
- Product + AggregateOffer JSON-LD por producto (precio "desde", stock).
- Validación B2B como prueba social ("la cava de tus restaurantes favoritos").
- Técnicas de conversión: envío gratis por umbral, ancla de precio regular tachado, badge "ahorra S/ X", escasez amable en delivery ("pedidos antes de las 4 p. m. salen hoy").
