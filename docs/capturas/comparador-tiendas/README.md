# Capturas del comparador de tiendas

Generadas con `npm run test:browser-discovery` el 8 de octubre de 2026.

Los libros, cuentas, catálogos y precios de estas capturas son **ficticios**. Se usan para comprobar guardado, enlaces, prioridad de la edición elegida y presentación. SQL y RLS se ejecutan en PGlite; no se escribieron datos en Supabase real.

- `comparador-panel-mobile.png`: comparador abierto desde el panel privado.
- `comparador-tiendas-360.png`, `comparador-tiendas-390.png`, `comparador-tiendas-768.png` y `comparador-tiendas-1440.png`: ficha pública de la favorita y sus tiendas.
- `resultado.json`: comprobaciones y errores de consola del recorrido.

La prueba compara anchos de 360, 390, 768 y 1440 px sin desbordamiento horizontal. Las imágenes muestran un recorte del comparador; las cuatro tiendas se comprueban en el test.

Las consultas comerciales reales y sus límites se explican en [COMPARADOR_TIENDAS.md](../../COMPARADOR_TIENDAS.md). Un precio ficticio de una captura no acredita una oferta de esa librería.
