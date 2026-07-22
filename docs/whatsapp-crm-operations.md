# Operación del CRM de WhatsApp

## Activación segura

El CRM se despliega detrás de `CRM_DASHBOARD_V2`. La bandeja anterior permanece disponible mientras el valor sea `false`.

1. Publicar el código con `CRM_DASHBOARD_V2=false`.
2. Aplicar `supabase/migrations/202607220001_whatsapp_crm.sql`.
3. Ejecutar `supabase/tests/007_whatsapp_crm.sql`; la prueba termina con `rollback` y no conserva datos.
4. Reiniciar la aplicación y comprobar los endpoints con el usuario administrador.
5. Cambiar `CRM_DASHBOARD_V2=true` y reiniciar PM2 con `--update-env`.

Configuración del servidor:

```dotenv
CRM_DASHBOARD_V2=false
CRM_SLA_MINUTES=10
CRM_ALERTS_24_7=true
CRM_ALERT_EMAILS=greciasemorile@gmail.com
```

## Automatizaciones y SLA

`POST /api/crm/maintenance` está protegido con `Authorization: Bearer $CRON_SECRET`. Debe ejecutarse cada minuto. Crea tareas idempotentes para SLA vencido, checkout abandonado, recompra y oportunidades estancadas; los correos quedan en `email_outbox` y los envía el worker existente de Resend.

Ejemplo de script del VPS:

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/root/wbstraders-web"
BASE_URL="https://wbstraders.76.13.238.64.nip.io"
CRON_SECRET_VALUE="$(sed -n 's/^CRON_SECRET=//p' "$APP_DIR/.env.local" | tail -n 1 | tr -d '\r\n')"
test -n "$CRON_SECRET_VALUE"

curl --fail --silent --show-error --max-time 20 \
  -X POST \
  -H "Authorization: Bearer ${CRON_SECRET_VALUE}" \
  "${BASE_URL}/api/crm/maintenance"
```

No se envían promociones automáticamente. Las tareas comerciales contienen una sugerencia y requieren confirmación humana.

## Multimedia privada

El bucket `whatsapp-media` acepta JPG, PNG, WebP y PDF hasta 10 MB. Es privado; el panel crea URLs firmadas por 15 minutos. La respuesta se registra y toma la conversación en una operación SQL, intenta despacharse de inmediato y conserva la cola para reintentos.

## Monitoreo de 48 horas

- Estado y latencia de `/api/greenapi/webhook`.
- Conversaciones con SLA vencido y emails idempotentes.
- Mensajes `failed` o `dead` en `whatsapp_outbox`.
- Tareas duplicadas por `dedupe_key`.
- Errores de Realtime y funcionamiento del respaldo cada 10 segundos.
- Que el bot no responda después de que la operadora toma la conversación.

## Cambio futuro a YCloud

El CRM usa el modelo normalizado de WhatsApp, no el formato de Green API. Para migrar se cambia el proveedor y las credenciales; mensajes, clientes, oportunidades, tareas, score y archivos permanecen intactos.
