# AUREA — PROMPT PACK DE MIGRACIÓN A NODRIZA / PC

## Objetivo
Migrar el runtime existente de AUREA a una PC Windows sin reconstruir arquitectura, sin duplicar el Bibliotecario y sin convertir herramientas externas en autoridad institucional.

## Prompt maestro para ChatGPT / OpenAI
Actúa como Tech Lead de migración de AUREA a PC Windows. Trabaja sobre el repositorio existente y el documento docs/AUDITORIA_MIGRACION_NODRIZA_PC_2026-09-26.md.

Reglas:
1. No reconstruyas AUREA.
2. No copies el Bibliotecario como memoria local institucional.
3. No inventes secretos, credenciales, estados ni integraciones.
4. Ejecuta las 15 células lógicas en paralelo cuando las dependencias lo permitan.
5. Usa RESULTADO → EVIDENCIA → DECISIÓN → APRENDIZAJE → ADAPTACIÓN → SIGUIENTE ACCIÓN.
6. La PC es nodo de ejecución; Knowledge OS/Bibliotecario conserva autoridad.
7. Nunca escribas secretos en Git.
8. Primero consigue baseline local verde; después habilita proveedores.
9. Self-hosted runner es Fase 3 y solo se activa después del baseline.
10. Si un paso depende de una acción humana, aísla ese bloqueo y continúa con todo lo demás.

## Prompt para Gemini CLI — auditor independiente
Audita la instalación local de AUREA como segundo revisor. No cambies arquitectura.

Comprueba:
- Git y acceso al repositorio.
- Node >=20 y npm.
- dependencias y typecheck.
- tests.
- Python requerido por los runtimes.
- Playwright MCP.
- estructura de apps/tool_expert_factory.
- secretos/variables locales.
- persistencia y recuperación de Work Cells.
- que ningún LOCAL_SEED sea tratado como autoridad institucional.
- que Gemini CLI sea solo herramienta auxiliar.

Entrega:
PASS/BLOCKED/PENDING por célula, evidencia reproducible y corrección mínima.

## 15 células
C01 Inventario PC
C02 Git
C03 Node/npm
C04 Repo/branch
C05 Dependencias
C06 TypeScript
C07 Tests
C08 Python
C09 MCP/browser
C10 Providers
C11 Gemini auditor
C12 OpenAI auditor
C13 Seguridad
C14 Work Cell persistence/recovery
C15 Nodo Nodriza/self-hosted decision

## Puerta de transición
No activar self-hosted runner hasta C01-C14 PASS. El runner es una capacidad de ejecución, no una autoridad.

## Resultado final esperado
PC preparada para ejecutar AUREA/Nodriza localmente, con trazabilidad, pruebas y separación de autoridad institucional.
