# AUREA — AUDITORÍA Y PLAN DE MIGRACIÓN NODRIZA → PC
Fecha: 2026-09-26
Rama: feat/browser-use-runtime-integration-v1

## RESULTADO
La migración debe hacerse como **reproducción controlada del runtime**, no como reconstrucción. La PC será inicialmente un nodo de ejecución de AUREA; el Bibliotecario/Knowledge OS seguirá siendo la autoridad institucional.

## EVIDENCIA
- Repositorio operativo: carlosasantoss73-tech/AUREA.
- package.json define Node/TypeScript/Vitest y scripts `test`, `typecheck`.
- No existe package-lock.json en la rama auditada; por ello la primera instalación local debe usar `npm install`, y después se debe evaluar generar y versionar un lockfile si el proyecto lo adopta.
- CI ejecuta runtimes Python además del núcleo TypeScript: OpenAI, Browser Use, Playwright MCP, Skyvern, Stagehand y Super Agent.
- Four Tools Audit #117 quedó 8/8 PASS.
- Work Cells tienen persistencia, recuperación, lifecycle validation y fail-closed.
- Bibliotecario queda fuera de esta migración como autoridad: no se duplica ni se copia como seed local.
- GitHub permite self-hosted runners en Windows, pero requiere configuración explícita y administración de la máquina; por seguridad se deja como Fase 3, no como prerrequisito de la migración. citeturn0search0turn0search1
- Gemini CLI puede instalarse en Windows con Node 20+ y puede utilizarse como auditor local independiente. citeturn0search3turn0search14

## DECISIÓN
Migración en 4 fases:
1. Baseline de la PC.
2. Reproducción local de AUREA.
3. Activación controlada de herramientas/autonomía.
4. Opcional: convertir la PC en self-hosted runner de GitHub Actions.

## 15 CÉLULAS

| Célula | Objetivo | PASS |
|---|---|---|
| C01 | Inventario PC | Hardware/SO/shell registrados |
| C02 | Git | versión + identidad + acceso repo |
| C03 | Node/npm | Node >=20 y npm operativos |
| C04 | Repo | clone/checkout reproducible |
| C05 | Dependencias | npm install sin corrupción |
| C06 | TypeScript | typecheck PASS |
| C07 | Tests | suite PASS |
| C08 | Python | Python 3.11/3.12 disponible para runtimes |
| C09 | MCP | Playwright MCP smoke local |
| C10 | Providers | credenciales separadas; nunca en repo |
| C11 | Gemini auditor | CLI instalado opcionalmente y revisión independiente |
| C12 | OpenAI auditor | revisión del estado local sin autoridad institucional |
| C13 | Seguridad | .env/.secrets excluidos y permisos revisados |
| C14 | Persistencia | Work Cell/recovery local probado |
| C15 | Nodo Nodriza | checklist final y decisión sobre self-hosted runner |

## ORDEN EFICAZ
C01–C03 → C04–C08 → C09–C14 → C15.

Las células son lógicas y se pueden ejecutar en paralelo donde no exista dependencia; no son agentes independientes.

## REGLA DE AUTONOMÍA
La PC puede ejecutar AUREA, pruebas, Work Cells, proveedores y auditorías. No puede convertirse por sí sola en autoridad institucional ni escribir memoria institucional sin aprobación y sin pasar por el Bibliotecario.

## SELF-HOSTED RUNNER
Solo después de que C01–C14 estén PASS. GitHub permite registrar un runner Windows desde Settings → Actions → Runners; el runner puede instalarse como servicio y requiere privilegios administrativos para esa instalación. citeturn0search0
No se recomienda usarlo para repositorios públicos con código de terceros/forks sin aislamiento adecuado. citeturn0search0

## GO/NO-GO
GO a instalación local cuando:
- PC identificada;
- Git operativo;
- Node >=20;
- acceso al repositorio;
- directorio de trabajo definido.

NO-GO si faltan credenciales de acceso, si el repositorio no puede clonarse o si el entorno local no puede reproducir typecheck/tests.

## APRENDIZAJE
El repositorio actual ya contiene suficiente runtime para iniciar la migración. No necesitamos reconstruir AUREA para llevarla a la PC.

## ADAPTACIÓN
La primera entrega será un bootstrap idempotente de Windows y una auditoría local. La instalación de Gemini CLI será auxiliar; no se convertirá en dependencia del runtime. Gemini CLI requiere Node 20+ y funciona en Windows 11 24H2+ según su documentación actual. citeturn0search3

## SIGUIENTE ACCIÓN
Ejecutar el bootstrap en la PC, devolver el reporte de C01–C03/C04 y continuar automáticamente con C05–C15.
