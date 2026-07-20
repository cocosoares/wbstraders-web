import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Cómo WBStraders trata los datos personales de clientes y visitantes.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacidad y datos personales"
      title="Política de privacidad"
      intro="Este documento explica qué información usa WBStraders para operar la tienda, atender consultas y —solo con autorización— medir y comunicar ofertas."
    >
      <section>
        <h2>1. Responsable y contacto</h2>
        <p>
          Responsable: {SITE.legal.businessName || "[RAZÓN SOCIAL PENDIENTE DE CONFIGURAR]"},
          RUC {SITE.legal.ruc || "[PENDIENTE]"}, con domicilio en {SITE.legal.address || "[DOMICILIO PENDIENTE DE CONFIGURAR]"}.
          Para consultas de privacidad o ejercicio de derechos escribe a <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
        </p>
        <p>
          Inscripción del banco de datos personales: [NÚMERO O CONSTANCIA PENDIENTE DE CONFIGURAR, SI CORRESPONDE].
        </p>
      </section>

      <section>
        <h2>2. Datos que podemos tratar</h2>
        <ul>
          <li>Datos de identificación y contacto proporcionados para comprar, recibir un pedido, solicitar soporte o consultar por HORECA.</li>
          <li>Datos del pedido, dirección de entrega, comprobante solicitado y estado de pago. La tienda no debe almacenar el número completo ni el código de seguridad de una tarjeta.</li>
          <li>Consentimientos, preferencias de contacto e historial de atención necesario para resolver una solicitud.</li>
          <li>Datos técnicos y eventos de navegación no identificatorios, únicamente si aceptas la medición analítica.</li>
        </ul>
      </section>

      <section>
        <h2>3. Finalidades</h2>
        <ul>
          <li>Procesar, conciliar, preparar, entregar y dar soporte a pedidos.</li>
          <li>Emitir el comprobante solicitado y atender obligaciones legales o reclamos.</li>
          <li>Responder consultas comerciales y administrar relaciones HORECA.</li>
          <li>Prevenir abuso y mantener la seguridad de la tienda.</li>
          <li>Medir el embudo y mejorar la experiencia, solo con consentimiento analítico.</li>
          <li>Enviar promociones por correo o WhatsApp, únicamente con consentimiento separado y posibilidad de baja.</li>
        </ul>
      </section>

      <section>
        <h2>4. Proveedores y transferencias</h2>
        <p>
          WBStraders puede encargar tareas a proveedores de infraestructura, base de datos, pago,
          mensajería, analítica, facturación o reparto que resulten necesarios para la finalidad informada.
          La lista efectiva, sus ubicaciones y las salvaguardas de transferencias internacionales deben
          documentarse aquí antes de activar cada proveedor. [LISTA DE ENCARGADOS PENDIENTE DE CONFIGURAR].
        </p>
        <p>
          WhatsApp y la pasarela de pago aplican además sus propias políticas cuando decides usar esos servicios.
        </p>
      </section>

      <section>
        <h2>5. Conservación y seguridad</h2>
        <p>
          Los datos se conservarán durante el plazo necesario para el pedido, soporte, obligaciones tributarias,
          reclamos o defensa de derechos. [TABLA DE PLAZOS POR CATEGORÍA PENDIENTE DE APROBACIÓN]. Se aplicarán
          controles de acceso, registro y copias de seguridad proporcionales al riesgo.
        </p>
      </section>

      <section>
        <h2>6. Tus derechos</h2>
        <p>
          Puedes solicitar información, acceso, actualización, rectificación, inclusión, oposición o cancelación,
          según corresponda, escribiendo a <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Indica qué derecho
          deseas ejercer y la información necesaria para verificar tu identidad sin enviar datos excesivos.
          También puedes acudir a la Autoridad Nacional de Protección de Datos Personales.
        </p>
      </section>

      <section>
        <h2>7. Cookies, almacenamiento y menores</h2>
        <p>
          El carrito y la preferencia de privacidad usan almacenamiento esencial del navegador. La analítica es
          opcional y no se carga si eliges “Solo necesarias”. La venta está dirigida exclusivamente a mayores de
          18 años; no buscamos recopilar deliberadamente datos de menores.
        </p>
      </section>
    </LegalPage>
  );
}
