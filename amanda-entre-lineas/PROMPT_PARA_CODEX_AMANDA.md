# Encargo para Codex: hacer Amanda entre líneas más personal, cuidada y profesional

Quiero que mejores y desarrolles este proyecto existente hasta que se sienta como una aplicación personal real, bonita y cómoda de usar. Trabaja sobre el código que te entrego, conserva lo que ya funciona y verifica el resultado. No te quedes en una propuesta de diseño o un mockup.

## Archivos que te entrego

- `amanda-entre-lineas-independiente.zip`: código fuente de la versión 1.1.0. Al extraerlo aparece la carpeta `amanda-entre-lineas`, con `package.json` en su raíz.
- `INSTRUCTIVO_PUBLICACION_AMANDA.md`: guía de configuración y publicación. Es una referencia de la versión actual; actualízala si tus cambios modifican los pasos.
- Este documento: objetivo del trabajo, decisiones ya tomadas y criterios de aceptación.

Lee primero el `README.md`, `.env.example`, `package.json`, las migraciones, los componentes y las instrucciones de repositorio que correspondan. Comprueba las versiones instaladas y consulta documentación oficial cuando haga falta. El código fuente es la referencia para entender la implementación; este brief define el resultado que quiero.

## Mi idea y mi personalidad

La app es mi wishlist personal, pensada para compartir en la biografía de Instagram. Soy conocida como **Amanda / @amandxcst**. El nombre de trabajo es **Amanda entre líneas**: úsalo durante este trabajo y mantenlo configurable.

Quiero que otras personas sepan qué regalarme sin tener que preguntarme, registrarse ni aprender a usar una aplicación compleja. Los libros serán lo principal, pero también quiero juegos de mesa, detalles de Harry Potter, accesorios y metas compartidas, como una Kindle o una Kobo.

Me gusta una mezcla de romance, misterio, fantasía y biblioteca clásica. Soy fan de Harry Potter. Quiero que el sitio se sienta mío: cercano, acogedor, elegante, femenino sin parecer infantil, con un toque de dark academia. Usa español natural y cercano, con expresiones chilenas cuando calcen. Los precios y montos se muestran en CLP.

No es una tienda: no necesito carrito, checkout, stock comercial, cuentas de clientes ni mensajes de urgencia. El regalo es el centro de la experiencia, no una venta. Tampoco quiero un catálogo genérico de libros ni un panel tipo software empresarial.

## Objetivo de esta mejora

Quiero una mejora visible y sustancial en composición, tipografía, navegación móvil, portadas, formularios y detalles de interacción. Cambiar unos colores o agregar sombras no cumple el encargo.

Primero revisa el estado actual y explica brevemente qué vas a mejorar. Luego implementa, prueba y entrega el código. Toma decisiones pequeñas por tu cuenta. Si un cambio altera significativamente la arquitectura, la privacidad o una regla ya acordada, explica sus opciones antes de aplicarlo.

No empieces el proyecto de nuevo sin necesidad. Se puede refactorizar lo que ayude a mantenerlo, pero preserva los datos, contratos útiles, permisos y funcionalidades existentes. Evita instalar dependencias si una solución sencilla con el stack actual basta.

## Diseño que busco

Dirección visual: **un pequeño universo lector de Amanda, entre biblioteca íntima y revista literaria contemporánea**.

- Borgoña profundo como color de identidad; crema y beige para dar aire; café oscuro o negro suave para el texto; dorado discreto en detalles.
- Una tipografía serif expresiva para títulos y otra muy legible para interfaz y textos. Reutiliza las fuentes locales si sirven; evita cargar fuentes y pesos innecesarios.
- Mucho espacio visual, jerarquía clara, bordes y sombras sutiles. Las portadas deben tener protagonismo y proporciones consistentes, sin recortes que impidan reconocerlas.
- No usar exceso de rosado, glitter, corazones, adornos, emojis ni degradados. Se pueden usar guiños pequeños de magia y lectura sin convertir la interfaz en un parque temático.
- Hero editorial con nombre, @amandxcst, una frase corta y acceso inmediato a los regalos. Evita una cabecera tan grande que esconda el contenido en el celular.
- Tres entradas claras: **Libros**, **Vaquitas** y **Otros regalitos**. Libros va primero. Las otras secciones siguen siendo encontrables aunque estén vacías.
- Las vaquitas deben sentirse como sueños personales compartidos: imagen, motivo, meta y avance claros. Los otros regalitos deben tener su propia presentación coherente con los libros.
- Reserva y aportes con microcopy amable: una explicación breve, sin trámites ni textos largos.
- Transiciones cortas, aparición suave y estados claros al guardar, reservar, cancelar o marcar como obtenido. Respeta `prefers-reduced-motion`.

Ejemplo de tono, para adaptar con criterio: «Historias que quiero hacer mías. Y algunos otros pequeños deseos». Evita slogans vacíos y textos que suenen a plantilla.

## Público y uso móvil

La mayoría entrará desde Instagram en un teléfono. Diseña y verifica primero esa experiencia:

- Sin desbordamiento horizontal; textos y botones cómodos desde 360–390 px.
- Controles táctiles de alrededor de 44 px y separación suficiente.
- Búsqueda y filtros sencillos; un sheet móvil puede servir, siempre con aplicar, limpiar y filtros activos visibles.
- Mantener búsqueda y filtros al abrir una ficha y regresar. Elegir entre un modal accesible o una ruta de detalle según lo que encaje mejor con el proyecto.
- Formularios que funcionen con teclado móvil sin acciones ocultas detrás de él.
- Buen comportamiento en escritorio, sin estirar indefinidamente tarjetas y textos.
- Accesibilidad: contraste, foco visible, etiquetas, navegación por teclado, cierre de diálogos y devolución del foco.

## Funcionalidad que debes conservar y pulir

### 1. Wishlist de libros

Cada libro tiene portada, título, autor, género, prioridad, precio aproximado opcional, editorial opcional, saga opcional, link de compra opcional y una nota de por qué lo quiero.

Filtros por género, prioridad, rango de precio, autor y saga o independiente; búsqueda por título y autor. Géneros, prioridades, rangos de precio y textos deben poder editarse desde el panel.

Prioridades actuales de referencia: «Lo quiero mucho», «Me tinca bastante», «Me interesa» y «Para algún día». Deben seguir siendo fáciles de cambiar, sin obligar a editar todo el libro.

Los estados son `wishlist`, `owned` y `archived`. **Ya lo tengo** saca inmediatamente el libro de la wishlist pública y lo deja en mi biblioteca privada. Debe poder restaurarse sin volver a ingresar todos sus datos. Lo mismo aplica a archivar y desarchivar.

### 2. Otros regalitos

Regalos individuales que no son libros: juegos de mesa, detalles de Harry Potter, accesorios lectores, tecnología y categorías personalizadas.

Cada uno tiene nombre, imagen, categoría, nota, prioridad, precio y enlace opcionales. Conserva agregar, editar, eliminar, archivar, marcar como obtenido y devolver a la wishlist. La categoría no debe restringirse a una lista cerrada.

### 3. Reservas de libros y regalitos

Estas son decisiones ya tomadas:

- Visitante anónimo; no pide cuenta, nombre, correo ni identidad.
- Botón como **Quiero regalarlo**.
- El visitante elige **7 o 14 días**.
- El elemento sigue visible, con indicación de reserva y vencimiento.
- Mientras hay una reserva vigente no se acepta una segunda reserva del mismo elemento.
- **Cancelar libera inmediatamente**. No agregar días de espera o penalización al cancelar.
- Al vencer se libera automáticamente por fecha en la base de datos; no depende de que alguien abra la página ni de un temporizador del navegador.
- Marcar el elemento como obtenido o archivado invalida la reserva; eliminarlo también elimina su reserva.
- Amanda no ve quién reservó. Conserva la sorpresa.
- El comprobante para cancelar está en una cookie HttpOnly y en la base solo se guarda su hash. No exponerlo en respuestas públicas.
- Hay un máximo de tres reservas activas por navegador, compartido entre libros y otros regalitos. Es una limitación práctica, no una garantía contra quien borra cookies.

Conserva las protecciones de concurrencia en PostgreSQL: dos solicitudes simultáneas no deben poder reservar el mismo elemento ni saltarse el límite compartido. Explica brevemente que la cancelación necesita el navegador original; si se pierden sus cookies, la reserva igual expira.

### 4. Vaquitas

Ya elegí **link externo para aportar y actualización manual del total por mí**. No implementar una pasarela de pagos, registro de donantes ni integración bancaria en esta mejora.

Cada vaquita tiene título, imagen opcional, nota, meta en CLP, total recaudado, enlace HTTPS y estado: borrador privado, recibiendo aportes, meta cumplida o archivado.

- Accesos rápidos para Kindle, Kobo y Harry Potter, además de crear cualquier meta personalizada.
- Para publicar una vaquita que recibe aportes, debe existir un enlace válido.
- La visita ve meta, avance, lo que falta y un botón para abrir ese enlace.
- Yo reviso los aportes en la plataforma externa y edito el total en mi panel. La app no debe inventar sincronización automática.
- Al llegar a la meta muestra agradecimiento y retira el botón de aporte. Esto no cierra por sí solo la campaña externa.
- No publicar datos bancarios personales ni inventar plataformas, precios, aportes o enlaces de pago.

### 5. Panel privado

Necesito un espacio cómodo y bonito desde el celular, con acceso por correo y contraseña en `/login` y panel en `/admin`.

Conserva una única propietaria y ningún registro público. La cuenta de Supabase Auth solo administra si su UID está vinculado en `app_owner`.

Mejora formularios, navegación, agrupación de campos, validación y feedback. Campos esenciales primero, opcionales después. Permite cambiar prioridad y estado rápidamente. Confirmación clara al eliminar; errores que indiquen qué corregir; evitar doble envío; mensajes de éxito y cierre de sesión funcional.

Separar visualmente libros deseados, biblioteca obtenida, archivados, otros regalitos, vaquitas y personalización sin saturar la pantalla con estadísticas o funciones futuras.

## Arquitectura actual

| Capa | Implementación entregada |
| --- | --- |
| Web y API | Next.js 16 App Router, React 19, TypeScript |
| UI | Tailwind CSS 4, Radix UI y CSS propio |
| Datos | PostgreSQL de Supabase |
| Auth | Supabase Auth, cliente de servidor y cookies HttpOnly |
| Imágenes | Supabase Storage, bucket privado `book-covers` |
| Publicación prevista | Vercel |
| Runtime | Node.js 22 o posterior |

Verifica las versiones concretas en `package.json` y su lockfile. No cambies todas las dependencias solo por usar lo más nuevo. Mantén la app independiente y ejecutable en un hosting Next.js compatible, sin depender de una sesión de ChatGPT.

Variables actuales, respetar estos nombres:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_PUBLISHABLE_KEY
SITE_URL=http://localhost:3000
```

En producción `SITE_URL` es el origen HTTPS exacto de la web. Se usa en seguridad y metadatos. La app actual no necesita `service_role`, una clave secreta ni la contraseña de PostgreSQL en sus variables. Documenta por qué necesita cada nueva variable si agregas alguna.

## Base de datos y seguridad

Tablas existentes: `app_owner`, `books`, `wishlist_settings`, `gift_goals`, `gift_items` y `gift_reservations`. Inspecciona sus campos, constraints, triggers y RPC en las migraciones antes de modificarlos.

Las reservas tienen exactamente un destino: `book_id` o `gift_item_id`. Preserva esa integridad y los comprobantes de reservas existentes.

Migraciones entregadas:

1. `supabase/migrations/001_initial.sql`
2. `supabase/migrations/002_other_gifts.sql`

Para una base nueva se aplican completas en ese orden. Para una base que ya tiene 001, se aplica solo 002. Si necesitas cambiar el esquema, crea una nueva migración incremental y explica su aplicación. No borres datos ni indiques volver a ejecutar 001 sobre una base existente.

Requisitos que se mantienen:

- RLS activa y comprobación de propietaria en el servidor; proteger rutas y operaciones, no solo esconder botones.
- Las visitas solo consultan elementos de wishlist, vaquitas públicas y configuración pública. Biblioteca obtenida, archivos y borradores quedan privados.
- La tabla con hashes de reservas no se expone directamente a visitantes ni al panel para identificar personas.
- Cookies seguras en HTTPS, validación de origen en mutaciones, validación de URLs y entradas del lado servidor.
- No usar `localStorage` como base de datos o sustituto de autenticación; ninguna contraseña hardcodeada.
- No imprimir claves, contraseñas o comprobantes en logs ni guardarlos en Git.
- Bucket privado con políticas según visibilidad. Subidas de JPG, PNG, WebP o GIF de hasta 4 MiB, dentro del límite actual de hosting. No convertirlo en público para resolver un error de permisos.
- Las notas de una ficha pública son públicas: no presentarlas como notas secretas de administración.

## Estado de publicación conocido

El código se probó localmente, pero no hay un despliegue real de Vercel ni una configuración completa de Supabase confirmados en este encargo. La última ayuda de configuración fue por un error en SQL Editor al pegar la ruta de una migración en vez de su contenido. No se confirmó después que las migraciones se ejecutaran correctamente.

Por tanto, no asumas que ya están listas las tablas, la cuenta propietaria, las variables o el dominio. Inspecciona lo que puedas comprobar con acceso autorizado. Si no tienes acceso o credenciales, sigue desarrollando y probando localmente, y deja claramente identificado lo pendiente. No afirmes que publicaste ni que validaste un backend real si no ocurrió.

La versión anterior alojada durante el diseño no se migra automáticamente. No elimines esa publicación ni inventes que el nuevo Supabase ya contiene mis libros. Los ejemplos para pruebas deben estar separados y nunca poblar producción silenciosamente.

## Mejoras técnicas y de experiencia a evaluar

Prioriza las que aporten valor concreto:

- Optimización de imágenes, carga diferida fuera de pantalla, dimensiones reservadas y fallback de portada.
- Estados de carga, vacíos y errores diseñados con el mismo cuidado que las pantallas completas. Una conexión caída no debe parecer una wishlist legítimamente vacía.
- Feedback consistente y validaciones útiles en libros, regalitos y vaquitas.
- Controles de reserva claros ante expiración, conflicto, cancelación, pérdida de comprobante y límite de reservas.
- Metadatos, favicon, imagen Open Graph, sitemap y `noindex` del acceso y panel. Revisar la previsualización para compartir usando el dominio configurado.
- Componentes y estilos compartidos con jerarquía coherente; evitar copiar tres veces una misma lógica.

La recuperación de contraseña por correo **no existe en la versión actual**. Evalúa agregarla solo si puedes completar y probar el flujo real de Supabase Auth, sus URLs y requisitos de correo. Si no puedes verificarlo, documenta esa limitación sin poner un botón que simule funcionar. Mantén este trabajo centrado en el MVP; reseñas, estadísticas, lectura, puntuaciones, recomendaciones y Goodreads quedan para después.

## Pruebas y criterios de aceptación

Ejecuta las comprobaciones del proyecto y corrige los fallos relacionados con tus cambios:

```bash
npm ci
npm run typecheck
npm test
npm run build
```

La versión entregada tiene pruebas de validación y PostgreSQL embebido con PGlite: usan las migraciones reales y roles de base de datos. Extiéndelas cuando cambies reglas o permisos importantes; no las sustituyas por mocks que omitan RLS.

Verifica también en un navegador cuando esté disponible:

1. Pantallas desde 360–390 px y escritorio sin desbordamientos; filtros, diálogos y teclado accesibles.
2. Wishlist pública sin cuenta; panel inaccesible sin sesión y con un usuario que no sea propietario.
3. CRUD de libros y regalitos, upload, prioridad, archivar, obtenido y restauración.
4. Elementos obtenidos y archivados ausentes de los datos públicos; privacidad de imágenes propias.
5. Reserva 7/14 días, cancelación inmediata, expiración, conflicto simultáneo y límite compartido de tres.
6. Creación y edición de vaquitas, publicación solo con enlace, actualización manual y meta cumplida.
7. Personalización persistida, errores de red y cierre de sesión.
8. Ausencia de errores relevantes de consola y de botones que no hacen nada.

No hace falta esperar dos semanas para probar expiración: usa pruebas controladas y datos aislados. Diferencia pruebas locales, servicios simulados y validaciones sobre Supabase real en tu informe.

## Entrega que espero

- Código modificado y organizado, con las funciones anteriores operativas.
- Diseño claramente más personal y profesional, especialmente en móvil, acompañado de capturas de las pantallas si puedes generarlas.
- Resumen concreto de cambios y decisiones importantes.
- Resultados de las comprobaciones, con fallos o limitaciones pendientes descritos con honestidad.
- README actualizado, `.env.example`, migraciones nuevas si correspondieron y guía de publicación vigente.
- Instrucciones muy claras para configurar Supabase Auth, vincular mi UID y publicar en Vercel: indicar cuándo se copia el **contenido** de un archivo SQL, cuándo se usa una ruta y dónde se coloca cada variable.
- Si guías mi configuración durante la conversación, dame un paso corto por vez y revisa su resultado antes de pasar al siguiente. No me tires toda la configuración de golpe.
- Una lista breve de siguientes mejoras razonables, sin implementarlas por defecto.

Empieza inspeccionando el proyecto, define una dirección visual concreta y avanza con la implementación. Quiero una pequeña app personal que dé gusto abrir, compartir y mantener: una biblioteca de deseos de Amanda que conserve su carácter mientras funciona bien.
