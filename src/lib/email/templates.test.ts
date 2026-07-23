import { describe, expect, it } from "vitest";
import { renderClaimEmail, renderOrderEmail } from "./templates";
import type { ClaimEmailContext, OrderEmailContext } from "./types";

const order: OrderEmailContext = {
  orderId: "00000000-0000-4000-8000-000000000001",
  orderNumber: "WBS-2026-001001",
  customerName: "Ana <script>alert(1)</script>",
  customerEmail: "ana@example.com",
  customerPhone: "999888777",
  totalCents: 21900,
  currency: "PEN",
  paymentStatus: "pending",
  fulfillmentStatus: "reserved",
  receiptType: "boleta",
  deliveryDistrict: "Miraflores",
  deliveryAddress: "Av. Prueba 123",
  createdAt: "2026-07-20T14:00:00.000Z",
  items: [{ productName: "Malbec <Reserva>", quantity: 1, lineTotalCents: 21900 }],
};

const claim: ClaimEmailContext = {
  claimId: "00000000-0000-4000-8000-000000000002",
  claimNumber: "LR-20260720-ABCD1234",
  customerName: "Ana Prueba",
  customerEmail: "ana@example.com",
  customerPhone: "999888777",
  claimType: "reclamo",
  itemDescription: "Pedido",
  detail: "Detalle de prueba",
  consumerRequest: "Solicito revisión",
  createdAt: "2026-07-20T14:00:00.000Z",
};

describe("Resend email templates", () => {
  it("renders order content and escapes customer-controlled HTML", () => {
    const email = renderOrderEmail("order.received.customer", order);
    expect(email.subject).toContain(order.orderNumber);
    expect(email.html).toContain("Malbec &lt;Reserva&gt;");
    expect(email.html).not.toContain("<script>alert(1)</script>");
    expect(email.text).toContain("S/ 219.00");
  });

  it("renders internal operations notification with an admin CTA", () => {
    const email = renderOrderEmail("order.received.operations", order);
    expect(email.subject).toContain("Nuevo pedido");
    expect(email.html).toContain("/admin/pedidos");
  });

  it("renders a customer claim acknowledgment without exposing the claim detail", () => {
    const email = renderClaimEmail("claim.received.customer", claim);
    expect(email.subject).toContain(claim.claimNumber);
    expect(email.html).not.toContain(claim.detail);
    expect(email.text).toContain("Conserva este número");
  });
  it("labels sandbox fiscal messages as non-tax-valid documents", () => {
    const email = renderOrderEmail("fiscal.issued.customer", {
      ...order,
      fiscalDocument: { documentType: "boleta", series: "TEST-B", number: "00000001", testMode: true },
    });
    expect(email.subject).toContain("prueba");
    expect(email.html).toContain("no tiene validez tributaria");
    expect(email.html).toContain("SUNAT");
  });
});
