# Operación de WhatsApp — WBStraders

## Propósito y límite del canal

WhatsApp es el canal de descubrimiento, asesoría, postventa y derivación humana de
WBStraders. El pago y la confirmación de una compra suceden únicamente en el
checkout protegido del sitio. El asistente nunca pide capturas de tarjeta, claves,
datos bancarios ni confirma pagos por texto.

La promoción de vinos requiere confirmar mayoría de edad, respetar las reglas de
Perú y usar una cuenta oficial de WhatsApp Business Platform. Antes de activar el
canal, el responsable de negocio debe validar las políticas vigentes de Meta y la
documentación legal de WBStraders.

## Voz del Sommelier

- Cercana, elegante y clara; siempre en español peruano sencillo.
- Hace una pregunta útil por turno antes de recomendar.
- Ofrece hasta tres alternativas y explica por qué encajan con la ocasión.
- Recomienda únicamente productos del catálogo WBStraders.
- No promete disponibilidad, precio, delivery ni descuentos: el checkout los
  recalcula y confirma.
- Nunca presiona a un cliente con presupuesto limitado; propone la mejor opción
  dentro del rango indicado.

## Flujo conversacional

1. **Edad.** Antes de recomendar alcohol: “¿Confirmas que tienes 18 años o más?”
   Si no confirma, no se muestran productos ni enlaces de compra.
2. **Intención.** Clasificar como recomendación, maridaje, regalo, pedido,
   corporativo/HORECA, reclamo o solicitud humana.
3. **Descubrimiento.** Preguntar solo lo necesario: ocasión/comida, personas,
   preferencia y presupuesto.
4. **Recomendación.** Mostrar una selección breve con el motivo, alternativa y
   siguiente acción. El sistema valida slugs contra el catálogo.
5. **Checkout.** Crear un enlace temporal y atribuible al checkout de
   WBStraders; precio, stock y delivery se validan de nuevo en el servidor.
6. **Seguimiento.** Las actualizaciones de pedido son de servicio; campañas y
   recuperaciones solo se envían con consentimiento y plantilla aprobada cuando
   aplique.

## Derivación obligatoria a una persona

Derivar de inmediato cuando el cliente pide una persona, solicita un pedido grande
o corporativo, tiene un reclamo, menciona pago/captura, requiere entrega urgente,
cuestiona stock/precio, consulta un pedido o expresa frustración.

El inbox debe recibir el motivo, el último mensaje, la intención detectada, el
estado +18, consentimiento comercial y el enlace de compra enviado. Objetivo de
SLA: primera respuesta humana en menos de cinco minutos durante horario operativo.

## Consentimiento y baja

- Registrar por separado consentimiento de recomendaciones/promociones y la
  evidencia de la fuente, fecha y texto mostrado.
- Procesar inmediatamente `PARAR`, `STOP`, `BAJA` y “no promociones”.
- Una baja comercial no impide que el cliente escriba por soporte o por un pedido.
- No guardar datos de pago ni copiar mensajes de un cliente a otro.

## Plantillas a preparar para aprobación

Los nombres y el contenido final deben aprobarse con Meta/YCloud antes de usarse
fuera de una conversación activa.

| Nombre propuesto | Categoría | Uso |
|---|---|---|
| `wbs_order_confirmation` | Utilidad | Confirmación de pedido y enlace de estado. |
| `wbs_payment_update` | Utilidad | Actualización transaccional, nunca solicitud de datos de pago. |
| `wbs_delivery_update` | Utilidad | Preparación, despacho o entrega. |
| `wbs_opt_in_confirmation` | Utilidad | Confirma la preferencia de novedades. |
| `wbs_new_arrivals_18plus` | Marketing | Novedades a personas +18 con consentimiento. |
| `wbs_cart_reminder_18plus` | Marketing | Recordatorio de selección iniciada, con baja clara. |

## Métricas y decisiones

| Evento/medida | Decisión que informa |
|---|---|
| `whatsapp_conversation_started` | Calidad de origen y volumen de demanda. |
| `whatsapp_age_verified` | Cumplimiento y avance del embudo. |
| `whatsapp_recommendation_sent` | Rendimiento de la asesoría por ocasión. |
| `whatsapp_checkout_started` | Conversación a intención de compra. |
| Pedido atribuido a WhatsApp | Conversación a venta y ticket promedio. |
| `whatsapp_handoff_requested` y SLA | Capacidad y calidad del equipo humano. |
| Opt-out, bloqueo y feedback negativo | Frecuencia, relevancia y salud del canal. |

No enviar teléfonos, correos, nombres ni texto libre de conversaciones a GA4/GTM.

## Lista de activación

1. Verificar empresa y número en WhatsApp Business Platform/YCloud.
2. Configurar `YCLOUD_API_KEY`, `YCLOUD_WEBHOOK_SECRET`,
   `YCLOUD_WHATSAPP_NUMBER`, `CRON_SECRET`, `WHATSAPP_OUTBOUND_ENABLED=false`
   y `WHATSAPP_BOT_ENABLED=false` inicialmente.
3. Aplicar migraciones, configurar la URL pública del webhook y probar firma,
   idempotencia, +18, baja y derivación humana.
4. Crear y aprobar plantillas.
5. Cargar el horario y responsables del inbox.
6. Activar el bot primero con un número interno de prueba y luego cambiar
   `WHATSAPP_OUTBOUND_ENABLED=true` para atenciÃ³n humana; activar el bot
   despuÃ©s con `WHATSAPP_BOT_ENABLED=true`.
7. Revisar calidad, conversiones, bajas y conversaciones derivadas cada semana.
