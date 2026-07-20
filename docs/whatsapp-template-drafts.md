# Borradores de plantillas de WhatsApp — WBStraders

Estos textos son borradores para cargar y aprobar en Meta/YCloud. Confirmar
categoría y contenido definitivo en el administrador de WhatsApp antes de
enviarlos. No incluir datos de pago, contraseñas, DNI ni direcciones completas.

## Utilidad / servicio

### `wbs_order_confirmation`

**Variables:** `{{1}}` número de pedido, `{{2}}` enlace seguro de estado.

> Hola, {{1}}. Recibimos tu pedido en WBStraders. Puedes revisar su estado aquí:
> {{2}}
>
> Si necesitas ayuda, responde a este mensaje.

Botón sugerido: **Ver mi pedido**.

### `wbs_payment_update`

**Variables:** `{{1}}` número de pedido, `{{2}}` estado del pago, `{{3}}` enlace seguro.

> Actualización de {{1}}: tu pago figura como {{2}}.
> Revisa el detalle de tu pedido aquí: {{3}}

No usar esta plantilla para pedir capturas, claves ni transferencias por chat.

### `wbs_delivery_update`

**Variables:** `{{1}}` número de pedido, `{{2}}` etapa, `{{3}}` referencia de seguimiento.

> Tu pedido {{1}} está {{2}}. Referencia: {{3}}.
> Te avisaremos ante cualquier cambio.

### `wbs_human_follow_up`

**Variables:** `{{1}}` nombre del asesor, `{{2}}` asunto.

> Hola. Soy {{1}} del equipo WBStraders. Retomo tu consulta sobre {{2}}.
> ¿En qué puedo ayudarte?

Usar solo para una solicitud previa del cliente o una conversación de servicio.

## Marketing — mayores de edad con consentimiento verificable

### `wbs_new_arrivals_18plus`

**Variables:** `{{1}}` novedad o selección, `{{2}}` enlace a catálogo.

> Hola. Tenemos una nueva selección para mayores de 18 años: {{1}}.
> Puedes verla aquí: {{2}}
>
> Responde **PARAR** para dejar de recibir novedades.

Botón sugerido: **Ver selección**.

### `wbs_cart_reminder_18plus`

**Variables:** `{{1}}` enlace seguro al carrito.

> Dejaste una selección de vinos pendiente en WBStraders. Si aún te interesa,
> puedes retomarla aquí: {{1}}
>
> Disponible para mayores de 18 años. Responde **PARAR** para dejar de recibir novedades.

## Control antes de enviar

- Confirmar +18 y consentimiento de marketing cuando aplique.
- Verificar que la variable no revele información sensible.
- Enviar una sola campaña por intención; no insistir si no hay interacción.
- Registrar bajas inmediatamente y excluirlas de próximos envíos.
