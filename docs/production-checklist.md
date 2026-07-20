# Puesta en producción

## Identidad y cumplimiento

- [ ] Completar razón social, RUC y domicilio en variables `NEXT_PUBLIC_LEGAL_*`.
- [ ] Validar textos con asesor legal/contador y publicar privacidad, términos, envíos y cambios.
- [ ] Publicar y versionar los términos antes de asignar `policy_version` a nuevas aceptaciones.
- [ ] Registrar el banco de datos personales ante ANPD.
- [ ] Aplicar la migración 002; validar legalmente el Libro de Reclamaciones y ensayar registro, bandeja, respuesta y conservación.
- [ ] Confirmar registros sanitarios, rotulado, advertencias y protocolo +18 en entrega.

## Infraestructura y seguridad

- [ ] Rotar el token de Hostinger expuesto; actualizar cualquier integración que lo use.
- [ ] Configurar dominio, DNS, HTTPS y `NEXT_PUBLIC_SITE_URL`.
- [ ] Crear Supabase de producción con plan que incluya backups; aplicar migraciones y RLS.
- [ ] Aplicar y ensayar la migración 003: pago manual, recuperación de excepciones y expiración de reservas.
- [ ] Guardar `SUPABASE_SERVICE_ROLE_KEY` solo en el servidor.
- [ ] Ensayar backup y restauración.
- [ ] Configurar alertas de errores, espacio, RAM, swap y disponibilidad.

## Operación

- [ ] Cargar costo puesto en almacén, stock y reglas de reserva por SKU.
- [ ] Aprobar margen mínimo por caja, canal y zona de entrega.
- [ ] Definir responsables, horario y SLA de atención/despacho.
- [ ] Verificar precios, fotos reales y promesas de entrega.
- [ ] Completar diez pedidos internos de extremo a extremo.
- [ ] Definir monitoreo diario de reclamos, comprobantes pendientes y excepciones de inventario.

## Pagos

- [ ] Elegir proveedor y contratar condiciones finales.
- [ ] Configurar credenciales y secreto del webhook.
- [ ] Probar todas las transiciones y reintentos en sandbox.
- [ ] Verificar que ninguna URL del navegador pueda marcar un pedido como pagado.
- [ ] Conciliar primer pedido real antes de activar campañas.
- [ ] Ensayar una transferencia/Yape con monto correcto, referencia duplicada y falta de stock; documentar quién puede conciliar.

## Mensajería y medición

- [ ] Configurar YCloud, plantillas, firma de webhook, opt-in y opt-out.
- [ ] Cargar GA4 o GTM solo después del consentimiento.
- [ ] Validar eventos sin duplicados ni PII.
- [ ] Confirmar `purchase` exclusivamente con pago verificado.

- [ ] Configurar `CRON_SECRET` y programar `POST /api/ycloud/outbox` con Bearer; alertar respuestas no 2xx.
- [ ] Programar `POST /api/maintenance/reservations` con el mismo Bearer al menos cada cinco minutos; alertar respuestas no 2xx.
- [ ] Aprobar la plantilla indicada por `YCLOUD_PAYMENT_CONFIRMED_TEMPLATE` y probar sus reintentos/webhooks.

## Puerta de crecimiento

No escalar pauta hasta tener inventario reconciliado, checkout estable, pagos conciliados, contribución positiva y al menos una oferta con operación repetible.
