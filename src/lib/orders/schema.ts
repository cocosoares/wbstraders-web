import { z } from "zod";

const trimmed = (max: number) => z.string().trim().min(1).max(max);

const safeReferrerSchema = z.string().trim().max(2048).transform((value, ctx) => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsafe_protocol");
    // Referrer query strings and fragments may contain identifiers or PII; only
    // origin + path are needed for channel attribution.
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    ctx.addIssue({ code: "custom", message: "El referrer no es una URL web válida" });
    return z.NEVER;
  }
});

const attributionTouchSchema = z.object({
  source: z.string().trim().max(100).optional(),
  medium: z.string().trim().max(100).optional(),
  campaign: z.string().trim().max(160).optional(),
  content: z.string().trim().max(160).optional(),
  term: z.string().trim().max(160).optional(),
  referrer: safeReferrerSchema.optional(),
});

export const customerSchema = z.object({
  name: trimmed(160).min(2),
  phone: trimmed(32).transform((value, ctx) => {
    const normalized = value.replace(/\D/g, "");
    if (normalized.length < 9 || normalized.length > 15) {
      ctx.addIssue({ code: "custom", message: "Ingresa un teléfono válido" });
      return z.NEVER;
    }
    return value;
  }),
  email: z.string().trim().email().max(254).toLowerCase(),
});

export const fiscalSchema = z
  .object({
    receiptType: z.enum(["boleta", "factura"]),
    documentType: z.enum(["dni", "ruc"]).optional(),
    documentNumber: z.string().trim().max(11).optional(),
    businessName: z.string().trim().max(200).optional(),
    fiscalAddress: z.string().trim().max(300).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.receiptType === "factura") {
      if (value.documentType !== "ruc") {
        ctx.addIssue({ code: "custom", path: ["documentType"], message: "La factura requiere RUC" });
      }
      if (!/^\d{11}$/.test(value.documentNumber ?? "")) {
        ctx.addIssue({ code: "custom", path: ["documentNumber"], message: "El RUC debe tener 11 dígitos" });
      }
      if (!value.businessName || value.businessName.length < 2) {
        ctx.addIssue({ code: "custom", path: ["businessName"], message: "Ingresa la razón social" });
      }
      if (!value.fiscalAddress || value.fiscalAddress.length < 5) {
        ctx.addIssue({ code: "custom", path: ["fiscalAddress"], message: "Ingresa el domicilio fiscal" });
      }
    } else if (value.documentNumber) {
      if (value.documentType === "dni" && !/^\d{8}$/.test(value.documentNumber)) {
        ctx.addIssue({ code: "custom", path: ["documentNumber"], message: "El DNI debe tener 8 dígitos" });
      }
      if (value.documentType === "ruc" && !/^\d{11}$/.test(value.documentNumber)) {
        ctx.addIssue({ code: "custom", path: ["documentNumber"], message: "El RUC debe tener 11 dígitos" });
      }
    }
  });

export const createOrderSchema = z.object({
  customer: customerSchema,
  delivery: z.object({
    district: trimmed(100),
    address: trimmed(300).min(5),
    reference: z.string().trim().max(300).optional(),
  }),
  fiscal: fiscalSchema.optional().default({ receiptType: "boleta" }),
  paymentMethod: z.enum(["mercadopago", "manual"]),
  testCoupon: z.string().trim().min(1).max(64).optional(),
  notes: z.string().trim().max(1000).optional(),
  marketingConsent: z.boolean(),
  ageConfirmed: z.literal(true, { error: "Debes confirmar que eres mayor de 18 años" }),
  termsAccepted: z.literal(true, { error: "Debes aceptar los términos y condiciones" }),
  items: z
    .array(z.object({ productId: trimmed(100), qty: z.number().int().min(1).max(48) }))
    .min(1)
    .max(50),
  attribution: attributionTouchSchema
    .extend({
      first: attributionTouchSchema.optional(),
      last: attributionTouchSchema.optional(),
    })
    // Attribution is collected from browser storage. Older visits can retain
    // harmless keys that are no longer part of the current model; discard
    // those keys instead of preventing a legitimate purchase.
    .optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type FiscalInput = z.infer<typeof fiscalSchema>;

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}
