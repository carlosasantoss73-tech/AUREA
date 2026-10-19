# Matriz de pruebas de precisión — SP EXÁMENES

Fecha: 2026-10-19
Fuente normativa primaria: Decreto Ejecutivo No. 461 publicado en el repositorio oficial de SERCOP:
https://portal.compraspublicas.gob.ec/sercop/normativa/n_r_decretos/https-portal-compraspublicas-gob-ec-sercop-wp-content-uploads-2026-07-decreto-ejecutivo-no-461-20260629212208-pdf

## Casos mínimos de aceptación

| ID | Entrada | Resultado esperado | Fundamento que debe verificarse |
|---|---|---|---|
| N-01 | El manual de fábrica no está adjunto ni existe referencia a él en ningún documento de la oferta; el pliego lo exige. | No convalidable, sujeto a verificar el pliego y régimen temporal del procedimiento. | Reglamento reformado, art. 102 numerales 1 y 2. |
| N-02 | El manual sí está adjunto como soporte, pero no se lo citó expresamente en el formulario único. | No clasificar automáticamente como no convalidable; evaluar el soporte y explicar la posible convalidación. | Reglamento reformado, art. 100 numeral 5. |
| N-03 | Se omitió mencionar el manual, pero no se sabe si estaba adjunto ni qué exige el pliego. | NO CONCLUYENTE; pedir los hechos faltantes o exponer las dos ramas sin elegir una. | Diferencia material entre arts. 100.5 y 102.1–102.2. |
| I-01 | Imagen PNG real, legible, con el caso N-01 y opciones de respuesta. | Leer el texto de la imagen y fundamentar en el artículo aplicable. No basta responder HTTP 200. | Misma base normativa de N-01; el smoke actual no sirve como prueba OCR porque usa PNG 1×1. |
| S-01 | La página oficial está disponible, pero no se logra descargar el PDF reformatorio. | sourceStatus parcial y NO CONCLUYENTE si ese texto es necesario; nunca reportar el PDF como consultado. | Evidencia real de descarga/adjunto, no solo URL seleccionada. |

## Criterios técnicos de aceptación
1. El JSON informa qué páginas se consultaron y qué PDFs fueron efectivamente descargados/adjuntados.
2. Una fuente seleccionada pero no recuperada queda marcada como no disponible; no aparece como evidencia consultada.
3. Si el proveedor de fallback no recibe los PDFs, la respuesta no afirma que los leyó y no emite una clasificación definitiva sin texto oficial suficiente.
4. La prueba de imagen usa un PNG válido con texto legible y comprueba el contenido de la respuesta, no solo el código HTTP.
5. La prueba ambigua debe producir NO CONCLUYENTE o explicar ambas ramas sin escoger una sin hechos suficientes.
6. La latencia se registra por caso; el objetivo de rapidez no justifica sacrificar precisión normativa.
7. El merge queda bloqueado mientras falle cualquiera de los casos N-01, N-02, N-03 o I-01.

## Estado al abrir esta matriz
- N-01/N-02/N-03/I-01/S-01: pendientes de ejecutar contra el código corregido.
- Smoke live actual: falla en imagen; la pregunta de texto tardó 65.049 ms y dio una clasificación sin fundamento normativo numerado.
- No se considera aprobada la precisión funcional del piloto.
