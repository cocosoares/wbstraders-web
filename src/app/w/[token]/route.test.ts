import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
});

describe("WhatsApp checkout redirect", () => {
  it("uses the public site URL instead of the reverse-proxy address", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://wbstraders.76.13.238.64.nip.io";
    const response = await GET(
      new Request(`http://localhost:3200/w/${"a".repeat(64)}`),
      { params: Promise.resolve({ token: "a".repeat(64) }) },
    );

    expect(response.headers.get("location")).toBe(
      `https://wbstraders.76.13.238.64.nip.io/checkout?wbs_checkout=${"a".repeat(64)}&utm_source=whatsapp&utm_medium=conversation&utm_campaign=sommelier&utm_content=recommendation`,
    );
  });
});
