import type { LucideIcon } from "lucide-react";
import { AlertCircle, DatabaseZap, Inbox } from "lucide-react";

type EmptyKind = "empty" | "demo" | "error";

export function AdminEmptyState({
  title,
  description,
  kind,
  icon,
}: {
  title: string;
  description: string;
  kind: EmptyKind;
  icon?: LucideIcon;
}) {
  const Icon = icon || (kind === "demo" ? DatabaseZap : kind === "error" ? AlertCircle : Inbox);

  return (
    <section
      className="rounded-2xl border border-dashed border-cream-300 bg-cream-50 px-5 py-12 text-center sm:px-8"
      aria-labelledby="empty-state-title"
    >
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-olive-100 text-olive-800">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2
        id="empty-state-title"
        className="mt-5 font-display text-2xl font-semibold text-ink-900"
      >
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-700">
        {description}
      </p>
    </section>
  );
}
