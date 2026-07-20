import path from "node:path";
import type { NextConfig } from "next";

function getSupabaseConnectSource() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!configuredUrl) return null;

  try {
    return new URL(configuredUrl).origin;
  } catch {
    return null;
  }
}

const connectSources = [
  "'self'",
  "https://www.google-analytics.com",
  "https://*.google-analytics.com",
  "https://www.googletagmanager.com",
  "https://*.googletagmanager.com",
  getSupabaseConnectSource(),
]
  .filter(Boolean)
  .join(" ");

const productionCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://*.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com",
  "font-src 'self' data:",
  `connect-src ${connectSources}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const developmentCsp = productionCsp
  .replace("script-src 'self'", "script-src 'self' 'unsafe-eval'")
  .replace("connect-src 'self'", "connect-src 'self' ws: wss:");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Evita que Next infiera la raíz del workspace por lockfiles ajenos al proyecto
  outputFileTracingRoot: path.join(process.cwd()),
  // Limita workers de build: hosting compartido reporta 64 CPUs del host físico
  // pero el límite real de procesos concurrentes de la cuenta (LVE) es mucho menor,
  // lo que hace fallar spawn() con EAGAIN. workerThreads evita crear procesos nuevos.
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value:
              process.env.NODE_ENV === "production"
                ? productionCsp
                : developmentCsp,
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
