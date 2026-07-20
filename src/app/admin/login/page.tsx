import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/admin/login-form";
import { LogoIcon, LogoWordmark } from "@/components/logo";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; reset?: string }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const { error, reset } = await searchParams;
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  return (
    <div className="min-h-dvh bg-cream-100">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Volver a la tienda"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg text-ink-700 transition-colors duration-200 hover:text-wine-600"
          >
            <LogoIcon className="text-ink-900" />
            <LogoWordmark />
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink-700 transition-colors duration-200 hover:bg-cream-200 hover:text-wine-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a la tienda
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center py-12">
          <section
            className="w-full max-w-md rounded-2xl border border-cream-300 bg-cream-50 p-6 shadow-sm sm:p-8"
            aria-labelledby="login-title"
          >
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-olive-700">
              Consola operativa
            </p>
            <h1
              id="login-title"
              className="mt-2 font-display text-3xl font-semibold text-ink-900"
            >
              Administración WBStraders
            </h1>
            <p className="mt-3 text-base leading-7 text-ink-700">
              Gestiona pedidos, clientes, inventario y oportunidades comerciales.
            </p>

            {error === "unauthorized" && (
              <div
                role="alert"
                className="mt-6 rounded-xl border border-wine-400 bg-wine-50 p-4 text-sm leading-6 text-wine-800"
              >
                Tu cuenta inició sesión, pero no tiene acceso administrativo.
                Solicita que agreguen tu correo a <code>ADMIN_EMAILS</code> o el
                rol <code>admin</code> en Supabase.
              </div>
            )}
            {reset === "success" && (
              <div
                role="status"
                className="mt-6 rounded-xl border border-olive-400 bg-olive-50 p-4 text-sm leading-6 text-olive-900"
              >
                Contraseña actualizada. Ya puedes iniciar sesión.
              </div>
            )}

            <LoginForm configured={configured} />
          </section>
        </main>
      </div>
    </div>
  );
}
