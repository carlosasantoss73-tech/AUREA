# AUREA — Continuity Snapshot — 2026-08-28

## Purpose
Durable handoff so future agents do not depend on conversational recall alone.

## Current architecture state
- B13 Runtime hardening merged to `main`.
- B14 Automatic Context Retrieval Gate merged to `main`.
- Runtime path: Gateway → Harness → Supervisor → Runtime.
- Historical/continuity-sensitive queries must pass through the Context Retrieval Gate before execution.
- If required evidence is unavailable, the Runtime blocks instead of inventing continuity.
- Technology Radar continuity is persisted in `src/technology/technology-radar.registry.ts`.

## Historical Librarian boundary
The historical Knowledge OS implementation included `server/bibliotecario.ts` with deterministic institutional retrieval, versioning, conflict handling, Context Packs and audit. That historical implementation was synthetic/P0 and did not provide automatic cross-conversation memory. The current AUREA P0 runtime therefore uses an explicit `ContextProvider` contract rather than pretending the historical DB is already connected.

## Technology/video continuity recovered from B11
Historical candidates recorded in the Technology Radar:
- MoneyPrinterTurbo — automated video generation candidate.
- OmniVoice / OmniVoice Studio — TTS/STT and voice candidate.
- Hermes Agent — agent/tool/skills candidate.
- Agent-Reach — web/social/GitHub access candidate.
- Creati.ai — discovery/directory source; not a Core component.
- Created.ai / CreatAI.io — content/marketing automation candidate.

All remain `DISCOVERED`; none is declared integrated without evidence.

## Current Terrazas Costa Limón creative task
Goal: create a 30-second, 720×1280 cinematic real-estate advertisement with real scene motion, hyperrealistic avatars, hyperrealistic voice, and CTA:
- WhatsApp: 0999276299
- Website: www.terrazascostalimon.com

Creative anchors selected by user:
- “Hay lugares que no se encuentran, se eligen.”
- “Deja tu huella en el paraíso.”

Commercial facts explicitly updated by user:
- Lots: 625 m².
- Hectare cash: USD 20,000.
- Direct owner credit: USD 25,000.
- User-provided installment reference: USD 417 × 60 months.

Important arithmetic note: 417 × 60 = USD 25,020, so advertising should not silently represent both USD 25,000 total and USD 417 × 60 as mathematically identical. Confirm the commercial wording before publishing.

## Failure that triggered B14
The agent incorrectly suggested a video tool from incomplete local recall instead of automatically retrieving the tools discussed earlier in the week. B14 exists specifically to prevent this class of lapse.

## Required behavior going forward
For any request containing continuity signals (this week, yesterday, before, what we did, continue, as discussed, etc.), retrieve evidence first. Do not ask the user to say “recover memory”. Do not invent missing historical facts. Return `NO CONSTA` when the real provider has no evidence.
