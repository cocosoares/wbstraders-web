"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PRODUCTS } from "@/data/products";
import { requireAdminAccess } from "@/components/admin/admin-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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

const whatsappReplySchema = z.object({
  conversationId: z.string().uuid(),
  contactId: z.string().uuid(),
  body: z.string().trim().min(1).max(4_000),
});

const whatsappConversationActionSchema = z.object({
  conversationId: z.string().uuid(),
  action: z.enum(["take", "resolve"]),
  resolutionNote: z.string().trim().max(2_000).optional(),
});

const emailRetrySchema = z.object({
  outboxId: z.string().uuid(),
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

export async function queueWhatsAppReply(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = whatsappReplySchema.safeParse({
    conversationId: formData.get("conversationId"),
    contactId: formData.get("contactId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return failure("Escribe una respuesta de hasta 4,000 caracteres.");

  const access = await requireAdminAccess();
  if (access.mode !== "live" || !access.userId) {
    return failure("Conecta Supabase antes de responder por WhatsApp.");
  }
  if (process.env.WHATSAPP_OUTBOUND_ENABLED?.trim().toLowerCase() !== "true") {
    return failure("La mensajerÃ­a de WhatsApp todavÃ­a no estÃ¡ activada.");
  }

  const { error } = await getSupabaseAdmin().rpc("enqueue_whatsapp_outbound", {
    p_conversation_id: parsed.data.conversationId,
    p_contact_id: parsed.data.contactId,
    p_body: parsed.data.body,
    p_message_kind: "text",
    p_metadata: { sentBy: "admin", actorId: access.userId },
  });
  if (error) {
    if (error.message.includes("whatsapp_service_window_expired")) {
      return failure(
        "La ventana de 24 horas ya cerrÃ³. Usa una plantilla aprobada en WhatsApp Business.",
      );
    }
    return failure("No pudimos poner la respuesta en la cola de WhatsApp.");
  }
  revalidatePath("/admin/conversaciones");
  return success("Respuesta puesta en cola para enviar por WhatsApp.");
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
    parsed.data.action === "take"
      ? "Tomaste la conversación. El bot ya no responderá este caso."
      : "Conversación cerrada.",
  );
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
