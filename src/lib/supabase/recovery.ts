export type RecoveryLinkPayload = {
  accessToken: string | null;
  code: string | null;
  error: string | null;
  isRecovery: boolean;
  refreshToken: string | null;
  tokenHash: string | null;
  type: string | null;
};

export function parseRecoveryLink(href: string): RecoveryLinkPayload {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const type = url.searchParams.get("type") || hash.get("type");
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash") || hash.get("token_hash");
  const accessToken = hash.get("access_token") || url.searchParams.get("access_token");
  const refreshToken = hash.get("refresh_token") || url.searchParams.get("refresh_token");
  const error =
    url.searchParams.get("error_description") ||
    hash.get("error_description") ||
    url.searchParams.get("error_code") ||
    hash.get("error_code") ||
    url.searchParams.get("error") ||
    hash.get("error");

  return {
    accessToken,
    code,
    error,
    isRecovery:
      type === "recovery" ||
      Boolean(code) ||
      Boolean(accessToken && refreshToken),
    refreshToken,
    tokenHash,
    type,
  };
}

