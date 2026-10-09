# Propuesta de registro del agente ECP en Universal AI Librarian

**Estado:** PROPUESTA NO INCORPORADA. No existe todavía un fileId de Drive para este registro. No pegar este objeto al índice vigente manualmente.

## Justificación

La lectura real de INDICE_MAESTRO_v011.json y su cadena de versiones recuperó 45 IDs únicos y no encontró un registro de proyecto ECP. El agente necesita un ámbito de proyecto identificable para que la búsqueda institucional pueda recuperar sus reglas, contexto y casos sin mezclar proyectos.

## Registro propuesto

    {
      "id": "AKL-046",
      "nombre": "ECP_AGENTE_CONTRATACION_PUBLICA_ECUADOR_v1.md",
      "categoria": "AGENTE",
      "proyecto": "ECP",
      "version": "v1",
      "estado": "PROPUESTA",
      "componente_reutilizable": "SI",
      "dependencias": "AKL-002; AKL-031; AKL-034; AKL-035; ECP evidence gate",
      "descripcion": "Agente auditor técnico-documental de contratación pública ecuatoriana. Reutiliza el Bibliotecario Universal, el protocolo operativo, el Context Pack y el gate ECP; exige evidencia primaria, régimen jurídico aplicable, citas y localizadores verificables; no recomienda adjudicación.",
      "palabras_clave": "ECP, contratación pública Ecuador, pliegos, TDR, ofertas, convalidación, auditoría, evidencia, SOCE",
      "ubicacion": {
        "carpeta": "03_AGENTES",
        "fileId": "PENDIENTE_CREAR_ARCHIVO_Y_APROBAR"
      },
      "decision_relacionada": "PENDIENTE_APROBACION",
      "fecha": "2026-10-09",
      "ultima_actualizacion": "2026-10-09"
    }

## Pasos de incorporación autorizada

1. Confirmar que AKL-046 sigue disponible al momento de la incorporación.
2. Crear el documento Markdown de agente en la carpeta institucional 03_AGENTES usando el flujo autorizado del Bibliotecario.
3. Validar que el documento cumple el protocolo vigente y no duplica al Bibliotecario Universal.
4. Obtener aprobación y asignar el fileId real.
5. Registrar el objeto en la siguiente versión del índice maestro, conservando la versión anterior y su trazabilidad.
6. Volver a leer el índice vigente por API y comprobar que ECP aparece con el estado esperado.
7. No considerar la biblioteca ECP operativa hasta que la búsqueda por proyecto recupere este registro y sus fuentes.

## Riesgo documental a resolver

La cadena v011 reporta AKL-002 como PROPUESTA, aunque otra referencia histórica cita DEC-001 como aprobación del Bibliotecario v2. Antes de usar AKL-002 como vigente en un registro institucional, cotejar el documento de decisión original con el índice actual y resolver la discrepancia mediante el protocolo de versiones. No cambiar el estado por inferencia.
