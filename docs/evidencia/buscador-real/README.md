# Consulta con fuentes reales · 8 de octubre de 2026

La interfaz consultó APIs de la aplicación sin interceptar sus respuestas bibliográficas ni comerciales. Se comprobó la edición Austral de **Orgullo y prejuicio**, ISBN **9789566180777**, autor Jane Austen, tapa dura, español y 352 páginas. La oferta de Contrapunto se obtuvo en CLP, con ISBN coincidente y stock declarado por la fuente. Es una instantánea de consulta: no acredita el menor precio del mercado ni disponibilidad o importe futuro.

La cuenta, la base SQL y el fondo de la biblioteca usan datos de prueba aislados. No se guardó este libro, no se compró nada y no se tocó Supabase real. Chromium no podía cargar imágenes externas directamente en este entorno; la prueba transfirió la portada real, sin modificarla, mediante el proxy HTTPS habitual de Node.js.

- [Libro real en celular](edicion-real-mobile.png)
- [Oferta real en celular](precio-real-mobile.png)
- [Libro real en escritorio](edicion-real-desktop.png)
- [Respuesta de catálogo, comparación y verificaciones](resultado.json)

La consulta obtuvo una oferta de Contrapunto. Penguin Libros y Buscalibre bloquearon la búsqueda automática según sus reglas generales; Antártica respondió HTTP 403. Google Books respondió HTTP 429 y el buscador continuó con sus otras fuentes. Los registros del navegador conservaron seis libros sintéticos, sin cambios.

La comprobación es adicional a las 52 pruebas deterministas, TypeScript, formato, build y la prueba de navegador con escenarios simulados. No demuestra el funcionamiento del despliegue real: Amanda confirmó la migración 003 después de esta prueba; la publicación y el uso con la cuenta real siguen pendientes de verificación.
