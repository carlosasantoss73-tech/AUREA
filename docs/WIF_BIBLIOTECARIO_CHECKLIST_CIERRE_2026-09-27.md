# AUREA — WIF / BIBLIOTECARIO — CHECKLIST DE CIERRE

Fecha: 2026-09-27

## Objetivo

Habilitar la autenticación GitHub Actions → Google Cloud mediante Workload Identity Federation (WIF) para demostrar la lectura institucional real del Bibliotecario.

No se utilizan claves JSON de cuentas de servicio ni secretos en código.

## Valores que deben existir en GitHub Actions

Configurar como GitHub Repository Variables o Secrets:

- AUREA_GCP_WIF_PROVIDER
- AUREA_GCP_SERVICE_ACCOUNT

Nunca registrar sus valores en commits, issues, chat, logs o archivos del repositorio.

## Forma esperada

AUREA_GCP_WIF_PROVIDER:

`projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID`

AUREA_GCP_SERVICE_ACCOUNT:

`SERVICE_ACCOUNT_NAME@PROJECT_ID.iam.gserviceaccount.com`

Los identificadores concretos deben provenir del proyecto GCP real; no se deben inventar.

## Requisitos GCP

1. Crear o identificar un Workload Identity Pool.
2. Crear o identificar un proveedor OIDC para GitHub Actions.
3. Usar como issuer:
   `https://token.actions.githubusercontent.com/`
4. Mapear como mínimo `google.subject=assertion.sub`.
5. Restringir el proveedor mediante atributos/condiciones al repositorio/propietario de GitHub.
6. Permitir al principal federado impersonar la cuenta de servicio si se utiliza el modo de service-account impersonation.
7. Conceder a la cuenta de servicio solamente los permisos mínimos necesarios para leer el índice institucional del Knowledge OS.

## Recomendación de restricción

La condición debe restringir como mínimo el repositorio/propietario de AUREA. Para mayor aislamiento puede limitarse también a la rama o al workflow de cierre.

No usar una condición abierta a cualquier identidad de GitHub.

## GitHub Actions

Los workflows AUREA ya utilizan:

```yaml
permissions:
  contents: read
  id-token: write
```

y:

```yaml
uses: google-github-actions/auth@v3
with:
  workload_identity_provider: ${{ vars.AUREA_GCP_WIF_PROVIDER || secrets.AUREA_GCP_WIF_PROVIDER }}
  service_account: ${{ vars.AUREA_GCP_SERVICE_ACCOUNT || secrets.AUREA_GCP_SERVICE_ACCOUNT }}
  create_credentials_file: true
```

## Prueba de cierre

Ejecutar:

**AUREA Knowledge OS v011 Live Reader Probe**

La prueba solo se considera exitosa si demuestra:

1. WIF configuration PRESENT.
2. Autenticación Google Cloud exitosa.
3. Lectura del índice institucional v011.
4. Identidad/metadata coherente con el ID configurado.
5. Capacidad de edición del índice NO concedida.
6. JSON válido.
7. `V011_CONTENT_PROBE: PASS`.

El SHA-256 generado por la prueba debe conservarse como evidencia de esa ejecución.

## Fail-closed

Si falta cualquiera de los dos valores GitHub:

- el probe debe detenerse;
- no se sustituye con LOCAL_SEED;
- no se declara Bibliotecario operativo.

## Después de WIF

1. Ejecutar el probe v011.
2. Ejecutar Cloud Continuity.
3. Confirmar `CLOUD_DEPLOYMENT=READY`.
4. Solo entonces seleccionar el runtime cloud mínimo.
5. Ejecutar recuperación desde un segundo equipo.
6. Repetir suite y auditoría final.

## Fuente oficial

Google recomienda Workload Identity Federation para cargas externas y GitHub Actions puede autenticarse mediante el token OIDC de GitHub. La configuración debe restringirse mediante atributos/condiciones y usar permisos mínimos.
