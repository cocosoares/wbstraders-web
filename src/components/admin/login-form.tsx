"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { ArrowRight, LoaderCircle, LogIn } from "lucide-react";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("Correo o contraseña incorrectos. Revisa los datos e inténtalo nuevamente.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("No fue posible iniciar sesión. Comprueba la conexión e inténtalo nuevamente.");
    } finally {
      setPending(false);
    }
  }

  if (!configured) {
    return (
      <div className="mt-6">
        <div className="rounded-xl border border-gold-500/40 bg-gold-500/10 p-4">
          <p className="font-semibold text-ink-900">Supabase aún no está configurado</p>
          <p className="mt-1 text-sm leading-6 text-ink-700">
            Agrega las variables públicas de Supabase para habilitar el acceso. El
            modo de configuración no contiene pedidos ni ventas de ejemplo.
          </p>
        </div>
        <Link
          href="/admin"
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-olive-700 px-5 py-3 text-sm font-bold text-cream-50 transition-colors duration-200 hover:bg-olive-800"
        >
          Abrir modo de configuración
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="admin-email" className="text-sm font-semibold text-ink-900">
          Correo administrativo
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          aria-describedby="admin-email-help"
          className="mt-2 min-h-11 w-full rounded-xl border border-cream-300 bg-white px-4 text-base text-ink-900 placeholder:text-ink-300 disabled:cursor-not-allowed disabled:opacity-60"
          placeholder="nombre@empresa.com"
        />
        <p id="admin-email-help" className="mt-1.5 text-xs leading-5 text-ink-500">
          Usa una cuenta autorizada en la configuración administrativa.
        </p>
      </div>

      <div>
        <label
          htmlFor="admin-password"
          className="text-sm font-semibold text-ink-900"
        >
          Contraseña
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          className="mt-2 min-h-11 w-full rounded-xl border border-cream-300 bg-white px-4 text-base text-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-wine-50 p-3 text-sm leading-6 text-wine-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-wine-600 px-5 py-3 text-sm font-bold text-cream-50 transition-colors duration-200 hover:bg-wine-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            Iniciando sesión…
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Iniciar sesión
          </>
        )}
      </button>
      <Link
        href="/admin/restablecer-clave"
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-olive-800 transition-colors hover:bg-olive-50 hover:text-olive-950"
      >
        ¿Olvidaste tu contraseña?
      </Link>
    </form>
  );
}
