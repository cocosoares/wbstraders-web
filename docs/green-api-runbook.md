# Green API: pruebas de WhatsApp

Esta integración se usa solo mientras WBStraders está en pruebas. La lógica de conversación, consentimiento +18, derivación a humano, checkout y cola se conserva; únicamente cambia el proveedor de transporte.

## Variables del servidor

Configura estas variables en el VPS, nunca en variables `NEXT_PUBLIC_*`:

```text
WHATSAPP_PROVIDER=greenapi
GREEN_API_URL=https://tu-region.api.greenapi.com
GREEN_API_INSTANCE_ID=tu_id_de_instancia
GREEN_API_TOKEN=tu_token_de_instancia
GREEN_API_WEBHOOK_SECRET=un_valor_largo_aleatorio
WHATSAPP_BOT_ENABLED=true
WHATSAPP_OUTBOUND_ENABLED=true
CRON_SECRET=el_secreto_ya_generado
```

`GREEN_API_URL` es opcional; por defecto se usa `https://api.greenapi.com`.

## Configuración en Green API

1. Autoriza la instancia con un número de pruebas mediante QR.
2. Activa notificaciones de mensajes entrantes y de mensajes enviados por API.
3. Registra este Webhook URL, sustituyendo el secreto:

```text
https://TU_DOMINIO/api/greenapi/webhook?secret=GREEN_API_WEBHOOK_SECRET
```

4. Programa cada minuto un `POST` a `https://TU_DOMINIO/api/whatsapp/outbox` con `Authorization: Bearer CRON_SECRET`.
5. Prueba desde otro número: confirma +18, pide una recomendación, solicita una persona y verifica que la respuesta aparece en el dashboard.

El endpoint ignora chats de grupo y rechaza callbacks sin el secreto. El código no marca pagos como confirmados a partir de WhatsApp.

## Cambio posterior a YCloud

Conserva la cola y los datos. Configura las credenciales YCloud, cambia `WHATSAPP_PROVIDER=ycloud` y usa los endpoints/documentación existentes de YCloud. No se requieren cambios de conversación ni de base de datos.
