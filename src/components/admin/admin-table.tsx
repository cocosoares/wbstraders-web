import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AdminTableCell = {
  label: string;
  value: ReactNode;
  align?: "left" | "right";
};

export type AdminTableRow = {
  id: string;
  cells: AdminTableCell[];
};

export function AdminTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: string[];
  rows: AdminTableRow[];
}) {
  return (
    <div className="rounded-2xl border border-cream-300 bg-cream-50 shadow-sm">
      <div className="space-y-3 p-4 md:hidden">
        {rows.map((row) => (
          <article
            key={row.id}
            className="rounded-xl border border-cream-300 bg-cream-100 p-4"
          >
            <dl className="space-y-3">
              {row.cells.map((cell) => (
                <div
                  key={cell.label}
                  className="grid grid-cols-[minmax(6.5rem,0.42fr)_1fr] gap-3 border-b border-cream-300 pb-3 last:border-0 last:pb-0"
                >
                  <dt className="text-xs font-bold uppercase tracking-wide text-ink-500">
                    {cell.label}
                  </dt>
                  <dd
                    className={cn(
                      "min-w-0 text-sm text-ink-700",
                      cell.align === "right" && "text-right",
                    )}
                  >
                    {cell.value}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-cream-300 bg-cream-100">
              {headers.map((header, index) => (
                <th
                  key={header}
                  scope="col"
                  className={cn(
                    "px-5 py-4 text-xs font-bold uppercase tracking-[0.1em] text-ink-500",
                    rows[0]?.cells[index]?.align === "right" && "text-right",
                  )}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-300">
            {rows.map((row) => (
              <tr key={row.id} className="align-top transition-colors hover:bg-cream-100/70">
                {row.cells.map((cell) => (
                  <td
                    key={cell.label}
                    className={cn(
                      "px-5 py-4 leading-6 text-ink-700",
                      cell.align === "right" && "text-right",
                    )}
                  >
                    {cell.value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
