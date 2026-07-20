import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Condiciones de uso y compra en la tienda online de WBStraders.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Condiciones de la tienda"
      title="Términos y condiciones"
      intro="Estas condiciones regulan el uso de la tienda y las compras de consumidores. Las operaciones HORECA se rigen además por su cotización o acuerdo comercial."
    >
      <section>
        <h2>1. Identificación del proveedor</h2>
        <p>
          Proveedor: {SITE.legal.businessName || "[RAZÓN SOCIAL PENDIENTE DE CONFIGURAR]"}; RUC {SITE.legal.ruc || "[PENDIENTE]"};
          domicilio {SITE.legal.address || "[PENDIENTE DE CONFIGURAR]"}; contacto <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
        </p>
      </section>

      <section>
        <h2>2. Edad y consumo responsable</h2>
        <p>
          Solo pueden comprar personas mayores de 18 años. La persona que recibe el pedido deberá acreditar mayoría
          de edad si el repartidor lo solicita; no se entrega alcohol a menores ni a una persona que no pueda recibirlo
          responsablemente. {SITE.legal.alcoholWarning}
        </p>
      </section>

      <section>
        <h2>3. Catálogo, precios y promociones</h2>
        <p>
          La disponibilidad, precio vigente, cantidad y costo de entrega se muestran antes de confirmar. Las imágenes
          son referenciales y la ficha identifica el producto ofrecido. Toda promoción está sujeta a su plazo, stock y
          condiciones publicadas; no se sustituirá un producto sin aceptación del cliente.
        </p>
        <p>[TRATAMIENTO DE IGV Y ALCANCE DE PRECIOS PENDIENTE DE VALIDACIÓN TRIBUTARIA Y CONFIGURACIÓN].</p>
      </section>

      <section>
        <h2>4. Pedido y pago</h2>
        <p>
          Completar el checkout crea una solicitud de pedido. El pedido se considera pagado únicamente cuando el
          proveedor de pago lo confirma al sistema; una captura o el retorno del navegador no bastan para acreditarlo.
          Si el pago queda pendiente, rechazado o expira, el stock reservado puede liberarse.
        </p>
      </section>

      <section>
        <h2>5. Entrega, cambios y devoluciones</h2>
        <p>
          Las zonas, estimaciones y reglas operativas están en <Link href="/envios-y-cambios">Envíos, cambios y devoluciones</Link>.
          Nada en estas condiciones limita los derechos reconocidos al consumidor por la normativa aplicable.
        </p>
      </section>

      <section>
        <h2>6. Comprobantes y atención</h2>
        <p>
          El cliente debe proporcionar los datos correctos para el comprobante solicitado. Los reclamos pueden
          presentarse en el <Link href="/libro-de-reclamaciones">Libro de Reclamaciones</Link>; usarlo no impide acudir
          a otras vías de solución de controversias.
        </p>
      </section>

      <section>
        <h2>7. Uso del sitio</h2>
        <p>
          No está permitido interferir con la seguridad, automatizar compras abusivas, suplantar identidades ni usar
          contenidos o marcas de la tienda sin autorización. Podemos bloquear actividad fraudulenta sin afectar los
          derechos relativos a pedidos legítimos ya pagados.
        </p>
      </section>
    </LegalPage>
  );
}
