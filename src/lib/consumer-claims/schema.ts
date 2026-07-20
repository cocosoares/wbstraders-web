import { z } from "zod";

const requiredText = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum).max(maximum);

export const consumerClaimSchema = z
  .object({
    customerName: requiredText(2, 160),
    documentType: z.enum(["dni", "ce", "passport", "ruc"]),
    documentNumber: z
      .string()
      .trim()
      .min(4)
      .max(20)
      .regex(/^[A-Za-z0-9-]+$/),
    address: requiredText(5, 300),
    phone: z.string().trim().min(9).max(32),
    email: z.string().trim().email().max(254).toLowerCase(),
    itemType: z.enum(["product", "service"]),
    itemDescription: requiredText(2, 500),
    orderNumber: z.string().trim().max(40).optional(),
    amountCents: z.number().int().min(0).max(100_000_000).optional(),
    claimType: z.enum(["reclamo", "queja"]),
    detail: requiredText(10, 4_000),
    consumerRequest: requiredText(5, 2_000),
    privacyAccepted: z.literal(true),
  })
  .strict()
  .superRefine((value, context) => {
    const digits = value.phone.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 15) {
      context.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Ingresa un teléfono válido",
      });
    }
    if (value.documentType === "dni" && !/^\d{8}$/.test(value.documentNumber)) {
      context.addIssue({
        code: "custom",
        path: ["documentNumber"],
        message: "El DNI debe tener 8 dígitos",
      });
    }
    if (value.documentType === "ruc" && !/^\d{11}$/.test(value.documentNumber)) {
      context.addIssue({
        code: "custom",
        path: ["documentNumber"],
        message: "El RUC debe tener 11 dígitos",
      });
    }
  });

export type ConsumerClaimInput = z.infer<typeof consumerClaimSchema>;
