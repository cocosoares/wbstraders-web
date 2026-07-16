import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <p className="font-display text-7xl font-bold text-wine-600">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold">
        Esta copa está vacía
      </h1>
      <p className="mt-3 text-ink-500">
        La página que buscas no existe o fue movida. Mejor volvamos a la cava.
      </p>
      <Link
        href="/catalogo"
        className="mt-8 rounded-xl bg-olive-600 px-7 py-4 font-bold text-cream-50 transition-colors duration-200 hover:bg-olive-700"
      >
        Ver el catálogo
      </Link>
    </div>
  );
}
