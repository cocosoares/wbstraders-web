import { describe, expect, it } from "vitest";
import { crmScoreTier, crmStageLabel } from "./scoring";

describe("CRM scoring", () => {
  it("classifies the agreed commercial thresholds", () => {
    expect(crmScoreTier(0)).toBe("exploring");
    expect(crmScoreTier(19)).toBe("exploring");
    expect(crmScoreTier(20)).toBe("warm");
    expect(crmScoreTier(49)).toBe("warm");
    expect(crmScoreTier(50)).toBe("hot");
  });

  it("exposes human labels for both pipelines", () => {
    expect(crmStageLabel("recommendation")).toBe("Recomendación");
    expect(crmStageLabel("tasting")).toBe("Degustación");
  });
});
