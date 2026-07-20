# Operación e-commerce WBStraders

## Fuente de verdad

Supabase/Postgres conserva clientes, consentimientos, pedidos, inventario, pagos y actividad. Mercado Pago es la autoridad del evento financiero implementado; YCloud es canal; SUNAT/PSE es la autoridad fiscal. Todos sincronizan resultados al pedido interno.

## Estados y responsables

### D2C

`pending_payment → paid → picking → dispatched → delivered`

Excepciones: `cancelled`, `refunded`, `payment_failed`, `chargeback`.

- Growth: atribución, lifecycle y consentimientos.
- Operaciones: stock, picking y entrega.
- Finanzas: conciliación, reembolso y comprobante.
- Atención: WhatsApp e incidencias.

### HORECA y regalos corporativos

`new → qualified → tasting → proposal → negotiation → won/lost → reorder_due`

Cada oportunidad debe tener owner, siguiente acción y fecha. No se avanza una etapa sin sus datos requeridos.

## Reglas de inventario

- Reservar antes de enviar a la pasarela.
- Expirar reservas impagas y registrar la liberación.
- Confirmar la salida solo tras webhook aprobado.
- Si una aprobación llega después de vencer la reserva, volver a validar disponibilidad bajo bloqueo. Sin stock, conciliar el pago pero derivar el pedido a excepción manual sin crear inventario negativo.
- El cron `POST /api/maintenance/reservations` persiste las reservas vencidas como `expired` y devuelve los pedidos impagos a `unfulfilled`.
- Resolver una excepción pagada desde `unfulfilled` a `reserved` vuelve a validar y asignar el pedido completo; si falta un solo SKU, no descuenta ninguno.
- Devoluciones y anulaciones generan movimientos inversos; nunca se edita el historial.
- Cada línea del pedido conserva nombre, SKU, precio, descuento e impuestos del momento de compra.

## Pagos

- Las `back_urls` son navegación, no comprobación.
- Validar firma y consultar el pago desde servidor.
- Registrar eventos con clave única por proveedor e ID externo.
- Procesar duplicados y eventos fuera de orden sin duplicar stock ni mensajes.
- Probar aprobado, pendiente, rechazado, vencido, duplicado, reembolso y contracargo.
- Yape o transferencia solo se concilian desde `/admin/pedidos`, contra el abono observado en la cuenta receptora. Se exige referencia única, monto exacto, nota y confirmación del operador.
- Una captura enviada por el cliente nunca basta para aprobar un pago manual.

## WhatsApp

- El webhook de pago crea el outbox dentro de la misma transacción que confirma el pedido.
- El cron `/api/ycloud/outbox` usa leases y `SKIP LOCKED`; dos workers no pueden reclamar la misma fila vigente.
- Los fallos reintentan con backoff de 1, 2, 4, 8 y 16 minutos. Al agotar cinco intentos quedan como `failed`.
- Un envío aceptado pero no finalizado en base de datos puede reintentarse tras vencer el lease; se reconcilia por `externalId` estable.

- Mensajes transaccionales: confirmación, preparación, despacho y entrega.
- Marketing requiere opt-in separado con fuente, fecha, texto aceptado y baja.
- Una baja excluye campañas de inmediato sin eliminar el historial transaccional permitido.
- WhatsApp nunca cambia un pedido a pagado por texto o captura.

## Comprobantes

- Bajo volumen: emitir en SEE-SOL y registrar tipo, serie, número y fecha.
- Al crecer: integrar PSE acreditado y conservar XML, CDR, representación y estado.
- Reembolso posterior a emisión requiere nota de crédito conforme al proceso contable.
- El RPC administrativo registra el resultado de una emisión externa; nunca sustituye la emisión real ante SUNAT.

## Libro de Reclamaciones

- Mantener visible el enlace público y comprobar diariamente que la ruta de registro responde.
- Cada recepción genera un número único y queda privada bajo RLS; el documento se enmascara antes de llegar a la interfaz administrativa.
- Asignar responsable y fecha interna de seguimiento, responder por el canal declarado y conservar evidencia conforme al plazo y política aprobados.
- No cerrar ni modificar una recepción sin dejar trazabilidad; la revisión legal define retención, respuesta y eventual exportación.

## Revisión diaria

1. Pagos del proveedor contra pedidos internos.
2. Pedidos pagados sin reserva confirmada.
3. Pedidos estancados por etapa y SLA.
4. Stock físico contra libro de movimientos.
5. Comprobantes pendientes o rechazados.
6. Incidencias, reclamos y bajas de marketing.
7. Cola de notificaciones YCloud agotadas o con finalización fallida.
8. Reservas vencidas procesadas y cron sin respuestas no 2xx.
