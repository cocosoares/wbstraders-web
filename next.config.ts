import path from "node:path";
import type { NextConfig } from "next";

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
};

export default nextConfig;
