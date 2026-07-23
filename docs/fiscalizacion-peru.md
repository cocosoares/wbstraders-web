# Facturación electrónica Perú — WBStraders

## Estado seguro inicial

La migración `202607230001_fiscal_sandbox_and_tax.sql` crea una base fiscal en modo
**sandbox**. Incluye un emisor ficticio y un RUC intencionalmente inválido. No se
conecta con SUNAT ni puede generar una boleta o factura válida.

El único documento que permite emitir es un **comprobante de prueba** y se cumplen
todas estas condiciones:

1. El pedido fue creado con el cupón interno de prueba.
2. El pago fue simulado y aprobado por el cupón interno.
3. Una administradora escribe `PRUEBA` para confirmar la acción.
4. El correo y el panel lo marcan como “sin validez tributaria”.

## Cómo probarlo

1. Aplica la migración en Supabase SQL Editor.
2. Ejecuta `supabase/tests/006_fiscal_sandbox.sql`; debe terminar sin errores.
3. Aplica también la migración `202607230002_test_checkout_payment.sql`.
4. Crea un pedido interno usando el cupón de prueba configurado y un correo
   incluido en `TEST_CHECKOUT_ALLOWED_EMAILS`. El pago queda aprobado de forma
   simulada y el stock queda reservado.
5. En **Comprobantes**, habilita temporalmente `FISCAL_SANDBOX_ENABLED=true`, escribe
   `PRUEBA` y emite el comprobante de prueba.

El sistema guarda una numeración `TEST-B` o `TEST-F`, el desglose de impuesto de
prueba y una auditoría. Nunca debe enviarse a un cliente como comprobante legal.

El pago simulado no llama a Mercado Pago ni cobra dinero. Únicamente se habilita
para una lista explícita de correos de prueba, por lo que el cupón no puede ser
usado por visitantes de la tienda.

## Activación real posterior

Para pasar a producción se requiere una migración separada y aprobada por el
contador con: razón social, RUC, domicilio fiscal, régimen, series, tratamiento
por producto de IGV/ISC, y cuenta/API de un PSE autorizado (la integración prevista
es NubeFact). La clave SOL no debe guardarse ni compartirse con la aplicación.

Antes de activar `FISCAL_MODE=production`, la configuración exige un RUC de 11
dígitos, emisor completo y proveedor `nubefact`; además se deberán ejecutar pruebas
contra el ambiente de certificación del PSE.
