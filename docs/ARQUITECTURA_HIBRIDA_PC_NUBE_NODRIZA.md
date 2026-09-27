# AUREA / NODRIZA — Arquitectura híbrida PC + nube

## Decisión
Mantener tres capas separadas:

1. **PC**: nodo local de ejecución y desarrollo.
2. **GitHub**: fuente versionada, recuperación y punto de sincronización.
3. **Nube**: nodo remoto de ejecución/continuidad.

El **Bibliotecario / Knowledge OS continúa siendo la autoridad institucional**. La nube no puede convertirse en una segunda autoridad.

## Flujo

PC
→ commit/push
→ GitHub
→ validación automática
→ autenticación OIDC/WIF
→ despliegue cloud
→ ejecución remota

Para recuperación:

otro PC
→ clone/pull
→ misma rama/estado
→ continuidad

## Protección

La redundancia recomendada no es simplemente "dos copias":

- GitHub conserva historial de código.
- La nube conserva el runtime remoto.
- Debe existir además un backup de estado/datos institucionales separado del runtime.
- El Bibliotecario conserva la autoridad de conocimiento.

## Qué falta para activar la nube

No se deben inventar credenciales.

Se necesita:
- proveedor cloud elegido (GCP es el candidato natural por el diseño actual);
- proyecto GCP;
- Workload Identity Federation;
- service account con permisos mínimos;
- destino de ejecución (Cloud Run/VM según la fase);
- almacenamiento de backups separado;
- políticas de secretos;
- dominio/end-point si se desea acceso remoto directo.

## Regla de sincronización

El PC no debe escribir directamente en la base institucional.

El cambio pasa por:
PC → Git → CI → validación → despliegue.

Esto permite auditoría, rollback y recuperación.

## Estado

La capa cloud queda preparada pero **NO desplegada** mientras WIF no esté disponible. El workflow usa fail-closed: si faltan las variables WIF, no intenta autenticarse ni inventa éxito.
