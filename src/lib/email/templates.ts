import type {
  ClaimEmailContext,
  EmailJobKind,
  OrderEmailContext,
  RenderedEmail,
} from "./types";

const BRAND = {
  wine: "#8C1D2C",
  ink: "#241F1B",
  cream: "#F8F4EC",
  muted: "#6F655C",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(cents: number, currency = "PEN"): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeZone: "America/Lima",
  }).format(new Date(value));
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://wbstraders.pe").replace(/\/$/, "");
}

function whatsappUrl(message: string): string {
  return `https://wa.me/51993518681?text=${encodeURIComponent(message)}`;
}

function layout(args: {
  eyebrow: string;
  title: string;
  greeting?: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  footer?: string;
}): string {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:${BRAND.cream};font-family:Arial,Helvetica,sans-serif;color:${BRAND.ink}">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.cream};padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border:1px solid #eadfce;border-radius:18px;overflow:hidden">
        <tr><td style="padding:26px 32px 18px;border-bottom:1px solid #eee4d7">
          <a href="${escapeHtml(siteUrl())}" style="font-weight:800;font-size:24px;color:${BRAND.wine};text-decoration:none">WBStraders</a>
        </td></tr>
        <tr><td style="padding:34px 32px">
          <div style="text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:700;color:${BRAND.wine};margin-bottom:10px">${escapeHtml(args.eyebrow)}</div>
          <h1 style="font-family:Georgia,serif;font-size:34px;line-height:1.12;margin:0 0 18px">${escapeHtml(args.title)}</h1>
          ${args.greeting ? `<p style="font-size:17px;line-height:1.6;margin:0 0 18px">${escapeHtml(args.greeting)}</p>` : ""}
          <div style="font-size:16px;line-height:1.65">${args.bodyHtml}</div>
          ${args.cta ? `<p style="margin:28px 0 4px"><a href="${escapeHtml(args.cta.url)}" style="display:inline-block;background:${BRAND.wine};color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:10px">${escapeHtml(args.cta.label)}</a></p>` : ""}
        </td></tr>
        <tr><td style="padding:22px 32px;background:#fbf8f2;color:${BRAND.muted};font-size:12px;line-height:1.55">
          ${escapeHtml(args.footer || "Este es un mensaje transaccional relacionado con tu compra o solicitud.")}<br>
          Venta prohibida a menores de 18 años. Tomar bebidas alcohólicas en exceso es dañino.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function orderSummary(order: OrderEmailContext, includeDelivery = false): string {
  const items = order.items
    .map(
      (item) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee4d7">${escapeHtml(item.quantity)} × ${escapeHtml(item.productName)}</td>
        <td align="right" style="padding:8px 0;border-bottom:1px solid #eee4d7;white-space:nowrap">${escapeHtml(money(item.lineTotalCents, order.currency))}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#fbf8f2;border-radius:12px;padding:16px">
    <tr><td colspan="2" style="padding:0 0 10px;font-weight:700">Pedido ${escapeHtml(order.orderNumber)}</td></tr>
    ${items}
    <tr><td style="padding:12px 0 0;font-weight:700">Total</td><td align="right" style="padding:12px 0 0;font-weight:700">${escapeHtml(money(order.totalCents, order.currency))}</td></tr>
  </table>
  ${includeDelivery ? `<p><strong>Entrega:</strong> ${escapeHtml(order.deliveryDistrict)} — ${escapeHtml(order.deliveryAddress)}</p>` : ""}`;
}

function customerOrderEmail(kind: EmailJobKind, order: OrderEmailContext): RenderedEmail {
  const firstName = order.customerName.trim().split(/\s+/)[0] || "hola";
  const contactUrl = whatsappUrl(`Hola, consulto por mi pedido ${order.orderNumber}.`);
  const base = {
    greeting: `Hola, ${firstName}.`,
    cta: { label: "Consultar por WhatsApp", url: contactUrl },
  };

  switch (kind) {
    case "order.received.customer":
      return {
        subject: `Recibimos tu pedido ${order.orderNumber}`,
        html: layout({
          ...base,
          eyebrow: "Pedido recibido",
          title: "Gracias por elegir WBStraders",
          bodyHtml: `<p>Registramos tu pedido el ${escapeHtml(formatDate(order.createdAt))}. Te avisaremos por este correo cuando confirmemos el pago y cuando avance el despacho.</p>${orderSummary(order, true)}`,
        }),
        text: `Hola, ${firstName}. Recibimos tu pedido ${order.orderNumber} por ${money(order.totalCents, order.currency)}. Te avisaremos cuando confirmemos el pago y el despacho.`,
      };
    case "payment.confirmed.customer":
      return {
        subject: `Pago confirmado — ${order.orderNumber}`,
        html: layout({
          ...base,
          eyebrow: "Pago confirmado",
          title: "Tu pedido ya está confirmado",
          bodyHtml: `<p>El pago de <strong>${escapeHtml(money(order.totalCents, order.currency))}</strong> fue verificado. Ahora coordinaremos la preparación y entrega.</p>${orderSummary(order)}`,
        }),
        text: `Pago confirmado para ${order.orderNumber}. Total: ${money(order.totalCents, order.currency)}. Te avisaremos cuando iniciemos la preparación.`,
      };
    case "payment.refunded.customer":
      return {
        subject: `Actualización de reembolso — ${order.orderNumber}`,
        html: layout({
          ...base,
          eyebrow: "Reembolso",
          title: "Actualizamos el estado de tu pago",
          bodyHtml: `<p>Registramos una actualización de reembolso para el pedido <strong>${escapeHtml(order.orderNumber)}</strong>. Si necesitas el detalle o el plazo de abono, responde a este correo.</p>`,
        }),
        text: `Registramos una actualización de reembolso para el pedido ${order.orderNumber}. Responde a este correo si necesitas el detalle.`,
      };
    case "fulfillment.preparing.customer":
      return {
        subject: `Estamos preparando tu pedido ${order.orderNumber}`,
        html: layout({
          ...base,
          eyebrow: "Preparación",
          title: "Tus vinos ya están en preparación",
          bodyHtml: `<p>Estamos armando y verificando tu pedido para que llegue en perfectas condiciones.</p>${orderSummary(order)}`,
        }),
        text: `Estamos preparando tu pedido ${order.orderNumber}. Te avisaremos cuando salga a reparto.`,
      };
    case "fulfillment.shipped.customer":
      return {
        subject: `Tu pedido ${order.orderNumber} salió a reparto`,
        html: layout({
          ...base,
          eyebrow: "En camino",
          title: "Tu pedido salió a reparto",
          bodyHtml: `<p>La entrega va en camino a <strong>${escapeHtml(order.deliveryDistrict)}</strong>. Recuerda que una persona mayor de 18 años debe recibirla.</p>`,
        }),
        text: `Tu pedido ${order.orderNumber} salió a reparto hacia ${order.deliveryDistrict}. Debe recibirlo una persona mayor de 18 años.`,
      };
    case "fulfillment.delivered.customer":
      return {
        subject: `Pedido entregado — ${order.orderNumber}`,
        html: layout({
          ...base,
          eyebrow: "Entrega completada",
          title: "¡Que disfrutes tus vinos!",
          bodyHtml: `<p>Marcamos el pedido <strong>${escapeHtml(order.orderNumber)}</strong> como entregado. Si hubo algún inconveniente, responde a este correo para ayudarte.</p>`,
        }),
        text: `Marcamos el pedido ${order.orderNumber} como entregado. Si hubo algún inconveniente, responde a este correo.`,
      };
    case "order.cancelled.customer":
      return {
        subject: `Pedido cancelado — ${order.orderNumber}`,
        html: layout({
          ...base,
          eyebrow: "Pedido cancelado",
          title: "Registramos la cancelación",
          bodyHtml: `<p>El pedido <strong>${escapeHtml(order.orderNumber)}</strong> figura como cancelado. Si no solicitaste este cambio o necesitas ayuda con un pago, responde a este correo.</p>`,
        }),
        text: `El pedido ${order.orderNumber} figura como cancelado. Responde a este correo si necesitas ayuda.`,
      };
    case "fiscal.issued.customer": {
      const fiscal = order.fiscalDocument;
      const reference = [fiscal?.series, fiscal?.number].filter(Boolean).join("-");
      return {
        subject: `Comprobante emitido — ${order.orderNumber}`,
        html: layout({
          ...base,
          eyebrow: "Comprobante",
          title: "Tu comprobante fue emitido",
          bodyHtml: `<p>Emitimos tu ${escapeHtml(fiscal?.documentType || order.receiptType)}${reference ? ` <strong>${escapeHtml(reference)}</strong>` : ""} para el pedido <strong>${escapeHtml(order.orderNumber)}</strong>.</p>${fiscal?.pdfUrl ? `<p><a href="${escapeHtml(fiscal.pdfUrl)}">Descargar comprobante</a></p>` : "<p>Si necesitas una copia digital del comprobante, responde a este correo y te la enviaremos.</p>"}`,
          footer: "Correo transaccional de comprobante. La aplicación registra el resultado fiscal; la validez tributaria depende del proceso SEE-SOL/PSE correspondiente.",
        }),
        text: `Emitimos tu ${fiscal?.documentType || order.receiptType}${reference ? ` ${reference}` : ""} para el pedido ${order.orderNumber}.`,
      };
    }
    default:
      throw new Error(`UNSUPPORTED_CUSTOMER_ORDER_EMAIL:${kind}`);
  }
}

function operationsOrderEmail(order: OrderEmailContext): RenderedEmail {
  const adminUrl = `${siteUrl()}/admin/pedidos`;
  return {
    subject: `Nuevo pedido ${order.orderNumber} — ${money(order.totalCents, order.currency)}`,
    html: layout({
      eyebrow: "Operación",
      title: `Nuevo pedido ${order.orderNumber}`,
      bodyHtml: `<p><strong>Cliente:</strong> ${escapeHtml(order.customerName)}<br><strong>Teléfono:</strong> ${escapeHtml(order.customerPhone)}<br><strong>Correo:</strong> ${escapeHtml(order.customerEmail || "No registrado")}</p>${orderSummary(order, true)}`,
      cta: { label: "Abrir pedidos", url: adminUrl },
      footer: "Aviso interno de operación. Contiene datos personales; no lo reenvíes fuera de WBStraders.",
    }),
    text: `Nuevo pedido ${order.orderNumber}. Cliente: ${order.customerName}. Teléfono: ${order.customerPhone}. Total: ${money(order.totalCents, order.currency)}.`,
  };
}

export function renderOrderEmail(kind: EmailJobKind, order: OrderEmailContext): RenderedEmail {
  if (kind === "order.received.operations") return operationsOrderEmail(order);
  return customerOrderEmail(kind, order);
}

export function renderClaimEmail(kind: EmailJobKind, claim: ClaimEmailContext): RenderedEmail {
  const firstName = claim.customerName.trim().split(/\s+/)[0] || "hola";
  if (kind === "claim.received.operations") {
    return {
      subject: `Nuevo ${claim.claimType}: ${claim.claimNumber}`,
      html: layout({
        eyebrow: "Atención al cliente",
        title: `Nuevo ${claim.claimType} ${claim.claimNumber}`,
        bodyHtml: `<p><strong>Cliente:</strong> ${escapeHtml(claim.customerName)}<br><strong>Correo:</strong> ${escapeHtml(claim.customerEmail)}<br><strong>Teléfono:</strong> ${escapeHtml(claim.customerPhone)}${claim.orderNumber ? `<br><strong>Pedido:</strong> ${escapeHtml(claim.orderNumber)}` : ""}</p><p><strong>Producto/servicio:</strong> ${escapeHtml(claim.itemDescription)}</p><p><strong>Solicitud:</strong> ${escapeHtml(claim.consumerRequest)}</p>`,
        cta: { label: "Abrir reclamos", url: `${siteUrl()}/admin/reclamos` },
        footer: "Aviso interno de atención al cliente. Contiene datos personales y debe tratarse de forma confidencial.",
      }),
      text: `Nuevo ${claim.claimType} ${claim.claimNumber}. Cliente: ${claim.customerName}. Solicitud: ${claim.consumerRequest}`,
    };
  }
  return {
    subject: `Recibimos tu ${claim.claimType} ${claim.claimNumber}`,
    html: layout({
      eyebrow: "Libro de Reclamaciones",
      title: "Tu solicitud fue registrada",
      greeting: `Hola, ${firstName}.`,
      bodyHtml: `<p>Recibimos tu ${escapeHtml(claim.claimType)} con el número <strong>${escapeHtml(claim.claimNumber)}</strong> el ${escapeHtml(formatDate(claim.createdAt))}. Nuestro equipo revisará la información y responderá por los datos de contacto registrados.</p><p>Conserva este número para cualquier seguimiento.</p>`,
      cta: { label: "Contactar soporte", url: `mailto:${escapeHtml(process.env.RESEND_REPLY_TO || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "ventas@wbstraders.com")}?subject=${encodeURIComponent(`Seguimiento ${claim.claimNumber}`)}` },
      footer: "Confirmación transaccional del Libro de Reclamaciones. Este mensaje no modifica los plazos legales aplicables.",
    }),
    text: `Hola, ${firstName}. Recibimos tu ${claim.claimType} ${claim.claimNumber}. Conserva este número para el seguimiento.`,
  };
}

export const templateInternals = { escapeHtml, money };
