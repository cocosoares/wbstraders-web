"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Columns3, List, ThermometerSun } from "lucide-react";
import type { AdminOpportunity } from "@/components/admin/admin-data";
import { formatAdminCurrency, formatAdminDate } from "@/components/admin/format";
import { crmStageLabel } from "@/lib/crm/scoring";
import { OpportunityActionForm } from "./opportunity-action-form";

const D2C_STAGES = ["lead", "qualified", "recommendation", "checkout", "won", "lost"];
const HORECA_STAGES = ["lead", "qualified", "tasting", "proposal", "negotiation", "won", "lost"];

export function CrmPipelineBoard({ opportunities }: { opportunities: AdminOpportunity[] }) {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [pipeline, setPipeline] = useState<"d2c" | "horeca">("d2c");
  const visible = useMemo(
    () => opportunities.filter((item) => pipeline === "d2c" ? item.segment === "d2c" : item.segment !== "d2c"),
    [opportunities, pipeline],
  );
  const stages = pipeline === "d2c" ? D2C_STAGES : HORECA_STAGES;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cream-300 bg-white p-3 shadow-sm">
        <div className="flex rounded-lg bg-cream-100 p-1">
          <button type="button" onClick={() => setPipeline("d2c")} className={tabClass(pipeline === "d2c")}>D2C</button>
          <button type="button" onClick={() => setPipeline("horeca")} className={tabClass(pipeline === "horeca")}>HORECA</button>
        </div>
        <div className="flex rounded-lg border border-cream-300 bg-white p-1">
          <button type="button" onClick={() => setView("kanban")} className={viewClass(view === "kanban")}><Columns3 className="h-4 w-4" /> Kanban</button>
          <button type="button" onClick={() => setView("table")} className={viewClass(view === "table")}><List className="h-4 w-4" /> Tabla</button>
        </div>
      </div>
      {view === "kanban" ? <Kanban opportunities={visible} stages={stages} /> : <PipelineTable opportunities={visible} />}
    </section>
  );
}

function Kanban({ opportunities, stages }: { opportunities: AdminOpportunity[]; stages: string[] }) {
  return (
    <div className="overflow-x-auto pb-3">
      <div className="grid min-w-max grid-flow-col auto-cols-[18rem] gap-3">
        {stages.map((stage) => {
          const cards = opportunities.filter((item) => item.stage === stage);
          const total = cards.reduce((sum, item) => sum + (item.valueCents || 0), 0);
          return (
            <section key={stage} className="rounded-xl border border-cream-300 bg-cream-100 p-3">
              <header className="flex items-start justify-between gap-2 border-b border-cream-300 pb-3">
                <div><h2 className="text-sm font-bold text-ink-900">{crmStageLabel(stage)}</h2><p className="mt-1 text-xs text-ink-500">{cards.length} · {formatAdminCurrency(total, "PEN")}</p></div>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-ink-700">{cards.length}</span>
              </header>
              <div className="mt-3 space-y-3">
                {cards.map((item) => <OpportunityCard key={item.id} item={item} />)}
                {!cards.length ? <p className="rounded-lg border border-dashed border-cream-400 p-4 text-center text-xs text-ink-500">Sin oportunidades</p> : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function OpportunityCard({ item }: { item: AdminOpportunity }) {
  return (
    <article className="rounded-xl border border-cream-300 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-bold leading-5 text-ink-900">{item.title}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.score >= 50 ? "bg-red-100 text-red-800" : item.score >= 20 ? "bg-amber-100 text-amber-800" : "bg-cream-200 text-ink-600"}`}>{item.score}</span></div>
      {item.customerId ? <Link href={`/admin/clientes/${item.customerId}`} className="mt-2 block text-xs font-semibold text-olive-800 hover:underline">{item.customerName}</Link> : <p className="mt-2 text-xs text-ink-500">{item.customerName}</p>}
      <div className="mt-3 flex items-center justify-between gap-2 text-xs"><span className="text-ink-500">{item.sourceChannel}</span><strong className="text-ink-900">{item.valueCents === null ? "Sin valor" : formatAdminCurrency(item.valueCents, item.currency)}</strong></div>
      {item.nextAction ? <p className="mt-3 rounded-lg bg-cream-100 p-2 text-xs leading-5 text-ink-700"><strong>Siguiente:</strong> {item.nextAction}{item.nextActionAt ? ` · ${formatAdminDate(item.nextActionAt)}` : ""}</p> : null}
      <div className="mt-3"><OpportunityActionForm opportunityId={item.id} stage={item.stage} segment={item.segment} /></div>
    </article>
  );
}

function PipelineTable({ opportunities }: { opportunities: AdminOpportunity[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-cream-300 bg-white shadow-sm">
      <table className="w-full min-w-[62rem] text-left text-sm">
        <thead><tr className="border-b border-cream-300 bg-cream-100 text-xs uppercase tracking-wide text-ink-500"><th className="p-3">Oportunidad</th><th className="p-3">Cliente</th><th className="p-3">Etapa</th><th className="p-3">Score</th><th className="p-3">Próxima acción</th><th className="p-3 text-right">Valor</th><th className="p-3">Gestionar</th></tr></thead>
        <tbody>{opportunities.map((item) => <tr key={item.id} className="border-b border-cream-200 align-top"><td className="p-3 font-bold text-ink-900">{item.title}<p className="mt-1 text-xs font-normal uppercase text-ink-500">{item.segment}</p></td><td className="p-3">{item.customerId ? <Link href={`/admin/clientes/${item.customerId}`} className="font-semibold text-olive-800 hover:underline">{item.customerName}</Link> : item.customerName}</td><td className="p-3">{crmStageLabel(item.stage)}</td><td className="p-3"><span className="inline-flex items-center gap-1 font-bold"><ThermometerSun className="h-4 w-4 text-amber-600" />{item.score}</span></td><td className="p-3">{item.nextAction || "Sin acción"}<p className="mt-1 text-xs text-ink-500">{item.nextActionAt ? formatAdminDate(item.nextActionAt) : "Sin fecha"}</p></td><td className="p-3 text-right font-bold">{item.valueCents === null ? "—" : formatAdminCurrency(item.valueCents, item.currency)}</td><td className="p-3"><OpportunityActionForm opportunityId={item.id} stage={item.stage} segment={item.segment} /></td></tr>)}</tbody>
      </table>
      {!opportunities.length ? <p className="p-6 text-center text-sm text-ink-600">No hay oportunidades en este pipeline.</p> : null}
    </div>
  );
}

function tabClass(active: boolean) { return `min-h-10 rounded-md px-4 text-sm font-bold ${active ? "bg-white text-olive-900 shadow-sm" : "text-ink-600"}`; }
function viewClass(active: boolean) { return `inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-bold ${active ? "bg-olive-100 text-olive-900" : "text-ink-600"}`; }
