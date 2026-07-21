import { NextResponse } from "next/server";

function publicBaseUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "https:") return url.toString();
    } catch {
      // Fall back to the request URL when an environment value is malformed.
    }
  }
  return request.url;
}

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const baseUrl = publicBaseUrl(request);
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return NextResponse.redirect(new URL("/", baseUrl));
  }

  // The reverse proxy forwards to Next.js on localhost:3200. Redirecting from
  // request.url would expose that internal address to the WhatsApp customer.
  const checkout = new URL("/checkout", baseUrl);
  checkout.searchParams.set("wbs_checkout", token);
  checkout.searchParams.set("utm_source", "whatsapp");
  checkout.searchParams.set("utm_medium", "conversation");
  checkout.searchParams.set("utm_campaign", "sommelier");
  checkout.searchParams.set("utm_content", "recommendation");
  return NextResponse.redirect(checkout);
}
