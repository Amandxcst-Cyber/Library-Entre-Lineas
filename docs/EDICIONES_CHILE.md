# Edición favorita, alternativas y compras en Chile

Implementado y comprobado localmente el 8 de octubre de 2026. Código incorporado a `main` desde `feature/chile-edition-comparison` tras la confirmación de Amanda de que la migración 004 terminó correctamente en Supabase. Amanda confirmó la ejecución y una consulta anónima de solo lectura a las tres columnas nuevas (`select=edition_note,edition_extras,edition_options&limit=0`) respondió HTTP 200. No se realizaron escrituras ni se probó su cuenta real desde este entorno. La búsqueda anterior publicada ya funcionaba según sus capturas y confirmación. Pendiente: verificar que Vercel publique esta actualización y probar el guardado de alternativas con su cuenta real.

## Cómo se usa

1. En Agregar libro, escribir el nombre. Los resultados incluyen autor, editorial, idioma, formato, portada e ISBN identificados por las fuentes. Solo se muestran ediciones identificadas en español; se omiten otros idiomas y el idioma desconocido. Open Library consulta una página limitada de ediciones concretas de las obras encontradas, evitando tomar las primeras ediciones internacionales del índice general.
2. Elegir **Usar esta edición**: será la favorita y aparecerá primero ante las visitas. El precio de una alternativa no cambia esta elección. Los datos importados siguen siendo editables.
3. Escribir **Por qué elegí esta versión** e **Ilustraciones y contenido adicional de mi edición**. La opinión se atribuye a Amanda; los extras anotados por ella se distinguen de las características explícitas del catálogo.
4. En los mismos resultados, pulsar **Agregar como alternativa** en otras versiones del mismo título y autor. Se normaliza la puntuación del autor y los calificativos de edición, pero se conservan los números para evitar mezclar libros 1 y 2. Se permiten una favorita y cuatro alternativas con ISBN distintos. Si una ficha tiene otro título/autor, se informa y no se agrega automáticamente: Amanda puede confirmar **Es el mismo tomo** cuando sabe que corresponde a una variante del mismo libro. Esta confirmación evita bloquear variantes cuyos catálogos usan títulos distintos.
5. Se consultan automáticamente los precios de cada alternativa en las cuatro fuentes chilenas. Se pueden actualizar explícitamente antes de guardar. Tras Guardar, las visitas ven la favorita, su motivo, sus datos y ofertas; después las alternativas con sus respectivas editoriales, formatos, extras, opiniones y precios.

Cada ISBN mantiene sus ofertas separadas. Los enlaces de compra y búsqueda de la comparación admiten solamente Antártica Chile, Buscalibre Chile, Contrapunto y Penguin Libros `/cl/`. Los enlaces bibliográficos de Open Library y Google Books son referencias, no tiendas recomendadas para comprar fuera de Chile. Una ficha internacional en español no demuestra que esa edición esté disponible en Chile: la interfaz lo indica hasta consultar las ofertas. Los enlaces de compra antiguos fuera de estas fuentes ya no se presentan como botón en la ficha pública; no se borran los datos existentes.

## Alcance de los consejos y precios

Tapa dura, tapa blanda, bolsillo e ilustrada se explican a partir de los datos identificados. Los títulos que indican ilustraciones, bolsillo, edición limitada o cantos pintados se etiquetan; no se deducen ilustraciones de la trama ni se inventan capítulos extra. Se identifica el traductor cuando existe, sin valorar una traducción que no se ha leído. Una editorial por sí sola no acredita que una edición sea mejor. Los campos ausentes se muestran por confirmar.

Los precios públicos son la **última consulta guardada por Amanda**, con fecha/hora de Santiago, en CLP y sin envío. La consulta al editar tiene caché de diez minutos. No hay cron ni garantía de precio en tiempo real. Stock desconocido o agotado no gana la comparación; una sola fuente disponible no se anuncia como la más barata de Chile. Las tiendas bloqueadas ofrecen un enlace humano a su búsqueda del ISBN; no un precio supuesto.

La cobertura continúa limitada: Contrapunto y Open Library respondieron en consultas reales; Google Books había respondido 429, Penguin/Buscalibre bloquearon el rastreo de la aplicación y Antártica respondió 403. Se necesita una API/integración autorizada de esas librerías para completar automáticamente la comparación. Tampoco se garantiza que los catálogos contengan todas las versiones ilustradas o con extras.

Consulta real de “Boulevard”: se obtuvieron los libros 1, 2 y 3 de Montena en español, con ISBN separados; no se obtuvo la edición ilustrada. Consulta real de “Harry Potter”: se obtuvieron fichas de Salamandra de tapa dura, una edición especial, pop-up y otras referencias de bolsillo en español; no se mostraron las versiones polaca/árabe de la captura de Amanda. Una búsqueda general de saga puede devolver distintos tomos; deben elegirse las variantes del tomo correcto.

## Seguridad y datos

004 agrega `edition_note`, `edition_extras` y `edition_options` sin alterar libros, reservas, propietaria ni políticas RLS. La API valida tamaños, URLs, idioma, ISBN, vendedor y coherencia de cada oferta. Solo Amanda modifica la selección; la wishlist pública expone únicamente libros deseados. Biblioteca y archivados permanecen privados. Las alternativas comparten la reserva del libro: no crean reservas nuevas, ni cambian los 7/14 días o el límite compartido de tres.

## Publicación: un paso a la vez

**Completado según confirmación de Amanda:** migración `004_chile_edition_options.sql` ejecutada correctamente en su Supabase existente. No repetir 001, 002, 003 ni 004 en esa base. La prueba local verificó conservación de libros y una reserva activa; Amanda confirmó la ejecución real y se verificó por lectura que las tres columnas existen en la API de Supabase.

El código se incorpora a main. **Siguiente paso:** comprobar que el nuevo despliegue de Vercel termina en Ready. Verificar con la cuenta real: elegir favorita, agregar una alternativa del mismo libro, guardar, y abrir la ficha en una ventana sin sesión. Las pruebas automáticas usan exclusivamente la base aislada. No requiere nuevas variables ni una clave de IA.

## Verificación

- `npm test`: 57 pruebas de validación, PostgreSQL/RLS/reservas y catálogos/ofertas.
- `npm run typecheck`, `npm run format:check`, `npm run build`.
- `npm run test:browser-discovery`: Auth/Storage/catálogos/ofertas simulados, SQL/RLS reales en PGlite. Verifica selección, consulta de alternativa, persistencia por API/SQL, favorita antes de una alternativa más barata, motivo público y ausencia de desbordamiento a 360/390/768/1440 px.
- Las capturas y resultados del flujo están en `docs/capturas/ediciones-chile/`; contienen datos ficticios, no precios comerciales reales.
- [Evidencia de la revalidación real](evidencia/ediciones-chile-real/README.md): metadatos y oferta de Contrapunto comprobados; sin guardar libros.
- `npm run test:live-discovery`: prueba adicional con fuentes reales y cuenta/base locales, sin guardar libros. Puede fallar si una fuente cambia o se bloquea. No acredita configuración real de Supabase ni despliegue.
