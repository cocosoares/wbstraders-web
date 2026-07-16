import { cn } from "@/lib/utils";

/**
 * Recreación en SVG del logo line-art de WBStraders:
 * botella con etiqueta verde, copa de vino y ramas laterales.
 */
export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={cn("h-9 w-9", className)}
    >
      {/* Rama izquierda con bayas */}
      <path
        d="M12 46c-3-6-4-14-1-22"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="9" cy="24" r="1.7" fill="currentColor" />
      <circle cx="12.5" cy="20" r="1.7" fill="currentColor" />
      <circle cx="8" cy="30" r="1.7" fill="currentColor" />
      <circle cx="13" cy="27" r="1.7" fill="currentColor" />
      {/* Botella */}
      <path
        d="M28 8h6v3.5c0 3 1 4.5 2 6 1.2 1.8 2 3.4 2 6.5V50a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V24c0-3.1.8-4.7 2-6.5 1-1.5 2-3 2-6V8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <rect x="27.5" y="7" width="7" height="2.6" rx="0.8" fill="currentColor" />
      <rect
        x="26.8"
        y="30"
        width="8.4"
        height="11"
        rx="0.8"
        fill="var(--color-olive-500)"
      />
      {/* Copa */}
      <path
        d="M44 22h12c0 7-2.4 11.5-6 12.5V44"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M46 47h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M45.2 27c.7 4 2.4 6.4 4.8 6.9 2.4-.5 4.1-2.9 4.8-6.9h-9.6Z"
        fill="var(--color-wine-600)"
      />
      {/* Rama derecha */}
      <path
        d="M58 44c4-7 4.5-16 1-24"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M59.5 26c2-.6 3.4-2 4-4.4-2.4 0-4 1.4-4 4.4Zm-.6 7c-2-.6-3.4-2-4-4.4 2.4 0 4 1.4 4 4.4Zm1 6c2-.6 3.4-2 4-4.4-2.4 0-4 1.4-4 4.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-sans text-xl font-bold tracking-tight text-wine-600",
        className,
      )}
    >
      WBS<span className="text-ink-900">traders</span>
    </span>
  );
}
