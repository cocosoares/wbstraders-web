import { AlertTriangle } from "lucide-react";

export function StockLevel({
  value,
  emphasize = false,
}: {
  value: number;
  emphasize?: boolean;
}) {
  const low = emphasize && value <= 5;

  return (
    <span className="inline-flex items-center justify-end gap-1.5 font-semibold tabular-nums text-ink-900">
      {low && <AlertTriangle className="h-4 w-4 text-wine-600" aria-hidden="true" />}
      <span>{value}</span>
      {low && <span className="sr-only">, stock bajo</span>}
    </span>
  );
}
