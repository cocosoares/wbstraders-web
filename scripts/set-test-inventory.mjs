import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const TARGET_ON_HAND = 1_000;
const PRODUCT_IDS = [
  "livvera-malbec",
  "livvera-cabernet",
  "livvera-bonarda",
  "livvera-malvasia",
  "livvera-sangiovese-rose",
  "ambrosia-brut-nature",
  "casa-sauvignon-blanc",
  "casa-malbec",
  "geografia-blancas",
  "geografia-tintas",
  "1700-torrontes",
  "1700-malbec",
  "1700-cabernet",
  "rn40-malbec",
];

function valueFromEnvFile(name) {
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim() || undefined;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || valueFromEnvFile("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || valueFromEnvFile("SUPABASE_SERVICE_ROLE_KEY");

if (!url || !serviceRoleKey) {
  throw new Error("SUPABASE_SERVER_CONFIG_MISSING");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: entries, error: readError } = await supabase
  .from("inventory_ledger")
  .select("product_id, quantity_delta")
  .in("product_id", PRODUCT_IDS);

if (readError) throw readError;

const onHandByProduct = new Map(PRODUCT_IDS.map((productId) => [productId, 0]));
const hasLedgerEntry = new Set();
for (const entry of entries ?? []) {
  onHandByProduct.set(entry.product_id, (onHandByProduct.get(entry.product_id) ?? 0) + entry.quantity_delta);
  hasLedgerEntry.add(entry.product_id);
}

const adjustments = PRODUCT_IDS.flatMap((productId) => {
  const currentOnHand = onHandByProduct.get(productId) ?? 0;
  const quantityDelta = TARGET_ON_HAND - currentOnHand;
  if (quantityDelta === 0) return [];

  return [
    {
      product_id: productId,
      quantity_delta: quantityDelta,
      event_type: hasLedgerEntry.has(productId) ? "adjustment" : "opening_balance",
      reason: `Inventario de prueba ajustado a ${TARGET_ON_HAND} unidades`,
      metadata: { environment: "testing", targetOnHand: TARGET_ON_HAND },
    },
  ];
});

if (adjustments.length) {
  const { error: insertError } = await supabase.from("inventory_ledger").insert(adjustments);
  if (insertError) throw insertError;
}

const { data: availability, error: availabilityError } = await supabase
  .from("inventory_availability")
  .select("product_id, on_hand, available")
  .in("product_id", PRODUCT_IDS);

if (availabilityError) throw availabilityError;

const unavailableProducts = PRODUCT_IDS.filter(
  (productId) => !availability?.some((item) => item.product_id === productId && item.on_hand === TARGET_ON_HAND),
);
if (unavailableProducts.length) {
  throw new Error(`TEST_INVENTORY_VERIFICATION_FAILED:${unavailableProducts.join(",")}`);
}

const minimumAvailable = Math.min(...(availability ?? []).map((item) => item.available));

console.log(
  JSON.stringify({
    products: PRODUCT_IDS.length,
    adjusted: adjustments.length,
    targetOnHand: TARGET_ON_HAND,
    minimumAvailable,
  }),
);
