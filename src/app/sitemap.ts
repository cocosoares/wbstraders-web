import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/data/products";
import { SITE } from "@/data/site";
import { WINERIES } from "@/data/wineries";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE.url, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/catalogo`, changeFrequency: "weekly", priority: 0.9 },
    {
      url: `${SITE.url}/arma-tu-caja`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    { url: `${SITE.url}/bodegas`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE.url}/ocasiones`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/ocasiones/ceviche`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE.url}/ocasiones/parrilla`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE.url}/ocasiones/nikkei`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE.url}/ocasiones/celebracion`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE.url}/regalos`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE.url}/horeca`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE.url}/envios-y-cambios`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE.url}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE.url}/terminos`, changeFrequency: "yearly", priority: 0.2 },
    {
      url: `${SITE.url}/libro-de-reclamaciones`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  const productPages: MetadataRoute.Sitemap = PRODUCTS.map((product) => ({
    url: `${SITE.url}/producto/${product.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const wineryPages: MetadataRoute.Sitemap = WINERIES.map((winery) => ({
    url: `${SITE.url}/bodegas/${winery.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticPages, ...productPages, ...wineryPages];
}
