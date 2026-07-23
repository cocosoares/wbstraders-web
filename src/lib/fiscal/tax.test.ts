import { describe, expect, it } from "vitest";
import { boletaRequiresDni, splitIncludedTaxes } from "./tax";

describe("splitIncludedTaxes", () => {
  it("separates included IGV without losing cents", () => {
    expect(splitIncludedTaxes(11800)).toEqual({
      grossCents: 11800,
      netCents: 10000,
      igvCents: 1800,
      iscCents: 0,
      igvBps: 1800,
    });
  });

  it("keeps ISC explicit instead of inferring it from a product", () => {
    const taxes = splitIncludedTaxes(13000, { iscCents: 1000 });
    expect(taxes.netCents + taxes.igvCents + taxes.iscCents).toBe(13000);
    expect(taxes.iscCents).toBe(1000);
  });

  it("requires customer identification only above the SUNAT boleta threshold", () => {
    expect(boletaRequiresDni(70_000)).toBe(false);
    expect(boletaRequiresDni(70_001)).toBe(true);
  });
});
