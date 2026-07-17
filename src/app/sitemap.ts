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
