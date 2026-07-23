import "server-only";

export function isFiscalSandboxUiEnabled(): boolean {
  return process.env.FISCAL_SANDBOX_ENABLED?.trim().toLowerCase() === "true";
}

