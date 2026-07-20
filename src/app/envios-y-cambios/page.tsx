import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { DELIVERY_ZONES } from "@/data/delivery-zones";
import { SITE } from "@/data/site";
import { formatPEN } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Envíos, cambios y devoluciones",
  description: "Zonas, tiempos estimados y proceso de incidencias para pedidos de WBStraders.",
};

export default function ShippingReturnsPage() {
  return (
    <LegalPage
      eyebrow="Información de compra"
      title="Envíos, cambios y devoluciones"
      intro="Consulta cómo coordinamos entregas en Lima y qué hacer si el producto recibido presenta una incidencia."
    >
      <section>
        <h2>1. Zonas y tarifas vigentes</h2>
        <ul>
          {DELIVERY_ZONES.map((zone) => (
            <li key={zone.id}>
              <strong>{zone.name}:</strong> estimación {zone.eta}; envío {formatPEN(zone.costCents)} y envío sin costo desde {formatPEN(zone.freeFromCents)}. Distritos: {zone.districts.join(", ")}.
            </li>
          ))}
        </ul>
        <p>
          El checkout debe confirmar la tarifa aplicable a la dirección. Para otros destinos, consulta disponibilidad
          antes de pagar. Las estimaciones pueden variar por horario, demanda, accesibilidad o causas ajenas al reparto.
        </p>
      </section>

      <section>
        <h2>2. Confirmación y recepción</h2>
        <p>
          La preparación comienza cuando el pago queda confirmado en el sistema. El receptor debe ser mayor de 18 años
          y podrá tener que acreditar su edad. Revisa cantidad y estado exterior al recibir; no es necesario entregar
          una copia o fotografía del documento de identidad.
        </p>
      </section>

      <section>
        <h2>3. Entrega no realizada</h2>
        <p>
          Si no hay una persona adulta disponible o la dirección es incorrecta, contactaremos al comprador para
          coordinar. [COSTO Y NÚMERO DE REPROGRAMACIONES PENDIENTES DE APROBACIÓN Y CONFIGURACIÓN].
        </p>
      </section>

      <section>
        <h2>4. Producto dañado, incorrecto o faltante</h2>
        <p>
          Escríbenos lo antes posible a <a href={`mailto:${SITE.email}`}>{SITE.email}</a> o al {SITE.phones[0]} con el
          número de pedido y una descripción. Las fotografías pueden ayudar a resolver el caso, pero se solicitarán
          solo cuando sean pertinentes. No deseches el producto hasta recibir indicaciones, salvo que represente un riesgo.
        </p>
      </section>

      <section>
        <h2>5. Cambios, cancelaciones y reembolsos</h2>
        <p>
          Evaluaremos la solicitud según el estado del pedido, la naturaleza del producto y los derechos del consumidor.
          Si corresponde un reembolso, se realizará por un medio permitido y su reflejo final puede depender del banco o
          proveedor de pago. [PLAZOS OPERATIVOS DE CANCELACIÓN Y REEMBOLSO PENDIENTES DE APROBACIÓN].
        </p>
      </section>
    </LegalPage>
  );
}
