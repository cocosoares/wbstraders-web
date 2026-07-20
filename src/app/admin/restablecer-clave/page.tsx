import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LogoIcon, LogoWordmark } from "@/components/logo";
import { PasswordRecoveryForm } from "@/components/admin/password-recovery-form";

export default function AdminPasswordRecoveryPage() {
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
            className="inline-flex min-h-11 items-center gap-2 rounded-lg text-ink-700 transition-colors hover:text-wine-600"
          >
            <LogoIcon className="text-ink-900" />
            <LogoWordmark />
          </Link>
          <Link
            href="/admin/login"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink-700 transition-colors hover:bg-cream-200 hover:text-wine-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al acceso
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center py-12">
          <section
            className="w-full max-w-md rounded-2xl border border-cream-300 bg-cream-50 p-6 shadow-sm sm:p-8"
            aria-labelledby="recovery-title"
          >
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-olive-700">
              Acceso administrativo
            </p>
            <h1 id="recovery-title" className="mt-2 font-display text-3xl font-semibold text-ink-900">
              Restablecer contraseña
            </h1>
            <p className="mt-3 text-base leading-7 text-ink-700">
              Solicita un enlace seguro o elige una contraseña nueva al abrirlo.
            </p>
            <PasswordRecoveryForm configured={configured} />
          </section>
        </main>
      </div>
    </div>
  );
}
