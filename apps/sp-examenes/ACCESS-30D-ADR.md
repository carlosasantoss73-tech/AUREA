# ADR — Acceso individual de 30 días para SP EXÁMENES

- Estado: PROPUESTA, pendiente de validación.
- Fecha: 2026-11-07.
- Alcance: SP EXÁMENES únicamente.
- Rama: `design/sp-examenes-access-30d-adr`.
- Base: `2380b96d2b51f68ca07321bb6f6d9764688fae41`.
- Restricción: no modificar `main`, no fusionar ni desplegar como parte de esta decisión.

## 1. Problema

El Worker de SP EXÁMENES no implementa autenticación ni licencias. El archivo `apps/sp-examenes/wrangler.jsonc` no declara bindings de persistencia. El README confirma que cuentas, suscripciones y expiración quedaron para una fase posterior.

AUREA sí contiene un contrato de principal autenticado y un adaptador de sesiones Cloudflare KV para Conchita. Esos componentes prueban patrones reutilizables, pero no constituyen una solución comercial lista para SP EXÁMENES.

## 2. Requisitos mínimos

1. Cada comprador recibe una licencia individual, activada manualmente después de confirmar el pago.
2. La vigencia empieza en la primera activación, no al generar o entregar el código.
3. La licencia vence exactamente 30 días después de su activación.
4. Una licencia vencida, revocada, no activada o inexistente no puede consultar `POST /api/answer`.
5. El navegador nunca recibe secretos de proveedor ni puede declarar por sí mismo su identidad, fecha de activación o vigencia.
6. Debe existir revocación administrativa y trazabilidad mínima de activación/estado.
7. Los fallos de autenticación o almacenamiento bloquean la consulta (fail closed).
8. No registrar preguntas, imágenes, códigos completos ni tokens de sesión en logs.
9. La funcionalidad debe probarse en entorno de prueba antes de cualquier despliegue.

## 3. Diseño recomendado para el primer piloto

### Licencia y código

- Crear códigos aleatorios criptográficamente seguros con al menos 128 bits de entropía.
- Mostrar/entregar el código una sola vez al administrador para distribución manual.
- Persistir únicamente el hash SHA-256 del código; nunca guardar el código en claro.
- Guardar estado `PENDING`, `ACTIVE`, `EXPIRED` o `REVOKED`, fecha de activación, vencimiento y referencia interna de cliente (sin datos personales innecesarios).
- Activar en la primera canjeada válida. La operación debe ser atómica para impedir que dos solicitudes activen o consuman el mismo código concurrentemente.
- El administrador debe poder revocar la licencia; no se requiere portal de administración para el primer piloto si la operación se realiza por un procedimiento restringido y auditado.

### Sesión del comprador

- Tras canjear el código, emitir un identificador de sesión aleatorio de alta entropía.
- Enviar la sesión como cookie `HttpOnly; Secure; SameSite=Lax`; no guardarla en `localStorage`.
- Persistir solo el hash de la sesión, asociada a la licencia y con vencimiento nunca posterior al vencimiento de la licencia.
- Validar la sesión y el estado/vigencia de la licencia en cada llamada a `POST /api/answer`.
- No confiar en `userId`, correo, fecha o licencia enviados por el cliente.
- Revocar sesiones al revocar la licencia.

## 4. Persistencia: decisión pendiente de infraestructura

No conectar el almacenamiento KV de Conchita directamente como repositorio de licencias sin evaluar consistencia. Cloudflare KV es útil para sesiones, pero su consistencia eventual no garantiza por sí sola un canje de código estrictamente único bajo concurrencia.

Antes de implementar, verificar si la cuenta/entorno de Cloudflare ya tiene D1 o Durable Objects habilitados para SP EXÁMENES:
- Preferencia: D1 con transacción y restricciones únicas para canje de licencia y creación de sesión, si la cuenta permite crear y enlazar la base.
- Alternativa: Durable Object como autoridad serializada para cada licencia, si ya existe un patrón desplegado y mantenible.
- KV puede servir para caché o sesiones no críticas, pero no debe ser la única protección contra doble canje.

No crear recursos Cloudflare ni modificar configuración de producción hasta que la arquitectura y el entorno de prueba estén definidos y autorizados.

## 5. Reutilización segura

- Reutilizar como referencia conceptual `ConchitaAuthenticatedPrincipal` y el contrato de sesión.
- Reutilizar código solo después de revisar dependencias, semántica de expiración, manejo de errores y aislamiento por aplicación.
- No importar el autenticador Cloudflare Access de ECP como login comercial: Cloudflare Access es control de acceso organizacional, no sistema de licencias para compradores.
- No modificar Conchita, ECP, Bibliotecario ni el índice institucional.

## 6. Pruebas obligatorias antes de piloto

1. Código válido: activa una licencia y crea sesión.
2. Segundo canje del mismo código: rechazado.
3. Código inexistente o alterado: rechazado sin revelar si una licencia existe.
4. Sesión válida y licencia vigente: permite acceder.
5. Sesión vencida, licencia vencida o licencia revocada: bloquea.
6. Manipulación de cookie/cabeceras/fechas desde navegador: no amplía vigencia ni identidad.
7. Almacenamiento indisponible: bloquea sin llamar al proveedor de IA.
8. Dos canjes concurrentes: exactamente uno puede activar.
9. Revocación: invalida acceso en la siguiente solicitud.
10. CORS/CSRF, atributos de cookie, límites de intentos y respuestas de error genéricas revisados.

## 7. Decisiones no tomadas

- Identificador mínimo del comprador (recomendación: referencia interna y correo solo si se necesita para soporte/entrega).
- Si se entregará el código como credencial de uso único o mediante un segundo canal de verificación.
- Recurso de persistencia Cloudflare disponible y autorizado (D1 o Durable Objects).
- Procedimiento administrativo para generar, entregar, activar manualmente, revocar y conciliar pagos.

Estas decisiones no se deben inventar ni resolver usando secretos, cuentas o recursos no verificados.

## 8. Criterio de aceptación

El Hito 4 solo podrá marcarse terminado cuando el flujo esté implementado en una rama revisable, CI pase, pruebas de seguridad y expiración pasen, y una prueba end-to-end en entorno de prueba demuestre acceso válido y bloqueo tras vencimiento/revocación. Un documento ADR o CI aislado no basta.

## 9. Evidencia adicional del repositorio (revisión 2026-11-07)

La revisión de `main` encontró que AUREA ya contiene un patrón Durable Object con SQLite:
- `src/conchita-durable-object-execution-result-store.ts`: adaptador y clase Durable Object con almacenamiento SQLite; las mutaciones se serializan por instancia.
- `src/conchita-durable-object-execution-result-store.test.ts`: prueba de reserva concurrente (16 solicitudes; una sola reserva exitosa).
- `wrangler.jsonc`: declara `CONCHITA_EXECUTION_STATE`, exporta la clase Durable Object y configura almacenamiento SQLite.
- `wrangler.ecp.jsonc`: declara Durable Objects para ECP y migración SQLite.

Esto cambia la recomendación: **Durable Objects es el patrón ya utilizado en AUREA y debe evaluarse primero para el control atómico de activación**, antes de introducir D1 o basar la activación únicamente en KV.

Límites de esta evidencia:
- Los bindings encontrados pertenecen a Conchita/ECP, no a SP EXÁMENES.
- No demuestra que el namespace esté habilitado o migrado en la cuenta/entorno de SP EXÁMENES.
- No autoriza compartir el namespace de Conchita con SP EXÁMENES.
- El código de Durable Object encontrado gestiona reservas de ejecución, no licencias; se requiere un contrato aislado para licencias, hash de códigos, sesiones y revocación.
- El test usa un adaptador SQL simulado; no demuestra persistencia real desplegada.

Siguiente paso de implementación: definir una clase Durable Object propia de SP EXÁMENES, con aislamiento de namespace y esquema SQLite para licencias/sesiones, y probar operaciones concurrentes con un test realista del runtime Cloudflare antes de enlazarla al Worker.
