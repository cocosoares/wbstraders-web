import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Evita que Next infiera la raíz del workspace por lockfiles ajenos al proyecto
  outputFileTracingRoot: path.join(process.cwd()),
};

export default nextConfig;
