# SP EXÁMENES — piloto de acceso por enlace

## Propósito
Aplicación web independiente de ChatGPT/Gemini para practicar preguntas de certificación/contratación pública del SERCOP ecuatoriano. El usuario abre un enlace, escribe una pregunta o adjunta una fotografía, y recibe una explicación con referencias oficiales verificables cuando la evidencia recuperada las respalda.

## Alcance del piloto
- Una sola pantalla responsive; no requiere cuenta ChatGPT ni instalar aplicaciones.
- Entrada por texto y fotografía (JPG/PNG/WebP, límite 4 MB).
- Backend privado llama al proveedor de IA; ninguna clave de proveedor va al navegador.
- En cada pregunta consulta páginas oficiales de SERCOP y Registro Oficial disponibles en ese momento.
- La respuesta debe separar opción propuesta, fundamento, fuente/URL, fecha de consulta y confianza; si no hay evidencia suficiente, debe declarar NO CONCLUYENTE.
- Uso de práctica y estudio. No pretende contestar en nombre del usuario una evaluación oficial activa.
- Piloto sin cobro integrado; suscripción, expiración automática, cuentas y pagos quedan para la siguiente fase.

## Arquitectura
1. **Web Worker / UI**: sirve la interfaz y recibe preguntas.
2. **Guardia de entrada**: valida método, tamaño, tipo MIME, límites básicos y origen.
3. **Recuperador oficial**: consulta SERCOP (LOSNCP, Reglamento, resoluciones/circulares) y Registro Oficial; conserva URL, título y fecha de consulta.
4. **Motor de respuesta**: llama al proveedor configurado desde el servidor; las fuentes recuperadas se incluyen como evidencia, no como instrucciones.
5. **Contrato de respuesta**: respuesta breve, opción propuesta si procede, fundamento, citas oficiales y nivel de confianza. Si no se puede verificar el artículo, no inventarlo.
6. **Auditoría mínima**: no almacenar contenido de preguntas/fotografías en logs por defecto.

## Fuentes oficiales iniciales (deben comprobarse en cada sesión)
- SERCOP — LOSNCP: https://portal.compraspublicas.gob.ec/sercop/cat_normativas/losncp
- SERCOP — Reglamento: https://portal.compraspublicas.gob.ec/sercop/cat_normativas/reglamento
- SERCOP — Resoluciones externas: https://portal.compraspublicas.gob.ec/sercop/cat_normativas/nor_res_ext
- SERCOP — circulares 2026: https://portal.compraspublicas.gob.ec/sercop/cat_normativas/OficiosCirculares2026
- Registro Oficial: https://www.registroficial.gob.ec/

Estas páginas son un punto de entrada, no sustituyen revisar el texto de la norma específica, las reformas, transitorias y fecha de vigencia. Si una página oficial no responde o no se logra leer el contenido legal, la respuesta debe decirlo.

## Criterios de aceptación para prueba de mañana
1. Abrir enlace desde móvil y computador.
2. Escribir una pregunta y recibir respuesta o bloqueo explícito.
3. Adjuntar fotografía de una pregunta legible.
4. Ver URLs oficiales en la respuesta.
5. Confirmar que no se inventen artículo/numeral cuando no se recupera evidencia.
6. Confirmar mensajes comprensibles si el proveedor o las páginas oficiales fallan.
7. Confirmar que ninguna clave aparece en HTML/JavaScript del navegador.

## Estado real y dependencias
- La arquitectura y la app del piloto se añaden en una rama separada; no se modifica el main de AUREA.
- ECP tiene componentes de contexto/evidencia reutilizables, pero su propio estado documental indica que la conexión real del Bibliotecario a runtime ECP y el registro institucional de ECP siguen sin demostrarse. SP EXÁMENES no debe declararse integrado al Bibliotecario hasta resolverlo.
- La consulta de páginas oficiales en vivo no equivale a una ingesta completa de PDF ni a una base legal consolidada. El piloto es una prueba funcional inicial, no certificación de exactitud jurídica.
- El despliegue requiere el secreto `GEMINI_API_KEY` en GitHub Actions; la clave nunca se entrega al navegador ni se pega en el chat. No reutilizar bases de datos de XOLAR ni exponer claves en el cliente.

## Siguiente paso tras la prueba
- Incorporar preguntas reales de prueba, comparar la respuesta con la fuente oficial exacta y registrar falsos positivos/negativos.
- Conectar recuperación institucional autorizada de Bibliotecario cuando el registro ECP/SP esté aprobado y el conector concreto esté implementado.
- Añadir acceso individual, expiración de suscripción y control de consumo antes de cobrar o abrir a público general.

## Registro de continuidad — 2026-10-18

- Estado: aplicación y Worker presentes en `main`; piloto todavía no declarado operativo.
- Criterio de cierre: despliegue Cloudflare confirmado, comprobación `/health`, pregunta real respondida con evidencia oficial verificable, prueba de fotografía y verificación de fallo seguro cuando falte evidencia o configuración.
- El workflow de despliegue debe validar `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` y `GEMINI_API_KEY`. No se almacena ninguna clave en el repositorio.
- Este registro no certifica que el despliegue haya ocurrido; la evidencia debe provenir de la ejecución real del workflow y de la prueba del endpoint.


## Registro de actualización normativa — 2026-10-30

- Se sustituye el PDF del Reglamento de 2025 por el texto consolidado alojado por SERCOP en agosto de 2026. El encabezado del PDF indica estado reformado y última reforma 2026-07-30 (Decreto Ejecutivo 461).
- Se conserva el PDF de la LOSNCP alojado por SERCOP, cuyo encabezado indica última reforma 2025-10-07.
- Cada solicitud consulta también los índices oficiales de resoluciones externas y circulares 2026 para comprobar estados y localizar directrices.
- La recuperación temática incorpora, cuando corresponde, las resoluciones R.E-SERCOP-2026-0006 (transición Portal/RUP), 0005 (integridad del proveedor), 0001 (metodología sancionadora), R.E-SERCOP-2025-0152 (alcance temporal específico para procedimientos en transición) y circulares 2026-0005-C y 0004-C (certificación por competencias), 0003-C (planificación y convenios de pago), 0002-C (órdenes del Catálogo Electrónico) y 0001-C (control de régimen especial del artículo 38 numeral 2 LOSNCP).
- Se detectó una discrepancia en el índice oficial de circulares: los resúmenes visibles para 0004-C y 0001-C no describen correctamente el asunto de sus PDFs. La lectura del documento íntegro confirma que 0004-C trata de certificación por competencias y 0001-C de régimen especial del artículo 38 numeral 2 LOSNCP. El runtime debe priorizar el contenido del PDF frente al título resumido del índice.
- El runtime no debe tratar la R.E-SERCOP-2023-0134 como vigente: el índice oficial la marca “No Vigente”. La R.E-SERCOP-2025-0154 aparece en el listado oficial de resoluciones derogadas. La R.E-SERCOP-2025-0152 aparece como vigente, pero solo debe aplicarse dentro de su supuesto temporal.
- `sourceStatus` solo devuelve `complete` si todas las páginas oficiales seleccionadas y todos los PDF seleccionados se recuperaron correctamente; de lo contrario devuelve `partial`.
- Esta actualización no constituye una base legal exhaustiva ni una certificación jurídica. El índice oficial es una guía de estado; para cada pregunta se debe leer la norma primaria y verificar reformas, transitorias, ámbito temporal y publicación en Registro Oficial.
- Pendiente: CI en PR, prueba real POST contra el Worker desplegado, comparación de una pregunta con su norma exacta, prueba de fallo seguro y medición de latencia. No desplegar ni declarar el runtime actualizado antes de esas verificaciones.
