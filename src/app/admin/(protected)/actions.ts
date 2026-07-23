"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { PRODUCTS } from "@/data/products";
import { validateCrmMedia } from "@/lib/crm/media";
import { requireAdminAccess } from "@/components/admin/admin-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { dispatchPendingWhatsAppOutbox } from "@/lib/whatsapp/outbox";

export type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const orderStageSchema = z.object({
  orderId: z.string().uuid(),
  fulfillmentStatus: z.enum([
    "unfulfilled",
    "reserved",
    "preparing",
    "shipped",
    "delivered",
    "cancelled",
    "returned",
  ]),
});

const manualPaymentSchema = z.object({
  orderId: z.string().uuid(),
  reference: z.string().trim().min(4).max(120),
  amount: z.string().trim().regex(/^\d{1,7}(?:[.,]\d{1,2})?$/),
  note: z.string().trim().min(8).max(500),
  confirmed: z.boolean(),
});

const opportunitySchema = z.object({
  opportunityId: z.string().uuid(),
  stage: z.enum([
    "lead",
    "qualified",
    "recommendation",
    "checkout",
    "tasting",
    "proposal",
    "negotiation",
    "won",
    "lost",
  ]),
  lostReason: z.string().trim().max(240).optional(),
});

const productIds = new Set(PRODUCTS.map((product) => product.id));
const inventorySchema = z.object({
  productId: z.string().refine((value) => productIds.has(value)),
  eventType: z.enum(["opening_balance", "adjustment"]),
  quantityDelta: z.coerce.number().int().min(-1000).max(1000).refine((value) => value !== 0),
  reason: z.string().trim().min(4).max(240),
});

const fiscalDocumentSchema = z.object({
  fiscalDocumentId: z.string().uuid(),
  status: z.enum(["issued", "rejected", "cancelled"]),
  series: z.string().trim().toUpperCase().max(20).optional(),
  number: z.string().trim().max(20).optional(),
  externalReference: z.string().trim().max(200).optional(),
  reason: z.string().trim().max(500).optional(),
  confirmed: z.boolean(),
});

const fiscalSandboxIssueSchema = z.object({
  fiscalDocumentId: z.string().uuid(),
  confirmation: z.literal("PRUEBA"),
});

const whatsappReplySchema = z.object({
  conversationId: z.string().uuid(),
  contactId: z.string().uuid(),
  body: z.string().trim().max(4_000),
  productId: z.string().trim().max(120).optional(),
  attachmentMode: z.enum(["none", "catalog", "product", "upload"]),
});

const whatsappConversationActionSchema = z.object({
  conversationId: z.string().uuid(),
  action: z.enum(["take", "resolve", "reopen"]),
  resolutionNote: z.string().trim().max(2_000).optional(),
});

const emailRetrySchema = z.object({
  outboxId: z.string().uuid(),
});

const whatsappPrioritySchema = z.object({
  conversationId: z.string().uuid(),
  priority: z.coerce.number().int().min(1).max(4),
});

const crmTaskSchema = z.object({
  activityId: z.string().uuid().optional(),
  action: z.enum(["create", "complete", "cancel"]),
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().max(4_000).optional(),
  dueAt: z.string().trim().optional(),
  customerId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
  priority: z.coerce.number().int().min(1).max(4).default(2),
});

const crmCustomerSchema = z.object({
  customerId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  email: z.union([z.literal(""), z.string().trim().email().max(254)]),
  lifecycleStage: z.enum(["prospect", "engaged", "customer", "repeat", "vip", "inactive", "horeca"]),
});

const crmTagSchema = z.object({
  customerId: z.string().uuid(),
  tagId: z.string().uuid(),
  enabled: z.boolean(),
});

const crmMergeCustomerSchema = z.object({
  targetCustomerId: z.string().uuid(),
  sourceCustomerId: z.string().uuid(),
  confirmation: z.literal("FUSIONAR"),
}).refine((value) => value.targetCustomerId !== value.sourceCustomerId);

const crmSavedReplySchema = z.object({
  replyId: z.string().uuid().optional(),
  action: z.enum(["create", "delete"]),
  title: z.string().trim().max(80).optional(),
  body: z.string().trim().max(4_000).optional(),
  category: z.enum(["general", "sales", "delivery", "support", "horeca"]).default("general"),
});

export async function updateOrderFulfillment(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = orderStageSchema.safeParse({
    orderId: formData.get("orderId"),
    fulfillmentStatus: formData.get("fulfillmentStatus"),
  });
  if (!parsed.success) return failure("Selecciona una etapa válida para el pedido.");

  const access = await requireAdminAccess();
  if (access.mode !== "live" || !access.userId) {
    return failure("Conecta Supabase antes de actualizar pedidos.");
  }

  const { error } = await getSupabaseAdmin().rpc(
    "admin_set_order_fulfillment",
    {
      p_order_id: parsed.data.orderId,
      p_fulfillment_status: parsed.data.fulfillmentStatus,
      p_actor_id: access.userId,
    },
  );
  if (error) {
    return failure(adminRpcMessage(error.message, "No pudimos actualizar el pedido."));
  }
  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  return success("Etapa del pedido actualizada.");
}

export async function recordManualPayment(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = manualPaymentSchema.safeParse({
    orderId: formData.get("orderId"),
    reference: formData.get("reference"),
    amount: String(formData.get("amount") || "").replace(",", "."),
    note: formData.get("note"),
    confirmed: formData.get("confirmed") === "true",
  });
  if (!parsed.success) {
    return failure("Completa la referencia, el monto y una nota de verificación válida.");
  }
  if (!parsed.data.confirmed) {
    return failure("Confirma que verificaste el abono en la cuenta receptora.");
  }

  const amountCents = decimalSolesToCents(parsed.data.amount);
  if (amountCents === null) {
    return failure("Ingresa el monto en soles con un máximo de dos decimales.");
  }

  const access = await requireAdminAccess();
  if (access.mode !== "live" || !access.userId) {
    return failure("Conecta Supabase antes de conciliar pagos.");
  }

  const { data, error } = await getSupabaseAdmin().rpc(
    "admin_record_manual_payment",
    {
      p_order_id: parsed.data.orderId,
      p_provider_reference: parsed.data.reference,
      p_amount_cents: amountCents,
      p_note: parsed.data.note,
      p_actor_id: access.userId,
    },
  );
  if (error) {
    return failure(manualPaymentRpcMessage(error.message));
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  const result = Array.isArray(data) ? data[0] : data;
  return success(
    result?.inventory_allocated === false
      ? "Pago conciliado. El pedido quedó en revisión porque aún no hay stock suficiente."
      : "Pago conciliado e inventario asignado.",
  );
}

export async function updateOpportunity(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = opportunitySchema.safeParse({
    opportunityId: formData.get("opportunityId"),
    stage: formData.get("stage"),
    lostReason: String(formData.get("lostReason") || "").trim() || undefined,
  });
  if (!parsed.success) return failure("Revisa la etapa y el motivo de pérdida.");

  if (parsed.data.stage === "lost" && !parsed.data.lostReason) {
    return failure("Indica por qué se perdió la oportunidad.");
  }

  const access = await requireAdminAccess();
  if (access.mode !== "live" || !access.userId) {
    return failure("Conecta Supabase antes de actualizar oportunidades.");
  }

  const { error } = await getSupabaseAdmin().rpc(
    "admin_set_opportunity_stage",
    {
      p_opportunity_id: parsed.data.opportunityId,
      p_stage: parsed.data.stage,
      p_lost_reason: parsed.data.lostReason || null,
      p_actor_id: access.userId,
    },
  );
  if (error) {
    return failure(
      adminRpcMessage(error.message, "No pudimos actualizar la oportunidad."),
    );
  }
  revalidatePath("/admin");
  revalidatePath("/admin/oportunidades");
  return success("Oportunidad actualizada.");
}

export async function registerInventoryMovement(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = inventorySchema.safeParse({
    productId: formData.get("productId"),
    eventType: formData.get("eventType"),
    quantityDelta: formData.get("quantityDelta"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return failure("Completa producto, tipo, cantidad distinta de cero y motivo.");
  }
  if (parsed.data.eventType === "opening_balance" && parsed.data.quantityDelta < 1) {
    return failure("El saldo inicial debe ser una cantidad positiva.");
  }

  const access = await requireAdminAccess();
  if (access.mode !== "live" || !access.userId) {
    return failure("Conecta Supabase antes de registrar inventario.");
  }

  const { error } = await getSupabaseAdmin().rpc("admin_record_inventory", {
    p_product_id: parsed.data.productId,
    p_quantity_delta: parsed.data.quantityDelta,
    p_event_type: parsed.data.eventType,
    p_reason: parsed.data.reason,
    p_actor_id: access.userId,
  });
  if (error) {
    return failure(
      adminRpcMessage(error.message, "No pudimos registrar el movimiento."),
    );
  }
  revalidatePath("/admin");
  revalidatePath("/admin/inventario");
  return success("Movimiento registrado y disponibilidad recalculada.");
}

export async function updateFiscalDocumentStatus(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = fiscalDocumentSchema.safeParse({
    fiscalDocumentId: formData.get("fiscalDocumentId"),
    status: formData.get("status"),
    series: String(formData.get("series") || "").trim() || undefined,
    number: String(formData.get("number") || "").trim() || undefined,
    externalReference:
      String(formData.get("externalReference") || "").trim() || undefined,
    reason: String(formData.get("reason") || "").trim() || undefined,
    confirmed: formData.get("confirmed") === "true",
  });
  if (!parsed.success) {
    return failure("Revisa los datos del resultado fiscal antes de guardarlo.");
  }

  if (parsed.data.status === "issued") {
    if (!parsed.data.series || !/^[A-Z0-9-]{1,20}$/.test(parsed.data.series)) {
      return failure("Ingresa una serie válida de hasta 20 caracteres.");
    }
    if (!parsed.data.number || !/^\d{1,20}$/.test(parsed.data.number)) {
      return failure("Ingresa el número correlativo usando solo dígitos.");
    }
  }
  if (parsed.data.status === "rejected" && (parsed.data.reason?.length || 0) < 5) {
    return failure("Registra el motivo recibido al rechazar el comprobante.");
  }
  if (parsed.data.status === "cancelled") {
    if ((parsed.data.reason?.length || 0) < 5 || !parsed.data.externalReference) {
      return failure("La anulación requiere motivo y referencia externa.");
    }
    if (!parsed.data.confirmed) {
      return failure("Confirma que la anulación ya se realizó fuera de esta aplicación.");
    }
  }

  const access = await requireAdminAccess();
  if (access.mode !== "live" || !access.userId) {
    return failure("Conecta Supabase antes de actualizar comprobantes.");
  }

  const { error } = await getSupabaseAdmin().rpc(
    "admin_set_fiscal_document_status",
    {
      p_fiscal_document_id: parsed.data.fiscalDocumentId,
      p_status: parsed.data.status,
      p_series: parsed.data.series || null,
      p_number: parsed.data.number || null,
      p_external_reference: parsed.data.externalReference || null,
      p_reason: parsed.data.reason || null,
      p_actor_id: access.userId,
    },
  );
  if (error) {
    return failure(fiscalRpcMessage(error.message));
  }

  revalidatePath("/admin");
  revalidatePath("/admin/comprobantes");
  return success(
    parsed.data.status === "issued"
      ? "Resultado registrado como emitido."
      : parsed.data.status === "rejected"
        ? "Rechazo registrado."
        : "Anulación registrada.",
  );
}

export async function issueSandboxFiscalDocument(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (process.env.FISCAL_SANDBOX_ENABLED?.trim().toLowerCase() !== "true") {
    return failure("El modo fiscal de prueba no estÃ¡ habilitado en este entorno.");
  }

  const parsed = fiscalSandboxIssueSchema.safeParse({
    fiscalDocumentId: formData.get("fiscalDocumentId"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) {
    return failure("Escribe PRUEBA para confirmar la emisiÃ³n sin validez tributaria.");
  }

  const access = await requireAdminAccess();
  if (access.mode !== "live" || !access.userId) {
    return failure("Conecta Supabase antes de emitir un comprobante de prueba.");
  }

  const { data, error } = await getSupabaseAdmin().rpc(
    "admin_issue_sandbox_fiscal_document",
    {
      p_fiscal_document_id: parsed.data.fiscalDocumentId,
      p_actor_id: access.userId,
    },
  );
  if (error) return failure(fiscalSandboxRpcMessage(error.message));

  const result = Array.isArray(data) ? data[0] : data;
  const reference = result?.series && result?.number ? ` ${result.series}-${result.number}` : "";
  revalidatePath("/admin");
  revalidatePath("/admin/comprobantes");
  return success(`Comprobante de prueba${reference} emitido. No tiene validez ante SUNAT.`);
}

export async function queueWhatsAppReply(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = whatsappReplySchema.safeParse({
    conversationId: formData.get("conversationId"),
    contactId: formData.get("contactId"),
    body: formData.get("body"),
    productId: String(formData.get("productId") || "").trim() || undefined,
    attachmentMode: String(formData.get("attachmentMode") || "none"),
  });
  if (!parsed.success) return failure("Revisa el mensaje y el adjunto antes de enviarlo.");

  const access = await requireAdminAccess();
  if (access.mode !== "live" || !access.userId) {
    return failure("Conecta Supabase antes de responder por WhatsApp.");
  }
  if (process.env.WHATSAPP_OUTBOUND_ENABLED?.trim().toLowerCase() !== "true") {
    return failure("La mensajerÃ­a de WhatsApp todavÃ­a no estÃ¡ activada.");
  }

  const db = getSupabaseAdmin();
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://wbstraders.pe").replace(/\/$/, "");
  const uploadedFile = formData.get("attachment");
  let body = parsed.data.body;
  let kind: "text" | "interactive" | "media" = "text";
  let storagePath: string | null = null;
  let rich: Record<string, unknown> | undefined;

  if (parsed.data.attachmentMode === "catalog") {
    const url = `${baseUrl}/catalogos/fiestas-patrias-2026.pdf`;
    body ||= "Te comparto el catálogo de WBStraders. Si me cuentas la ocasión o tu presupuesto, te ayudo a elegir.";
    kind = "media";
    rich = {
      attachment: {
        url,
        fileName: "catalogo-wbstraders.pdf",
        mimeType: "application/pdf",
        caption: "Catálogo WBStraders",
      },
    };
  }

  if (parsed.data.attachmentMode === "product") {
    const product = PRODUCTS.find((item) => item.id === parsed.data.productId);
    if (!product) return failure("Selecciona un producto válido del catálogo.");
    body ||= `🍷 ${product.name}\n${product.description}\n\nVa muy bien con ${product.pairings.slice(0, 2).join(" y ")}.`;
    kind = "interactive";
    const productImageUrl = product.image
      ? new URL(product.image, baseUrl).toString()
      : null;
    rich = {
      ...(productImageUrl
        ? {
            image: {
              url: productImageUrl,
              fileName: `${product.slug}.webp`,
              caption: product.name,
              mimeType: "image/webp",
            },
          }
        : {}),
      actionButtons: [
        {
          type: "url",
          id: `product-${product.id}`.slice(0, 80),
          text: "Ver producto",
          url: `${baseUrl}/producto/${product.slug}`,
        },
      ],
    };
  }

  if (parsed.data.attachmentMode === "upload") {
    if (!(uploadedFile instanceof File) || uploadedFile.size === 0) {
      return failure("Selecciona una imagen o PDF para adjuntar.");
    }
    const validation = validateCrmMedia({ size: uploadedFile.size, mimeType: uploadedFile.type });
    if (!validation.valid) {
      return failure("El archivo debe ser JPG, PNG, WebP o PDF y pesar como máximo 10 MB.");
    }
    const extension = validation.extension;
    const safeName = uploadedFile.name
      .replace(/\.[^.]+$/, "")
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "archivo";
    storagePath = `${parsed.data.conversationId}/${randomUUID()}-${safeName}.${extension}`;
    const uploaded = await db.storage.from("whatsapp-media").upload(storagePath, uploadedFile, {
      contentType: uploadedFile.type,
      upsert: false,
      cacheControl: "private, max-age=900",
    });
    if (uploaded.error) return failure("No pudimos guardar el archivo de forma segura.");
    body ||= `Te comparto ${uploadedFile.name}.`;
    kind = "media";
    rich = {
      attachment: {
        storagePath,
        fileName: `${safeName}.${extension}`,
        mimeType: uploadedFile.type,
        caption: body.slice(0, 1_024),
      },
    };
  }

  if (!body) return failure("Escribe una respuesta o selecciona un adjunto.");

  const { error } = await db.rpc("admin_send_whatsapp_reply", {
    p_conversation_id: parsed.data.conversationId,
    p_contact_id: parsed.data.contactId,
    p_body: body,
    p_message_kind: kind,
    p_metadata: { ...(rich ? { rich } : {}), sentBy: "admin", actorId: access.userId },
    p_actor_id: access.userId,
  });
  if (error) {
    if (storagePath) await db.storage.from("whatsapp-media").remove([storagePath]);
    if (error.message.includes("whatsapp_service_window_expired")) {
      return failure(
        "La ventana de 24 horas ya cerrÃ³. Usa una plantilla aprobada en WhatsApp Business.",
      );
    }
    return failure("No pudimos poner la respuesta en la cola de WhatsApp.");
  }
  after(() =>
    dispatchPendingWhatsAppOutbox(db, 3).catch((dispatchError) => {
      console.error("[crm] immediate WhatsApp dispatch failed", dispatchError);
    }),
  );
  revalidatePath("/admin/conversaciones");
  return success("Respuesta enviada a la cola de WhatsApp.");
}

export async function manageWhatsAppConversation(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = whatsappConversationActionSchema.safeParse({
    conversationId: formData.get("conversationId"),
    action: formData.get("action"),
    resolutionNote: String(formData.get("resolutionNote") || "").trim() || undefined,
  });
  if (!parsed.success) return failure("No pudimos actualizar esta conversación.");

  const access = await requireAdminAccess();
  if (access.mode !== "live" || !access.userId) {
    return failure("Conecta Supabase antes de gestionar conversaciones.");
  }
  const { error } = await getSupabaseAdmin().rpc("admin_manage_whatsapp_conversation", {
    p_conversation_id: parsed.data.conversationId,
    p_action: parsed.data.action,
    p_resolution_note: parsed.data.resolutionNote ?? null,
    p_actor_id: access.userId,
  });
  if (error) return failure("No pudimos actualizar la propiedad de la conversación.");
  revalidatePath("/admin/conversaciones");
  return success(
    parsed.data.action === "reopen"
      ? "Conversación reabierta y asignada."
      : parsed.data.action === "take"
      ? "Tomaste la conversación. El bot ya no responderá este caso."
      : "Conversación cerrada.",
  );
}

export async function markCrmConversationRead(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const conversationId = z.string().uuid().safeParse(formData.get("conversationId"));
  if (!conversationId.success) return failure("No pudimos identificar la conversación.");
  const access = await requireAdminAccess();
  if (access.mode !== "live" || !access.userId) return failure("Acceso administrativo requerido.");
  const { error } = await getSupabaseAdmin().rpc("admin_mark_whatsapp_read", {
    p_conversation_id: conversationId.data,
    p_actor_id: access.userId,
  });
  if (error) return failure("No pudimos marcar la conversación como leída.");
  revalidatePath("/admin/conversaciones");
  return success("Conversación marcada como leída.");
}

export async function updateCrmConversationPriority(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = whatsappPrioritySchema.safeParse({
    conversationId: formData.get("conversationId"),
    priority: formData.get("priority"),
  });
  if (!parsed.success) return failure("Selecciona una prioridad válida.");
  const access = await requireAdminAccess();
  if (access.mode !== "live" || !access.userId) return failure("Acceso administrativo requerido.");
  const { error } = await getSupabaseAdmin().rpc("admin_set_whatsapp_priority", {
    p_conversation_id: parsed.data.conversationId,
    p_priority: parsed.data.priority,
    p_actor_id: access.userId,
  });
  if (error) return failure("No pudimos actualizar la prioridad.");
  revalidatePath("/admin/conversaciones");
  return success("Prioridad actualizada.");
}

export async function manageCrmTask(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = crmTaskSchema.safeParse({
    activityId: String(formData.get("activityId") || "").trim() || undefined,
    action: formData.get("action"),
    subject: String(formData.get("subject") || "").trim() || undefined,
    body: String(formData.get("body") || "").trim() || undefined,
    dueAt: String(formData.get("dueAt") || "").trim() || undefined,
    customerId: String(formData.get("customerId") || "").trim() || undefined,
    conversationId: String(formData.get("conversationId") || "").trim() || undefined,
    opportunityId: String(formData.get("opportunityId") || "").trim() || undefined,
    priority: formData.get("priority") || 2,
  });
  if (!parsed.success || (parsed.data.action === "create" && !parsed.data.subject)) {
    return failure("Revisa el asunto, fecha y prioridad de la tarea.");
  }
  let dueAt: string | null = null;
  if (parsed.data.dueAt) {
    const date = new Date(parsed.data.dueAt);
    if (!Number.isFinite(date.getTime())) return failure("Selecciona una fecha válida.");
    dueAt = date.toISOString();
  }
  const access = await requireAdminAccess();
  if (access.mode !== "live" || !access.userId) return failure("Acceso administrativo requerido.");
  const { error } = await getSupabaseAdmin().rpc("admin_manage_crm_task", {
    p_activity_id: parsed.data.activityId ?? null,
    p_action: parsed.data.action,
    p_subject: parsed.data.subject ?? null,
    p_body: parsed.data.body ?? null,
    p_due_at: dueAt,
    p_customer_id: parsed.data.customerId ?? null,
    p_conversation_id: parsed.data.conversationId ?? null,
    p_opportunity_id: parsed.data.opportunityId ?? null,
    p_priority: parsed.data.priority,
    p_actor_id: access.userId,
  });
  if (error) return failure("No pudimos actualizar la tarea.");
  revalidatePath("/admin/conversaciones");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/oportunidades");
  return success(parsed.data.action === "create" ? "Tarea creada." : "Tarea actualizada.");
}

export async function updateCrmCustomer(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = crmCustomerSchema.safeParse({
    customerId: formData.get("customerId"),
    name: formData.get("name"),
    email: String(formData.get("email") || "").trim(),
    lifecycleStage: formData.get("lifecycleStage"),
  });
  if (!parsed.success) return failure("Revisa el nombre, correo y segmento del cliente.");
  const access = await requireAdminAccess();
  if (access.mode !== "live" || !access.userId) return failure("Acceso administrativo requerido.");
  const { error } = await getSupabaseAdmin().rpc("admin_update_crm_customer", {
    p_customer_id: parsed.data.customerId,
    p_name: parsed.data.name,
    p_email: parsed.data.email,
    p_lifecycle_stage: parsed.data.lifecycleStage,
    p_actor_id: access.userId,
  });
  if (error) return failure("No pudimos actualizar el perfil del cliente.");
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${parsed.data.customerId}`);
  revalidatePath("/admin/conversaciones");
  return success("Perfil actualizado.");
}

export async function setCrmCustomerTag(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = crmTagSchema.safeParse({
    customerId: formData.get("customerId"),
    tagId: formData.get("tagId"),
    enabled: formData.get("enabled") === "true",
  });
  if (!parsed.success) return failure("No pudimos identificar la etiqueta.");
  const access = await requireAdminAccess();
  if (access.mode !== "live" || !access.userId) return failure("Acceso administrativo requerido.");
  const { error } = await getSupabaseAdmin().rpc("admin_set_crm_customer_tag", {
    p_customer_id: parsed.data.customerId,
    p_tag_id: parsed.data.tagId,
    p_enabled: parsed.data.enabled,
    p_actor_id: access.userId,
  });
  if (error) return failure("No pudimos actualizar la etiqueta.");
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${parsed.data.customerId}`);
  revalidatePath("/admin/conversaciones");
  return success("Etiqueta actualizada.");
}

export async function manageCrmSavedReply(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = crmSavedReplySchema.safeParse({
    replyId: String(formData.get("replyId") || "").trim() || undefined,
    action: formData.get("action"),
    title: String(formData.get("title") || "").trim() || undefined,
    body: String(formData.get("body") || "").trim() || undefined,
    category: formData.get("category") || "general",
  });
  if (!parsed.success) return failure("Revisa la respuesta rápida.");
  const access = await requireAdminAccess();
  if (access.mode !== "live" || !access.userId) return failure("Acceso administrativo requerido.");
  const db = getSupabaseAdmin();
  if (parsed.data.action === "create") {
    if (!parsed.data.title || !parsed.data.body) return failure("Completa título y mensaje.");
    const inserted = await db.from("crm_saved_replies").insert({
      title: parsed.data.title,
      body: parsed.data.body,
      category: parsed.data.category,
      created_by: access.userId,
    });
    if (inserted.error) return failure("No pudimos guardar la respuesta rápida.");
  } else {
    if (!parsed.data.replyId) return failure("No pudimos identificar la respuesta rápida.");
    const removed = await db.from("crm_saved_replies").update({ active: false }).eq("id", parsed.data.replyId);
    if (removed.error) return failure("No pudimos ocultar la respuesta rápida.");
  }
  await db.from("audit_log").insert({
    actor_id: access.userId,
    actor_type: "admin",
    action: `crm.saved_reply_${parsed.data.action}`,
    entity_type: "crm_saved_reply",
    entity_id: parsed.data.replyId ?? "new",
  });
  revalidatePath("/admin/conversaciones");
  return success(parsed.data.action === "create" ? "Respuesta rápida guardada." : "Respuesta rápida eliminada.");
}

export async function mergeCrmCustomers(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = crmMergeCustomerSchema.safeParse({
    targetCustomerId: formData.get("targetCustomerId"),
    sourceCustomerId: formData.get("sourceCustomerId"),
    confirmation: String(formData.get("confirmation") || "").trim().toUpperCase(),
  });
  if (!parsed.success) return failure("Selecciona el duplicado y escribe FUSIONAR para confirmar.");
  const access = await requireAdminAccess();
  if (access.mode !== "live" || !access.userId) return failure("Acceso administrativo requerido.");
  const { error } = await getSupabaseAdmin().rpc("admin_merge_crm_customers", {
    p_source_customer_id: parsed.data.sourceCustomerId,
    p_target_customer_id: parsed.data.targetCustomerId,
    p_actor_id: access.userId,
  });
  if (error) return failure("No pudimos fusionar estos clientes. Revisa que ambos registros sigan disponibles.");
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${parsed.data.targetCustomerId}`);
  revalidatePath("/admin/conversaciones");
  revalidatePath("/admin/oportunidades");
  return success("Duplicado fusionado. Pedidos, conversaciones, tareas y score quedaron en el cliente principal.");
}

export async function retryEmailDelivery(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = emailRetrySchema.safeParse({ outboxId: formData.get("outboxId") });
  if (!parsed.success) return failure("No pudimos identificar el correo para reintentar.");

  const access = await requireAdminAccess();
  if (access.mode !== "live" || !access.userId) {
    return failure("Conecta Supabase antes de reintentar correos.");
  }

  const { error } = await getSupabaseAdmin().rpc("admin_retry_email_outbox", {
    p_outbox_id: parsed.data.outboxId,
    p_actor_id: access.userId,
  });
  if (error) {
    if (error.message.includes("email_outbox_not_retryable")) {
      return failure("Este correo ya no está en un estado que permita reintento.");
    }
    return failure("No pudimos devolver el correo a la cola. Inténtalo nuevamente.");
  }

  revalidatePath("/admin/emails");
  return success("Correo devuelto a la cola. Se procesará en menos de un minuto.");
}

function adminRpcMessage(message: string, fallback: string) {
  if (message.includes("invalid_fulfillment_transition")) {
    return "Avanza el pedido una etapa a la vez.";
  }
  if (message.includes("payment_required")) {
    return "El pago debe estar aprobado antes de reservar o preparar el pedido.";
  }
  if (message.includes("inventory_still_unavailable")) {
    return "Todavía no hay stock suficiente para asignar todo el pedido.";
  }
  if (message.includes("refund_required_before_cancellation")) {
    return "Un pedido pagado requiere reembolso antes de cancelarse.";
  }
  if (message.includes("opening_balance_already_exists")) {
    return "Este producto ya tiene movimientos. Usa un ajuste de inventario.";
  }
  if (message.includes("lost_reason_required")) {
    return "Indica por qué se perdió la oportunidad.";
  }
  return fallback;
}

function manualPaymentRpcMessage(message: string) {
  if (message.includes("manual_payment_amount_mismatch")) {
    return "El monto verificado no coincide exactamente con el total del pedido.";
  }
  if (message.includes("manual_payment_reference_already_used")) {
    return "Esa referencia ya fue usada para conciliar otro pedido.";
  }
  if (message.includes("payment_already_reconciled")) {
    return "Este pedido ya fue conciliado con otra referencia.";
  }
  if (message.includes("manual_payment_only")) {
    return "Este pedido no usa un medio de pago coordinado.";
  }
  if (message.includes("payment_not_pending")) {
    return "El pedido ya no tiene un pago pendiente conciliable.";
  }
  if (message.includes("invalid_manual_payment_reference")) {
    return "Ingresa una referencia de operación válida.";
  }
  if (message.includes("manual_payment_note_required")) {
    return "Describe brevemente cómo verificaste el abono.";
  }
  return "No pudimos conciliar el pago. Verifica los datos e inténtalo nuevamente.";
}

function fiscalRpcMessage(message: string) {
  if (message.includes("fiscal_document_not_found")) {
    return "No encontramos el comprobante solicitado.";
  }
  if (message.includes("unsupported_manual_fiscal_document")) {
    return "Este comprobante no pertenece a la cola fiscal manual.";
  }
  if (
    message.includes("invalid_fiscal_series") ||
    message.includes("invalid_fiscal_number") ||
    message.includes("fiscal_series_and_number_required_together")
  ) {
    return "Revisa la serie y el número correlativo.";
  }
  if (message.includes("fiscal_rejection_reason_required")) {
    return "Registra un motivo de rechazo válido.";
  }
  if (message.includes("fiscal_cancellation_reference_and_reason_required")) {
    return "La anulación requiere referencia externa y motivo.";
  }
  if (message.includes("invalid_fiscal_status_transition")) {
    return "Ese cambio no está permitido desde el estado actual.";
  }
  return "No pudimos actualizar el comprobante. Revisa los datos e inténtalo nuevamente.";
}

function fiscalSandboxRpcMessage(message: string) {
  if (message.includes("fiscal_sandbox_not_enabled")) {
    return "La base fiscal no estÃ¡ en modo de prueba.";
  }
  if (message.includes("sandbox_payment_not_approved")) {
    return "Primero concilia el pago del pedido interno de prueba.";
  }
  if (message.includes("sandbox_internal_test_order_required")) {
    return "Por seguridad, sÃ³lo se emiten pruebas para pedidos creados con el cupÃ³n interno.";
  }
  if (message.includes("fiscal_document_not_pending")) {
    return "Este comprobante ya fue procesado o no admite una emisiÃ³n de prueba.";
  }
  return "No pudimos emitir el comprobante de prueba. Revisa la migraciÃ³n fiscal y vuelve a intentarlo.";
}

function success(message: string): AdminActionState {
  return { status: "success", message };
}

function failure(message: string): AdminActionState {
  return { status: "error", message };
}

function decimalSolesToCents(value: string): number | null {
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return null;
  const whole = Number.parseInt(match[1], 10);
  const decimal = Number.parseInt((match[2] || "").padEnd(2, "0"), 10) || 0;
  const cents = whole * 100 + decimal;
  return Number.isSafeInteger(cents) ? cents : null;
}
