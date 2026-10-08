# Amanda entre líneas · Instructivo de publicación

> **Actualización del buscador automático:** fuentes reales comprobadas con cobertura limitada y migración 003 ejecutada según confirmación de Amanda el 8 de octubre de 2026. Se incorpora el código desde `feature/book-discovery` a `main`; queda verificar que Vercel publique el cambio y probar con la cuenta real. No repetir 001, 002 ni 003 en la base ya configurada. Consulta [la guía de la mejora y su evidencia](docs/AUTOMATIZACION_LIBROS.md). Los pasos siguientes son referencia para una instalación nueva.

Esta guía corresponde al proyecto **amanda-entre-lineas-independiente.zip**, versión 1.1.0: libros, otros regalitos y vaquitas. Al terminar tendrás una dirección pública para Instagram y un acceso privado con tu correo y contraseña. La publicación se hace en tus propias cuentas.

La ruta principal se puede completar desde el navegador en un computador. No necesitas instalar Node.js ni Git para seguirla. La prueba local está al final y es opcional.

## Qué vas a usar

| Servicio | Para qué sirve | Cómo lo usarás después |
| --- | --- | --- |
| GitHub | Guarda el código y su historial | Para actualizar la aplicación |
| Supabase | Guarda tus libros, regalitos, vaquitas, imágenes y cuenta privada | Para gestionar el proyecto y tu cuenta |
| Vercel | Ejecuta la web y le da una dirección HTTPS | Para publicar cambios y configurar un dominio |

Crear estas cuentas no crea tres cuentas para tus visitas: ellas abren el link sin registrarse. Tu cuenta de administración de Amanda se crea aparte dentro de Supabase Auth.

Puedes comenzar con la dirección que te asigne Vercel; no necesitas comprar un dominio. Revisa el plan y sus límites al crear cada servicio: esta guía no presupone un precio o disponibilidad ilimitada.

## 1. Descargar y extraer el proyecto

1. Descarga **amanda-entre-lineas-independiente.zip** desde el enlace de la conversación.
2. Extrae el ZIP. En Windows: clic derecho → **Extraer todo**.
3. Abre la carpeta **amanda-entre-lineas**. En ese nivel deben aparecer `package.json`, `package-lock.json`, `README.md` y las carpetas `app`, `components`, `lib`, `public` y `supabase`.
4. Conserva todos los archivos y carpetas de la exportación, incluidos `.gitignore`, `.env.example` y cualquier carpeta `vendor` incluida.

Usa esta exportación independiente para la nueva publicación. El nuevo Supabase comienza vacío: los datos de la vista previa anterior no se copian automáticamente. Puedes mantener el link anterior mientras preparas y compruebas el nuevo.

## 2. Crear el proyecto Supabase y preparar la base de datos

1. Entra a [Supabase](https://supabase.com/dashboard), crea tu cuenta o inicia sesión.
2. Selecciona **New project**, elige tu organización y ponle un nombre, por ejemplo `amanda-entre-lineas`.
3. Define una contraseña segura para la base de datos y guárdala. Esta contraseña es diferente de la que usarás para entrar a tu wishlist y no se agrega a Vercel.
4. Elige una región cercana a Chile entre las disponibles y espera a que el proyecto termine de crearse.
5. Abre **SQL Editor** y una consulta nueva.
6. En tu computador, abre `supabase/migrations/001_initial.sql` con un editor de texto. Copia **todo** el contenido, pégalo en SQL Editor y pulsa **Run**.
7. Espera el resultado exitoso. Luego abre otra consulta y ejecuta **todo** `supabase/migrations/002_other_gifts.sql`.

**El orden es 001 y después 002. Ejecuta cada migración una sola vez si termina correctamente.** La segunda agrega los regalos que no son libros y sus reservas.

Si ya configuraste este mismo Supabase con la versión anterior y ejecutaste `001_initial.sql`, aplica solo `002_other_gifts.sql`. No ejecutes de nuevo la migración inicial.

Puedes comprobar el resultado en **Table Editor**: deben existir `app_owner`, `books`, `wishlist_settings`, `gift_goals`, `gift_items` y `gift_reservations`. En **Storage** debe aparecer el bucket privado `book-covers`, creado por la migración. No hace falta crear tablas, políticas ni el bucket manualmente.

## 3. Crear tu cuenta y convertirla en administradora

1. En el mismo proyecto Supabase, abre **Authentication → Users**.
2. Usa **Add user → Create new user**, o la opción equivalente para crear un usuario con contraseña. Ingresa tu correo y una contraseña segura.
3. Activa **Auto Confirm User** si aparece: tu cuenta debe quedar con el correo confirmado. Crea la cuenta directamente; esta versión no tiene una pantalla para aceptar invitaciones ni recuperar la contraseña por correo.
4. Abre la cuenta recién creada y copia su **User UID**. Es un identificador con formato UUID; no es el ID del proyecto Supabase.
5. En SQL Editor ejecuta esta consulta, reemplazando el texto entre comillas por tu UID real:

```sql
insert into public.app_owner (id, user_id)
values (1, 'PEGA_AQUI_TU_USER_UID');
```

El archivo `supabase/owner.example.sql` contiene la misma operación. No ejecutes su UUID de ceros sin reemplazarlo.

6. Comprueba que hay una única fila con tu UID:

```sql
select id, user_id from public.app_owner;
```

7. En la configuración de **Authentication**, desactiva **Allow new users to sign up**. La documentación oficial enlaza esta configuración desde la sección de proveedores; el menú puede aparecer como **Sign In / Providers**. Mantén habilitado el acceso por correo y contraseña. No necesitas habilitar accesos anónimos ni Google.

**Crear un usuario no basta para darle acceso al panel:** la fila de `app_owner` es la que autoriza tu cuenta. Guarda tus contraseñas en un gestor; no las pegues en el repositorio ni en la conversación.

## 4. Obtener la URL y la clave de Supabase

En tu proyecto abre **Connect** y elige la configuración para Next.js. Copia estos dos valores:

| Valor | Cómo reconocerlo |
| --- | --- |
| Project URL | Dirección similar a `https://identificador.supabase.co` |
| Publishable key | Clave que normalmente comienza con `sb_publishable_` |

También puedes encontrar las claves en **Settings → API Keys**. Si el proyecto todavía solo muestra claves antiguas, crea las nuevas claves desde esa sección y usa la publishable.

La app necesita la clave **publishable**. No uses una clave `sb_secret_`, `service_role` ni la contraseña de PostgreSQL. La clave pública está diseñada para este uso; las políticas instaladas por las migraciones limitan qué puede ver y modificar cada usuario.

Mantén estos valores a mano para el paso de Vercel. No hace falta crear un `.env.local` para la ruta de publicación desde el navegador.

## 5. Subir el código a GitHub

1. Entra a [GitHub](https://github.com), crea tu cuenta o inicia sesión.
2. Usa **New repository**. Nombre sugerido: `amanda-entre-lineas`.
3. Elige **Private**. Puedes inicializarlo con un README para que aparezca directamente la lista de archivos; el README del proyecto lo reemplazará al subirlo.
4. Entra al repositorio y selecciona **Add file → Upload files**. Si está vacío, también puedes usar el enlace para subir archivos existentes.
5. Abre la carpeta extraída `amanda-entre-lineas`, selecciona **su contenido** y arrástralo a la zona de carga de GitHub. Conserva las subcarpetas completas. No subas solamente el ZIP.
6. Espera a que termine la carga. Confirma con **Commit changes**, o la opción equivalente; puedes usar el mensaje `Primera versión de Amanda entre líneas`. Si GitHub te pide crear una rama y una pull request, completa también su incorporación a la rama principal.
7. Comprueba que al abrir el repositorio aparece `package.json` en el primer nivel, junto con `app/`, `public/` y `supabase/`.

La exportación tiene 75 archivos y cabe en una carga del navegador. Asegúrate de incluir `.gitignore` y `.env.example` si tu explorador los oculta. No subas un archivo con credenciales reales, `.env.local`, `node_modules` ni `.next`. La carga por navegador no aplica las exclusiones de `.gitignore`: revisa lo seleccionado si antes probaste la app en tu computador.

Si subiste la carpeta completa y `package.json` quedó dentro de `amanda-entre-lineas/` en GitHub, también sirve: en Vercel deberás elegir esa subcarpeta como **Root Directory**.

## 6. Publicar en Vercel

1. Entra a [Vercel](https://vercel.com/new) y crea tu cuenta. Vincula GitHub cuando te lo solicite.
2. Importa el repositorio `amanda-entre-lineas`. Si no aparece, revisa que la integración de Vercel tenga permiso para ese repositorio privado.
3. Comprueba la configuración de construcción:

| Campo | Valor |
| --- | --- |
| Framework Preset | `Next.js` |
| Root Directory | La carpeta que contiene `package.json`: `./` si está en la raíz |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | Dejar la configuración automática de Next.js |
| Node.js | 22 o posterior; el valor predeterminado actual 24.x es compatible con el requisito del proyecto |

No elijas exportación estática: el login, las reservas y el panel necesitan el servidor Next.js. Vercel configura sus funciones al usar el preset correspondiente.

4. Agrega las tres variables siguientes en **Environment Variables**, para **Production**. Nombre y valor se introducen en campos separados, sin comillas alrededor del valor:

| Nombre exacto | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | La Project URL del paso 4 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | La publishable key del paso 4 |
| `SITE_URL` | La dirección HTTPS principal de tu web, por ejemplo `https://tu-proyecto.vercel.app` |

5. **Si aún no conoces la dirección final**, usa `https://pendiente.example` como valor temporal de `SITE_URL` para esta primera construcción. Es solo un marcador: no uses todavía el login ni las reservas.
6. Pulsa **Deploy** y espera a que termine. Si el proyecto ya está creado, las variables se administran desde **Settings → Environment Variables**.
7. Copia el **dominio principal de producción** asignado al proyecto, visible en sus dominios. Usa la dirección estable que compartirás; evita copiar una URL temporal de una construcción o de Preview.
8. Reemplaza el valor temporal de `SITE_URL` por esa dirección real, con `https://`, sin `/login`, rutas adicionales ni parámetros. Ejemplo de formato: `https://tu-proyecto.vercel.app`.
9. En **Deployments**, abre el menú de tres puntos del despliegue de producción y selecciona **Redeploy**. Espera a que el nuevo despliegue esté listo. Guardar una variable no actualiza el despliegue anterior.
10. En Supabase, abre **Authentication → URL Configuration** y coloca la misma dirección real en **Site URL**. Guarda los cambios. El login actual usa correo y contraseña; no requiere configurar OAuth ni una ruta de callback.
11. Si Vercel exige iniciar sesión para abrir la página pública, revisa **Deployment Protection** y permite visitas anónimas a producción. La privacidad del panel sigue dependiendo de la cuenta de Amanda y los permisos de Supabase.

**En este punto, la dirección pública, el `SITE_URL` de Vercel y la Site URL de Supabase deben coincidir.** Usa esa dirección principal también para administrar; entrar por otro dominio puede hacer que la app rechace una operación con un error de origen.

## 7. Entrar a tu panel y agregar contenido

Abre tu dirección principal seguida de **`/login`**. Inicia sesión con el correo y la contraseña del usuario que creaste en Supabase Auth, no con la contraseña de la base de datos. La app te llevará a **`/admin`**.

| Acción | Dónde hacerla |
| --- | --- |
| Agregar un libro | **Agregar libro** |
| Guardar un libro conseguido | **Ya lo tengo**; pasa a **Mi biblioteca** y sale de la wishlist pública |
| Corregir un cambio de estado | Desde la biblioteca, volverlo a la wishlist |
| Ajustar nombre, textos y filtros | **Personalizar** |
| Añadir Harry Potter, juegos o accesorios | **Otros regalitos → Agregar regalito** |
| Crear una meta de aporte | **Mis vaquitas → Crear una vaquita**, o una idea rápida para Kindle, Kobo o Harry Potter |
| Obtener el enlace público | **Copiar mi link** o abrir **Ver wishlist** |

Los montos son pesos chilenos enteros: escribe `15000` para $15.000, sin puntos ni símbolo de moneda. Las portadas pueden subirse desde el panel en JPG, PNG, WebP o GIF de hasta 4 MiB. El bucket se mantiene privado y la app sirve las imágenes según la visibilidad del elemento.

Las notas personales dentro de una ficha pública explican por qué quieres ese regalo y **son visibles para las visitas**. Guarda allí solo lo que quieras compartir. Los estados de biblioteca y archivo quedan privados.

### Configurar una vaquita

1. Crea por tu cuenta un enlace externo válido para recibir aportes en la plataforma que elijas. La aplicación no procesa cobros ni elige una plataforma por ti.
2. En **Mis vaquitas**, selecciona una idea o crea una nueva.
3. Completa título, nota, imagen opcional, **Meta (CLP)** y **Total recaudado (CLP)**.
4. Pega tu enlace HTTPS en **Link externo para aportar**.
5. Elige **Recibiendo aportes** y guarda. Si quieres preparar los detalles antes de tener el enlace, usa **Borrador privado**.
6. Cuando recibas aportes, revisa el total en la plataforma externa y actualiza manualmente **Total recaudado** desde este panel.

Al alcanzar la meta, la app pasa la vaquita a **Meta cumplida** y retira su botón para aportar. Debes gestionar aparte cualquier cierre de campaña en la plataforma externa. Puedes tener vaquitas y regalitos de distintas categorías; los libros siguen siendo el primer estante.

## 8. Comprobar antes de cambiar el link de Instagram

Haz estas pruebas con un libro y un regalito de prueba que luego puedas borrar:

- [ ] Abre la dirección de producción en una ventana privada o de incógnito: la wishlist se ve sin pedir cuenta.
- [ ] Abre `/admin` en esa ventana: debe pedirte iniciar sesión y no mostrar tu biblioteca.
- [ ] Entra como Amanda en tu navegador habitual y agrega un libro con portada. Comprueba que se ve desde la ventana privada.
- [ ] Desde la ventana privada, reserva ese libro por una o dos semanas. Debe aparecer reservado, con su vencimiento.
- [ ] Desde otro navegador o perfil sin ese comprobante, verifica que no permite otra reserva activa del mismo libro.
- [ ] Desde el navegador que hizo la reserva, cancélala. El libro vuelve a estar disponible inmediatamente al actualizar el estado.
- [ ] Marca el libro como **Ya lo tengo** desde el panel. Al recargar la ventana privada debe desaparecer de la wishlist y quedar en tu biblioteca privada.
- [ ] Devuélvelo a la wishlist y comprueba que reaparece.
- [ ] Agrega un regalito y comprueba también su reserva y su cambio a obtenido.
- [ ] Publica una vaquita, comprueba que se ve su meta y avance y que **Aportar** abre tu enlace externo correcto.
- [ ] Cierra sesión: el panel vuelve a pedir acceso.
- [ ] Prueba desde tu celular y desde el navegador interno de Instagram. Comparte el enlace contigo para revisar la presentación.
- [ ] Borra los elementos de prueba y cambia el link de la biografía por la dirección de producción.

Las reservas vencen por fecha en la base de datos: **no necesitas configurar un cron ni liberarlas manualmente**. Cancelar libera de inmediato; vencer libera al cumplirse los 7 o 14 días elegidos. El comprobante de cancelación pertenece al navegador que reservó. Si se borran sus cookies o se cambia de navegador, la reserva seguirá hasta su vencimiento. No se solicita el nombre de quien reserva.

## 9. Agregar un dominio propio después

1. Cuando tengas un dominio, agrégalo en **Vercel → tu proyecto → Settings → Domains**.
2. Sigue los registros DNS exactos que te indique Vercel en el proveedor del dominio. Espera a que quede verificado y con HTTPS.
3. Decide una dirección principal, por ejemplo con o sin `www`, y usa siempre esa.
4. Cambia `SITE_URL` en Vercel a esa dirección y haz **Redeploy**.
5. Cambia también la **Site URL** en Supabase Auth.
6. Verifica otra vez login, edición y reservas antes de actualizar Instagram. Configura los otros dominios como redirecciones a la dirección principal para evitar errores de origen.

No se migra la base al cambiar de dominio. Las reservas vigentes se siguen respetando, pero sus comprobantes guardados en cookies no se transfieren al dominio nuevo. Quienes reservaron antes pueden necesitar esperar al vencimiento si ya no pueden cancelar desde el origen anterior. Si quieres una transición sencilla, cambia de dominio cuando no haya reservas activas.

## Si algo falla

| Síntoma | Qué revisar primero |
| --- | --- |
| Vercel no encuentra Next.js o `package.json` | **Root Directory** apunta a la carpeta con `package.json`, no al ZIP ni a `public` |
| Fallo al instalar o construir | Conservaste `package-lock.json` y todos los archivos; abre **Build Logs** y revisa el primer error concreto |
| Página visible, pero avisos de que no carga el contenido | Variables URL/clave del mismo Supabase; proyecto activo; migraciones 001 y 002 completadas |
| Credenciales inválidas | Correo y contraseña del usuario Auth, no de la base de datos; correo confirmado |
| No puede verificar acceso o dice que el espacio es privado | La fila de `app_owner` existe y tiene exactamente el UID de tu usuario |
| “La solicitud debe venir desde esta web” | `SITE_URL` coincide con el dominio de la barra del navegador; hiciste Redeploy tras cambiarlo |
| “relation already exists” en la migración inicial | Puede haberse ejecutado antes: comprueba el estado y no repitas una migración completada |
| No se puede subir una portada | Sesión de Amanda, archivo compatible de menos de 4 MiB, bucket privado `book-covers` y sus políticas creados por las migraciones |
| Una vaquita no aparece | Estado **Recibiendo aportes** o **Meta cumplida**; los borradores y archivos son privados |
| Las visitas ven el login de Vercel | Acceso público permitido para producción en **Deployment Protection** |

Esta versión no incluye recuperación de contraseña dentro de la web. No borres tu usuario Auth para intentar arreglar un problema de acceso: su UID está vinculado a los permisos. Gestiona la cuenta desde tu proyecto Supabase y conserva su identificador.

Para pedir ayuda, basta el texto del error y el paso donde ocurrió. No compartas contraseñas, claves secretas, cookies ni capturas que las muestren.

## Opcional: probar en tu computador con Windows

Instala Node.js 22 o posterior desde [nodejs.org](https://nodejs.org). Abre PowerShell en la carpeta que contiene `package.json` y ejecuta:

```powershell
npm ci
Copy-Item .env.example .env.local
notepad .env.local
```

Completa y guarda `.env.local` con tus valores reales de Supabase y la dirección local:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_PUBLISHABLE_KEY
SITE_URL=http://localhost:3000
```

Después ejecuta:

```powershell
npm run dev
```

Abre `http://localhost:3000` y `http://localhost:3000/login`. Mantén abierta la terminal; para detenerlo pulsa **Ctrl+C**. Si Next.js usa otro puerto porque 3000 está ocupado, actualiza `SITE_URL` con ese puerto y reinicia.

Si PowerShell bloquea `npm.ps1`, usa `npm.cmd ci` y `npm.cmd run dev` en lugar de cambiar la política de ejecución del sistema.

Para verificar el código antes de publicarlo:

```powershell
npm run typecheck
npm test
npm run build
```

La prueba local usa el Supabase que configures; si usas el proyecto de producción, sus cambios también afectan los datos publicados. Nunca subas `.env.local` a GitHub.

## Mantenimiento cotidiano

Agregar libros, cambiar estados, subir imágenes, personalizar o actualizar una vaquita se hace desde `/admin` y no requiere un nuevo despliegue. Cambiar el código y subirlo a la rama de producción conectada en GitHub hace que Vercel publique una nueva versión automáticamente. Cambiar variables de entorno requiere Redeploy. Las migraciones futuras se aplican solo cuando una actualización del proyecto las indique.

Conserva la exportación original y el repositorio. El código en GitHub no es un respaldo de los datos de Supabase ni de las imágenes de Storage; administra esos respaldos por separado según el plan y las herramientas que uses. La aplicación ya incluye favicon, metadatos e imagen de presentación para compartir, que usarán la dirección configurada en `SITE_URL`.

## Referencias oficiales verificadas para esta guía

- [Crear un repositorio en GitHub](https://docs.github.com/es/repositories/creating-and-managing-repositories/creating-a-new-repository)
- [Subir archivos y carpetas a GitHub](https://docs.github.com/es/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)
- [Configuración general de Supabase Auth](https://supabase.com/docs/guides/auth/general-configuration)
- [Claves API de Supabase y cuadro Connect](https://supabase.com/docs/guides/getting-started/api-keys)
- [URL de la aplicación en Supabase Auth](https://supabase.com/docs/guides/auth/redirect-urls)
- [Publicar desde el dashboard de Vercel](https://vercel.com/docs/getting-started-with-vercel#deploy-from-the-dashboard)
- [Configuración de construcción y directorio raíz](https://vercel.com/docs/builds/configure-a-build)
- [Versiones de Node.js en Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Variables de entorno en Vercel](https://vercel.com/docs/environment-variables/managing-environment-variables)
- [Redeploy desde Vercel](https://vercel.com/docs/deployments/managing-deployments#redeploy-a-project)
- [Agregar un dominio](https://vercel.com/docs/domains/working-with-domains/add-a-domain)

Los textos exactos de los menús pueden cambiar entre versiones de los servicios. Los nombres de variables, rutas y archivos de esta guía corresponden a la exportación indicada al comienzo.
