# WBStraders design system

## Dirección

Editorial premium, cálida y gastronómica. La experiencia debe sentirse como una cava boutique accesible: fotografía de producto protagonista, tipografía con contraste y acciones de compra inequívocas. Se conserva la identidad crema, oliva y vino; no se introducen estilos visuales paralelos.

## Tokens

- Fondo principal: `cream-100`; superficies: `cream-50`; separadores: `cream-300`.
- Texto principal: `ink-900`; secundario: `ink-700`; auxiliar: `ink-500`.
- Acción principal de compra: `wine-600`, hover `wine-700`.
- Navegación, progreso y estados positivos: `olive-600`/`olive-700`.
- Detalles premium: `gold-500`; nunca como único indicador de estado.
- Display: Playfair Display. Interfaz y cuerpo: Inter.

## Jerarquía

- Cada pantalla tiene una sola acción primaria visible.
- En tienda: comprar o agregar al carrito es primario; WhatsApp es asistencia secundaria.
- En administración: la acción primaria depende de la tarea; los estados se expresan con texto, icono y color.
- Las tarjetas usan borde visible, radio de 12–16 px y sombra mínima.

## Accesibilidad e interacción

- Texto normal con contraste mínimo 4.5:1.
- Objetivos táctiles de al menos 44×44 px y 8 px de separación.
- Foco visible en toda interacción y orden de tabulación equivalente al visual.
- Inputs con etiqueta persistente, mensaje de error junto al campo y `aria-describedby`.
- Estados de carga deshabilitan la acción y explican qué está ocurriendo.
- Nunca depender de hover ni de color para comunicar información.
- Respetar `prefers-reduced-motion`; animar solo `transform` y `opacity` entre 150–300 ms.

## Responsive

- Mobile first desde 375 px; sin scroll horizontal.
- Formularios en una columna en móvil y dos cuando el contenido lo permite.
- Barras fijas reservan espacio para no ocultar contenido.
- Tablas administrativas ofrecen una representación legible o tarjetas en móvil.

## Contenido comercial

- Propuesta: vinos argentinos de autor, importación directa, cajas combinables y entrega confiable en Lima.
- Navegación primaria por ocasión antes que por conocimiento técnico.
- Mostrar precio total, precio unitario, ahorro monetario verificable y entrega antes de pagar.
- No usar reseñas, disponibilidad, descuentos ni tiempos de entrega no demostrables.
- Incluir advertencia +18 y consumo responsable en superficies comerciales relevantes.
