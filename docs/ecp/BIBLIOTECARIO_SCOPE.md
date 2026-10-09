# ECP — alcance de conocimiento dentro del Bibliotecario Universal

## Decisión de arquitectura

ECP no tendrá un segundo Bibliotecario ni un índice institucional paralelo. Su conocimiento específico será un **ámbito de proyecto dentro del Universal AI Librarian / Knowledge OS**, con identificador lógico `ecp`, sujeto al índice maestro vigente y a las reglas del Bibliotecario Universal.

La entrada de ECP en la biblioteca institucional aún requiere confirmación/registro en el índice maestro por el procedimiento autorizado. Este documento de código no modifica Google Drive ni declara que ese registro ya exista.

## Tipos de conocimiento ECP

1. **Normativa oficial:** LOSNCP, reglamento, decretos, resoluciones, transitorias y modelos de pliego, con vigencia y fecha aplicable.
2. **Expediente:** ficha SOCE, resolución de inicio, pliego, TDR, aclaraciones, respuestas y ofertas originales.
3. **Criterios de auditoría:** reglas aprobadas de evidencia, clasificación y convalidación, versionadas y revisables.
4. **Casos y aprendizajes:** patrones de error, resultados de Red Team y pruebas de regresión, sin sustituir fuentes primarias.
5. **Context packs:** paquetes por procedimiento con citas y localizadores, vinculados a las fuentes originales y sin copiar el índice maestro.

## Metadatos mínimos por registro

- ID de registro y proyecto `ecp`.
- ID real del archivo en la biblioteca.
- Fuente, título, versión y estado institucional.
- Fecha de vigencia o fecha del procedimiento, cuando aplique.
- Extracto verificable y localizador (página, hoja, sección o artículo).
- Procedencia institucional.
- Relación con el procedimiento/requisito.
- Huella o versión del archivo cuando esté disponible.

## Política de lectura

- Consultar siempre el índice maestro vigente y respetar su cadena de versiones.
- Recuperar solo registros del proyecto y estados autorizados.
- Si el registro no aparece en el índice vigente, no inventar que existe: bloquear y reportar el registro pendiente.
- No promover una nota de continuidad, un prompt o un resumen secundario a evidencia primaria.
- No usar semillas locales como sustituto silencioso de la biblioteca institucional.
- Toda conclusión de auditoría debe enlazar requisito, fuente, documento y localizador real.

## Política de escritura y aprendizaje

El runtime ECP no modifica directamente el índice maestro ni documentos institucionales. Las nuevas normas, casos o aprendizajes se preparan como propuestas versionadas y se incorporan a Knowledge OS por el flujo autorizado del Bibliotecario. Las pruebas de regresión pueden residir en código, pero no reemplazan la autoridad documental.

## Estado

- Contrato de alcance: DOCUMENTADO.
- Composición del Context Retrieval Gate compartido con el pack ECP: IMPLEMENTADA en código; CI pendiente.
- Conector live al Bibliotecario y registro efectivo de ECP en el índice vigente: NO DEMOSTRADOS.
- Operación de auditoría completa: NO OPERATIVA hasta validar recuperación, ingesta, citas y expediente original.
