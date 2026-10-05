# AUREA — PAQUETE DE MIGRACIÓN EXTERNA Y PILOTO LOCAL

## Objetivo
Esta migración NO reconstruye AUREA. Traslada el estado real existente a un entorno externo/computadora y permite ejecutar primero el piloto Conchita.

## Fuente de verdad
1. Código actual del repositorio.
2. Knowledge OS / Bibliotecario e índices institucionales.
3. Pruebas y gates.
4. Decisiones aprobadas.
5. Este documento como índice operativo.

Reglas: no duplicar componentes; no inventar estados; no reinterpretar arquitectura; no bajar umbrales; SEARCH -> COMPARE -> VERIFY -> REUSE -> IMPLEMENT solo si falta.

## Estado
Cerrado/demostrado: P0; Knowledge OS/Bibliotecario; WIF -> Google Cloud -> Google Drive -> índice v011; canEdit=false; Recovery Bridge; Four Tools Functional Runtime; Browser Use; Skyvern; Playwright MCP; Stagehand; A2A interface/contract; PR #158; PR #159; PR #160.

No declarar operativo todavía: Multi-provider real; fallback real Provider A -> Provider B; Persistence/Recovery real sobre Cloudflare; A2A LIVE real.

## Piloto Conchita
Worker: src/conchita-cloudflare-worker.ts
Worker: aurea-conchita-pilot
Health: GET /health
Session: POST /conchita/v1/session
Message: POST /conchita/v1/message
Bindings: CONCHITA_SESSIONS (KV), CONCHITA_EXECUTION_STATE (Durable Object).
Variables: CONCHITA_ANTHROPIC_MODEL, CONCHITA_PILOT_USER_ID, CONCHITA_ALLOWED_ORIGIN.
Secrets: ANTHROPIC_API_KEY, CONCHITA_PILOT_BOOTSTRAP_TOKEN.

## Ejecución local
Ruta recomendada de mínima fricción:

1. Copiar .dev.vars.example a .dev.vars.
2. Completar localmente ANTHROPIC_API_KEY y CONCHITA_PILOT_BOOTSTRAP_TOKEN.
3. Ejecutar desde la raíz.

Windows:
powershell -ExecutionPolicy Bypass -File .\scripts\run-conchita-local-pilot.ps1

Linux/macOS:
bash ./scripts/run-conchita-local-pilot.sh

El runner instala dependencias, inicia Wrangler localmente, espera HEALTHY, ejecuta el piloto existente y detiene Wrangler al finalizar. No sustituye la evidencia real: el resultado debe conservarse fuera del chat.

Ruta manual, si se necesita diagnóstico:
npm install
npx wrangler --version
npx wrangler dev

Wrangler usa el puerto local 8787 por defecto. Los bindings pueden simularse localmente; el código del Worker se ejecuta en la computadora. Para desarrollo local, Cloudflare recomienda .dev.vars o .env junto al archivo Wrangler y no versionar secretos.

Crear LOCALMENTE .dev.vars:

ANTHROPIC_API_KEY="PEGAR_LOCALMENTE_LA_CLAVE"
CONCHITA_PILOT_BOOTSTRAP_TOKEN="CREAR_UN_TOKEN_LOCAL"

Variables no secretas:
CONCHITA_ANTHROPIC_MODEL="claude-sonnet-5"
CONCHITA_PILOT_USER_ID="pilot-user"
CONCHITA_ALLOWED_ORIGIN="http://localhost:8787"

No incluir secretos en Git.

## Prueba mínima
1. Ejecutar Wrangler.
2. GET http://localhost:8787/health.
3. Esperar status HEALTHY.
4. POST /conchita/v1/session con Authorization Bearer.
5. Conservar sessionId.
6. POST /conchita/v1/message con sessionId, message, clientRequestId y mode=PERSONAL.
7. Confirmar COMPLETED.
8. Registrar health, sesión, ejecución, provider, trace y respuesta.

## No bloquear el piloto
No esperar por multi-provider, fallback real, A2A LIVE, despliegue Cloudflare autenticado, persistencia cloud operacional ni perfeccionamiento arquitectónico no necesario.

## Continuidad externa
El repositorio y documentación pasan a ser la continuidad operativa externa. ChatGPT queda como coordinación, no como fuente única.

## Prioridad
P0 ejecutar/probar piloto local.
P1 empaquetar continuidad externa.
P2 corregir solo bloqueos del piloto.
P3 completar capacidades restantes según evidencia.

## Regla de éxito
Este paquete NO significa que AUREA esté terminada. Es exitoso cuando el código existente puede ejecutarse fuera de ChatGPT, el contexto crítico deja de depender exclusivamente del chat y el piloto puede ejecutarse y medirse.
