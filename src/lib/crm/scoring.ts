import type { CrmScoreTier } from "./types";

export function crmScoreTier(score: number): CrmScoreTier {
  if (score >= 50) return "hot";
  if (score >= 20) return "warm";
  return "exploring";
}

export function crmScoreLabel(tier: CrmScoreTier): string {
  if (tier === "hot") return "Caliente";
  if (tier === "warm") return "Interesado";
  return "Explorando";
}

export const D2C_STAGES = [
  "lead",
  "qualified",
  "recommendation",
  "checkout",
  "won",
  "lost",
] as const;

export const HORECA_STAGES = [
  "lead",
  "qualified",
  "tasting",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

export function crmStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    lead: "Lead",
    qualified: "Calificado",
    recommendation: "Recomendación",
    checkout: "Checkout",
    tasting: "Degustación",
    proposal: "Propuesta",
    negotiation: "Negociación",
    won: "Ganado",
    lost: "Perdido",
  };
  return labels[stage] ?? stage.replaceAll("_", " ");
}
