import { NextResponse } from "next/server";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const checkout = new URL("/checkout", request.url);
  checkout.searchParams.set("wbs_checkout", token);
  checkout.searchParams.set("utm_source", "whatsapp");
  checkout.searchParams.set("utm_medium", "conversation");
  checkout.searchParams.set("utm_campaign", "sommelier");
  checkout.searchParams.set("utm_content", "recommendation");
  return NextResponse.redirect(checkout);
}
