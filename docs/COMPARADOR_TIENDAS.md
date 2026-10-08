# Comparador de tiendas: corrección de presentación y acceso

La captura de Amanda del 8 de octubre de 2026 confirmó un libro guardado con dos ediciones y sus consultas. Para Verity (`9789564082417`), una lectura pública y una consulta real de las fuentes encontraron una oferta de Contrapunto por $16.030 CLP, sin envío. Las otras tres fuentes no entregaron precios: sus consultas quedaron bloqueadas. La lista anterior y los enlaces no dejaban suficientemente clara esa diferencia.

## Qué se corrige

- El panel agrega **Comparar tiendas** debajo de cada libro, para abrir la favorita y sus alternativas sin entrar a Editar.
- El comparador presenta las cuatro tiendas con tarjetas, precio obtenido o estado explícito, fecha/hora de Santiago, stock informado y enlace de la oferta. La tienda con precio aparece antes de las que no lo obtuvieron.
- Si el importe manual está vacío, el panel, las tarjetas públicas y sus filtros/ordenamiento utilizan la oferta disponible guardada del ISBN favorito. Ya no aparece Precio por confirmar mientras existe esa referencia. **No se modifica el importe manual ni se escribe automáticamente en Supabase.**
- Las tiendas bloqueadas dejan de enlazar su buscador rechazado. Se ofrece el sitio oficial y una búsqueda web por ese ISBN, limitada al dominio chileno (Penguin `/cl/`). La búsqueda web es una acción de la visita; no consulta ni acredita un precio automáticamente. También se puede copiar el ISBN y buscarlo dentro de la tienda.
- El precio y las tiendas obtenidos se distinguen de los pendientes: **1 de 4 tiendas con precio obtenido**. No se promete el menor precio de todo Chile ni cuatro precios cuando solo hay uno.
- Las ofertas de distintos ISBN siguen separadas. La edición favorita de Amanda mantiene su primer lugar, aunque una alternativa tenga un precio menor.

## Lo que sigue limitado

No hay comparación automática completa de las cuatro librerías. Para este ISBN se volvieron a consultar las fuentes reales: Contrapunto respondió con una oferta CLP y stock; Penguin, Antártica y Buscalibre bloquearon las consultas. El acceso humano también puede ser bloqueado por una tienda. Se comprobó el acceso a la portada oficial Penguin `/cl/`, pero no se solicitó su buscador prohibido por robots.txt. El enlace antiguo de la captura daba 403 en el navegador de Amanda.

Automatizar los precios de las otras tiendas requiere APIs o integraciones que permitan consultar sus datos, con acceso autorizado y verificación del ISBN/moneda/stock. No se incorporan precios inventados, captchas resueltos, cambios de identidad, proxies para eludir bloqueos ni scraping de resultados del buscador web. La app sigue mostrando únicamente la última consulta guardada; para actualizarla, editar el libro, volver a consultar y guardar.

## Verificación y publicación

- 60 pruebas: validación, PostgreSQL/RLS/reservas, catálogo y comparador. Los casos nuevos cubren tiendas ausentes, enlaces bloqueados, ofertas de otro ISBN y precio de referencia con importe manual vacío o explícito.
- TypeScript, formato y build de producción.
- Navegador aislado: guardar una favorita y alternativa, vaciar el importe manual, abrir el comparador desde el panel, comprobar las cuatro tiendas, copiar ISBN y verificar anchos 360/390/768/1440. Auth y precios son simulados; SQL y RLS son reales en PGlite. Sin escrituras contra Supabase real.
- Consulta real adicional en navegador: ISBN 9789566180777, metadatos/portada reales y oferta CLP de Contrapunto copiada al formulario; cobertura limitada visible, sin desbordamiento y sin guardar libros. Evidencia: `docs/evidencia/comparador-tiendas-real/`.
- Capturas de ese flujo: `docs/capturas/comparador-tiendas/`. Son datos ficticios.

No requiere migraciones, nuevas variables ni credenciales. La mejora se publica en main conservando los datos existentes. El despliegue nuevo debe verificarse después de la publicación; la cobertura comercial limitada no se resuelve por desplegar de nuevo.
