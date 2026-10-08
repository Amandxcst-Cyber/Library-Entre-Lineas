# Búsqueda de libros y comparación de ediciones

**Estado: implementada; autocompletado y oferta de Contrapunto comprobados con fuentes reales el 8 de octubre de 2026. Migración 003 ejecutada según confirmación de Amanda el 8 de octubre de 2026; despliegue correcto y buscador funcionando según capturas y confirmación posterior de Amanda.**

La rama `feature/book-discovery` parte de la versión original que está publicada. El rediseño anterior queda separado. Esta mejora conserva la única propietaria, RLS, las reservas de 7/14 días, el bucket privado y los enlaces externos de vaquitas.

## Flujo

1. Amanda escribe un título o ISBN en **Agregar libro**. Tras una pausa breve, se consultan Google Books, Open Library y fichas públicas de Contrapunto. La búsqueda por ISBN usa la edición exacta de Open Library; sus colaboradores no se toman de otras ediciones de la obra. La mejora siguiente limita los resultados a ediciones identificadas en español: [ediciones y compras en Chile](EDICIONES_CHILE.md).
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

La configuración del entorno fue publicada y su copia de trabajo se restauró. Se confirmó acceso real a las fuentes. La prueba distingue las siguientes situaciones:

| Fuente | Resultado observado el 8 de octubre de 2026 |
| --- | --- |
| Open Library | Búsqueda y fichas reales por título/ISBN disponibles. |
| Google Books | HTTP 429: límite de consultas; la búsqueda continúa con las otras fuentes. |
| Contrapunto | Fichas de ediciones y una oferta CLP con ISBN y stock comprobados. |
| Penguin Libros | La búsqueda automática de la aplicación está prohibida por sus reglas generales de robots.txt. Se conserva el enlace para consulta humana. |
| Buscalibre | La búsqueda automática de la aplicación está prohibida por sus reglas generales de robots.txt. Se conserva el enlace para consulta humana. |
| Antártica | HTTP 403 al consultar las reglas de rastreo con el identificador de la aplicación; no se solicitaron productos después del rechazo. |

**No hay una comparación automática completa entre las cuatro librerías.** La interfaz identifica las fuentes bloqueadas y no inventa sus precios. Si solo se obtiene una oferta disponible, la llama única fuente obtenida; no asegura que sea la más barata del mercado. Para automatizar las otras tiendas se necesita una API o integración autorizada y comprobarla. No se cambió de identidad para eludir restricciones.

La consulta por título encontró varias ediciones reales de *Orgullo y prejuicio* con ISBN distintos. La edición Austral `9789566180777` permitió completar Jane Austen, portada, español, tapa dura y 352 páginas, y consultar una oferta de Contrapunto. No se inventaron año ni traductor ausentes. Los catálogos externos pueden contener errores: todos los campos siguen siendo editables antes de guardar. [La evidencia de consultas reales](evidencia/buscador-real/README.md) separa los datos reales de la cuenta/base aisladas usadas para probar la interfaz.

## Incorporación y verificación de producción

La versión comprobada se incorpora desde `feature/book-discovery` a `main` para que la integración Git de Vercel publique la actualización. El entorno Codex aún no permite consultar el dominio de Vercel ni el Supabase real: esas verificaciones directas siguen pendientes. La confirmación de la migración proviene de Amanda, no de una consulta de este entorno.

Pasos de publicación:

1. Mantener la cobertura limitada descrita arriba; no anunciar comparación completa entre cuatro tiendas. El entorno y las consultas reales ya se comprobaron.
2. **Completado según confirmación de Amanda:** migración `003_book_editions.sql` ejecutada en el Supabase real. No repetir 001, 002 ni 003 en esa base. Para una instalación nueva, aplicar las migraciones en orden, una sola vez cada una. La 003 agrega columnas con valores vacíos/nulos y conserva datos.
3. Esperar que Vercel publique el commit de `main` y probar con la cuenta real: importación de una edición, elección de oferta y datos guardados. Mantener `SITE_URL` con el dominio principal y aplicar Redeploy si cambian variables.

La fuente comercial comprobada lee HTML/JSON-LD y la ficha bibliográfica visible; los demás conectores continúan limitados por sus fuentes. No se ejecuta JavaScript de las tiendas ni se evita un captcha/bloqueo.

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

## Prueba opcional con fuentes externas reales

`npm test` sigue siendo determinista y no consulta Internet: ejecuta 52 pruebas. `test:browser-discovery` usa catálogos/ofertas simulados para comprobar fallos y persistencia. La prueba adicional `test:live-discovery` consulta fuentes reales desde una web local y deja **sin guardar** el libro del formulario. Puede fallar si cambian los datos, el stock, la red o el markup de la tienda.

En Codex con Node.js 24, iniciar el servidor de prueba con `NODE_USE_ENV_PROXY=1 NO_PROXY=127.0.0.1,localhost` además de las variables de fixture indicadas arriba, para usar el proxy del entorno en las consultas externas. En Vercel no se necesitan estas dos opciones del entorno Codex. Ejecutar las pruebas de navegador por separado, contra la fixture, nunca contra producción:

```bash
NODE_USE_ENV_PROXY=1 NO_PROXY=127.0.0.1,localhost PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs BROWSER_EXECUTABLE=/usr/bin/chromium npm run test:live-discovery
```

Ese comando usa el Chromium y Playwright presentes en este entorno. La alternativa para instalarlos fuera del proyecto está en la sección anterior. Las capturas reales documentan una consulta concreta, no una garantía permanente de precio, disponibilidad o cobertura. No se compró nada ni se modificó Supabase real.

En la prueba real, solo se transportan las portadas reales a Chromium mediante el proxy HTTPS de Node.js; no se sustituyen por imágenes ficticias ni se interceptan las API de catálogo/precios. La biblioteca y el acceso permanecen aislados.

### Comprobación después del despliegue

1. En Vercel, confirmar que el último despliegue de Production usa el commit de esta actualización y muestra **Ready**.
2. Entrar a `/admin`, abrir **Agregar libro** y escribir `9789566180777` como ejemplo de la consulta real comprobada. Seleccionar la edición y revisar autor, portada, idioma y formato. El título también sirve para buscar otras ediciones.
3. Si hay oferta con stock declarado, copiar precio/enlace; revisar los campos y guardar solo si Amanda quiere agregar ese libro. Reabrir su ficha y comprobar que los datos de edición se conservan. Los precios pueden cambiar o no estar disponibles.
4. Comprobar que la wishlist, biblioteca, otros regalos y vaquitas conservan sus datos. Las pruebas de reservas no deben crear compromisos reales en producción.

Un resultado exitoso de compilación local o un push a GitHub no confirma que Vercel terminó de publicar. Si falla el despliegue, revisar el error exacto del build; no volver a ejecutar migraciones que ya terminaron correctamente.


## Comparación pública de variantes

La nueva rama `feature/chile-edition-comparison` conserva esta implementación y agrega edición favorita, motivo, extras y alternativas con instantáneas de precios por ISBN. **La migración 004 fue ejecutada según confirmación de Amanda; el código se incorpora a main. Falta verificar el nuevo despliegue.** El primer paso y la verificación están en [EDICIONES_CHILE.md](EDICIONES_CHILE.md). La publicación histórica descrita arriba corresponde al buscador anterior, que Amanda ya confirmó funcionando.
