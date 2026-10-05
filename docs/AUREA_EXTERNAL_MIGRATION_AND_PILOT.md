# AUREA — PAQUETE DE MIGRACIÓN EXTERNA Y PILOTO LOCAL

## 1. Objetivo
Esta migración NO reconstruye AUREA.
Objetivo inmediato: trasladar a un entorno externo/computadora el estado real ya construido, conservar arquitectura/contratos/decisiones/reglas y ejecutar primero el piloto existente de Conchita.

## 2. Fuente de verdad
1. Código actual del repositorio.
2. Knowledge OS / Bibliotecario e índices institucionales.
3. Pruebas y gates existentes.
4. Decisiones aprobadas.
5. Este documento como índice operativo de continuidad.

Reglas: no duplicar componentes; no inventar estados; no reinterpretar arquitectura; no bajar umbrales; SEARCH -> COMPARE -> VERIFY -> REUSE -> IMPLEMENT solo si falta.
Cada cambio importante: RESULTADO -> EVIDENCIA -> DECISIÓN -> APRENDIZAJE -> ADAPTACIÓN -> SIGUIENTE ACCIÓN.

## 3. Estado que debe conservarse
Cerrado/demostrado: P0; Knowledge OS/Bibliotecario; WIF -> Google Cloud -> Google Drive -> índice v011; canEdit=false; Recovery Bridge; Four Tools Functional Runtime; Browser Use; Skyvern; Playwright MCP; Stagehand; A2A interface/contract; PR #158; PR #159; PR #160.

No declarar operativo todavía: Multi-provider real; fallback real Provider A -> Provider B; Persistence/Recovery real sobre Cloudflare; A2A LIVE real.

## 4. Piloto Conchita
Worker: src/conchita-cloudflare-worker.ts
Worker name: aurea-conchita-pilot
Health: GET /health
Session: POST /conchita/v1/session
Message: POST /conchita/v1/message
Bindings: CONCHITA_SESSIONS (KV), CONCHITA_EXECUTION_STATE (Durable Object).
Variables: CONCHITA_ANTHROPIC_MODEL, CONCHITA_PILOT_USER_ID, CONCHITA_ALLOWED_ORIGIN.
Required secrets: ANTHROPIC_API_KEY, CONCHITA_PILOT_BOOTSTRAP_TOKEN.

## 5. Ejecución local
Desde la raíz: npm install
Luego: npx wrangler dev
Configuración: wrangler.jsonc.

Crear LOCALMENTE un archivo .dev.vars junto a wrangler.jsonc:
ANTHROPIC_API_KEY="PEGAR_LOCALMENTE_LA_CLAVE"
CONCHITA_PILOT_BOOTSTRAP_TOKEN="CREAR_UN_TOKEN_LOCAL"

Variables locales no secretas:
CONCHITA_ANTHROPIC_MODEL="claude-sonnet-5"
CONCHITA_PILOT_USER_ID="pilot-user"
CONCHITA_ALLOWED_ORIGIN="http://localhost:8787"

No incluir secretos en este documento ni en Git.

## 6. Prueba mínima
1. Ejecutar Wrangler.
2. Abrir http://localhost:8787/health.
3. Esperar status HEALTHY.
4. Crear sesión con POST /conchita/v1/session y Authorization Bearer.
5. Conservar sessionId.
6. Enviar POST /conchita/v1/message con sessionId, message, clientRequestId y mode=PERSONAL.
7. Confirmar respuesta COMPLETED.
8. Registrar health, sesión, ejecución, provider, trace y respuesta.

## 7. No bloquear el piloto por
Multi-provider; fallback real; A2A LIVE; despliegue Cloudflare autenticado; persistencia cloud operacional; terminación completa de AUREA; perfeccionamiento arquitectónico no necesario.

## 8. Migración de contexto
El repositorio y esta documentación deben convertirse en la continuidad operativa externa. La conversación de ChatGPT queda como coordinación, no como única fuente de conocimiento.

## 9. Prioridad
P0: ejecutar y probar piloto local.
P1: empaquetar continuidad externa de AUREA.
P2: corregir únicamente bloqueos que impidan el piloto.
P3: después del piloto, completar capacidades restantes según evidencia.

## 10. Regla de éxito
Este paquete NO significa que AUREA esté terminada. Es exitoso cuando el código existente puede ejecutarse fuera de ChatGPT, el contexto crítico deja de depender exclusivamente del chat y el piloto puede ejecutarse y medirse.

## 11. Próxima acción
Ejecutar primero la prueba local del Worker y resolver solo el primer bloqueo real encontrado.