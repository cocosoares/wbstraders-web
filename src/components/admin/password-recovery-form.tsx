"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { ArrowLeft, CheckCircle2, LoaderCircle } from "lucide-react";

type RecoveryState = "checking" | "request" | "reset" | "sent" | "error";

function browserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export function PasswordRecoveryForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const confirmId = useId();
  const [state, setState] = useState<RecoveryState>("checking");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const configuredClient = useMemo(() => configured, [configured]);

  useEffect(() => {
    if (!configuredClient) {
      setState("error");
      setMessage("Supabase aún no está configurado en esta aplicación.");
      return;
    }

    const supabase = browserSupabase();
    let active = true;
    let recoveryDetected = window.location.hash.includes("type=recovery");
    const code = new URLSearchParams(window.location.search).get("code");

    async function resolveRecoverySession() {
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          recoveryDetected = true;
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (active) setState(recoveryDetected && session ? "reset" : "request");
      } catch {
        if (active) {
          setState("error");
          setMessage("El enlace ya venció o no es válido. Solicita uno nuevo.");
        }
      }
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session && active) {
        recoveryDetected = true;
        setState("reset");
      }
    });
    void resolveRecoverySession();

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [configuredClient]);

  async function requestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") || "").trim();
    if (!email) return;

    setPending(true);
    setMessage("");
    try {
      const { error } = await browserSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/restablecer-clave`,
      });
      if (error) throw error;
      setState("sent");
    } catch {
      setState("error");
      setMessage("No pudimos enviar el enlace. Revisa el correo e inténtalo otra vez.");
    } finally {
      setPending(false);
    }
  }

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    if (password.length < 10) {
      setMessage("Usa una contraseña de al menos 10 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    setPending(true);
    setMessage("");
    try {
      const { error } = await browserSupabase().auth.updateUser({ password });
      if (error) throw error;
      router.replace("/admin/login?reset=success");
      router.refresh();
    } catch {
      setMessage("No pudimos actualizar la contraseña. Solicita un enlace nuevo.");
    } finally {
      setPending(false);
    }
  }

  if (state === "checking") {
    return (
      <p className="mt-6 inline-flex items-center gap-2 text-sm text-ink-700">
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        Verificando el enlace…
      </p>
    );
  }

  if (state === "sent") {
    return (
      <div className="mt-6 rounded-xl border border-olive-400 bg-olive-50 p-4 text-sm leading-6 text-olive-900">
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Revisa tu correo.
        </p>
        <p className="mt-1">Abre el enlace más reciente para elegir una nueva contraseña.</p>
      </div>
    );
  }

  if (state === "reset") {
    return (
      <form className="mt-6 space-y-5" onSubmit={updatePassword} noValidate>
        <PasswordFields
          passwordId={passwordId}
          confirmId={confirmId}
          pending={pending}
        />
        <SubmitButton pending={pending} label="Guardar nueva contraseña" />
        <FormMessage message={message} />
      </form>
    );
  }

  return (
    <form className="mt-6 space-y-5" onSubmit={requestReset} noValidate>
      <div>
        <label htmlFor={emailId} className="text-sm font-semibold text-ink-900">
          Correo administrativo
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending || !configured}
          placeholder="nombre@empresa.com"
          className="mt-2 min-h-11 w-full rounded-xl border border-cream-300 bg-white px-4 text-base text-ink-900 placeholder:text-ink-300 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
      <SubmitButton pending={pending} label="Enviar enlace de recuperación" />
      <FormMessage message={message} />
      <BackToLogin />
    </form>
  );
}

function PasswordFields({
  passwordId,
  confirmId,
  pending,
}: {
  passwordId: string;
  confirmId: string;
  pending: boolean;
}) {
  return (
    <>
      <div>
        <label htmlFor={passwordId} className="text-sm font-semibold text-ink-900">
          Nueva contraseña
        </label>
        <input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          disabled={pending}
          className="mt-2 min-h-11 w-full rounded-xl border border-cream-300 bg-white px-4 text-base text-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
      <div>
        <label htmlFor={confirmId} className="text-sm font-semibold text-ink-900">
          Repite la contraseña
        </label>
        <input
          id={confirmId}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          disabled={pending}
          className="mt-2 min-h-11 w-full rounded-xl border border-cream-300 bg-white px-4 text-base text-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
    </>
  );
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-wine-600 px-5 py-3 text-sm font-bold text-cream-50 transition-colors hover:bg-wine-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {pending ? "Procesando…" : label}
    </button>
  );
}

function FormMessage({ message }: { message: string }) {
  return message ? <p role="alert" className="text-sm leading-6 text-wine-700">{message}</p> : null;
}

function BackToLogin() {
  return (
    <Link
      href="/admin/login"
      className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-olive-800 hover:text-olive-950"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Volver a iniciar sesión
    </Link>
  );
}
