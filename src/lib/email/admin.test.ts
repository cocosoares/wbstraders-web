import { describe, expect, it } from "vitest";
import {
  EMAIL_TEMPLATE_PREVIEWS,
  emailDeliveryLabel,
  emailEventLabel,
  emailKindLabel,
} from "./admin";

describe("email admin labels", () => {
  it("uses clear Spanish labels for known lifecycle jobs", () => {
    expect(emailKindLabel("order.received.customer")).toBe("Pedido recibido · cliente");
    expect(emailEventLabel("email.complained")).toBe("Marcado como spam");
    expect(emailDeliveryLabel("delivered")).toBe("Entregado");
  });

  it("keeps unknown provider codes readable", () => {
    expect(emailEventLabel("email.custom_event")).toBe("Email custom event");
    expect(emailDeliveryLabel(null)).toBeNull();
  });

  it("documents one job, trigger and purpose per visible template", () => {
    expect(EMAIL_TEMPLATE_PREVIEWS.length).toBeGreaterThanOrEqual(8);
    for (const template of EMAIL_TEMPLATE_PREVIEWS) {
      expect(template.subject.length).toBeGreaterThan(10);
      expect(template.trigger.length).toBeGreaterThan(10);
      expect(template.purpose.length).toBeGreaterThan(10);
    }
  });
});
