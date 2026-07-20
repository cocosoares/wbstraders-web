# Plan de medición WBStraders

## Principio

La venta existe cuando el proveedor de pagos confirma el pago mediante webhook. Una visita a la página de retorno, un clic en WhatsApp o una captura no generan `purchase`.

No se envía PII a GA4, GTM ni plataformas publicitarias: quedan excluidos nombre, teléfono, correo, DNI, dirección, referencia y notas del pedido.

## Eventos

| Evento | Disparador | Propiedades permitidas | Decisión |
|---|---|---|---|
| `view_item_list` | Se muestra una lista | `item_list_id`, productos | Rendimiento de colecciones |
| `select_item` | Selección desde lista | producto, posición | Merchandising |
| `view_item` | Vista de producto | SKU, línea, bodega, precio | Interés por producto |
| `add_to_cart` | Adición confirmada | SKU, cantidad, valor | Conversión de ficha |
| `view_cart` | Apertura del carrito | valor, botellas | Fricción de carrito |
| `begin_checkout` | Entrada al checkout | valor, botellas | Inicio de intención |
| `add_shipping_info` | Distrito válido | zona, costo | Efecto del delivery |
| `payment_redirected` | Pedido creado y salida a pasarela | proveedor, valor | Abandono de pago |
| `purchase` | Webhook aprobado | ID de transacción, valor, productos | Ingresos verificados |
| `refund` | Reembolso confirmado | ID de transacción, valor | Rentabilidad real |
| `pack_builder_started` | Primera selección | línea, tamaño | Uso del configurador |
| `pack_builder_completed` | Caja completa | línea, tamaño, valor | Conversión del configurador |
| `tier_unlocked` | Se alcanza una escala | línea, cantidad | Elasticidad por volumen |
| `whatsapp_clicked` | Clic de asistencia | ubicación, intención | Rol de venta asistida |
| `horeca_lead_submitted` | Lead B2B válido | tipo de negocio, zona | Pipeline HORECA |

## Atribución

Persistir en el pedido el primer y último `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` y referrer. Nunca reemplazar la conciliación financiera con los datos de GA4.

## Dashboard semanal

- Producto → carrito → checkout → intento de pago → pago aprobado.
- Ticket, botellas, descuento, delivery subsidiado y contribución por pedido.
- Aprobación, rechazo, pendiente, reembolso y contracargo.
- Precisión de stock, pago a despacho y entrega puntual.
- Recompra por cohortes a 30/60/90 días.
- WhatsApp: primera respuesta, conversación a checkout y conversación a pago.
- HORECA: lead a calificado, degustación, propuesta, ganado y reposición.

## Validación antes de publicar

- Consentimiento denegado: no carga GA4/GTM.
- Consentimiento aceptado: cada evento aparece una sola vez.
- `purchase` no aparece al visitar manualmente una URL de éxito.
- Ningún payload contiene PII.
- Valor y moneda coinciden con el pedido conciliado.
