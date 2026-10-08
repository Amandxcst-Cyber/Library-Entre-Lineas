# Buscador de ediciones: evidencia local

Capturas del formulario privado, con datos **ficticios** y catálogos/ofertas **simulados**. No representan precios ni disponibilidad reales de las librerías. Auth y Storage también están simulados; la persistencia usa las migraciones reales y RLS en PGlite.

- [Celular, 390 px](autocompletar-mobile.png)
- [Escritorio, 1440 px](autocompletar-desktop.png)
- [Resultados del navegador](resultado.json)

El navegador comprobó también ausencia de desbordamiento a 360 y 768 px, autorización de las API, cancelación de consultas anteriores, autocompletado, copia del precio, persistencia y edición manual ante errores. TypeScript, formato, build de producción y las 46 pruebas de validación/SQL/catálogos pasaron. Los conectores comerciales requieren verificación externa antes de publicar.
