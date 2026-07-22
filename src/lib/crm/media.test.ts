import { describe, expect, it } from "vitest";
import { CRM_MEDIA_MAX_BYTES, validateCrmMedia } from "./media";

describe("validateCrmMedia", () => {
  it("accepts the private CRM media formats", () => {
    expect(validateCrmMedia({ size: 2_000, mimeType: "image/jpeg" })).toEqual({ valid: true, extension: "jpg" });
    expect(validateCrmMedia({ size: 2_000, mimeType: "image/png" }).valid).toBe(true);
    expect(validateCrmMedia({ size: 2_000, mimeType: "image/webp" }).valid).toBe(true);
    expect(validateCrmMedia({ size: 2_000, mimeType: "application/pdf" })).toEqual({ valid: true, extension: "pdf" });
  });

  it("rejects empty, executable and oversized files", () => {
    expect(validateCrmMedia({ size: 0, mimeType: "image/jpeg" })).toEqual({ valid: false, reason: "empty" });
    expect(validateCrmMedia({ size: 2_000, mimeType: "application/javascript" })).toEqual({ valid: false, reason: "unsupported" });
    expect(validateCrmMedia({ size: CRM_MEDIA_MAX_BYTES + 1, mimeType: "application/pdf" })).toEqual({ valid: false, reason: "too_large" });
  });
});
