import { describe, expect, it } from "vitest";
import { parseRecoveryLink } from "@/lib/supabase/recovery";

describe("parseRecoveryLink", () => {
  it("detects a PKCE recovery code", () => {
    expect(
      parseRecoveryLink("https://example.com/admin/restablecer-clave?code=pkce-code"),
    ).toMatchObject({ code: "pkce-code", isRecovery: true });
  });

  it("detects a recovery token hash", () => {
    expect(
      parseRecoveryLink(
        "https://example.com/admin/restablecer-clave?token_hash=hashed-token&type=recovery",
      ),
    ).toMatchObject({ tokenHash: "hashed-token", type: "recovery", isRecovery: true });
  });

  it("detects implicit recovery tokens in the hash", () => {
    expect(
      parseRecoveryLink(
        "https://example.com/admin/restablecer-clave#access_token=access&refresh_token=refresh&type=recovery",
      ),
    ).toMatchObject({
      accessToken: "access",
      refreshToken: "refresh",
      type: "recovery",
      isRecovery: true,
    });
  });

  it("preserves provider errors without treating a plain URL as recovery", () => {
    expect(
      parseRecoveryLink(
        "https://example.com/admin/restablecer-clave?error=access_denied&error_description=Expired",
      ),
    ).toMatchObject({ error: "Expired", isRecovery: false });
    expect(
      parseRecoveryLink("https://example.com/admin/restablecer-clave"),
    ).toMatchObject({ error: null, isRecovery: false });
  });
});

