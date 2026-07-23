export const DEFAULT_IGV_BPS = 1_800;
export const BOLETA_DNI_THRESHOLD_CENTS = 70_000;

export type TaxBreakdown = {
  grossCents: number;
  netCents: number;
  igvCents: number;
  iscCents: number;
  igvBps: number;
};

/**
 * Splits a price that already includes IGV. ISC is intentionally an explicit
 * input: its treatment for each wine must be approved by the accountant and
 * never guessed from the product name.
 */
export function splitIncludedTaxes(
  grossCents: number,
  options: { igvBps?: number; iscCents?: number } = {},
): TaxBreakdown {
  const safeGross = Math.max(0, Math.round(grossCents));
  const igvBps = Math.max(0, Math.min(10_000, Math.round(options.igvBps ?? DEFAULT_IGV_BPS)));
  const iscCents = Math.max(0, Math.min(safeGross, Math.round(options.iscCents ?? 0)));
  const taxableGross = safeGross - iscCents;
  const netCents = Math.round((taxableGross * 10_000) / (10_000 + igvBps));

  return {
    grossCents: safeGross,
    netCents,
    igvCents: taxableGross - netCents,
    iscCents,
    igvBps,
  };
}

export function boletaRequiresDni(totalCents: number): boolean {
  return Number.isFinite(totalCents) && totalCents > BOLETA_DNI_THRESHOLD_CENTS;
}
