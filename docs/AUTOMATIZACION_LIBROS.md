# Búsqueda de libros y comparación de ediciones

**Estado: propuesta implementada y comprobada localmente. No publicada en producción.**

La rama `feature/book-discovery` parte de la versión original que está publicada. El rediseño anterior queda separado. Esta mejora conserva la única propietaria, RLS, las reservas de 7/14 días, el bucket privado y los enlaces externos de vaquitas.

## Flujo

1. Amanda escribe un título o ISBN en **Agregar libro**. Tras una pausa breve, se consultan Google Books y Open Library.
2. Se muestran fichas de ediciones con autor, portada, editorial, año, idioma, formato, traducción y páginas cuando la fuente los proporciona. Amanda elige la edición; los campos se completan y siguen siendo editables. No se adivina la saga o una categoría de su lista personal.
3. Elegir una edición con ISBN inicia la consulta de precios. Solo se aceptan datos estructurados con ISBN coincidente, moneda CLP y precio entero. Tapa dura, bolsillo y traducciones con distintos ISBN no se mezclan.
4. Se muestran librería, stock declarado, fecha de consulta y enlace. **Usar este precio y link** copia una oferta al formulario; no realiza una compra. Las ofertas sin stock confirmado no se declaran como la más económica disponible.
5. Guardar conserva ISBN, formato, idioma, año, páginas y traducción junto al libro. Las notas personales, prioridad y estado conservan su control habitual.

La preferencia inicial es **leer en español con buena relación entre precio y contenido**, indicada por Amanda. La orientación utiliza datos bibliográficos; no evalúa la calidad literaria de una traducción ni inventa extras, reseñas o una “mejor versión” universal. Las fichas incluyen enlaces a sus fuentes. Más páginas o un año más reciente no se interpretan como más calidad.

## Lo comprobado

- Instalación con lockfile, TypeScript y build de producción.
- Pruebas existentes de permisos, reservas y vaquitas; migración incremental sobre una biblioteca poblada y reserva activa.
- ISBN-10/13 y dígito de control; separación por ISBN; referencias de fuentes combinadas.
- Precios CLP, stock, descuentos condicionados identificables, respuesta malformada y fuente bloqueada.
- Redirecciones limitadas a dominios permitidos, límites de tamaño/tiempo y respeto a robots.txt. No se ejecuta JavaScript de las tiendas ni se evita un captcha/bloqueo.
- Navegador: búsqueda anterior cancelada, autocompletado, copia de oferta, persistencia por API/SQL, acceso privado y edición manual tras fallos. Sin desbordamiento a 360/390/768/1440 px.

Los catálogos y ofertas del navegador son **simulados**, con datos ficticios. Auth y Storage de la prueba son simulados; las migraciones, SQL y RLS se ejecutan en PGlite. Las capturas no acreditan precios reales.

## Lo pendiente antes de publicar

El entorno Codex bloquea los dominios externos con **403 en el proxy**, antes de contactar a las fuentes. Se guardó un borrador de red con los dominios de catálogos, portadas y las cuatro librerías. Guardarlo no cambia por sí solo la red en ejecución.

Por este bloqueo **no se han verificado en vivo** los catálogos, las URLs de búsqueda ni el markup comercial de Penguin Libros, Antártica, Buscalibre y Contrapunto. Sus conectores son experimentales: leen JSON-LD público y omiten resultados sin identidad/precio verificables. No se garantiza que esas cuatro webs publiquen información utilizable ni que permitan consultas automáticas. Después de habilitar la red hay que probar ISBN reales y ajustar o sustituir cada conector por una API autorizada si hace falta. No se habilitará una fuente que requiera evitar sus bloqueos.

Antes de incorporar la rama a `main`:

1. Aplicar el borrador de red del entorno Codex y verificar fuentes reales; conservar claramente las que no respondan.
2. Ejecutar **una sola vez** el contenido de `supabase/migrations/003_book_editions.sql` en el SQL Editor del Supabase real, tras las migraciones 001 y 002 ya completadas. Agrega columnas con valores vacíos/nulos para los libros existentes. No repite las migraciones iniciales ni borra datos.
3. Incorporar el código, desplegar y probar con la cuenta real: importación de una edición, elección de oferta y datos guardados. Mantener `SITE_URL` con el dominio principal y aplicar Redeploy si cambian variables.

El proyecto no necesita una clave de IA, `service_role` ni nuevas variables para estas consultas públicas. Las APIs gratuitas pueden imponer sus propios límites. Los resultados se reutilizan hasta 5 minutos para catálogos y 10 minutos para ofertas, en memoria de cada instancia. Los precios son una instantánea al consultar: no hay cron ni actualización permanente del precio guardado. Envío, promociones no descritas en los datos y disponibilidad final se comprueban en la tienda.

## Reproducir la prueba local

Nunca apuntar estas pruebas a Supabase/Vercel reales. El test exige una base aislada con seis portadas sintéticas antes de modificar libros.

```bash
npm ci
npm run typecheck
npm test
```

Primera terminal:

```bash
FIXTURE_PORT=54322 npm run test:fixture
```

Segunda terminal, variables únicamente para esa terminal:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54322 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=fixture-public-key SITE_URL=http://127.0.0.1:3003 npm run build
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54322 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=fixture-public-key SITE_URL=http://127.0.0.1:3003 npm run start -- --hostname 127.0.0.1 --port 3003
```

Para ejecutar el navegador, instalar Playwright fuera del proyecto y usar su módulo mediante `PLAYWRIGHT_MODULE` si no está disponible:

```bash
npm install --prefix /tmp/amanda-browser-deps playwright@1.57.0
/tmp/amanda-browser-deps/node_modules/.bin/playwright install chromium
PLAYWRIGHT_MODULE=/tmp/amanda-browser-deps/node_modules/playwright/index.mjs npm run test:browser-discovery
```

`BROWSER_EXECUTABLE` permite usar un Chromium instalado; `TEST_ARTIFACT_DIR` elige dónde guardar las capturas. Los comandos anteriores usan sintaxis Bash. Los archivos de evidencia documentan exactamente la simulación y sus límites.
