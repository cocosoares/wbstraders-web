# Activación técnica de WhatsApp — VPS

## Variables de entorno

Configurar en el servidor, nunca en el repositorio:

```env
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
YCLOUD_API_KEY=...
YCLOUD_WEBHOOK_SECRET=...
YCLOUD_WHATSAPP_NUMBER=+51...
CRON_SECRET=valor-largo-aleatorio
WHATSAPP_OUTBOUND_ENABLED=false
WHATSAPP_BOT_ENABLED=false
WHATSAPP_WEBHOOK_TOLERANCE_SECONDS=300
```

Mantener ambas banderas en `false` hasta terminar las pruebas internas.

## Orden de activación

1. Ejecutar la migración `202607180001_whatsapp_conversational_commerce.sql` en
   Supabase SQL Editor.
2. Desplegar el sitio en un dominio HTTPS público.
3. Registrar en YCloud el webhook `https://tu-dominio.com/api/ycloud/webhook` y
   copiar el secreto de firma.
4. Programar la cola saliente cada minuto.
5. Cambiar solo `WHATSAPP_OUTBOUND_ENABLED=true`; probar un mensaje humano con
   un número interno y verificar la cola/inbox.
6. Probar +18, baja, derivación, carrito y compra atribuida.
7. Cambiar `WHATSAPP_BOT_ENABLED=true` únicamente tras aprobar esa prueba.

## Cron del VPS

Cada minuto, ejecutar desde el servidor:

```bash
curl --fail --silent --show-error -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://tu-dominio.com/api/whatsapp/outbox?limit=10"
```

Ejemplo de `crontab`:

```cron
* * * * * /usr/bin/curl --fail --silent --show-error -X POST -H "Authorization: Bearer TU_SECRETO" "https://tu-dominio.com/api/whatsapp/outbox?limit=10" >> /var/log/wbstraders-whatsapp-cron.log 2>&1
```

Usar un archivo protegido o el gestor de secretos del VPS para `CRON_SECRET`;
no dejarlo literal en el historial de comandos.

## Prueba de aceptación

- Webhook con firma válida responde `200` y uno inválido responde `401`.
- El mismo evento dos veces no duplica mensaje ni respuesta.
- Sin +18 no se recomienda alcohol ni se crea carrito.
- `PARAR` guarda la baja de marketing.
- “Quiero una persona” crea una derivación, el bot deja de responder y el inbox
  permite tomar/cerrar el caso.
- Un checkout desde WhatsApp crea un pedido con canal `whatsapp`.
- Un mensaje libre después de 24 horas no sale de la cola.
