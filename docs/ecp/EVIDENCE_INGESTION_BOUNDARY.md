# ECP — Límite de ingesta de evidencia documental

Estado: componente de segmentación de texto extraído; no equivale a ingesta PDF/Excel/OCR completa.

## Qué hace

`src/ecp/evidence-chunker.ts` convierte bloques de texto ya extraídos en fragmentos limitados, conservando:
- ámbito de proyecto (`ecp`);
- identificador, título y versión del documento;
- URI de origen y tipo MIME;
- localizadores por página, hoja/rango, filas o sección;
- índice y cantidad total de fragmentos;
- texto completo del bloque, sin truncado silencioso.

La versión puede ser un identificador de versión institucional o un hash calculado por el extractor. El chunker no calcula el hash ni descarga archivos.

## Qué no hace

- No abre enlaces compartidos de CNEL ni descarga archivos.
- No parsea PDF, XLSX, DOCX ni imágenes.
- No ejecuta OCR.
- No registra documentos en el Bibliotecario ni modifica el índice maestro.
- No demuestra autenticidad jurídica ni que el texto extraído coincida con el original.

## Contrato obligatorio del extractor aguas arriba

El extractor debe entregar un bloque por unidad localizable y conservar el localizador original. Para PDF, usar página física del archivo; para Excel, hoja y rango/celda; para OCR, identificar página y marcar incertidumbre/legibilidad. Si el localizador no puede determinarse, usar `UNKNOWN` y no elevar la evidencia a concluyente sin revisión.

## Regla de integridad

No se permite truncar texto silenciosamente. Si un token individual excede el límite o faltan metadatos/localizadores, se bloquea. El resultado de este componente es preparación de contexto, no una evaluación jurídica. Cada afirmación de una matriz ECP debe mantener vínculo con el documento primario y su localizador verificable.

## Próximo paso técnico

Añadir adaptadores de extracción separados y probados para PDF y XLSX, con pruebas sobre archivos de muestra y un límite explícito de tamaño. Conectar la ingesta al repositorio institucional solo por el flujo autorizado del Bibliotecario.
