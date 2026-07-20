# Operación comercial de WhatsApp — WBStraders

## Objetivo y responsable

WhatsApp convierte consultas en pedidos seguros, sin sustituir el checkout ni la
atención humana. El dueño del canal revisa el inbox durante horario operativo;
cada conversación tomada tiene un responsable y una nota de cierre.

## Estados operativos

| Estado | Entrada | Responsable | Salida / SLA |
|---|---|---|---|
| Sommelier | Cliente inicia consulta y confirma +18 | Bot | Recomendación, checkout o derivación. |
| Derivada | Pedido, reclamo, urgencia, HORECA o pide persona | Equipo comercial | Tomar en menos de 5 minutos en horario operativo. |
| Tomada | Un asesor pulsa “Tomar conversación” | Asesor asignado | Resolver, crear oportunidad o cerrar. |
| Cerrada | Solución confirmada o sin acción pendiente | Asesor | Nota breve de resultado y próxima acción si aplica. |

## Enrutamiento

| Señal | Ruta | Primera respuesta |
|---|---|---|
| Maridaje, ocasión, regalo individual | Sommelier | Inmediata tras +18. |
| Pedido, delivery, pago o stock | Atención de pedidos | Menos de 5 min. |
| Regalo corporativo, evento, restaurante, volumen | Comercial/HORECA | Menos de 15 min. |
| Reclamo, frustración o error | Responsable de servicio | Menos de 5 min. |
| Ventana de 24 h cerrada | Plantilla aprobada | No enviar texto libre. |

## Guion de venta consultiva

1. **Apertura:** confirmar mayoría de edad y entender el motivo.
2. **Descubrimiento:** preguntar una cosa por turno: ocasión/comida, cantidad,
   preferencia o presupuesto.
3. **Recomendación:** máximo tres opciones, explicando por qué encajan. No
   prometer precio, stock ni delivery: el checkout los recalcula.
4. **Cierre:** compartir el enlace seguro o proponer la siguiente acción humana.
5. **Seguimiento:** si el cliente pidió ayuda, registrar el resultado; si aceptó
   marketing, usar únicamente las plantillas aprobadas.

## Respuestas modelo

**Regalo:** “Para recomendarte algo que realmente se sienta especial: ¿para qué
ocasión es y qué presupuesto tienes en mente?”

**Maridaje:** “Cuéntame qué van a comer y cuántas personas serán. Así te propongo
una opción que acompañe bien la comida sin complicarte.”

**Precio/stock:** “Te confirmo la disponibilidad y el total exacto en el checkout
seguro. ¿Quieres que prepare una selección para una o varias botellas?”

**HORECA/corporativo:** “Con gusto. Para armar una propuesta útil, ¿cuántas cajas
necesitas, para qué fecha y en qué distrito o ciudad sería la entrega?”

**Reclamo:** “Lamento lo ocurrido. Voy a revisarlo con prioridad. Compárteme tu
número de pedido y una persona del equipo continuará contigo.”

## Métricas semanales

- Conversaciones iniciadas, edad confirmada y recomendaciones enviadas.
- Checkouts iniciados, pedidos y facturación atribuidos a WhatsApp.
- Derivaciones abiertas y tiempo hasta que un asesor toma el caso.
- Conversiones por motivo: regalo, maridaje, pedido y HORECA.
- Bajas, bloqueos y mensajes fuera de ventana.

No llevar texto libre, teléfonos, correos ni nombres a GA4/GTM.
