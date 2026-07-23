# WBStraders — e-commerce de vinos de autor

Tienda D2C y operación comercial para WBStraders, importadora boutique de vinos argentinos en Lima. Construida con Next.js 15, TypeScript, Tailwind CSS 4, Supabase, Zustand y Vitest.

## Capacidades

- Catálogo con precios exactos por caja y mix & match por línea.
- Carrito persistente y checkout invitado accesible.
- Pedido creado antes de pagar, snapshots de precio y reservas de inventario.
- Mercado Pago Checkout Pro por REST, retorno interno y webhook idempotente.
- Pago coordinado: crea pedidos pendientes y solo un administrador puede conciliarlos contra un abono real, con monto exacto y trazabilidad.
- `/admin` como CRM operativo para pedidos, clientes, inventario, oportunidades, reclamos y comprobantes.
- Integración de webhooks YCloud y consentimiento de marketing trazable.
- Email transaccional con Resend, cola durable, reintentos, webhook firmado y contactos comerciales con consentimiento.
- Sommelier con OpenRouter, fallback local, validación y rate limit.
- Consentimiento previo a GA4/GTM y eventos sin PII.
- Páginas de privacidad, términos, envíos/cambios y Libro de Reclamaciones.
- Age gate y confirmación +18 en checkout.

## Desarrollo

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Comandos de verificación:

```bash
npm test
npx tsc --noEmit
npm run build
npm audit
```

El proyecto de video está separado:

```bash
cd promo-video
npm ci
npx tsc --noEmit
npm run render
```

## Configuración

`.env.example` documenta todas las variables. Principios obligatorios:

- `SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `RESEND_API_KEY` y secretos de webhook son solo de servidor.
- `PAYMENT_PROVIDER=manual` sirve para desarrollo; no marca pedidos como pagados.
- Producción requiere Supabase con backups, migraciones aplicadas y RLS activa.
- Si GA4/GTM no está configurado o el visitante no consiente, no se carga analítica.
- Nunca guardar tokens reales en `.codex/`, `.mcp.json` ni archivos versionados.

## Base de datos

Las migraciones viven en `supabase/migrations` y se aplican en orden. Ejecutarlas con Supabase CLI o desde el SQL Editor del proyecto correcto. El modelo separa los estados de pedido, pago, envío y comprobante; `inventory_ledger` es el historial contable del stock.

## Pagos

Flujo esperado:

1. `POST /api/orders` valida productos y recalcula precios en servidor.
2. Se crea el pedido y se reserva stock.
3. Mercado Pago recibe `external_reference = order_id`.
4. El navegador vuelve a `/pago/exito`, `/pago/pendiente` o `/pago/error`.
5. Solo el webhook firmado y la consulta servidor-servidor pueden confirmar el pago.

Las URLs de retorno y las capturas de pantalla no son prueba de pago.
La solicitud exige `ageConfirmed: true` y `termsAccepted: true`; la aceptación
de términos se registra como consentimiento con pedido y fecha, sin atribuir una
versión legal mientras no exista una versión publicada explícita.

Los pedidos con `payment_provider = manual` se concilian en `/admin/pedidos`.
La función transaccional exige referencia única, monto idéntico al pedido, nota de
verificación y operador autenticado. Si el pago existe pero el stock ya no está
disponible, conserva la verdad financiera (`approved`) y deriva el despacho a una
excepción sin crear una salida parcial de inventario.

## Operación y lanzamiento

- [Plan de medición](docs/tracking-plan.md)
- [Modelo operativo](docs/operations.md)
- [Checklist de producción](docs/production-checklist.md)
- [Sistema de diseño](design-system/MASTER.md)

Antes de aceptar pagos reales deben completarse razón social, RUC, domicilio, credenciales, reglas logísticas, costos/márgenes, stock y textos validados por asesor legal/contable.

## Reclamos y comprobantes

`/libro-de-reclamaciones` registra solicitudes privadas mediante el endpoint
rate-limited `/api/consumer-claims` y devuelve un número de recepción. La bandeja
`/admin/reclamos` enmascara el documento antes de renderizarlo. La migración 002
debe aplicarse para habilitar este flujo; la publicación definitiva requiere
validar el formulario, los textos y el procedimiento de respuesta con asesoría legal.

El checkout crea una boleta o factura pendiente. `/admin/comprobantes` es una cola
manual auditada para registrar el resultado real de SEE-SOL/PSE; no emite ni simula
un comprobante ante SUNAT por sí misma.

Existe además un sandbox fiscal estrictamente limitado a pedidos internos con cupón
de prueba. Sus comprobantes se identifican como “sin validez tributaria”; la guía de
uso y activación real está en [Facturación electrónica Perú](docs/fiscalizacion-peru.md).

## Despacho de WhatsApp

Los pagos aprobados crean una fila única en `notification_outbox`. Un cron debe
invocar `POST /api/ycloud/outbox` con `Authorization: Bearer $CRON_SECRET`.
El endpoint reclama hasta cinco filas por defecto mediante `FOR UPDATE SKIP LOCKED`,
usa un lease de dos minutos y reintenta con backoff hasta cinco veces. La plantilla
configurada en `YCLOUD_PAYMENT_CONFIRMED_TEMPLATE` debe aceptar el número de pedido
como su primer parámetro; el idioma se toma de `YCLOUD_TEMPLATE_LANGUAGE`.

La entrega es al menos una vez: `externalId` permanece estable entre reintentos para
reconciliar eventos del proveedor. No deben ejecutarse envíos manuales sobre filas
en estado `processing`.

## Email con Resend

Los eventos de pedido, pago, despacho, comprobante y Libro de Reclamaciones se
registran en `email_outbox`. Un cron invoca `POST /api/email/outbox` con
`Authorization: Bearer $CRON_SECRET`; el worker usa claves de idempotencia estables,
lease y reintentos. `POST /api/resend/webhook` verifica la firma Svix/Resend,
reconcilia entregas y suprime direcciones con rebote o queja.

Los contactos comerciales solo se sincronizan cuando existe un registro de
consentimiento. El envío transaccional y la sincronización comercial tienen
interruptores separados. La configuración completa y el procedimiento de prueba
están en [docs/resend-email-operations.md](docs/resend-email-operations.md).

## Caducidad de reservas

Un segundo cron debe invocar `POST /api/maintenance/reservations` con el mismo
Bearer. El endpoint procesa hasta 500 pedidos con reservas vencidas por defecto
(máximo 1000) mediante
`FOR UPDATE SKIP LOCKED`, las marca `expired` y cambia a `unfulfilled` los pedidos
que continúan impagos. Programarlo al menos cada cinco minutos.

## CRM de WhatsApp

La bandeja profesional, el cliente 360°, los pipelines D2C/HORECA, scoring, tareas y SLA se activan con `CRM_DASHBOARD_V2=true` después de aplicar la migración CRM. El procedimiento de publicación, cron y monitoreo está documentado en [docs/whatsapp-crm-operations.md](docs/whatsapp-crm-operations.md).

## Seguridad

`.codex/`, `.mcp.json`, `.env` y variantes locales están ignorados. El token de Hostinger que apareció en el historial anterior debe rotarse desde la cuenta; excluirlo de Git evita nuevas filtraciones, pero no revoca la credencial ya expuesta.
