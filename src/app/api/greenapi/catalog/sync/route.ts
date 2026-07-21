import { NextResponse } from "next/server";
import { syncGreenApiCatalog, type GreenApiCatalogMode } from "@/lib/greenapi/catalog";
import { verifyCronBearer } from "@/lib/ycloud/outbox";

export const runtime = "nodejs";
export const maxDuration = 60;

function modeFrom(value: string | null): GreenApiCatalogMode | null {
  return value === "dry-run" || value === "sync" ? value : null;
}

function isTrue(value: string | null): boolean {
  return value?.trim().toLowerCase() === "true";
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json({ error: { code: "CRON_NOT_CONFIGURED" } }, { status: 503 });
  }
  if (!verifyCronBearer(request.headers.get("authorization"), cronSecret)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED" } },
      { status: 401, headers: { "WWW-Authenticate": "Bearer", "Cache-Control": "no-store" } },
    );
  }

  const params = new URL(request.url).searchParams;
  const mode = modeFrom(params.get("mode") ?? "dry-run");
  if (!mode) {
    return NextResponse.json({ error: { code: "INVALID_MODE" } }, { status: 400 });
  }
  if (mode === "sync" && process.env.GREEN_API_CATALOG_SYNC_ENABLED?.trim().toLowerCase() !== "true") {
    return NextResponse.json({ error: { code: "GREEN_API_CATALOG_SYNC_DISABLED" } }, { status: 403 });
  }

  try {
    const result = await syncGreenApiCatalog({
      mode,
      productId: params.get("productId")?.trim() || undefined,
      forceHidden: isTrue(params.get("hidden")),
      force: isTrue(params.get("force")),
    });
    return NextResponse.json(result, {
      status: result.failed > 0 ? 502 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "GREEN_API_CATALOG_SYNC_FAILED";
    const status = code === "GREEN_API_CATALOG_PRODUCT_NOT_FOUND" ? 404 : 500;
    return NextResponse.json({ error: { code } }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
