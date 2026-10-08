# Consulta real con la mejora de ediciones

Revalidación del 8 de octubre de 2026, 19:17 UTC (16:17 en Santiago). Metadatos, portada y precio obtenidos de fuentes externas reales. Auth y SQL corresponden a una cuenta/base **local aislada**, sin guardar libros. No acredita el despliegue ni la migración 004 en el Supabase real.

ISBN `9789566180777`: Jane Austen, Austral, tapa dura, español, 352 páginas, edición limitada con cantos pintados según la ficha. Contrapunto devolvió $13.930 CLP y stock disponible en ese momento, sin envío. Penguin Libros, Antártica y Buscalibre quedaron como fuentes bloqueadas: no se inventaron precios.

- [Resultado completo](resultado.json), con hora, URL, stock y datos.
- [Edición real móvil](edicion-real-mobile.png), [escritorio](edicion-real-desktop.png), [consulta de precio móvil](precio-real-mobile.png).

La portada real se transportó por Node.js para que Chromium la cargara usando el proxy del entorno. Las API de catálogo/precio no se interceptaron. El resultado es una instantánea y no garantiza valores futuros ni disponibilidad de todas las versiones.
