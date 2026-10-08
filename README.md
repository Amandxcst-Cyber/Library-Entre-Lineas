# Amanda entre líneas

> **Ediciones y compras en Chile:** nueva mejora en `feature/chile-edition-comparison`, comprobada localmente: búsqueda en español, favorita primero y alternativas con sus datos y precios. Requiere migración 004 antes de publicar. [Uso, alcance y primer paso](docs/EDICIONES_CHILE.md). El buscador anterior de main funciona según confirmación de Amanda; las consultas automáticas de tiendas tienen cobertura limitada.

La wishlist personal de Amanda (@amandxcst), con libros como protagonistas, una biblioteca privada, vaquitas para sueños lectores y un estante de otros regalitos.

Esta versión es una aplicación independiente: se puede alojar en Vercel y usar con un dominio propio. Las visitas no necesitan cuenta. Amanda entra con correo y contraseña en `/login`; la aplicación no usa autenticación de ChatGPT.

La versión original ya fue desplegada en `library-entre-lineas.vercel.app`, según las capturas aportadas por Amanda, quien confirmó que pudo iniciar sesión. Esta actualización agrega una mejora comprobada localmente y con fuentes externas con cobertura limitada. La migración real fue confirmada por Amanda; Amanda confirmó también que el buscador publicado funciona. La nueva comparación pública de variantes todavía no está desplegada. No contiene credenciales ni acredita una prueba completa de producción.

## Qué incluye

- Página pública responsive, portadas protagonistas, estética crema y borgoña, tipografía local y animaciones suaves con respeto a `prefers-reduced-motion`.
- Búsqueda por título o autor y filtros por género, prioridad, precio, autor y saga o libro independiente.
- Panel privado con agregar, editar, eliminar, archivar, cambiar prioridad y marcar **Ya lo tengo**. Los libros obtenidos desaparecen de la página pública y pasan a **Mi biblioteca**; pueden volver a la wishlist.
- Portadas por enlace o subida de JPG, PNG, WebP y GIF de hasta 4 MB. Las imágenes subidas de libros privados también quedan protegidas.
- Nombre, textos, géneros, prioridades y rangos de precio configurables desde el panel.
- Reservas anónimas de **7 o 14 días**, cancelación inmediata y liberación automática al vencer. No se pide nombre, correo ni identidad del visitante.
- Tres accesos visibles: **Libros**, **Vaquitas** y **Otros regalitos**. Los libros aparecen primero; las secciones de aporte y otros regalos siguen visibles incluso cuando están vacías.
- Otros regalos con imagen, categoría libre (Harry Potter, juegos de mesa, lectura y tecnología u otra), prioridad, precio, link y nota. Se pueden reservar, cancelar, archivar, eliminar, marcar como obtenidos y devolver a la wishlist.
- Vaquitas con accesos rápidos para Kindle, Kobo y Harry Potter, además de cualquier sueño personalizado. Cada una tiene título, imagen, nota, meta, monto recaudado y **link externo**. Amanda actualiza el monto manualmente. Al llegar a la meta se muestra el agradecimiento y desaparece el botón para aportar; esto no cierra la campaña en la plataforma externa.
- Favicon, imagen Open Graph, metadatos, sitemap y robots. El panel y el login tienen `noindex`.

## Arquitectura

| Capa             | Tecnología                                           |
| ---------------- | ---------------------------------------------------- |
| Aplicación y API | Next.js 16 App Router, React 19, TypeScript          |
| Interfaz         | Tailwind CSS 4, Radix UI, CSS propio                 |
| Datos            | PostgreSQL de Supabase, políticas Row Level Security |
| Acceso privado   | Supabase Auth, sesión con cookies HttpOnly           |
| Imágenes         | Supabase Storage, bucket privado `book-covers`       |
| Hosting previsto | Vercel, runtime Node.js                              |

Las acciones de administración verifican la sesión y que su usuario sea el propietario. La base de datos vuelve a aplicar estos permisos con RLS. Las visitas usan los datos públicos y funciones específicas de reserva; no reciben acceso a la tabla de comprobantes.

## 1. Preparar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard).
2. Abre **SQL Editor** y ejecuta `supabase/migrations/001_initial.sql` y después `supabase/migrations/002_other_gifts.sql`, una sola vez cada uno y en ese orden, en una base nueva. Crean las tablas, funciones, triggers, políticas y el bucket de imágenes.
3. En **Authentication → Users**, crea tu cuenta con tu correo y contraseña. Confirma el correo desde el panel al crearla si esa opción aparece. Guarda la contraseña en tu gestor de contraseñas.
4. Copia el **User UID** de esa cuenta. Reemplaza el UUID de ejemplo en `supabase/owner.example.sql` y ejecuta ese archivo en SQL Editor. La cuenta quedará vinculada como la única administradora.
5. Desactiva los nuevos registros públicos en la configuración de Authentication. La aplicación no tiene registro de visitantes.
6. Obtén la URL del proyecto y la **publishable key** desde la configuración API del proyecto.

No se usa una clave `service_role` ni una contraseña de PostgreSQL en la aplicación. La clave publishable se puede usar públicamente: las políticas de la migración son las que limitan el acceso.

## 2. Ejecutar en tu computador

Necesitas Node.js 22 o posterior y npm.

```bash
npm ci
cp .env.example .env.local
```

Edita `.env.local` con los valores de tu proyecto:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_PUBLISHABLE_KEY
SITE_URL=http://localhost:3000
```

```bash
npm run dev
```

Abre `http://localhost:3000` para la página pública y `http://localhost:3000/login` para tu acceso. Después de iniciar sesión llegarás a `/admin`. La biblioteca comienza vacía; agrega tus libros y crea tu primera vaquita desde ese panel.

| Variable                               | Uso                                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL HTTPS de tu proyecto Supabase                                                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publishable del mismo proyecto                                                      |
| `SITE_URL`                             | Origen exacto de la web, con protocolo; se usa en metadatos y verificación de solicitudes |

Usa `.env.local` solo en tu equipo. `.gitignore` evita incluirla en el repositorio.

## 3. Publicar en Vercel

1. Sube el contenido de esta carpeta a un repositorio Git propio, conservando `package-lock.json`, `public/`, `vendor/` y `supabase/`. No subas `node_modules/`, `.next/` ni `.env.local`.
2. En [Vercel](https://vercel.com/new), importa ese repositorio. Elige el preset **Next.js**, Node.js 22 o posterior y esta carpeta como raíz. El build es `npm run build`; la instalación es `npm ci`.
3. Configura las tres variables anteriores en **Environment Variables** del proyecto. En producción `SITE_URL` debe ser la URL HTTPS real que usarás para compartir la web.
4. Despliega. Si todavía no conocías la URL al configurar, copia la URL pública asignada por Vercel, actualiza `SITE_URL` y haz un **Redeploy**. Los cambios de variables requieren un nuevo despliegue.
5. En la configuración de URL de Supabase Auth, establece también esa dirección como **Site URL**. El login actual usa contraseña y no necesita un proveedor social ni una redirección externa.
6. Si activas la protección de despliegues de Vercel, permite el acceso público al despliegue de producción para que las visitas de Instagram puedan abrirlo.
7. Abre `/login`, entra con la cuenta creada y agrega un libro. Prueba reservarlo desde otra ventana del navegador, cancelar la reserva y marcarlo como **Ya lo tengo**. Verifica que desaparezca de la wishlist pública.

Puedes agregar después un dominio desde **Project → Settings → Domains**. Cambia `SITE_URL`, la Site URL de Supabase y vuelve a desplegar. Comparte siempre ese dominio como dirección principal. Si usas un despliegue Preview para editar datos, configura su propio `SITE_URL`: una dirección distinta será rechazada por la protección de origen.

La app necesita un servidor Next.js; no funciona como un HTML estático subido a cualquier hosting. También puede ejecutarse en un hosting Node.js compatible mediante `npm run build` y `npm run start`.

## Tu panel

- **Wishlist:** agrega y ordena las historias que todavía quieres.
- **Mi biblioteca:** libros marcados como tuyos, visibles solo para ti.
- **Archivados:** historias en pausa, también privadas.
- **Personalizar:** cambia nombre, presentación, prioridades, géneros y rangos de precio. Para eliminar una categoría usada, primero cambia los libros que la usan.
- **Otros regalitos:** agrega juegos, detalles de Harry Potter o accesorios. Puedes escribir tus propias categorías y administrar los estados **Por regalar**, **Ya los tengo** y **Archivados**. Los regalos obtenidos salen de la página pública; sus imágenes subidas también quedan privadas.
- **Mis vaquitas:** crea un sueño en borrador, agrega tu link externo, publica y actualiza el total recaudado. Los borradores y archivados quedan privados.
- **Cerrar sesión:** cierra el acceso al panel desde ese navegador.

Si olvidas tu contraseña, puedes gestionar la cuenta desde tu proyecto Supabase. Esta primera versión no incluye una pantalla de recuperación por correo.

## Reservas y privacidad

El visitante elige una o dos semanas para un libro o un regalo individual. Mientras la reserva está vigente el libro permanece visible con una advertencia; otra persona no puede reservarlo. Al cancelar vuelve a estar disponible inmediatamente. Al vencer, PostgreSQL lo considera disponible desde la siguiente consulta, aunque no haya habido visitas ni se ejecute un cron. La página actualiza el estado periódicamente y al volver a ella.

El comprobante se guarda en una cookie HttpOnly del navegador que hizo la reserva; la base de datos guarda únicamente su hash. Solo ese comprobante permite cancelarla. Si se pierden las cookies o se cambia de navegador, habrá que esperar al vencimiento. Amanda no ve nombres ni identidades de quienes reservan.

Se permiten hasta tres reservas activas por navegador en total, sumando libros y otros regalitos. Es una ayuda para evitar acaparar libros por accidente; no es una barrera contra alguien que borra cookies o llama directamente a la API. Para una web personal es un punto de partida razonable. Si hay abuso, la siguiente mejora sería protección adicional de tráfico o CAPTCHA.

La fecha de expiración es pública; los comprobantes y la biblioteca obtenida no lo son. Marcar un libro o un regalito como propio o archivarlo cancela su reserva dentro de la misma transacción. Eliminarlo también elimina su reserva.

## Estructura de datos

| Tabla               | Contenido                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `app_owner`         | El único usuario de Supabase autorizado para administrar                                                                      |
| `books`             | Título, autor, portada, descripción, nota, género, prioridad, estado, precio, regalo especial, link, editorial, saga y fechas |
| `wishlist_settings` | Textos, géneros, prioridades y rangos de precio como JSON                                                                     |
| `gift_items`        | Regalos individuales, categoría libre, nota, imagen, prioridad, precio, enlace, estado y fechas                               |
| `gift_goals`        | Vaquitas, montos, enlace externo, estado y fechas                                                                             |
| `gift_reservations` | Libro o regalito (exactamente uno), hashes de comprobante y visitante, estado, creación y expiración                          |

Las funciones `get_wishlist_books` y `get_wishlist_gift_items` devuelven los dos estantes públicos. `get_gift_state`, `reserve_wishlist_gift` y `cancel_wishlist_gift` manejan las reservas de ambos tipos; las funciones anteriores de libros siguen disponibles como adaptadores compatibles. Cada reserva tiene exactamente uno de `book_id` o `gift_item_id`. La creación bloquea la fila del regalo y serializa las solicitudes de un mismo visitante para evitar dobles reservas y superar el límite compartido.

Los estados del libro son `wishlist`, `owned` y `archived`. En una siguiente migración se pueden agregar historial de lectura, reseñas y puntuaciones mediante una tabla separada que referencie `books.id`, sin mezclar posesión con lectura.

## Archivos del proyecto

| Carpeta       | Responsabilidad                                             |
| ------------- | ----------------------------------------------------------- |
| `app/`        | Páginas, metadatos y rutas API                              |
| `components/` | Wishlist, formularios, panel, reservas y vaquitas           |
| `lib/`        | Modelos, validación, sesión, consultas y reglas de reservas |
| `supabase/`   | Migración y ejemplo para configurar la propietaria          |
| `public/`     | Fuentes, iconos, fotografía e imagen para compartir         |
| `tests/`      | Pruebas de validación y PostgreSQL con RLS                  |

## Verificación

```bash
npm run typecheck
npm test
npm run build
```

Las pruebas de base de datos usan PostgreSQL embebido (PGlite) y ejecutan la migración real con roles `anon` y `authenticated`. Comprueban privacidad, permisos de la propietaria, reservas de libros y otros regalos, expiración, cancelación, el límite compartido, cambios de estado, vaquitas e imágenes. También actualizan una base v1 con una reserva existente y verifican que su comprobante siga funcionando. No necesitan cuentas ni claves reales.

También se comprobaron los flujos HTTP con el SDK de Supabase y servicios locales de prueba: acceso por correo, cookies HttpOnly, panel privado, creación de regalos y vaquitas, reservas y cancelación, y cambio entre wishlist y obtenidos.

Esto verifica el código y las reglas de PostgreSQL localmente. El login, la entrega real de archivos en Supabase Storage y el despliegue deben comprobarse también en tu propio proyecto una vez configurado, siguiendo el paso 7 de publicación.

## Actualizar una base Supabase de la versión anterior

Si ya ejecutaste `001_initial.sql`, aplica **solo** `002_other_gifts.sql`, antes de desplegar el código nuevo. No vuelvas a ejecutar la migración inicial. La actualización agrega otros regalos y adapta la tabla de reservas sin borrar libros, vaquitas, imágenes ni reservas de libros existentes. No necesita variables de entorno nuevas.

## Si venías de la vista previa alojada anteriormente

Esta exportación no copia automáticamente los datos ni las imágenes de la versión alojada anteriormente. El nuevo proyecto comienza vacío. Antes de cambiar el link de Instagram, lleva tus libros, personalización y vaquitas a la nueva base y vuelve a subir sus imágenes desde el panel. No migres los comprobantes de reserva: pertenecen al navegador y dominio anterior. Puedes mantener la versión anterior disponible hasta verificar la nueva.

## Próximas mejoras

1. Recuperación de contraseña desde la web y carga de portada optimizada antes de subir.
2. Exportación e importación privada de libros y respaldos.
3. Historial de lectura, reseñas, puntuación y favoritos.
4. Sagas y autores como entidades separadas cuando crezca tu biblioteca.
5. Protección adicional de reservas si el tráfico lo requiere.

## Documentación oficial

- [Supabase Auth para Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Permisos de Storage](https://supabase.com/docs/guides/storage/security/access-control)
- [Variables de entorno en Vercel](https://vercel.com/docs/environment-variables)
- [Límites de funciones de Vercel](https://vercel.com/docs/functions/limitations): las subidas se limitan a 4 MB para dejar margen bajo el límite de petición del hosting.
