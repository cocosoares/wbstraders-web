"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, Check, LoaderCircle, Mail, MessageCircle, Package, ReceiptText, Tag } from "lucide-react";
import {
  manageCrmTask,
  mergeCrmCustomers,
  setCrmCustomerTag,
  updateCrmCustomer,
  type AdminActionState,
} from "@/app/admin/(protected)/actions";
import { formatAdminCurrency, formatAdminDate } from "@/components/admin/format";
import { crmScoreLabel, crmStageLabel } from "@/lib/crm/scoring";
import type { CrmCustomer360, CrmTag, CrmTask } from "@/lib/crm/types";

const INITIAL: AdminActionState = { status: "idle", message: "" };

export function CrmCustomerProfile({ customer }: { customer: CrmCustomer360 }) {
  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin/clientes" className="inline-flex items-center gap-2 text-sm font-bold text-olive-800 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a clientes
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-olive-700">Cliente 360°</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900 sm:text-4xl">{customer.name || "Cliente sin nombre"}</h1>
            <p className="mt-2 text-sm text-ink-600">{customer.phone ? `+${customer.phone}` : "Sin teléfono"} · {customer.email || "Correo pendiente"}</p>
          </div>
          <div className={`rounded-xl border px-4 py-3 ${customer.score >= 50 ? "border-red-200 bg-red-50" : customer.score >= 20 ? "border-amber-200 bg-amber-50" : "border-cream-300 bg-white"}`}>
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Score comercial</p>
            <p className="mt-1 text-2xl font-bold text-ink-900">{customer.score}</p>
            <p className="text-xs font-semibold text-ink-700">{crmScoreLabel(customer.scoreTier)}</p>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Compras pagadas" value={String(customer.paidOrders)} />
        <Kpi label="Total gastado" value={formatAdminCurrency(customer.totalSpentCents, "PEN")} />
        <Kpi label="Ticket promedio" value={formatAdminCurrency(customer.averageOrderCents, "PEN")} />
        <Kpi label="Última compra" value={customer.lastPurchaseAt ? formatAdminDate(customer.lastPurchaseAt) : "Sin compras"} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="space-y-5">
          <ProfileEditor customer={customer} />
          <TagEditor customer={customer} />
          <Preferences customer={customer} />
          <MergeCustomers customer={customer} />
        </aside>
        <main className="space-y-6">
          <Tasks customer={customer} />
          <Opportunities customer={customer} />
          <Orders customer={customer} />
          <Timeline customer={customer} />
        </main>
      </div>
    </div>
  );
}

function ProfileEditor({ customer }: { customer: CrmCustomer360 }) {
  const [state, action, pending] = useActionState(updateCrmCustomer, INITIAL);
  return (
    <section className="rounded-2xl border border-cream-300 bg-white p-4 shadow-sm">
      <h2 className="font-display text-xl font-semibold text-ink-900">Datos comerciales</h2>
      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="customerId" value={customer.id} />
        <label className="block text-xs font-bold text-ink-700">Nombre<input name="name" required minLength={2} maxLength={160} defaultValue={customer.name} className="mt-1 min-h-11 w-full rounded-lg border border-cream-300 px-3 text-sm font-normal" /></label>
        <label className="block text-xs font-bold text-ink-700">Correo<input name="email" type="email" maxLength={254} defaultValue={customer.email || ""} placeholder="Solo con autorización" className="mt-1 min-h-11 w-full rounded-lg border border-cream-300 px-3 text-sm font-normal" /></label>
        <label className="block text-xs font-bold text-ink-700">Ciclo de vida<select name="lifecycleStage" defaultValue={customer.lifecycleStage} className="mt-1 min-h-11 w-full rounded-lg border border-cream-300 bg-white px-3 text-sm font-normal"><option value="prospect">Prospecto</option><option value="engaged">Interesado</option><option value="customer">Nuevo</option><option value="repeat">Recurrente</option><option value="vip">VIP</option><option value="inactive">Inactivo</option><option value="horeca">HORECA</option></select></label>
        <div className="rounded-lg bg-cream-100 p-3 text-xs leading-5 text-ink-600"><p><strong>Origen:</strong> {customer.sourceChannel}</p><p><strong>Consentimiento:</strong> {consentLabel(customer.marketingConsent)}</p></div>
        <button disabled={pending} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-olive-700 px-3 text-sm font-bold text-white disabled:opacity-50">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null} Guardar perfil</button>
        {state.message ? <p className={`text-xs ${state.status === "error" ? "text-red-700" : "text-olive-700"}`}>{state.message}</p> : null}
      </form>
    </section>
  );
}

function TagEditor({ customer }: { customer: CrmCustomer360 }) {
  return <section className="rounded-2xl border border-cream-300 bg-white p-4 shadow-sm"><h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink-900"><Tag className="h-5 w-5 text-olive-700" /> Segmentación</h2><div className="mt-3 flex flex-wrap gap-2">{customer.tags.map((tag) => <TagToggle key={tag.id} customerId={customer.id} tag={tag} />)}</div></section>;
}

function TagToggle({ customerId, tag }: { customerId: string; tag: CrmTag }) {
  const [state, action, pending] = useActionState(setCrmCustomerTag, INITIAL);
  return <form action={action}><input type="hidden" name="customerId" value={customerId} /><input type="hidden" name="tagId" value={tag.id} /><input type="hidden" name="enabled" value={tag.selected ? "false" : "true"} /><button disabled={pending} className={`min-h-9 rounded-full border px-3 text-xs font-bold ${tag.selected ? "border-olive-500 bg-olive-100 text-olive-900" : "border-cream-300 bg-cream-50 text-ink-600"}`}>{tag.name}</button>{state.status === "error" ? <span className="sr-only">{state.message}</span> : null}</form>;
}

function Preferences({ customer }: { customer: CrmCustomer360 }) {
  const entries = Object.entries(customer.qualification);
  return <section className="rounded-2xl border border-cream-300 bg-white p-4 shadow-sm"><h2 className="font-display text-xl font-semibold text-ink-900">Preferencias</h2>{entries.length ? <dl className="mt-3 divide-y divide-cream-200 text-sm">{entries.map(([key, value]) => <div key={key} className="flex justify-between gap-4 py-2"><dt className="capitalize text-ink-500">{key.replaceAll("_", " ")}</dt><dd className="text-right font-semibold text-ink-800">{value}</dd></div>)}</dl> : <p className="mt-2 text-sm leading-6 text-ink-600">Se completarán progresivamente según lo que el cliente cuente en WhatsApp.</p>}</section>;
}

function MergeCustomers({ customer }: { customer: CrmCustomer360 }) {
  const [state, action, pending] = useActionState(mergeCrmCustomers, INITIAL);
  return (
    <details className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-bold text-red-800">Fusionar un posible duplicado</summary>
      <form action={action} className="mt-4 space-y-3 border-t border-red-200 pt-4">
        <input type="hidden" name="targetCustomerId" value={customer.id} />
        <p className="text-xs leading-5 text-red-800">Los pedidos, conversaciones, tareas, etiquetas y score del registro seleccionado pasarán a este cliente. La acción queda auditada.</p>
        <label className="block text-xs font-bold text-ink-700">Registro duplicado<select name="sourceCustomerId" required defaultValue="" className="mt-1 min-h-11 w-full rounded-lg border border-red-200 bg-white px-3 text-sm font-normal"><option value="">Seleccionar…</option>{customer.mergeCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.email || candidate.phone}</option>)}</select></label>
        <label className="block text-xs font-bold text-ink-700">Escribe FUSIONAR<input name="confirmation" required autoComplete="off" className="mt-1 min-h-11 w-full rounded-lg border border-red-200 bg-white px-3 text-sm font-normal" /></label>
        <button disabled={pending || !customer.mergeCandidates.length} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-3 text-sm font-bold text-white disabled:opacity-50">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null} Fusionar duplicado</button>
        {!customer.mergeCandidates.length ? <p className="text-xs text-ink-600">No hay otros clientes disponibles para comparar.</p> : null}
        {state.message ? <p className={`text-xs ${state.status === "error" ? "text-red-700" : "text-olive-700"}`}>{state.message}</p> : null}
      </form>
    </details>
  );
}

function Tasks({ customer }: { customer: CrmCustomer360 }) {
  const open = customer.tasks.filter((task) => task.status === "planned");
  return <section className="rounded-2xl border border-cream-300 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-display text-2xl font-semibold text-ink-900">Tareas y seguimiento</h2><span className="rounded-full bg-cream-200 px-2.5 py-1 text-xs font-bold text-ink-700">{open.length} abiertas</span></div><div className="mt-4 space-y-2">{open.length ? open.map((task) => <CustomerTask key={task.id} task={task} />) : <p className="text-sm text-ink-600">No hay seguimientos pendientes.</p>}</div></section>;
}

function CustomerTask({ task }: { task: CrmTask }) {
  const [state, action, pending] = useActionState(manageCrmTask, INITIAL);
  const overdue = Boolean(task.dueAt && Date.parse(task.dueAt) < Date.now());
  return <form action={action} className={`flex items-start gap-3 rounded-xl border p-3 ${overdue ? "border-red-200 bg-red-50" : "border-cream-300 bg-cream-50"}`}><input type="hidden" name="activityId" value={task.id} /><input type="hidden" name="action" value="complete" /><div className="min-w-0 flex-1"><p className="font-bold text-ink-900">{task.subject}</p>{task.body ? <p className="mt-1 text-sm leading-6 text-ink-600">{task.body}</p> : null}<p className={`mt-1 text-xs ${overdue ? "font-bold text-red-700" : "text-ink-500"}`}>{task.dueAt ? formatAdminDate(task.dueAt) : "Sin fecha"}</p></div><button disabled={pending} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-olive-400 text-olive-700 hover:bg-olive-100"><Check className="h-4 w-4" /></button>{state.status === "error" ? <span className="sr-only">{state.message}</span> : null}</form>;
}

function Opportunities({ customer }: { customer: CrmCustomer360 }) {
  return <section className="rounded-2xl border border-cream-300 bg-white p-5 shadow-sm"><h2 className="font-display text-2xl font-semibold text-ink-900">Oportunidades</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{customer.opportunities.length ? customer.opportunities.map((item) => <article key={item.id} className="rounded-xl border border-cream-300 bg-cream-50 p-4"><div className="flex items-start justify-between gap-2"><h3 className="font-bold text-ink-900">{item.title}</h3><span className="rounded-full bg-olive-100 px-2 py-1 text-[10px] font-bold uppercase text-olive-800">{crmStageLabel(item.stage)}</span></div><p className="mt-2 text-xs uppercase tracking-wide text-ink-500">{item.segment} · score {item.score}</p>{item.valueCents !== null ? <p className="mt-2 font-bold text-ink-900">{formatAdminCurrency(item.valueCents, item.currency)}</p> : null}</article>) : <p className="text-sm text-ink-600">Aún no hay oportunidades asociadas.</p>}</div></section>;
}

function Orders({ customer }: { customer: CrmCustomer360 }) {
  return <section className="rounded-2xl border border-cream-300 bg-white p-5 shadow-sm"><h2 className="font-display text-2xl font-semibold text-ink-900">Pedidos</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[34rem] text-left text-sm"><thead><tr className="border-b border-cream-300 text-xs uppercase tracking-wide text-ink-500"><th className="pb-2">Pedido</th><th className="pb-2">Pago</th><th className="pb-2">Despacho</th><th className="pb-2 text-right">Total</th></tr></thead><tbody>{customer.orders.map((order) => <tr key={order.id} className="border-b border-cream-200"><td className="py-3"><Link href={`/admin/pedidos/${order.id}`} className="font-bold text-olive-800 hover:underline">{order.orderNumber}</Link><p className="text-xs text-ink-500">{formatAdminDate(order.createdAt)}</p></td><td className="py-3">{order.paymentStatus}</td><td className="py-3">{order.fulfillmentStatus}</td><td className="py-3 text-right font-bold">{formatAdminCurrency(order.totalCents, order.currency)}</td></tr>)}</tbody></table>{!customer.orders.length ? <p className="py-4 text-sm text-ink-600">Sin pedidos todavía.</p> : null}</div></section>;
}

function Timeline({ customer }: { customer: CrmCustomer360 }) {
  const items = [
    ...customer.emails.map((item) => ({ id: `email-${item.id}`, date: item.createdAt, icon: Mail, title: `Email: ${item.kind}`, detail: `${item.state}${item.deliveryStatus ? ` · ${item.deliveryStatus}` : ""}` })),
    ...customer.claims.map((item) => ({ id: `claim-${item.id}`, date: item.createdAt, icon: ReceiptText, title: `Reclamo ${item.claimNumber}`, detail: `${item.claimType} · ${item.status}` })),
    ...customer.orders.map((item) => ({ id: `order-${item.id}`, date: item.createdAt, icon: Package, title: `Pedido ${item.orderNumber}`, detail: `${item.paymentStatus} · ${formatAdminCurrency(item.totalCents, item.currency)}` })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return <section className="rounded-2xl border border-cream-300 bg-white p-5 shadow-sm"><h2 className="font-display text-2xl font-semibold text-ink-900">Actividad unificada</h2><div className="mt-4 space-y-3">{items.length ? items.map((item) => { const Icon = item.icon; return <article key={item.id} className="flex gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream-200 text-olive-800"><Icon className="h-4 w-4" /></div><div><p className="text-sm font-bold text-ink-900">{item.title}</p><p className="text-xs text-ink-600">{item.detail}</p><time className="text-[11px] text-ink-500">{formatAdminDate(item.date)}</time></div></article>; }) : <p className="text-sm text-ink-600">Sin actividad registrada.</p>}</div></section>;
}

function Kpi({ label, value }: { label: string; value: string }) { return <article className="rounded-xl border border-cream-300 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-ink-500">{label}</p><p className="mt-2 text-xl font-bold text-ink-900">{value}</p></article>; }
function consentLabel(value: string) { return ({ opted_in: "Aceptado", opted_out: "Rechazado", pending: "Pendiente", unknown: "Sin registrar" } as Record<string, string>)[value] || value; }
