# ECP runtime context injection

Estado: implementación propuesta en rama de trabajo; falta CI y conexión al punto de entrada desplegado.

## Objetivo

Usar el proveedor de contexto institucional existente y el pipeline ECP antes de llamar al modelo, sin crear otro Bibliotecario ni alterar el índice maestro.

## Componente

`src/ecp/institutional-execution-adapter.ts` envuelve un `ExecutionAdapter` existente en una ruta exclusivamente ECP:

1. recibe la solicitud;
2. consulta `ContextRetrievalGate` con `projectId: "ecp"` e `institutionalOnly: true`;
3. aplica `composeEcpContext`;
4. bloquea antes de invocar el adaptador del proveedor si faltan hechos, citas, metadatos o procedencia institucional;
5. solo cuando el pack está `READY`, añade el contexto citado a la entrada del modelo y registra fuentes en la evidencia de ejecución.

## Límite de seguridad

No se debe registrar este decorador sobre la ruta general PERSONAL/XOLAR. Debe registrarse en una ruta de ejecución ECP dedicada, con proveedor, capacidades, WorkCell y permisos limitados al proyecto ECP.

## Pruebas previstas

- contexto institucional completo se adjunta a la petición del proveedor;
- recuperación vacía bloquea y no llama al proveedor;
- citas locales/no institucionales bloquean y no llaman al proveedor.

## Bloqueadores que esta pieza no resuelve por sí sola

- no registra el proyecto ECP en el índice institucional;
- no concede acceso ni crea credenciales de Google Drive;
- no convierte el lector del índice en un lector de PDF/Excel;
- no demuestra la descarga de archivos del share de CNEL;
- no sustituye pruebas end-to-end con ofertas primarias ni Red Team.

El piloto no debe declararse OPERATIVO hasta resolver esas dependencias y verificar la conexión de esta pieza en el despliegue real.
