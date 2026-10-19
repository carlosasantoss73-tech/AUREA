# Auditoría SP EXÁMENES — 2026-10-19

## RESULTADO
PR #206 está fusionado y sus checks de CI pasaron. El despliegue de main en el commit 726c1d0418e8a3c8b63f7120fe69bf3ce66bfe9c terminó correctamente, pero el piloto no supera todavía la prueba funcional de precisión.

## EVIDENCIA
- PR #206: https://github.com/carlosasantoss73-tech/AUREA/pull/206 — fusionado el 2026-10-18 17:07:28 UTC; checks verify, worker-dry-run y diagnostic en verde.
- PR #214: https://github.com/carlosasantoss73-tech/AUREA/pull/214 — la optimización de concurrencia se fusionó y desplegó.
- Despliegue actual: https://github.com/carlosasantoss73-tech/AUREA/actions/runs/39190977904 — éxito.
- Smoke live: https://github.com/carlosasantoss73-tech/AUREA/actions/runs/39190977899 — fallo en el paso de imagen. La pregunta de texto devolvió HTTP 200, pero tardó 65.049 ms y clasificó como subsanable la omisión del manual de fábrica sin artículo verificable. La respuesta reconoce que no halló un artículo específico y aun así concluye con confianza media.
- La imagen de prueba era un PNG 1×1 y el fallback OpenAI la rechazó con HTTP 400 por imagen no compatible. Esa ejecución no demuestra OCR ni precisión visual.

## EVIDENCIA NORMATIVA OFICIAL
Fuente SERCOP: Decreto Ejecutivo No. 461 (reforma del Reglamento): https://portal.compraspublicas.gob.ec/sercop/normativa/n_r_decretos/https-portal-compraspublicas-gob-ec-sercop-wp-content-uploads-2026-07-decreto-ejecutivo-no-461-20260629212208-pdf
- Art. 100, numeral 4: la omisión documental es convalidable bajo condiciones, entre ellas que el hecho/documento existiera antes del cierre y conste referenciado en la oferta.
- Art. 100, numeral 5: el soporte que sí fue adjuntado, aunque no esté expresamente referenciado en el formulario único, debe evaluarse; puede solicitarse convalidación con base en ese soporte.
- Art. 102, numeral 1: la falta de información/documentación que no tenga referencia en la oferta es no convalidable.
- Art. 102, numeral 2: el incumplimiento de requisitos técnicos de la oferta establecidos en los pliegos es no convalidable.
La pregunta del smoke (“olvidó incluir o referenciar”) mezcla supuestos jurídicamente distintos; no admite una respuesta categórica única sin aclarar si el manual estaba totalmente ausente o si estaba adjunto como soporte y qué exigía el pliego.

## DECISIÓN
No declarar el piloto preciso ni cerrar el trabajo. No fusionar cambios de auditoría a main hasta que pasen los controles de precisión, evidencia normativa y entrada de imagen válida.

## APRENDIZAJE
El campo sourceStatus: complete sólo significó que las fuentes seleccionadas se recuperaron; no garantizó que se hubiera incorporado la reforma normativa de 2026. Además, la respuesta no estaba condicionada a un artículo/numeral verificable y el smoke de imagen sólo probaba un payload inválido, no lectura visual.

## ADAPTACIÓN
1. Incluir la página oficial de Decreto 461 y recuperar su PDF real desde el enlace publicado por SERCOP; no inventar la URL del PDF.
2. Informar en sources qué PDFs fueron realmente descargados/adjuntados y marcar partial si falta una fuente seleccionada.
3. Añadir una regla de evidencia: si la respuesta reconoce que no verificó la norma aplicable pero concluye sin artículo/numeral, devolver NO CONCLUYENTE.
4. Añadir pruebas: caso inequívoco de documento totalmente ausente; caso de soporte adjunto pero no citado; caso ambiguo que debe resultar NO CONCLUYENTE; y una imagen PNG válida con texto legible.
5. Medir la latencia y no confundir HTTP 200 con exactitud normativa.

## SIGUIENTE ACCIÓN
Implementar los cambios en una rama de auditoría, ejecutar tests estáticos y una prueba local contra el worker de esa rama con credenciales de Actions, y mantener el PR sin fusionar si no se verifican las respuestas, el estado de fuentes y la lectura de imagen.
