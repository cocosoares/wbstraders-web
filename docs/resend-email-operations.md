# Resend: email transaccional, marketing y atención

## Qué queda automatizado

| Evento | Cliente | Operación |
| --- | --- | --- |
| Pedido recibido | Confirmación, productos, total y entrega | Nuevo pedido con acceso al dashboard |
| Pago confirmado o reembolsado | Estado financiero | El dashboard conserva la fuente operativa |
| Preparando, en reparto y entregado | Seguimiento de despacho | El dashboard conserva la fuente operativa |
| Comprobante emitido | Serie/número y enlace PDF si existe una URL HTTPS | Cola fiscal en dashboard |
| Reclamo recibido | Acuse con número de seguimiento | Aviso inmediato con acceso a reclamos |
| Consentimiento comercial | Alta o baja de contacto en Resend | Sin envío transaccional mezclado |

Las respuestas de los clientes van a `RESEND_REPLY_TO`. Durante la etapa inicial
puede mantenerse `greciasemorile@gmail.com`, de modo que una sola persona opere
pedidos, soporte y reclamos desde correo, WhatsApp y dashboard.

El correo de comprobante no crea una boleta/factura ni sustituye SUNAT. Solo se
encola después de que el comprobante real sea marcado como emitido. Adjunta o
enlaza el PDF únicamente cuando `fiscal_documents.pdf_path` contiene una URL HTTPS.

## Arquitectura segura

1. Los triggers de Supabase escriben un evento único en `email_outbox`.
2. El pedido o pago termina sin esperar a Resend.
3. Un cron protegido reclama trabajos con lease y `FOR UPDATE SKIP LOCKED`.
4. El worker envía con una clave de idempotencia estable y hasta seis intentos.
5. El webhook firmado registra entrega, rebote, queja o supresión.
6. Rebotes, quejas y supresiones bloquean futuros emails al cliente y desuscriben el contacto comercial.

## Variables de servidor

```dotenv
RESEND_API_KEY=
RESEND_CONTACTS_API_KEY=
RESEND_WEBHOOK_SECRET=
RESEND_FROM="WBStraders <pedidos@mail.tudominio.com>"
RESEND_REPLY_TO=greciasemorile@gmail.com
EMAIL_OPERATIONS_TO=greciasemorile@gmail.com
EMAIL_TEST_RECIPIENT=
EMAIL_TRANSACTIONAL_ENABLED=false
EMAIL_MARKETING_SYNC_ENABLED=false
```

Nunca se debe usar `NEXT_PUBLIC_` para claves o secretos de Resend. Los dos
interruptores permanecen en `false` hasta terminar las pruebas.

Mientras no exista un dominio verificado, usar
`EMAIL_TEST_RECIPIENT=greciasemorile@gmail.com`. Esto redirige todos los correos
transaccionales a esa única bandeja y agrega `[PRUEBA]` al asunto. Debe eliminarse
antes de enviar a clientes reales.

## Configuración en Resend

1. Elegir un dominio propio. Recomendación: verificar un subdominio dedicado como `mail.dominio.com` y usar `pedidos@mail.dominio.com`.
2. En **Domains**, copiar a DNS los registros SPF y DKIM que entregue Resend. Agregar DMARC al dominio organizacional.
3. Esperar a que el dominio figure como verificado.
4. Crear dos API keys y guardarlas solo en el VPS: `RESEND_API_KEY` con **Sending access** restringido al dominio y `RESEND_CONTACTS_API_KEY` con **Full access** para sincronizar altas/bajas comerciales.
5. Crear un webhook con esta URL:

   `https://DOMINIO-PUBLICO/api/resend/webhook`

6. Suscribir como mínimo: `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`, `email.suppressed`, `contact.updated` y `contact.deleted`.
7. Copiar el signing secret del webhook a `RESEND_WEBHOOK_SECRET` en el VPS.

Documentación oficial: [dominios](https://resend.com/docs/dashboard/domains/introduction),
[envío](https://resend.com/docs/api-reference/emails/send-email),
[webhooks firmados](https://resend.com/docs/webhooks/verify-webhooks-requests) y
[contactos](https://resend.com/docs/dashboard/audiences/contacts).

## Cron del VPS

El cron existente puede usar el mismo `CRON_SECRET`. Se recomienda un script
separado para poder alertar fallos sin mezclar WhatsApp y email:

```bash
#!/usr/bin/env bash
set -euo pipefail
APP_DIR="/root/wbstraders-web"
BASE_URL="https://DOMINIO-PUBLICO"
CRON_SECRET_VALUE="$(sed -n 's/^CRON_SECRET=//p' "$APP_DIR/.env.local" | tail -n 1 | tr -d '\r\n')"
test -n "$CRON_SECRET_VALUE"
curl --fail --silent --show-error --max-time 45 \
  -X POST \
  -H "Authorization: Bearer ${CRON_SECRET_VALUE}" \
  "${BASE_URL}/api/email/outbox?limit=10"
```

Ejecutar cada minuto. Si ambos interruptores están en `false`, el endpoint no
reclama filas y responde correctamente con `disabled: true`.

## Marketing sin comprometer la operación

Los correos de pedidos y reclamos son transaccionales y no dependen de aceptar
marketing. La casilla comercial solo controla el contacto de Resend.

Primera automatización recomendada, después de validar entregabilidad y contenido:

1. **Bienvenida inmediata:** propuesta de valor, selección boutique y preferencias del cliente.
2. **Educación al día 3:** cómo elegir vino por ocasión, comida y presupuesto; CTA a WhatsApp.
3. **Recompra al día 25–35 después de una entrega:** recomendación complementaria, sin descuentos permanentes.
4. **Reactivación a 60–90 días:** novedades o cata, con una sola oferta clara.

Las campañas se crean como Broadcasts/Automations en Resend y deben incluir la
desuscripción gestionada por Resend. El webhook devuelve esa baja al historial de
consentimientos de Supabase. No importar listas compradas ni contactos sin
consentimiento verificable.

## Prueba antes de activar

1. Aplicar `202607200001_resend_email_lifecycle.sql` en Supabase.
2. Desplegar la aplicación con los interruptores aún en `false`.
3. Verificar que un pedido y un reclamo crean filas `pending` en `email_outbox`.
4. Activar solo `EMAIL_TRANSACTIONAL_ENABLED=true` y ejecutar manualmente el cron.
5. Confirmar contenido, Reply-To y entrega en Resend y en la bandeja destinataria.
6. Probar las transiciones del pedido una sola vez y confirmar que no hay duplicados.
7. Activar `EMAIL_MARKETING_SYNC_ENABLED=true`; comprobar un consentimiento concedido y uno denegado.
8. Ensayar un webhook inválido (debe dar 401) y revisar un evento real firmado.
9. Recién entonces dejar ambos interruptores activos y programar el cron.
